document.addEventListener("DOMContentLoaded",()=>{
  const menu=document.querySelector("[data-menu]"),links=document.querySelector(".nav-links");
  if(menu&&links)menu.addEventListener("click",()=>links.classList.toggle("open"));
  document.querySelectorAll("[data-open-ken]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();window.KenWidget?.open()}));
  document.querySelectorAll("[data-year]").forEach(el=>el.textContent=new Date().getFullYear());
});
