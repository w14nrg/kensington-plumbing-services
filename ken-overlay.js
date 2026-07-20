(()=>{
"use strict";

const state={
  sessionId:localStorage.getItem("kps_ken_session")||`session_${crypto.randomUUID()}`,
  conversation:[],
  serverState:{},
  estimate:null,
  leadId:null
};
localStorage.setItem("kps_ken_session",state.sessionId);

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function isHome(){
  return location.pathname==="/"||/\/index\.html$/i.test(location.pathname);
}

function injectHomeEntry(){
  if(!isHome()||document.getElementById("ken-home-entry"))return;
  const section=document.createElement("section");
  section.id="ken-home-entry";
  section.innerHTML=`
    <div class="ken-home-inner">
      <div class="ken-home-copy">
        <div class="ken-home-kicker">Kensington Plumbing Services · Ask Ken</div>
        <h2 class="ken-home-title">What can Ken help you with?</h2>
        <p class="ken-home-sub">Tell Ken what’s happening in your own words. He’ll talk it through with you, give you an estimated price and help you book a plumber.</p>
        <form class="ken-home-form" id="ken-home-form">
          <input id="ken-home-input" type="text" autocomplete="off" placeholder="e.g. My toilet keeps filling after I flush…" aria-label="Describe your plumbing problem">
          <button type="submit">Ask Ken →</button>
        </form>
        <div class="ken-home-trust"><span>Local West London plumbers</span><span>£75 to book</span><span>Paid amount deducted from completed repair</span></div>
      </div>
      <img class="ken-home-avatar" src="/ken-avatar.png" alt="Ken, Kensington Plumbing Services virtual plumber">
    </div>`;
  const header=document.querySelector("header");
  const main=document.querySelector("main");
  if(header&&header.parentNode) header.insertAdjacentElement("afterend",section);
  else if(main&&main.parentNode) main.parentNode.insertBefore(section,main);
  else document.body.insertBefore(section,document.body.firstChild);

  section.querySelector("#ken-home-form").addEventListener("submit",e=>{
    e.preventDefault();
    const input=section.querySelector("#ken-home-input");
    const text=input.value.trim();
    if(!text){input.focus();return}
    input.value="";
    openKen();
    sendUserMessage(text);
  });
}

function widgetMarkup(){
  return `
  <div class="ken-widget">
    <button class="ken-launcher" type="button" aria-expanded="false">
      <img src="/ken-avatar.png" alt="">
      <span><strong>Ask Ken</strong><small>Plumbing help & live estimate</small></span>
    </button>
    <section class="ken-panel" aria-label="Chat with Ken">
      <header class="ken-head">
        <img src="/ken-avatar.png" alt="Ken, Kensington Plumbing Services virtual plumber">
        <div class="ken-head-copy"><strong>Ken</strong><span>Kensington Plumbing Services · live estimate & booking</span></div>
        <button class="ken-close" type="button" aria-label="Close Ken">×</button>
      </header>
      <div class="ken-status"><span></span></div>
      <div class="ken-messages" aria-live="polite"></div>
      <div class="ken-mini-actions"></div>
      <div class="ken-inputbar">
        <input type="text" maxlength="700" autocomplete="off" placeholder="Type your reply…" aria-label="Message Ken">
        <button class="ken-send" type="button" aria-label="Send">➜</button>
      </div>
      <div class="ken-footnote">Online estimates are based on the information you provide. Your plumber confirms the exact price on site before additional work proceeds.</div>
    </section>
  </div>`;
}

function addMessage(text,role="bot"){
  const box=document.querySelector(".ken-messages");
  if(!box)return;
  const row=document.createElement("div");
  row.className=`ken-row ${role}`;
  row.innerHTML=`<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;
  box.appendChild(row);
  box.scrollTop=box.scrollHeight;
  state.conversation.push({role:role==="user"?"user":"assistant",content:text});
  state.conversation=state.conversation.slice(-14);
}

function addHtml(html){
  const box=document.querySelector(".ken-messages");
  const wrap=document.createElement("div");
  wrap.innerHTML=html;
  while(wrap.firstChild)box.appendChild(wrap.firstChild);
  box.scrollTop=box.scrollHeight;
}

function setMiniActions(items=[]){
  const bar=document.querySelector(".ken-mini-actions");
  if(!bar)return;
  bar.innerHTML="";
  items.forEach(item=>{
    const b=document.createElement("button");
    b.className="ken-mini-action";
    b.type="button";
    b.textContent=item.label;
    b.addEventListener("click",()=>sendUserMessage(item.message||item.label));
    bar.appendChild(b);
  });
}

function setProgress(value){
  const el=document.querySelector(".ken-status span");
  if(el)el.style.width=`${Math.max(12,Math.min(100,value||18))}%`;
}

function showTyping(){
  const box=document.querySelector(".ken-messages");
  const div=document.createElement("div");
  div.className="ken-typing";
  div.dataset.kenTyping="1";
  div.textContent="Ken is typing…";
  box.appendChild(div);
  box.scrollTop=box.scrollHeight;
}
function hideTyping(){document.querySelector("[data-ken-typing]")?.remove()}

async function api(path,options={}){
  const response=await fetch(path,{
    ...options,
    headers:{"Content-Type":"application/json",...(options.headers||{})}
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error(data.error||"Something went wrong.");
    error.data=data;
    throw error;
  }
  return data;
}

function openKen(){
  document.querySelector(".ken-panel")?.classList.add("open");
  document.querySelector(".ken-launcher")?.setAttribute("aria-expanded","true");
  setTimeout(()=>document.querySelector(".ken-inputbar input")?.focus(),60);
}
function closeKen(){
  document.querySelector(".ken-panel")?.classList.remove("open");
  document.querySelector(".ken-launcher")?.setAttribute("aria-expanded","false");
}

async function sendUserMessage(text){
  const message=String(text||"").trim();
  if(!message)return;
  addMessage(message,"user");
  setMiniActions([]);
  showTyping();

  try{
    const data=await api("/api/ken",{
      method:"POST",
      body:JSON.stringify({
        sessionId:state.sessionId,
        message,
        history:state.conversation.slice(0,-1),
        state:state.serverState,
        page:location.pathname
      })
    });
    hideTyping();
    state.sessionId=data.sessionId||state.sessionId;
    localStorage.setItem("kps_ken_session",state.sessionId);
    state.serverState=data.state||state.serverState;
    setProgress(data.progress||30);

    if(data.safety){
      addHtml(`<div class="ken-safety">${esc(data.safety)}</div>`);
    }
    if(data.reply) addMessage(data.reply,"bot");

    if(Array.isArray(data.quickReplies)&&data.quickReplies.length){
      setMiniActions(data.quickReplies.map(x=>({label:x,message:x})));
    }

    if(data.estimate){
      state.estimate=data.estimate;
      showEstimate(data.estimate);
      setProgress(100);
    }
  }catch(error){
    hideTyping();
    addMessage("I’m having trouble connecting at the moment. You can still call Kensington Plumbing Services on 020 7371 3333, or try me again in a moment.","bot");
  }
}

function showEstimate(e){
  if(document.querySelector(`[data-estimate-id="${CSS.escape(e.estimateId)}"]`))return;
  addHtml(`
    <div class="ken-estimate" data-estimate-id="${esc(e.estimateId)}">
      <div class="ken-estimate-kicker">Your estimated repair</div>
      <h3>${esc(e.jobName)}</h3>
      <div class="ken-price">£${esc(e.min)}–£${esc(e.max)}</div>
      <p>${esc(e.summary||"Based on what you’ve told Ken so far.")}</p>
      <span class="ken-confidence">Estimate confidence: ${esc(e.confidence)}</span>
      <div class="ken-pay-note"><strong>£75 to book your plumber.</strong><br>The £75 covers attendance and diagnosis. When we carry out the repair, it is deducted from the final repair price. Your plumber confirms the exact price before additional work proceeds.</div>
      <form class="ken-lead-form" data-ken-lead-form>
        <input name="name" autocomplete="name" placeholder="Your name" required>
        <input name="phone" autocomplete="tel" placeholder="Mobile number" required>
        <input name="email" type="email" autocomplete="email" placeholder="Email (optional)">
        <button class="ken-btn primary" type="submit">Continue — pay £75 & book</button>
        <button class="ken-btn secondary" type="button" data-ken-new>Start a new problem</button>
      </form>
    </div>`);
  const form=document.querySelector("[data-ken-lead-form]");
  form?.addEventListener("submit",submitLead);
  document.querySelector("[data-ken-new]")?.addEventListener("click",resetKen);
}

async function submitLead(event){
  event.preventDefault();
  const form=event.currentTarget;
  const submit=form.querySelector('button[type="submit"]');
  const values=Object.fromEntries(new FormData(form).entries());
  submit.disabled=true;
  submit.textContent="Preparing secure payment…";
  try{
    const lead=await api("/api/lead",{
      method:"POST",
      body:JSON.stringify({
        ...values,
        sessionId:state.sessionId,
        estimateId:state.estimate?.estimateId,
        postcode:state.serverState?.postcode||""
      })
    });
    state.leadId=lead.leadId;
    const checkout=await api("/api/checkout",{
      method:"POST",
      body:JSON.stringify({leadId:state.leadId,estimateId:state.estimate?.estimateId})
    });
    location.href=checkout.checkoutUrl;
  }catch(error){
    submit.disabled=false;
    submit.textContent="Continue — pay £75 & book";
    if(error.data?.setupRequired){
      addMessage("Your estimate is ready. Secure SumUp payment is the next connection we’re setting up. For now, call 020 7371 3333 and I’ll keep your estimate here.","bot");
    }else{
      addMessage(error.message||"I couldn’t start the payment. Please call 020 7371 3333.","bot");
    }
  }
}

function resetKen(){
  state.conversation=[];
  state.serverState={};
  state.estimate=null;
  state.leadId=null;
  const box=document.querySelector(".ken-messages");
  if(box)box.innerHTML="";
  setMiniActions([
    {label:"I have a leak"},
    {label:"Toilet problem"},
    {label:"Tap or shower problem"},
    {label:"Heating or radiator"},
    {label:"Blocked sink or drain"}
  ]);
  setProgress(18);
  addMessage("No problem — tell me what you need help with next.","bot");
}

function submitInput(){
  const input=document.querySelector(".ken-inputbar input");
  const text=input?.value.trim();
  if(!text)return;
  input.value="";
  sendUserMessage(text);
}

function init(){
  // Remove known Tawk runtime elements if they appear.
  const killTawk=()=>{
    document.querySelectorAll('iframe[src*="tawk.to"],iframe[src*="tawk"],.tawk-min-container,#tawkchat-container').forEach(el=>el.remove());
  };
  killTawk();
  new MutationObserver(killTawk).observe(document.documentElement,{childList:true,subtree:true});

  injectHomeEntry();

  const host=document.createElement("div");
  host.innerHTML=widgetMarkup();
  document.body.appendChild(host.firstElementChild);

  document.querySelector(".ken-launcher")?.addEventListener("click",openKen);
  document.querySelector(".ken-close")?.addEventListener("click",closeKen);
  document.querySelector(".ken-send")?.addEventListener("click",submitInput);
  document.querySelector(".ken-inputbar input")?.addEventListener("keydown",e=>{if(e.key==="Enter")submitInput()});

  addMessage("Hi, I’m Ken. Tell me what’s gone wrong and I’ll help you work out the likely issue, give you an estimated price and get a plumber booked if you need one.","bot");
  setMiniActions([
    {label:"I have a leak"},
    {label:"Toilet problem"},
    {label:"Tap or shower problem"},
    {label:"Heating or radiator"},
    {label:"Blocked sink or drain"}
  ]);
}

window.KenWidget={open:openKen,close:closeKen,send:sendUserMessage,reset:resetKen};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
