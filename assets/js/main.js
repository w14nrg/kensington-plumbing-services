const menuBtn=document.querySelector('.menu-btn');
const nav=document.querySelector('.desktop-nav');
if(menuBtn&&nav){menuBtn.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',open?'true':'false');menuBtn.textContent=open?'×':'☰';});}
document.querySelectorAll('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.faq-item').classList.toggle('open')));
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const quoteForm=document.querySelector('#quote-form');
if(quoteForm){quoteForm.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(quoteForm);const parts=[`Hi Kensington Plumbing Services,`,`Name: ${d.get('name')||''}`,`Area/postcode: ${d.get('area')||''}`,`Job: ${d.get('service')||''}`,`Details: ${d.get('message')||''}`];window.open('https://wa.me/442073713333?text='+encodeURIComponent(parts.join('\n')),'_blank','noopener');});}


// Tawk.to live chat is loaded only after the visitor allows it.
const KPS_CHAT_KEY='kps_tawk_consent_v1';
function loadKpsTawk(){
  if(window.__kpsTawkLoaded) return;
  window.__kpsTawkLoaded=true;
  window.Tawk_API=window.Tawk_API||{};
  window.Tawk_LoadStart=new Date();
  const s=document.createElement('script');
  s.async=true;s.src='https://embed.tawk.to/6a50f3f3634c491d47a3b90f/1jt63hs8i';s.charset='UTF-8';s.setAttribute('crossorigin','*');
  document.head.appendChild(s);
}
function showKpsChatChoice(){const b=document.querySelector('[data-chat-consent]');if(b)b.hidden=false;}
function hideKpsChatChoice(){const b=document.querySelector('[data-chat-consent]');if(b)b.hidden=true;}
document.addEventListener('DOMContentLoaded',()=>{
  const choice=localStorage.getItem(KPS_CHAT_KEY);
  if(choice==='allow') loadKpsTawk(); else if(choice!=='decline') showKpsChatChoice();
  document.querySelectorAll('[data-chat-allow]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(KPS_CHAT_KEY,'allow');hideKpsChatChoice();loadKpsTawk();}));
  document.querySelectorAll('[data-chat-decline]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(KPS_CHAT_KEY,'decline');hideKpsChatChoice();}));
  document.querySelectorAll('[data-chat-settings]').forEach(b=>b.addEventListener('click',()=>{localStorage.removeItem(KPS_CHAT_KEY);showKpsChatChoice();}));
});

// Let a visitor clear Ken's current conversation and immediately begin a fresh one.
(function addKenStartNewChat(){
  if(document.getElementById('ken-page-app')) return;

  const KEN_STORAGE_KEY='kps_ken_final_live_v10';
  const RESTART_FLAG='kps_ken_restart_pending';
  let reopened=false;

  function mount(){
    const head=document.querySelector('.ken-head');
    if(!head) return false;

    if(!head.querySelector('.ken-restart')){
      const button=document.createElement('button');
      button.className='ken-restart';
      button.type='button';
      button.textContent='Start new chat';
      button.setAttribute('aria-label','Clear this chat and start a new one');
      button.title='Clear this chat and start again';
      button.style.cssText='border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;border-radius:999px;padding:6px 8px;font:800 9px/1 Inter,Arial,sans-serif;cursor:pointer;white-space:nowrap';
      button.addEventListener('click',()=>{
        try{sessionStorage.setItem(RESTART_FLAG,'1');}catch{}
        try{localStorage.removeItem(KEN_STORAGE_KEY);}catch{}
        window.location.reload();
      });

      const online=head.querySelector('.ken-online');
      const close=head.querySelector('.ken-close');
      head.insertBefore(button,online||close||null);
    }

    if(!reopened){
      let shouldReopen=false;
      try{
        shouldReopen=sessionStorage.getItem(RESTART_FLAG)==='1';
        if(shouldReopen) sessionStorage.removeItem(RESTART_FLAG);
      }catch{}
      if(shouldReopen){
        reopened=true;
        requestAnimationFrame(()=>document.querySelector('.ken-launcher')?.click());
      }
    }

    return true;
  }

  if(!mount()){
    const observer=new MutationObserver(()=>{
      if(mount()) observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }
})();
