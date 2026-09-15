function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=UTF-8","cache-control":"no-store"}})}
function clean(value,max=160){return String(value??"").trim().slice(0,max)}
function uid(prefix){return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0,12)}`}
function sqlTimestamp(date){return date.toISOString().replace("T"," ").replace(/\.\d{3}Z$/,"")}

export async function handleManualReservation(request,env){
  if(!env.DB)return json({error:"Booking database is not connected yet."},503);
  const data=await request.json().catch(()=>({}));
  const appointmentDate=clean(data.appointmentDate,20);
  const agreedTime=clean(data.agreedTime,20);
  const bookingType=clean(data.bookingType,50)||"Already arranged by phone";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate))return json({error:"Please enter the agreed appointment date."},400);
  if(!/^\d{2}:\d{2}$/.test(agreedTime))return json({error:"Please enter the agreed appointment time."},400);

  const reservationId=uid("res");
  const slotKey=`manual-${appointmentDate}-${agreedTime}-${crypto.randomUUID().slice(0,8)}`;
  const expiresAt=sqlTimestamp(new Date(Date.now()+35*60*1000));
  try{
    await env.DB.prepare(`INSERT INTO reservations
      (id,session_id,estimate_id,lead_id,slot_key,appointment_date,start_time,end_time,status,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(
        reservationId,
        clean(data.sessionId,100)||null,
        clean(data.estimateId,100)||null,
        clean(data.leadId,100)||null,
        slotKey,
        appointmentDate,
        agreedTime,
        "as agreed",
        "HELD",
        expiresAt
      ).run();
  }catch(error){
    console.error("Manual reservation error",error);
    return json({error:"We could not create the agreed appointment. Please call 020 7371 3333."},500);
  }
  return json({reservation:{reservationId,slotKey,date:appointmentDate,start:agreedTime,end:"as agreed",bookingType,displayLabel:`${appointmentDate} at ${agreedTime} — ${bookingType}`,expiresAt}});
}
