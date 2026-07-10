
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
