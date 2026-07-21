
(function(){
"use strict";
if(document.getElementById("ken-page-app"))return;

const STORAGE="kps_ken_final_live_v10";
let state={sessionId:`session_${Date.now()}_${Math.random().toString(36).slice(2)}`,conversation:[],serverState:{},estimate:null,leadId:null,reservation:null};
try{const s=JSON.parse(localStorage.getItem(STORAGE)||"null");if(s)state={...state,...s}}catch{}
const save=()=>localStorage.setItem(STORAGE,JSON.stringify(state));
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json",...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(d.error||"Something went wrong.");e.data=d;throw e}return d}

function loadScript(src){
  return new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src="${src}"]`))return resolve();
    const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}
async function load3D(){
  try{
    if(!window.THREE)await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js");
    if(!window.THREE?.OrbitControls)await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js");
    if(!document.querySelector('script[src="/ken-v8-3d.js"]'))await loadScript("/ken-v8-3d.js");
  }catch(e){console.warn("Ken 3D could not load",e)}
}

const widget=document.createElement("div");
widget.className="ken-widget";
widget.innerHTML=`<div class="ken-greeting"><strong>👋 Hi, I’m Ken</strong><span>Your plumbing assistant. Tell me what’s gone wrong, get a live estimate and book online. <b>Book with Ken & save £10 on your first visit & diagnosis.</b></span><div class="ken-greeting-price"><del>£85</del><strong>£75</strong></div></div>
<button class="ken-launcher" type="button" aria-label="Ask Ken">
<div id="ken-mini-3d"></div>
<span class="ken-launcher-copy"><b>Ask Ken</b><small>Live estimate & booking</small></span><span class="ken-live-dot"></span></button>
<section class="ken-panel" aria-label="Ken plumbing assistant">
<header class="ken-head"><div class="ken-head-copy"><strong>Ken</strong><span>Plumbing assistant · Estimates · Booking</span><a href="/ken">Open Ken’s full page →</a></div><div class="ken-online">Online</div><button class="ken-close" type="button">×</button></header>
<div class="ken-progress"><span></span></div><div class="ken-confidence-line"><span>Estimate confidence</span><strong>Tell Ken what’s happening</strong></div>
<div class="ken-live-estimate" hidden></div><div class="ken-messages" aria-live="polite"></div><div class="ken-quick"></div>
<div class="ken-inputbar"><input maxlength="700" autocomplete="off" placeholder="Describe your plumbing problem…"><button class="ken-send" type="button">➜</button></div>
<div class="ken-footnote">* Estimates are not fixed quotations. <button type="button" data-ken-disclaimer>How estimates work</button><span class="ken-foot-direct"> · <a href="tel:+442073713333">Call</a> · <a href="https://wa.me/442073713333?text=Hi%20Kensington%20Plumbing%20Services%2C%20I%20need%20help%20with%20a%20plumbing%20job.">WhatsApp</a></span></div></section>`;
document.body.appendChild(widget);

const disclaimer=document.createElement("div");disclaimer.className="ken-disclaimer-modal";disclaimer.hidden=true;
disclaimer.innerHTML=`<div class="ken-disclaimer-card"><button class="ken-disclaimer-close" type="button">×</button><h3>About Ken’s estimates</h3>
<p><strong>Ken’s prices are estimates only, not quotations or fixed prices.</strong> They are based on the information you provide and the likely work identified from it.</p>
<p>The actual cost may be higher or lower after an on-site inspection. Giving Ken more useful information will generally allow a narrower range.</p>
<p>Hidden or unidentified leaks and other diagnosis-first faults cannot responsibly be given an eventual repair price before the cause is found. In these cases Ken shows the £75 attendance and diagnosis instead.</p>
<p>Larger or project-type work may show only a broad budget guide and will require a full quotation after assessment.</p>
<p>Your plumber will confirm the price before additional chargeable work. If the repair cannot reasonably be completed during the initial attendance, a full quotation can be provided.</p>
<p>The £75 booking payment covers attendance and diagnosis and is deducted from the final repair price where Kensington Plumbing Services subsequently carries out the repair.</p></div>`;
document.body.appendChild(disclaimer);

const panel=widget.querySelector(".ken-panel"),messages=widget.querySelector(".ken-messages"),quick=widget.querySelector(".ken-quick"),input=widget.querySelector(".ken-inputbar input"),estimateBox=widget.querySelector(".ken-live-estimate"),confidenceText=widget.querySelector(".ken-confidence-line strong");

function progress(n){const v=Math.max(10,Math.min(100,Number(n)||10));widget.querySelector(".ken-progress span").style.width=v+"%";confidenceText.textContent=v<35?`Low · ${v}%`:v<70?`Building · ${v}%`:v<85?`Good · ${v}%`:`High · ${v}%`}
function add(text,role="bot",persist=true){const row=document.createElement("div");row.className=`ken-row ${role}`;row.innerHTML=role==="bot"?`<div class="ken-bot-dot">K</div><div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`:`<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;messages.appendChild(row);messages.scrollTop=messages.scrollHeight;if(persist){state.conversation.push({role:role==="user"?"user":"assistant",content:text});state.conversation=state.conversation.slice(-30);save()}}
function setQuick(items=[]){quick.innerHTML="";items.forEach(t=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.onclick=()=>send(t);quick.appendChild(b)})}
function typing(on){widget.querySelector("[data-typing]")?.remove();if(on){const t=document.createElement("div");t.className="ken-typing";t.dataset.typing="1";t.textContent="Ken is thinking…";messages.appendChild(t);window.Ken3D?.setMood("thinking")}else window.Ken3D?.setMood("idle")}
function clearEstimateForNewIssue(){state.estimate=null;state.leadId=null;state.reservation=null;estimateBox.hidden=true;estimateBox.innerHTML="";progress(15);messages.querySelectorAll(".ken-booking-card").forEach(x=>x.remove())}

