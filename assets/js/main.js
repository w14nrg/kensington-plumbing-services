const menuBtn=document.querySelector('.menu-btn');
const nav=document.querySelector('.desktop-nav');
if(menuBtn&&nav){menuBtn.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',open?'true':'false');menuBtn.textContent=open?'×':'☰';});}
document.querySelectorAll('.faq-q').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.faq-item').classList.toggle('open')));
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const quoteForm=document.querySelector('#quote-form');
if(quoteForm){quoteForm.addEventListener('submit',e=>{e.preventDefault();const d=new FormData(quoteForm);const parts=[`Hi Kensington Plumbing Services,`,`Name: ${d.get('name')||''}`,`Area/postcode: ${d.get('area')||''}`,`Job: ${d.get('service')||''}`,`Details: ${d.get('message')||''}`];window.open('https://wa.me/442073713333?text='+encodeURIComponent(parts.join('\n')),'_blank','noopener');});}

// Tawk.to has been retired. Remove its old consent controls and stored preference.
document.addEventListener('DOMContentLoaded',()=>{
  try{localStorage.removeItem('kps_tawk_consent_v1');}catch{}
  document.querySelectorAll('[data-chat-settings],[data-chat-consent]').forEach(el=>el.remove());
});

// Keep the Ken launcher above the fixed Call / WhatsApp bar on mobile.
const kenMobileClearance=document.createElement('style');
kenMobileClearance.textContent='@media(max-width:650px){.ken-widget{bottom:64px!important}}';
document.head.appendChild(kenMobileClearance);

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
