(()=>{
"use strict";

const PAGE_MODE = !!document.getElementById("ken-page-app");
const state={
  sessionId:localStorage.getItem("kps_ken_session")||`session_${crypto.randomUUID()}`,
  conversation:[],
  serverState:{},
  estimate:null,
  leadId:null
};
localStorage.setItem("kps_ken_session",state.sessionId);

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const isHome=()=>location.pathname==="/"||/\/index\.html$/i.test(location.pathname);

function homeEntryMarkup(){
  return `
    <section id="ken-home-entry">
      <div class="ken-home-inner">
        <div>
          <div class="ken-home-kicker">Ask Ken · Online plumbing assistant</div>
          <h2 class="ken-home-title">What can Ken help you with?</h2>
          <p class="ken-home-sub">Describe the problem in your own words. Ken will talk it through with you, give you an estimated price range and help you book a plumber.</p>
          <form class="ken-home-form" id="ken-home-form">
            <input id="ken-home-input" type="text" autocomplete="off" placeholder="e.g. My toilet keeps filling after I flush…" aria-label="Describe your plumbing problem">
            <button type="submit">Ask Ken →</button>
          </form>
          <div class="ken-home-trust">
            <span>Real conversation</span>
            <span>Estimated repair price</span>
            <span>£75 to secure attendance & diagnosis</span>
          </div>
        </div>
        <img class="ken-home-avatar" src="/ken-avatar.png" alt="Ken, Kensington Plumbing Services online plumbing assistant">
      </div>
    </section>`;
}

function injectHomeEntry(){
  if(!isHome()||document.getElementById("ken-home-entry"))return;
  const holder=document.createElement("div");
  holder.innerHTML=homeEntryMarkup();
  const section=holder.firstElementChild;

  const header=document.querySelector("header");
  const nav=document.querySelector("nav");
  const hero=document.querySelector(".hero,.carousel,.header-carousel");
  const main=document.querySelector("main");

  if(header) header.insertAdjacentElement("afterend",section);
  else if(nav&&nav.parentElement) nav.parentElement.insertAdjacentElement("afterend",section);
  else if(hero) hero.insertAdjacentElement("beforebegin",section);
  else if(main&&main.parentElement) main.parentElement.insertBefore(section,main);
  else document.body.insertBefore(section,document.body.firstChild);

  section.querySelector("#ken-home-form")?.addEventListener("submit",e=>{
    e.preventDefault();
    const input=section.querySelector("#ken-home-input");
    const text=input.value.trim();
    if(!text){input.focus();return}
    input.value="";
    openKen();
    sendUserMessage(text);
  });
}

function popupMarkup(){
  return `
  <div class="ken-widget">
    <button class="ken-launcher" type="button" aria-expanded="false" aria-label="Ask Ken">
      <img src="/ken-avatar.png" alt="">
      <span><strong>Ask Ken</strong><small>Get help, an estimate & book</small></span>
    </button>
    <section class="ken-panel" aria-label="Chat with Ken">
      ${chatMarkup(false)}
    </section>
  </div>`;
}

function chatMarkup(full){
  return `
    <header class="ken-head">
      <img src="/ken-avatar.png" alt="Ken, Kensington Plumbing Services online plumbing assistant">
      <div class="ken-head-copy">
        <strong>Ken</strong>
        <span>Kensington Plumbing Services · estimate & booking</span>
        ${full ? "" : '<a class="ken-full-link" href="/ken.html">Open the full Ken estimator →</a>'}
      </div>
      ${full ? "" : '<button class="ken-close" type="button" aria-label="Close Ken">×</button>'}
    </header>
    <div class="ken-status"><span></span></div>
    <div class="ken-messages" aria-live="polite"></div>
    <div class="ken-mini-actions"></div>
    <div class="ken-inputbar">
      <input type="text" maxlength="700" autocomplete="off" placeholder="Type your reply…" aria-label="Message Ken">
      <button class="ken-send" type="button" aria-label="Send">➜</button>
    </div>
    <div class="ken-footnote">Ken gives an estimated range from the information you provide. Your plumber confirms the exact price on site before additional work proceeds.</div>`;
}

function fullPageMarkup(){
  return `
    <div class="ken-full-chat">
      ${chatMarkup(true)}
    </div>`;
}

function uiRoot(){
  return PAGE_MODE ? document.getElementById("ken-page-app") : document.querySelector(".ken-panel");
}
function q(sel){return uiRoot()?.querySelector(sel)}
function messages(){return q(".ken-messages")}

function addMessage(text,role="bot"){
  const box=messages();
  if(!box)return;
  const row=document.createElement("div");
  row.className=`ken-row ${role}`;
  row.innerHTML=`<div class="ken-bubble">${esc(text).replace(/\n/g,"<br>")}</div>`;
  box.appendChild(row);
  box.scrollTop=box.scrollHeight;
  state.conversation.push({role:role==="user"?"user":"assistant",content:text});
  state.conversation=state.conversation.slice(-16);
}

function addHtml(html){
  const box=messages();
  if(!box)return;
  const wrap=document.createElement("div");
  wrap.innerHTML=html;
  while(wrap.firstChild)box.appendChild(wrap.firstChild);
  box.scrollTop=box.scrollHeight;
}

function setQuickReplies(items=[]){
  const bar=q(".ken-mini-actions");
  if(!bar)return;
  bar.innerHTML="";
  items.forEach(text=>{
    const b=document.createElement("button");
    b.className="ken-mini-action";
    b.type="button";
    b.textContent=text;
    b.addEventListener("click",()=>sendUserMessage(text));
    bar.appendChild(b);
  });
}

function setProgress(value){
  const bar=q(".ken-status span");
  if(bar)bar.style.width=`${Math.max(12,Math.min(100,value||18))}%`;
}

function showTyping(){
  const box=messages();
  if(!box)return;
  const t=document.createElement("div");
  t.className="ken-typing";
  t.dataset.kenTyping="1";
  t.textContent="Ken is typing…";
  box.appendChild(t);
  box.scrollTop=box.scrollHeight;
}
function hideTyping(){q("[data-ken-typing]")?.remove()}

async function api(path,options={}){
  const r=await fetch(path,{
    ...options,
    headers:{"Content-Type":"application/json",...(options.headers||{})}
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    const error=new Error(data.error||"Something went wrong.");
    error.data=data;
    throw error;
  }
  return data;
}

function openKen(){
  if(PAGE_MODE)return;
  document.querySelector(".ken-panel")?.classList.add("open");
  document.querySelector(".ken-launcher")?.setAttribute("aria-expanded","true");
  setTimeout(()=>q(".ken-inputbar input")?.focus(),60);
}
function closeKen(){
  if(PAGE_MODE)return;
  document.querySelector(".ken-panel")?.classList.remove("open");
  document.querySelector(".ken-launcher")?.setAttribute("aria-expanded","false");
}

async function sendUserMessage(text){
  const message=String(text||"").trim();
  if(!message)return;

  addMessage(message,"user");
  setQuickReplies([]);
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

    if(data.safety) addHtml(`<div class="ken-safety">${esc(data.safety)}</div>`);
    if(data.reply) addMessage(data.reply,"bot");
    if(Array.isArray(data.quickReplies)&&data.quickReplies.length) setQuickReplies(data.quickReplies);

    if(data.estimate){
      state.estimate=data.estimate;
      showEstimate(data.estimate);
      setProgress(100);
    }
  }catch(error){
    hideTyping();
    addMessage("I’m having trouble connecting at the moment. Please try again in a moment, or call Kensington Plumbing Services on 020 7371 3333.","bot");
  }
}

function showEstimate(e){
  if(q(`[data-estimate-id="${CSS.escape(e.estimateId)}"]`))return;
  addHtml(`
    <div class="ken-estimate" data-estimate-id="${esc(e.estimateId)}">
      <div class="ken-estimate-kicker">Your estimated repair</div>
      <h3>${esc(e.jobName)}</h3>
      <div class="ken-price">£${esc(e.min)}–£${esc(e.max)}</div>
      <p>${esc(e.summary||"Based on what you’ve told Ken so far.")}</p>
      <span class="ken-confidence">Estimate confidence: ${esc(e.confidence)}</span>
      <div class="ken-pay-note">
        <strong>£75 to book your plumber.</strong><br>
        The £75 covers attendance and diagnosis. When we carry out the repair, it is deducted from the final repair price. Your plumber confirms the exact price before additional work proceeds.
      </div>
      <form class="ken-lead-form" data-ken-lead-form>
        <input name="name" autocomplete="name" placeholder="Your name" required>
        <input name="phone" autocomplete="tel" placeholder="Mobile number" required>
        <input name="email" type="email" autocomplete="email" placeholder="Email (optional)">
        <button class="ken-btn primary" type="submit">Continue — pay £75 & book</button>
        <button class="ken-btn secondary" type="button" data-ken-new>Start a new problem</button>
      </form>
    </div>`);

  q("[data-ken-lead-form]")?.addEventListener("submit",submitLead);
  q("[data-ken-new]")?.addEventListener("click",resetKen);
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
      addMessage("Your estimate is ready. Secure online payment is not connected yet, so please call 020 7371 3333 to book for now.","bot");
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
  const box=messages();
  if(box)box.innerHTML="";
  setProgress(18);
  addMessage("No problem — tell me what you need help with next.","bot");
  setQuickReplies([
    "I have a leak",
    "My toilet has a problem",
    "I have a tap or shower problem",
    "I have a radiator or heating problem",
    "I have a blocked sink or drain"
  ]);
}

function submitInput(){
  const input=q(".ken-inputbar input");
  const text=input?.value.trim();
  if(!text)return;
  input.value="";
  sendUserMessage(text);
}

function initialiseChat(){
  addMessage("Hi, I’m Ken. Tell me what’s gone wrong in your own words and I’ll help work out the likely problem, give you an estimated price range and help you book a plumber.","bot");
  setQuickReplies([
    "I have a leak",
    "My toilet has a problem",
    "I have a tap or shower problem",
    "I have a radiator or heating problem",
    "I have a blocked sink or drain"
  ]);
  setProgress(18);
}

function removeTawk(){
  document.querySelectorAll('iframe[src*="tawk.to"],iframe[src*="tawk"],.tawk-min-container,#tawkchat-container,.tawk-button-circle').forEach(el=>el.remove());
}

function init(){
  removeTawk();
  try{
    new MutationObserver(removeTawk).observe(document.documentElement,{childList:true,subtree:true});
  }catch{}

  if(PAGE_MODE){
    document.getElementById("ken-page-app").innerHTML=fullPageMarkup();
  }else{
    injectHomeEntry();
    const host=document.createElement("div");
    host.innerHTML=popupMarkup();
    document.body.appendChild(host.firstElementChild);

    document.querySelector(".ken-launcher")?.addEventListener("click",openKen);
    document.querySelector(".ken-close")?.addEventListener("click",closeKen);
  }

  q(".ken-send")?.addEventListener("click",submitInput);
  q(".ken-inputbar input")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      submitInput();
    }
  });

  initialiseChat();

  // ?q= lets another page send the customer's first problem directly to the full estimator.
  if(PAGE_MODE){
    const initial=new URLSearchParams(location.search).get("q");
    if(initial) setTimeout(()=>sendUserMessage(initial),120);
  }
}

window.KenWidget={open:openKen,close:closeKen,send:sendUserMessage,reset:resetKen};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
