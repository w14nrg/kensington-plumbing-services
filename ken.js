
(function(){
"use strict";
if(document.getElementById("ken-page-app"))return;

const STORAGE="kps_ken_chat_v9";
let state={sessionId:`session_${Date.now()}_${Math.random().toString(36).slice(2)}`,conversation:[],serverState:{},estimate:null,leadId:null,reservation:null};
try{const s=JSON.parse(localStorage.getItem(STORAGE)||"null");if(s)state={...state,...s}}catch{}
const save=()=>localStorage.setItem(STORAGE,JSON.stringify(state));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const api=async(path,opts={})=>{const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||"Something went wrong.");e.data=d;throw e}return d};

function loadMascot(){
  if(window.KenMascot){window.KenMascot.mount();return}
  if(document.querySelector('script[src="/ken-mascot.js"]'))return;
  const s=document.createElement("script");s.src="/ken-mascot.js";s.defer=true;document.body.appendChild(s);
}

function chatMarkup(){
  return `<header class="ken-head">
    <div class="ken-mini-avatar"><div id="ken-mini-3d" data-ken-mascot="mini"></div></div>
    <div class="ken-head-copy"><strong>Ken</strong><span>Plumbing assistant · Live estimates · Booking</span><a href="/ken">Open full Ken estimator →</a></div>
    <div class="ken-online">Online</div><button class="ken-close" type="button" aria-label="Close">×</button>
  </header>
  <div class="ken-progress"><span></span></div>
  <div class="ken-confidence-line"><span>Estimate confidence</span><strong>Tell Ken what’s happening</strong></div>
  <div class="ken-live-estimate" hidden></div>
  <div class="ken-messages" aria-live="polite"></div>
  <div class="ken-quick"></div>
  <div class="ken-inputbar"><input type="text" maxlength="700" autocomplete="off" placeholder="Describe your plumbing problem…"><button class="ken-send" type="button">➜</button></div>
  <div class="ken-footnote">* Ken’s prices are estimates, not fixed quotations. <button type="button" data-ken-disclaimer>How estimates work</button></div>`;
}

const widget=document.createElement("div");
widget.className="ken-widget";
widget.innerHTML=`<div class="ken-greeting"><strong>👋 Hi, I’m Ken</strong><span>Your plumbing assistant. Tell me the issue — I’ll give you a live estimate and help book you in.</span></div>
<button class="ken-launcher" type="button" aria-label="Ask Ken">
  <div id="ken-launcher-mascot" data-ken-mascot="mini"></div>
  <span class="ken-launcher-copy"><b>Ask Ken</b><small>Live estimate & booking</small></span><span class="ken-live-dot"></span>
</button>
<section class="ken-panel" aria-label="Ken plumbing assistant">${chatMarkup()}</section>`;
document.body.appendChild(widget);

const disclaimer=document.createElement("div");
disclaimer.className="ken-disclaimer-modal";disclaimer.hidden=true;
disclaimer.innerHTML=`<div class="ken-disclaimer-card" role="dialog" aria-modal="true" aria-label="About Ken's estimates">
<button class="ken-disclaimer-close" type="button" aria-label="Close">×</button>
<h3>About Ken’s estimates</h3>
<p><strong>Ken’s prices are estimates only and are not quotations or fixed prices.</strong> They are based on the information you provide and the likely work identified from that information.</p>
<p>The actual cost may be higher or lower following an on-site inspection. Giving Ken more accurate information will generally allow a narrower, more useful estimate.</p>
<p>Some faults — including hidden leaks, fault tracing, concealed pipework and problems where the cause cannot be established remotely — cannot reliably be priced before inspection. In these cases the range may be wider or attendance and diagnosis may be required before a repair price can be confirmed.</p>
<p>Your plumber will assess the problem on site and confirm the price before carrying out additional chargeable work. If the repair cannot reasonably be completed during the initial attendance, a quotation can be provided for the required work.</p>
<p>The £75 booking payment covers attendance and diagnosis and is deducted from the final repair price where Kensington Plumbing Services subsequently carries out the repair.</p>
</div>`;
document.body.appendChild(disclaimer);
disclaimer.addEventListener("click",e=>{if(e.target===disclaimer||e.target.closest(".ken-disclaimer-close"))disclaimer.hidden=true});

