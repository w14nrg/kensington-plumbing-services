
(function(){
"use strict";

const ASSETS={
  hero:"/ken-mascot-hero.png",
  front:"/ken-mascot-front.png",
  threequarter:"/ken-mascot-threequarter.png",
  side:"/ken-mascot-side.png",
  back:"/ken-mascot-back.png",
  wave:"/ken-mascot-wave.png"
};

const FRAME_MAP=[
  {a:0,src:ASSETS.front},
  {a:45,src:ASSETS.threequarter},
  {a:90,src:ASSETS.side},
  {a:180,src:ASSETS.back},
  {a:270,src:ASSETS.side},
  {a:315,src:ASSETS.threequarter},
  {a:360,src:ASSETS.front}
];

const instances=[];
let mood="idle";

function norm(a){a%=360;if(a<0)a+=360;return a}
function adjacentFrames(angle){
  const a=norm(angle);
  for(let i=0;i<FRAME_MAP.length-1;i++){
    const x=FRAME_MAP[i], y=FRAME_MAP[i+1];
    if(a>=x.a && a<=y.a){
      const t=(a-x.a)/(y.a-x.a||1);
      return [x,y,t];
    }
  }
  return [FRAME_MAP[0],FRAME_MAP[1],0];
}

function createLayer(src){
  const img=document.createElement("img");
  img.className="ken-mascot-frame";
  img.src=src;
  img.alt="";
  img.draggable=false;
  return img;
}

function createEyelids(){
  const wrap=document.createElement("div");
  wrap.className="ken-blink-overlay";
  wrap.innerHTML='<i class="ken-lid ken-lid-left"></i><i class="ken-lid ken-lid-right"></i>';
  return wrap;
}

function mount(host){
  if(!host || host.dataset.kenMascotMounted==="1")return;
  host.dataset.kenMascotMounted="1";
  const mode=host.dataset.kenMascot||(/mini|launcher/.test(host.id)?"mini":"turntable");

  const stage=document.createElement("div");
  stage.className="ken-mascot-stage";
  const layerA=createLayer(mode==="mini"?ASSETS.hero:ASSETS.front);
  const layerB=createLayer(ASSETS.threequarter);
  const wave=createLayer(ASSETS.wave);
  wave.classList.add("ken-wave-frame");
  const lids=createEyelids();
  stage.append(layerA,layerB,wave,lids);
  host.replaceChildren(stage);

  const state={
    host,stage,layerA,layerB,wave,lids,mode,
    angle:0,scale:1,panX:0,panY:0,
    dragging:false,panning:false,lastX:0,lastY:0,
    interactedAt:performance.now(),waveUntil:0
  };

  if(mode==="turntable"){
    host.classList.add("ken-mascot-interactive");
    host.addEventListener("pointerdown",e=>{
      state.dragging=true;
      state.panning=e.button===2||e.shiftKey;
      state.lastX=e.clientX;state.lastY=e.clientY;
      state.interactedAt=performance.now();
      host.setPointerCapture?.(e.pointerId);
      host.classList.add("is-dragging");
      e.preventDefault();
    });
    host.addEventListener("pointermove",e=>{
      if(!state.dragging)return;
      const dx=e.clientX-state.lastX, dy=e.clientY-state.lastY;
      state.lastX=e.clientX;state.lastY=e.clientY;
      if(state.panning){
        state.panX+=dx;state.panY+=dy;
      }else{
        state.angle=norm(state.angle+dx*.72);
      }
      state.interactedAt=performance.now();
      render(state);
      e.preventDefault();
    });
    const release=e=>{
      state.dragging=false;state.panning=false;
      host.classList.remove("is-dragging");
      try{host.releasePointerCapture?.(e.pointerId)}catch{}
    };
    host.addEventListener("pointerup",release);
    host.addEventListener("pointercancel",release);
    host.addEventListener("contextmenu",e=>e.preventDefault());
    host.addEventListener("wheel",e=>{
      state.scale=Math.max(.72,Math.min(2.15,state.scale*(e.deltaY<0?1.09:.92)));
      state.interactedAt=performance.now();
      render(state);
      e.preventDefault();
    },{passive:false});
  }

  instances.push(state);
  render(state);
}

function render(s){
  if(s.mode==="mini"){
    s.layerA.src=ASSETS.hero;
    s.layerA.style.opacity="1";
    s.layerB.style.opacity="0";
    s.stage.style.transform=`translate(calc(-50% + ${s.panX}px),calc(-50% + ${s.panY}px)) scale(${s.scale})`;
    return;
  }
  const [a,b,t]=adjacentFrames(s.angle);
  if(s.layerA.dataset.src!==a.src){s.layerA.src=a.src;s.layerA.dataset.src=a.src}
  if(s.layerB.dataset.src!==b.src){s.layerB.src=b.src;s.layerB.dataset.src=b.src}
  s.layerA.style.opacity=String(1-t);
  s.layerB.style.opacity=String(t);
  s.stage.style.transform=`translate(calc(-50% + ${s.panX}px),calc(-50% + ${s.panY}px)) scale(${s.scale})`;
}

function tick(ts){
  requestAnimationFrame(tick);
  instances.forEach(s=>{
    if(s.mode==="turntable"){
      const idle=ts-s.interactedAt>5500&&!s.dragging;
      if(idle){
        // Gentle showroom movement. User drag still controls the full turntable.
        s.angle=norm(12*Math.sin(ts/2300));
        render(s);
      }
    }

    // Wave only when the character is front-facing (or in mini mode).
    const frontish=s.mode==="mini" || norm(s.angle)<20 || norm(s.angle)>340;
    const cycle=ts%12000;
    const shouldWave=frontish && cycle>1800 && cycle<3300;
    s.wave.style.opacity=shouldWave?"1":"0";
    if(shouldWave){
      s.layerA.style.opacity="0";
      s.layerB.style.opacity="0";
    }else if(s.mode==="turntable"){
      render(s);
    }else{
      s.layerA.style.opacity="1";
    }

    // Small exact-character blink illusion: eyelids briefly cover the eyes.
    const blink=ts%4650;
    s.lids.classList.toggle("blink",frontish && blink<130);

    if(mood==="thinking")s.stage.classList.add("ken-thinking");
    else s.stage.classList.remove("ken-thinking");
    if(mood==="success")s.stage.classList.add("ken-success");
    else s.stage.classList.remove("ken-success");
  });
}

function mountAll(){
  document.querySelectorAll("[data-ken-mascot],#ken-large-3d,#ken-mini-3d,#ken-launcher-mascot,#ken-home-mascot")
    .forEach(mount);
}

window.KenMascot={
  mount:mountAll,
  setMood(v){
    mood=v||"idle";
    if(v==="success")setTimeout(()=>{if(mood==="success")mood="idle"},1400);
  }
};
// Backwards-compatible alias so the V9 conversation code can keep calling Ken3D.
window.Ken3D=window.KenMascot;

function init(){
  mountAll();
  document.addEventListener("ken-chat-ready",mountAll);
  new MutationObserver(mountAll).observe(document.body,{childList:true,subtree:true});
  document.getElementById("ken-fullscreen")?.addEventListener("click",()=>{
    document.getElementById("ken-viewer")?.requestFullscreen?.();
  });
  requestAnimationFrame(tick);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