function bookingChoiceHtml(){
  return `<div class="ken-popup-offer"><span><del>£85</del><strong>£75</strong></span><p><b>Book with Ken & save £10</b><small>First visit & diagnosis</small></p></div>
  <div class="ken-direct-choice">Or book directly: <a href="tel:+442073713333">Call</a> · <a href="https://wa.me/442073713333?text=Hi%20Kensington%20Plumbing%20Services%2C%20I%20need%20help%20with%20a%20plumbing%20job.">WhatsApp</a></div>`;
}
function renderEstimate(e){
  state.estimate=e;save();progress(e.confidenceScore||30);estimateBox.hidden=false;
  if(e.mode==="diagnosis"){
    estimateBox.innerHTML=`<div class="live-estimate-top"><span>DIAGNOSIS REQUIRED*</span><strong>${esc(e.confidence||"Building")}</strong></div><div class="live-estimate-main"><div><small>Likely attendance</small><b>${esc(e.jobName)}</b></div><div><small>Attendance & diagnosis</small><b class="live-price">£75</b></div></div><div class="confidence-meter"><span style="width:${Math.max(8,Math.min(100,e.confidenceScore||20))}%"></span></div><p>${esc(e.summary||"The eventual repair price will be confirmed once the cause is identified.")}</p>${bookingChoiceHtml()}${bookingChoiceHtml()}${bookingChoiceHtml()}<button class="ken-action-btn" type="button" data-book>Continue to booking</button>`;
  }else if(e.mode==="budget"){
    estimateBox.innerHTML=`<div class="live-estimate-top"><span>BUDGET GUIDE*</span><strong>Site quote required</strong></div><div class="live-estimate-main"><div><small>Likely work</small><b>${esc(e.jobName)}</b></div><div><small>Broad guide</small><b class="live-price">£${esc(e.min)}–£${esc(e.max)}</b></div></div><div class="confidence-meter"><span style="width:${Math.max(8,Math.min(72,e.confidenceScore||20))}%"></span></div><p>Larger/project work needs an on-site assessment before a full quotation is confirmed.</p>${bookingChoiceHtml()}${bookingChoiceHtml()}${bookingChoiceHtml()}<button class="ken-action-btn" type="button" data-book>Continue to booking</button>`;
  }else{
    estimateBox.innerHTML=`<div class="live-estimate-top"><span>LIVE ESTIMATE*</span><strong>${esc(e.confidence||"Low")} confidence</strong></div><div class="live-estimate-main"><div><small>Likely job</small><b>${esc(e.jobName)}</b></div><div><small>Current range</small><b class="live-price">£${esc(e.min)}–£${esc(e.max)}</b></div></div><div class="confidence-meter"><span style="width:${Math.max(8,Math.min(100,e.confidenceScore||20))}%"></span></div><p>Book now, or keep chatting. Useful extra information can narrow the range where it genuinely helps.</p>${bookingChoiceHtml()}${bookingChoiceHtml()}${bookingChoiceHtml()}<button class="ken-action-btn" type="button" data-book>Continue to booking</button>`;
  }
  estimateBox.querySelector("[data-book]")?.addEventListener("click",()=>location.href="/ken");
}
function open(){panel.classList.add("open");widget.querySelector(".ken-greeting").classList.add("hide");setTimeout(()=>input.focus(),100)}
function close(){panel.classList.remove("open")}
async function send(text){const message=String(text||"").trim();if(!message)return;open();add(message,"user");setQuick([]);typing(true);try{const data=await api("/api/ken",{method:"POST",body:JSON.stringify({sessionId:state.sessionId,message,history:state.conversation.slice(0,-1),state:state.serverState,page:location.pathname})});typing(false);if(data.resetIssue)clearEstimateForNewIssue();state.sessionId=data.sessionId||state.sessionId;state.serverState=data.state||state.serverState;if(data.reply)add(data.reply,"bot");if(data.quickReplies)setQuick(data.quickReplies);if(data.estimate)renderEstimate(data.estimate);else if(!data.topicLocked)progress(data.progress||20);save()}catch(e){typing(false);add("I’m having trouble connecting right now. Please try again in a moment, or call 020 7371 3333.","bot")}}

widget.querySelector(".ken-launcher").addEventListener("click",open);widget.querySelector(".ken-close").addEventListener("click",close);
widget.querySelector(".ken-send").addEventListener("click",()=>{const t=input.value.trim();if(t){input.value="";send(t)}});input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();widget.querySelector(".ken-send").click()}});
disclaimer.addEventListener("click",e=>{if(e.target===disclaimer||e.target.closest(".ken-disclaimer-close"))disclaimer.hidden=true});document.addEventListener("click",e=>{if(e.target.closest("[data-ken-disclaimer]"))disclaimer.hidden=false});

if(state.conversation.length)state.conversation.forEach(m=>add(m.content,m.role==="user"?"user":"bot",false));
else add("Hi, I’m Ken. Tell me what’s gone wrong with your plumbing. I’ll ask a couple of useful questions, build a live estimate where possible, and help you book in.","bot");
if(state.estimate)renderEstimate(state.estimate);else progress(state.serverState?.confidenceScore||15);
setQuick(["I have a leak","My toilet has a problem","I have a tap or shower problem","I have a radiator or heating problem","I have a blocked sink or drain"]);
load3D();
})();