function addHomeFocus(){
  const isHome=location.pathname==="/"||/\/index\.html$/i.test(location.pathname);
  if(!isHome||document.getElementById("ken-home-focus"))return;
  const sec=document.createElement("section");sec.id="ken-home-focus";sec.className="ken-home-focus";
  sec.innerHTML=`<div class="ken-home-focus-inner">
    <div class="ken-home-copy">
      <div class="ken-home-kicker">MEET KEN · YOUR ONLINE PLUMBING ASSISTANT</div>
      <h2>Tell Ken what’s gone wrong.</h2>
      <p>Chat through the problem in your own words. Ken builds a live estimated repair range as he learns more, then helps you book a plumber online.</p>
      <form class="ken-home-form"><input placeholder="e.g. My toilet keeps filling after I flush…" maxlength="700"><button>Ask Ken →</button></form>
      <div class="ken-home-points"><span>Live estimated price</span><span>Plumbing only</span><span>3-hour booking windows</span></div>
      <button class="ken-home-smallprint" type="button" data-ken-disclaimer>* How Ken’s estimates work</button>
    </div>
    <div class="ken-home-character">
      <div class="ken-home-wave">👋 <b>Hi, I’m Ken</b><span>What’s gone wrong?</span></div>
      <div id="ken-home-mascot" data-ken-mascot="mini"></div>
    </div>
  </div>`;
  const main=document.querySelector("main");
  if(main)main.insertAdjacentElement("afterbegin",sec);else document.body.prepend(sec);
  sec.querySelector("form").addEventListener("submit",e=>{
    e.preventDefault();
    const i=sec.querySelector("input"),t=i.value.trim();
    if(!t)return;i.value="";open();send(t);
  });
}

const panel=widget.querySelector(".ken-panel"),messages=widget.querySelector(".ken-messages"),quick=widget.querySelector(".ken-quick"),input=widget.querySelector(".ken-inputbar input"),estimateBox=widget.querySelector(".ken-live-estimate"),confidenceText=widget.querySelector(".ken-confidence-line strong");

