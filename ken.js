
(function(){
  "use strict";
  const root=document.getElementById("ken-page-app");
  if(!root)return;

  const STORAGE="kps_ken_chat_v3";
  let state={sessionId:`session_${Date.now()}_${Math.random().toString(36).slice(2)}`,conversation:[],serverState:{},fallback:{step:0,job:"",postcode:"",access:""}};
  try{const s=JSON.parse(localStorage.getItem(STORAGE)||"null");if(s)state={...state,...s}}catch{}
  const save=()=>localStorage.setItem(STORAGE,JSON.stringify(state));
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  root.innerHTML=`
    <header class="ken-chat-head">
      <div class="ken-mini-avatar"><div id="ken-mini-3d" style="width:100%;height:100%"></div></div>
      <div class="ken-chat-title"><strong>Ken</strong><span>Plumbing assistant · Estimates · Booking</span></div>
      <div class="online-pill">Online</div>
    </header>
    <div class="ken-progress"><span></span></div>
    <div class="ken-messages" aria-live="polite"></div>
    <div class="ken-quick"></div>
    <div class="ken-inputbar"><input type="text" maxlength="700" placeholder="Describe your plumbing problem…"><button class="ken-send" type="button">➜</button></div>
    <div class="ken-footnote">Ken gives an estimated range from the information supplied. Your plumber confirms the exact price before additional work proceeds.</div>`;

  const messages=root.querySelector(".ken-messages"),quick=root.querySelector(".ken-quick"),input=root.querySelector(".ken-inputbar input");
  function progress(n){root.querySelector(".ken-progress span").style.width=Math.max(16,Math.min(100,n))+"%"}
  function add(text,role="bot",persist=true){
    const row=document.createElement("div");row.className=`ken-row ${role}`;
    row.innerHTML=role==="bot"?`<div class="ken-bot-dot">K</div><div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`:`<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;
    messages.appendChild(row);messages.scrollTop=messages.scrollHeight;
    if(persist){state.conversation.push({role:role==="user"?"user":"assistant",content:text});state.conversation=state.conversation.slice(-24);save()}
  }
  function html(x){const w=document.createElement("div");w.innerHTML=x;while(w.firstChild)messages.appendChild(w.firstChild);messages.scrollTop=messages.scrollHeight}
  function setQuick(items=[]){quick.innerHTML="";items.forEach(t=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.onclick=()=>send(t);quick.appendChild(b)})}
  function typing(on){root.querySelector("[data-typing]")?.remove();if(on){const t=document.createElement("div");t.className="ken-typing";t.dataset.typing="1";t.textContent="Ken is thinking…";messages.appendChild(t);window.Ken3D?.react("thinking")}}
  async function api(path,opts={}){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4500);
    try{
      const r=await fetch(path,{...opts,signal:ctrl.signal,headers:{"Content-Type":"application/json",...(opts.headers||{})}});
      const type=r.headers.get("content-type")||"";
      if(!r.ok||!type.includes("application/json"))throw new Error("API unavailable");
      return await r.json();
    }finally{clearTimeout(timer)}
  }

  const jobData=[
    {test:/toilet|cistern|flush|wc/i,name:"Toilet / cistern repair",min:95,max:210,q:"Is water continuously running into the toilet bowl, is the cistern slow to refill, or is the flush not working?"},
    {test:/leak|drip|water.*ceiling|pipe/i,name:"Leak or accessible pipework repair",min:95,max:260,q:"Where can you see the water coming from — a visible pipe or fitting, under a fixture, or is the source hidden?"},
    {test:/tap|mixer|faucet/i,name:"Tap repair or replacement",min:95,max:260,q:"Is the tap dripping from the spout, leaking around the base/connections, or do you want the whole tap replaced?"},
    {test:/shower|bath/i,name:"Shower / bath plumbing repair",min:120,max:360,q:"Is the main problem a leak, low pressure, temperature, drainage, or the shower valve itself?"},
    {test:/radiator|heating|trv|lockshield/i,name:"Radiator / water-side heating repair",min:95,max:300,q:"Is the radiator cold, leaking, making noise, or is a valve not working?"},
    {test:/blocked|blockage|drain|sink.*slow|waste/i,name:"Local waste or blockage repair",min:95,max:285,q:"Is it completely blocked or just draining slowly, and which fixture is affected?"},
    {test:/tank|cylinder|pump|overflow/i,name:"Tank, cylinder or pump diagnosis",min:125,max:450,q:"Is the problem an overflow, a leak, poor pressure, no hot water, or a pump that isn’t working?"},
    {test:/washing machine|dishwasher|appliance/i,name:"Plumbing appliance connection / repair",min:95,max:220,q:"Is this a new connection, a leaking connection, or a waste/drainage problem?"}
  ];
  function infer(text){return jobData.find(j=>j.test.test(text))||{name:"Plumbing fault diagnosis",min:75,max:220,q:"Tell me where the problem is and exactly what you can see or hear happening."}}
  function postcode(text){const m=text.toUpperCase().match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/);return m?m[1]:""}

  async function fallback(message){
    const f=state.fallback;
    if(f.step===0){
      const j=infer(message);f.job=j;f.step=1;save();
      return{reply:j.q,progress:38};
    }
    if(f.step===1){
      f.detail=message;f.step=2;save();
      return{reply:"Thanks. Is the area easy to get to, tight/awkward, or hidden behind tiles, boxing or flooring?",progress:58,quickReplies:["Easy to get to","Tight or awkward","Hidden behind tiles or boxing"]};
    }
    if(f.step===2){
      f.access=message;f.step=3;save();
      return{reply:"What’s the postcode for the job?",progress:75};
    }
    if(f.step===3){
      f.postcode=postcode(message)||message;f.step=4;save();
      let min=f.job.min,max=f.job.max;
      if(/tight|awkward/i.test(f.access)){min+=35;max+=90}
      if(/hidden|tile|boxing|floor/i.test(f.access)){min+=80;max+=220}
      return{reply:"That gives me enough to put together an initial estimate.",progress:100,estimate:{estimateId:"preview-"+Date.now(),jobName:f.job.name,min,max,confidence:"Medium",summary:"Based on what you’ve told Ken so far. The exact fault and price are confirmed on site."}};
    }
    return{reply:"You’ve already got an estimate for this problem. When the live booking system is connected, you’ll be able to choose an available appointment and pay the £75 booking payment here.",progress:100};
  }

  async function send(text){
    const message=String(text||"").trim();if(!message)return;
    add(message,"user");setQuick([]);typing(true);
    let data=null;
    try{
      data=await api("/api/ken",{method:"POST",body:JSON.stringify({sessionId:state.sessionId,message,history:state.conversation.slice(0,-1),state:state.serverState,page:location.pathname})});
    }catch{data=await fallback(message)}
    typing(false);window.Ken3D?.react("idle");
    if(data.state)state.serverState=data.state;
    if(data.reply)add(data.reply,"bot");
    if(data.quickReplies)setQuick(data.quickReplies);
    progress(data.progress||40);
    if(data.estimate)showEstimate(data.estimate);
    save();
  }

  function showEstimate(e){
    window.Ken3D?.react("estimate");
    html(`<div class="ken-estimate">
      <div class="ken-estimate-label">YOUR ESTIMATED REPAIR</div>
      <h3>${esc(e.jobName)}</h3>
      <div class="ken-price">£${esc(e.min)}–£${esc(e.max)}</div>
      <p>${esc(e.summary||"Based on the details supplied.")}</p>
      <div class="ken-pay-note"><strong>£75 to book your plumber.</strong><br>The £75 covers attendance and diagnosis and is deducted from the final repair price when we carry out the work.</div>
      <button class="ken-action-btn" type="button" data-book-preview>See available appointments</button>
    </div>`);
    messages.querySelector("[data-book-preview]")?.addEventListener("click",async()=>{
      try{
        const d=await api("/api/slots");
        if(d.slots?.length){add("Great — the live booking system is connected. Choose one of the available appointments below.","bot");showSlots(d.slots)}
      }catch{add("The estimator is working in preview mode. Live appointment availability and the £75 SumUp payment switch on in the next Cloudflare step.","bot")}
    });
  }
  function showSlots(slots){html(`<div class="ken-estimate"><div class="ken-estimate-label">AVAILABLE APPOINTMENTS</div>${slots.slice(0,8).map(s=>`<button class="ken-action-btn" style="margin:5px 0;background:#0b2930">${esc(s.dayLabel)} · ${esc(s.timeLabel)}</button>`).join("")}</div>`)}

  function boot(){
    if(state.conversation.length){
      state.conversation.forEach(m=>add(m.content,m.role==="user"?"user":"bot",false));
    }else{
      add("Hi, I’m Ken. Tell me what’s gone wrong in your own words and I’ll help work out the likely problem, give you an estimated price range and help you book a plumber.","bot");
    }
    setQuick(["I have a leak","My toilet has a problem","I have a tap or shower problem","I have a radiator or heating problem","I have a blocked sink or drain"]);
    progress(18);
  }

  root.querySelector(".ken-send").onclick=()=>{const t=input.value.trim();if(t){input.value="";send(t)}};
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();root.querySelector(".ken-send").click()}});
  document.querySelectorAll("[data-ken-prompt]").forEach(b=>b.addEventListener("click",()=>{send(b.dataset.kenPrompt);root.scrollIntoView({behavior:"smooth",block:"center"})}));
  boot();
})();
