
(()=>{
"use strict";

const PAGE_MODE=!!document.getElementById("ken-page-app");
const STORAGE_KEY="kps_ken_v2_state";
const defaults={sessionId:`session_${crypto.randomUUID()}`,conversation:[],serverState:{},estimate:null,reservation:null,leadId:null};
let state=defaults;
try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
  if(saved&&typeof saved==="object")state={...defaults,...saved,sessionId:saved.sessionId||defaults.sessionId};
}catch{}
const persist=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
persist();

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const isHome=()=>location.pathname==="/"||/\/index\.html$/i.test(location.pathname);

function chatMarkup(full=false){
  return `
    <header class="ken-head">
      <div class="ken-head-avatar">K</div>
      <div class="ken-head-copy">
        <strong>Ken</strong>
        <span>Plumbing assistant · Estimates · Booking</span>
        ${full?"":'<a class="ken-full-link" href="/ken.html">Open full Ken estimator →</a>'}
      </div>
      <div class="ken-online">Online</div>
      ${full?"":'<button class="ken-close" type="button" aria-label="Close">×</button>'}
    </header>
    <div class="ken-status"><span></span></div>
    <div class="ken-messages" aria-live="polite"></div>
    <div class="ken-mini-actions"></div>
    <div class="ken-inputbar">
      <input type="text" maxlength="700" autocomplete="off" placeholder="Describe your plumbing problem…">
      <button class="ken-send" type="button">➜</button>
    </div>
    <div class="ken-footnote">Ken provides an estimated range from the information supplied. The exact price is confirmed on site before additional work proceeds.</div>`;
}

function popupMarkup(){
  return `<div class="ken-widget">
    <button class="ken-launcher" type="button"><img src="/ken-avatar.png" alt=""><span><strong>Ask Ken</strong><small>Estimate & book a plumber</small></span></button>
    <section class="ken-panel">${chatMarkup(false)}</section>
  </div>`;
}

function homeEntryMarkup(){
  return `<section id="ken-home-entry"><div class="ken-home-inner"><div>
    <div class="ken-home-kicker">ASK KEN · PLUMBING ESTIMATOR</div>
    <h2 class="ken-home-title">What can Ken help you with?</h2>
    <p class="ken-home-sub">Describe the problem. Ken will talk it through, estimate the likely repair and show available appointments.</p>
    <form class="ken-home-form" id="ken-home-form"><input id="ken-home-input" placeholder="e.g. My toilet keeps filling after I flush…"><button>Ask Ken →</button></form>
    <div class="ken-home-trust"><span>Natural conversation</span><span>Live estimate</span><span>Online booking</span></div>
  </div><img class="ken-home-avatar" src="/ken-avatar.png" alt="Ken"></div></section>`;
}

function injectHomeEntry(){
  if(!isHome()||document.getElementById("ken-home-entry"))return;
  const h=document.createElement("div");h.innerHTML=homeEntryMarkup();const el=h.firstElementChild;
  const header=document.querySelector("header"),main=document.querySelector("main");
  if(header)header.insertAdjacentElement("afterend",el);else if(main&&main.parentNode)main.parentNode.insertBefore(el,main);else document.body.prepend(el);
  el.querySelector("#ken-home-form")?.addEventListener("submit",e=>{e.preventDefault();const i=el.querySelector("#ken-home-input"),t=i.value.trim();if(!t)return i.focus();i.value="";openKen();sendUserMessage(t)});
}

function root(){return PAGE_MODE?document.getElementById("ken-page-app"):document.querySelector(".ken-panel")}
function q(sel){return root()?.querySelector(sel)}
function box(){return q(".ken-messages")}

function renderMessage(text,role="bot",save=true){
  const b=box();if(!b)return;
  const row=document.createElement("div");row.className=`ken-row ${role}`;
  row.innerHTML=`<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;
  b.appendChild(row);b.scrollTop=b.scrollHeight;
  if(save){state.conversation.push({role:role==="user"?"user":"assistant",content:text});state.conversation=state.conversation.slice(-24);persist()}
  const speech=document.getElementById("ken-character-speech");
  if(speech&&role==="bot")speech.textContent=text.length>120?text.slice(0,117)+"…":text;
}

function addHtml(html){const b=box();if(!b)return;const w=document.createElement("div");w.innerHTML=html;while(w.firstChild)b.appendChild(w.firstChild);b.scrollTop=b.scrollHeight}
function setQuick(items=[]){const bar=q(".ken-mini-actions");if(!bar)return;bar.innerHTML="";items.forEach(text=>{const btn=document.createElement("button");btn.className="ken-mini-action";btn.textContent=text;btn.onclick=()=>sendUserMessage(text);bar.appendChild(btn)})}
function progress(n){const el=q(".ken-status span");if(el)el.style.width=`${Math.max(12,Math.min(100,n||18))}%`}
function typing(on){q("[data-typing]")?.remove();if(!on)return;const t=document.createElement("div");t.className="ken-typing";t.dataset.typing="1";t.textContent="Ken is typing…";box()?.appendChild(t)}
async function api(path,options={}){const r=await fetch(path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||"Something went wrong.");e.data=d;throw e}return d}
function openKen(){if(PAGE_MODE)return;document.querySelector(".ken-panel")?.classList.add("open");setTimeout(()=>q(".ken-inputbar input")?.focus(),70)}
function closeKen(){document.querySelector(".ken-panel")?.classList.remove("open")}

async function sendUserMessage(text){
  const message=String(text||"").trim();if(!message)return;
  renderMessage(message,"user");setQuick([]);typing(true);
  try{
    const d=await api("/api/ken",{method:"POST",body:JSON.stringify({sessionId:state.sessionId,message,history:state.conversation.slice(0,-1),state:state.serverState,page:location.pathname})});
    typing(false);state.sessionId=d.sessionId||state.sessionId;state.serverState=d.state||state.serverState;persist();progress(d.progress||35);
    if(d.safety)addHtml(`<div class="ken-safety">${esc(d.safety)}</div>`);
    if(d.reply)renderMessage(d.reply,"bot");
    if(d.quickReplies?.length)setQuick(d.quickReplies);
    if(d.estimate){state.estimate=d.estimate;persist();showEstimate(d.estimate);progress(78)}
  }catch(e){typing(false);renderMessage("I’m having trouble connecting right now. Please try again in a moment, or call 020 7371 3333.","bot")}
}

function showEstimate(e){
  if(q(`[data-estimate="${CSS.escape(e.estimateId)}"]`))return;
  addHtml(`<div class="ken-estimate" data-estimate="${esc(e.estimateId)}">
    <div class="ken-estimate-kicker">YOUR ESTIMATED REPAIR</div>
    <h3>${esc(e.jobName)}</h3>
    <div class="ken-price">£${esc(e.min)}–£${esc(e.max)}</div>
    <p>${esc(e.summary||"Based on what you’ve told Ken so far.")}</p>
    <span class="ken-confidence">Estimate confidence: ${esc(e.confidence)}</span>
    <div class="ken-pay-note"><strong>Ready to book?</strong><br>Choose an available appointment. We’ll hold it while you complete the £75 SumUp payment. The £75 covers attendance and diagnosis and is deducted from the final repair price when we carry out the work.</div>
    <button class="ken-btn dark" type="button" data-load-slots style="width:100%;margin-top:11px">See available appointments</button>
  </div>`);
  q("[data-load-slots]")?.addEventListener("click",loadSlots);
}

async function loadSlots(){
  const btn=q("[data-load-slots]");if(btn){btn.disabled=true;btn.textContent="Checking appointments…"}
  try{
    const d=await api("/api/slots");
    if(!d.slots?.length){renderMessage("I don’t have an online slot showing right now. Please call 020 7371 3333 and we’ll arrange the quickest available visit.","bot");return}
    addHtml(`<div class="ken-slot-wrap"><div class="ken-slot-title">Choose an available appointment</div><div class="ken-slots">${d.slots.slice(0,10).map(s=>`<button class="ken-slot" data-slot="${esc(s.slotKey)}"><strong>${esc(s.dayLabel)}</strong><small>${esc(s.timeLabel)}</small></button>`).join("")}</div></div>`);
    q(".ken-slots")?.querySelectorAll("[data-slot]").forEach(b=>b.addEventListener("click",()=>reserveSlot(b.dataset.slot)));
  }catch(e){renderMessage("I couldn’t load the appointments just now. Please try again in a moment.","bot")}
  finally{if(btn){btn.disabled=false;btn.textContent="See available appointments"}}
}

async function reserveSlot(slotKey){
  try{
    const d=await api("/api/reserve-slot",{method:"POST",body:JSON.stringify({slotKey,sessionId:state.sessionId,estimateId:state.estimate?.estimateId})});
    state.reservation=d.reservation;persist();progress(88);
    renderMessage(`Great — I’ve held ${d.reservation.displayLabel} for you for 35 minutes while you complete the booking.`,"bot");
    showLeadForm();
  }catch(e){renderMessage(e.message||"That appointment has just been taken. Choose another slot and I’ll hold it for you.","bot");loadSlots()}
}

function showLeadForm(){
  if(q("[data-ken-lead]"))return;
  addHtml(`<div class="ken-estimate"><div class="ken-estimate-kicker">CONFIRM YOUR DETAILS</div>
    <h3>${esc(state.reservation?.displayLabel||"Your appointment")}</h3>
    <form class="ken-lead-form" data-ken-lead>
      <input name="name" autocomplete="name" placeholder="Your name" required>
      <input name="phone" autocomplete="tel" placeholder="Mobile number" required>
      <input name="email" type="email" autocomplete="email" placeholder="Email (optional)">
      <button class="ken-btn primary" type="submit">Pay £75 with SumUp & confirm booking</button>
    </form></div>`);
  q("[data-ken-lead]")?.addEventListener("submit",startCheckout);
}

async function startCheckout(e){
  e.preventDefault();const form=e.currentTarget,button=form.querySelector("button"),v=Object.fromEntries(new FormData(form).entries());
  button.disabled=true;button.textContent="Preparing secure SumUp payment…";
  try{
    const lead=await api("/api/lead",{method:"POST",body:JSON.stringify({...v,sessionId:state.sessionId,estimateId:state.estimate?.estimateId,postcode:state.serverState?.postcode||"",reservationId:state.reservation?.reservationId})});
    state.leadId=lead.leadId;persist();
    const checkout=await api("/api/checkout",{method:"POST",body:JSON.stringify({leadId:state.leadId,estimateId:state.estimate?.estimateId,reservationId:state.reservation?.reservationId})});
    location.href=checkout.checkoutUrl;
  }catch(err){
    button.disabled=false;button.textContent="Pay £75 with SumUp & confirm booking";
    if(err.data?.setupRequired)renderMessage("The booking flow is ready, but the SumUp account has not been connected yet. Once connected, this button will take the £75 payment and confirm the appointment automatically.","bot");
    else renderMessage(err.message||"I couldn’t start the payment. Please call 020 7371 3333.","bot");
  }
}

function submitInput(){const i=q(".ken-inputbar input"),t=i?.value.trim();if(!t)return;i.value="";sendUserMessage(t)}
function resetKen(){state={...defaults,sessionId:`session_${crypto.randomUUID()}`};persist();if(box())box().innerHTML="";bootConversation()}

function bootConversation(){
  if(state.conversation?.length){
    state.conversation.forEach(m=>renderMessage(m.content,m.role==="user"?"user":"bot",false));
    if(state.estimate)showEstimate(state.estimate);
    if(state.reservation)showLeadForm();
  }else{
    renderMessage("Hi, I’m Ken. Tell me what’s gone wrong in your own words and I’ll help work out the likely problem, give you an estimated price range and help you book a plumber.","bot");
    setQuick(["I have a leak","My toilet has a problem","I have a tap or shower problem","I have a radiator or heating problem","I have a blocked sink or drain"]);
  }
}

function removeTawk(){document.querySelectorAll('iframe[src*="tawk.to"],iframe[src*="tawk"],.tawk-min-container,#tawkchat-container,.tawk-button-circle').forEach(el=>el.remove())}

function init(){
  removeTawk();try{new MutationObserver(removeTawk).observe(document.documentElement,{childList:true,subtree:true})}catch{}
  if(PAGE_MODE){
    document.getElementById("ken-page-app").innerHTML=chatMarkup(true);
  }else{
    injectHomeEntry();const h=document.createElement("div");h.innerHTML=popupMarkup();document.body.appendChild(h.firstElementChild);
    document.querySelector(".ken-launcher")?.addEventListener("click",openKen);document.querySelector(".ken-close")?.addEventListener("click",closeKen);
  }
  q(".ken-send")?.addEventListener("click",submitInput);q(".ken-inputbar input")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitInput()}});
  document.querySelectorAll("[data-ken-prompt]").forEach(b=>b.addEventListener("click",()=>{q(".ken-inputbar input")?.scrollIntoView({behavior:"smooth",block:"center"});sendUserMessage(b.dataset.kenPrompt)}));
  bootConversation();
  const initial=new URLSearchParams(location.search).get("q");if(initial&&!state.conversation.some(m=>m.role==="user"))setTimeout(()=>sendUserMessage(initial),150);
}
window.KenWidget={open:openKen,close:closeKen,send:sendUserMessage,reset:resetKen};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
