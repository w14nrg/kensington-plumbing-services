import test from "node:test";
import assert from "node:assert/strict";
import worker from "../_worker.js";
import entryWorker from "../_worker-entry.js";

function makeDatabase(){
  let notificationStatus="NONE";
  const payment={id:"pay_test",reservation_id:"res_test",lead_id:"lead_test",estimate_id:"est_test",checkout_reference:"KPS-test",status:"PAID",sumup_checkout_id:null};
  const booking={id:"book_test",payment_id:"pay_test",reservation_id:"res_test",lead_id:"lead_test",slot_key:"2026-08-24_08:00_11:00",appointment_date:"2026-08-24",start_time:"08:00",end_time:"11:00",status:"CONFIRMED"};
  return {
    prepare(sql){
      let args=[];
      const statement={
        bind(...values){args=values;return statement;},
        async first(){
          if(sql.includes("FROM payments WHERE checkout_reference"))return payment;
          if(sql.includes("FROM bookings WHERE payment_id"))return booking;
          if(sql.includes("FROM bookings b"))return {...booking,checkout_reference:"KPS-test",payment_status:"PAID",customer_name:"Test Customer",customer_phone:"07123456789",customer_email:"customer@example.com",customer_address:"1 Test Street",customer_postcode:"W14 9BP",job_name:"Repair dripping tap",estimate_min:95,estimate_max:190};
          if(sql.includes("FROM reservations WHERE id="))return {id:"res_test",...booking};
          return null;
        },
        async all(){
          if(sql.includes("INNER JOIN payments"))return {results:[booking]};
          return {results:[]};
        },
        async run(){
          if(sql.includes("INSERT OR IGNORE INTO booking_notifications")&&notificationStatus==="NONE")notificationStatus="PENDING";
          if(sql.includes("SET status='SENDING'")){
            if(notificationStatus==="PENDING"||notificationStatus==="FAILED"){notificationStatus="SENDING";return {meta:{changes:1}};}
            return {meta:{changes:0}};
          }
          if(sql.includes("SET status='SENT'"))notificationStatus="SENT";
          if(sql.includes("SET status='FAILED'"))notificationStatus="FAILED";
          return {meta:{changes:1},args};
        }
      };
      return statement;
    }
  };
}

test("a confirmed paid booking emails Nicholas exactly once",async()=>{
  const originalFetch=globalThis.fetch;
  const emails=[];
  globalThis.fetch=async(url,init)=>{emails.push({url:String(url),body:JSON.parse(init.body)});return new Response(JSON.stringify({id:"email_test"}),{status:200,headers:{"content-type":"application/json"}});};
  try{
    const env={DB:makeDatabase(),RESEND_API_KEY:"re_test",OWNER_EMAIL:"nicholas.griffith.uk@gmail.com",NOTIFICATION_FROM_EMAIL:"Ken Alerts <onboarding@resend.dev>"};
    const request=()=>new Request("https://www.kensington.biz/api/payment-status?ref=KPS-test");
    const first=await worker.fetch(request(),env);
    assert.equal(first.status,200);
    assert.equal((await first.json()).paid,true);
    assert.equal(emails.length,1);
    assert.equal(emails[0].url,"https://api.resend.com/emails");
    assert.deepEqual(emails[0].body.to,["nicholas.griffith.uk@gmail.com"]);
    assert.match(emails[0].body.subject,/PAID BOOKING/);
    assert.match(emails[0].body.text,/Test Customer/);
    assert.match(emails[0].body.text,/07123456789/);
    const second=await worker.fetch(request(),env);
    assert.equal(second.status,200);
    assert.equal(emails.length,1);
  }finally{globalThis.fetch=originalFetch;}
});

test("a missing email key never cancels an already paid booking",async()=>{
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls+=1;throw new Error("unexpected network call");};
  try{
    const env={DB:makeDatabase(),OWNER_EMAIL:"nicholas.griffith.uk@gmail.com"};
    const response=await worker.fetch(new Request("https://www.kensington.biz/api/payment-status?ref=KPS-test"),env);
    assert.equal(response.status,200);
    assert.equal((await response.json()).paid,true);
    assert.equal(calls,0);
  }finally{globalThis.fetch=originalFetch;}
});

test("production health reports paid booking notification configuration",async()=>{
  const response=await entryWorker.fetch(new Request("https://www.kensington.biz/api/health"),{RESEND_API_KEY:"re_test",OWNER_EMAIL:"nicholas.griffith.uk@gmail.com"},{});
  assert.equal(response.status,200);
  const health=await response.json();
  assert.equal(health.paidBookingNotifications,true);
});

test("the recovery route sends an alert for an existing paid booking",async()=>{
  const originalFetch=globalThis.fetch;
  const emails=[];
  globalThis.fetch=async(url,init)=>{emails.push(JSON.parse(init.body));return new Response(JSON.stringify({id:"email_recovery"}),{status:200,headers:{"content-type":"application/json"}});};
  try{
    const env={DB:makeDatabase(),RESEND_API_KEY:"re_test",OWNER_EMAIL:"nicholas.griffith.uk@gmail.com",NOTIFICATION_FROM_EMAIL:"Ken Alerts <onboarding@resend.dev>"};
    const response=await worker.fetch(new Request("https://www.kensington.biz/api/retry-booking-notifications",{method:"POST"}),env);
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.confirmedPaidBookings,1);
    assert.equal(result.notificationsSent,1);
    assert.equal(emails.length,1);
    assert.match(emails[0].subject,/PAID BOOKING/);
  }finally{globalThis.fetch=originalFetch;}
});