function progress(n){const v=Math.max(10,Math.min(100,Number(n)||10));widget.querySelector(".ken-progress span").style.width=v+"%";confidenceText.textContent=v<35?`Low · ${v}%`:v<70?`Building · ${v}%`:v<85?`Good · ${v}%`:`High · ${v}%`}
function add(text,role="bot",persist=true){const row=document.createElement("div");row.className=`ken-row ${role}`;row.innerHTML=role==="bot"?`<div class="ken-bot-dot">K</div><div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`:`<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;messages.appendChild(row);messages.scrollTop=messages.scrollHeight;if(persist){state.conversation.push({role:role==="user"?"user":"assistant",content:text});state.conversation=state.conversation.slice(-30);save()}}
function html(x){const w=document.createElement("div");w.innerHTML=x;while(w.firstChild)messages.appendChild(w.firstChild);messages.scrollTop=messages.scrollHeight}
function setQuick(items=[]){quick.innerHTML="";items.forEach(t=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.onclick=()=>send(t);quick.appendChild(b)})}
function typing(on){widget.querySelector("[data-typing]")?.remove();if(on){const t=document.createElement("div");t.className="ken-typing";t.dataset.typing="1";t.textContent="Ken is thinking…";messages.appendChild(t);window.KenMascot?.setMood("thinking")}else window.KenMascot?.setMood("idle")}

function open(){panel.classList.add("open");widget.querySelector(".ken-greeting")?.classList.add("hide");setTimeout(()=>input.focus(),120)}
function close(){panel.classList.remove("open")}
widget.querySelector(".ken-launcher").addEventListener("click",open);
widget.querySelector(".ken-close").addEventListener("click",close);

function inlineEstimate(e){
  html(`<div class="ken-booking-card"><div class="ken-estimate-label">YOUR CURRENT ESTIMATE*</div><div class="inline-estimate-row"><div><strong>${esc(e.jobName)}</strong><small>${esc(e.confidence||"Low")} confidence · ${esc(e.confidenceScore||0)}%</small></div><div class="inline-estimate-price">£${esc(e.min)}–£${esc(e.max)}</div></div><p>${esc(e.summary||"Based on the details supplied so far.")}</p>${e.canBook?'<button class="ken-action-btn" type="button" data-inline-book>Continue to booking</button>':''}</div>`);
  messages.querySelectorAll("[data-inline-book]").forEach(b=>b.addEventListener("click",showDetailsForm));
}
function renderEstimate(e,showInline=false){
  state.estimate=e;save();progress(e.confidenceScore||30);estimateBox.hidden=false;
  estimateBox.innerHTML=`<div class="live-estimate-top"><span>LIVE ESTIMATE*</span><strong>${esc(e.confidence||"Low")} confidence</strong></div><div class="live-estimate-main"><div><small>Likely job</small><b>${esc(e.jobName)}</b></div><div><small>Current range</small><b class="live-price">£${esc(e.min)}–£${esc(e.max)}</b></div></div><div class="confidence-meter"><span style="width:${Math.max(8,Math.min(100,e.confidenceScore||20))}%"></span></div><p>${e.provisional?"This is a broad working estimate. Keep chatting and Ken will narrow it where the information supports it.":"You can continue to booking now, or add another useful detail to refine the range."}</p>${e.canBook?'<button class="ken-action-btn" type="button" data-continue-booking>Continue to booking</button>':''}`;
  estimateBox.querySelector("[data-continue-booking]")?.addEventListener("click",showDetailsForm);
  if(showInline)inlineEstimate(e);
}
async function send(text){const message=String(text||"").trim();if(!message)return;const wasBookable=Boolean(state.estimate?.canBook);open();add(message,"user");setQuick([]);typing(true);try{const data=await api("/api/ken",{method:"POST",body:JSON.stringify({sessionId:state.sessionId,message,history:state.conversation.slice(0,-1),state:state.serverState,page:location.pathname})});typing(false);state.sessionId=data.sessionId||state.sessionId;state.serverState=data.state||state.serverState;if(data.reply)add(data.reply,"bot");if(data.quickReplies)setQuick(data.quickReplies);if(data.estimate){const showInline=Boolean(data.showEstimateNow||data.estimate.showNow||(!wasBookable&&data.estimate.canBook));renderEstimate(data.estimate,showInline)}else progress(data.progress||20);save()}catch(e){typing(false);add("I’m having trouble connecting right now. Please try again in a moment, or call 020 7371 3333.","bot")}}

function showDetailsForm(){
  if(messages.querySelector("[data-customer-details]"))return;
  add("Great. I’ll take your details first, then show you the available 3-hour appointment windows.","bot");
  html(`<div class="ken-booking-card"><div class="ken-estimate-label">YOUR DETAILS</div><form class="ken-details-form" data-customer-details><input name="name" autocomplete="name" placeholder="Your name" required><input name="phone" autocomplete="tel" placeholder="Mobile number" required><textarea name="address" autocomplete="street-address" placeholder="Full address" required></textarea><input name="postcode" autocomplete="postal-code" placeholder="Postcode" required><input name="email" type="email" autocomplete="email" placeholder="Email (optional)"><button class="ken-action-btn" type="submit">Show 3-hour appointments</button></form></div>`);
  messages.querySelector("[data-customer-details]")?.addEventListener("submit",saveDetails);
}
async function saveDetails(ev){ev.preventDefault();const form=ev.currentTarget,btn=form.querySelector("button"),v=Object.fromEntries(new FormData(form).entries());btn.disabled=true;btn.textContent="Saving details…";try{const d=await api("/api/lead",{method:"POST",body:JSON.stringify({...v,sessionId:state.sessionId,estimateId:state.estimate?.estimateId})});state.leadId=d.leadId;save();form.closest(".ken-booking-card").remove();add("Thanks. Here are the next available 3-hour appointment windows.","bot");await loadSlots()}catch(e){btn.disabled=false;btn.textContent="Show 3-hour appointments";add(e.message,"bot")}}
async function loadSlots(){try{const d=await api("/api/slots");if(!d.slots?.length){add("There are no online slots showing at the moment. Please call 020 7371 3333 and we’ll arrange the quickest visit.","bot");return}html(`<div class="ken-booking-card"><div class="ken-estimate-label">AVAILABLE 3-HOUR APPOINTMENTS</div><div class="ken-slots">${d.slots.slice(0,9).map(s=>`<button type="button" class="ken-slot" data-slot="${esc(s.slotKey)}"><strong>${esc(s.dayLabel)}</strong><small>${esc(s.timeLabel)}</small></button>`).join("")}</div><p class="slot-note">Choose a slot. We’ll hold it while you complete the £75 SumUp payment.</p></div>`);messages.querySelectorAll("[data-slot]").forEach(b=>b.addEventListener("click",()=>chooseSlot(b)))}catch(e){add(e.message,"bot")}}
async function chooseSlot(btn){const all=[...messages.querySelectorAll("[data-slot]")];all.forEach(b=>b.disabled=true);btn.textContent="Holding this slot…";try{const r=await api("/api/reserve-slot",{method:"POST",body:JSON.stringify({slotKey:btn.dataset.slot,sessionId:state.sessionId,estimateId:state.estimate?.estimateId,leadId:state.leadId})});state.reservation=r.reservation;save();add(`I’ve held ${r.reservation.displayLabel} for you. I’m taking you to SumUp now to pay the £75 attendance and diagnosis fee and confirm the booking.`,"bot");const c=await api("/api/checkout",{method:"POST",body:JSON.stringify({leadId:state.leadId,estimateId:state.estimate?.estimateId,reservationId:r.reservation.reservationId})});location.href=c.checkoutUrl}catch(e){all.forEach(b=>b.disabled=false);if(e.data?.setupRequired)add("The booking flow is ready, but SumUp still needs to be connected before I can take the £75 payment.","bot");else add(e.message,"bot")}}

widget.querySelector(".ken-send").onclick=()=>{const t=input.value.trim();if(t){input.value="";send(t)}};
input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();widget.querySelector(".ken-send").click()}});
document.addEventListener("click",e=>{if(e.target.closest("[data-ken-disclaimer]"))disclaimer.hidden=false});

function boot(){
  if(state.conversation.length)state.conversation.forEach(m=>add(m.content,m.role==="user"?"user":"bot",false));
  else add("Hi, I’m Ken. Tell me what’s gone wrong in your own words. I’ll talk it through with you and keep refining the estimated price as I learn more.","bot");
  if(state.estimate)renderEstimate(state.estimate,false);
  setQuick(["I have a leak","My toilet has a problem","I have a tap or shower problem","I have a radiator or heating problem","I have a blocked sink or drain"]);
  if(!state.estimate)progress(state.serverState?.confidenceScore||15);
}
addHomeFocus();loadMascot();boot();
})();
