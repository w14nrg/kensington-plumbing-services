
(function(){
  "use strict";
  const viewer=document.getElementById("ken-viewer");
  const img=document.getElementById("ken-spin-image");
  if(!viewer||!img)return;

  const frames=[
    "/ken-angle-0.jpg",
    "/ken-angle-1.jpg",
    "/ken-angle-2.jpg",
    "/ken-angle-3.jpg",
    "/ken-angle-4.jpg",
    "/ken-angle-5.jpg"
  ];

  let frame=0,dragging=false,startX=0,startY=0,lastX=0,lastY=0,zoom=1,offsetY=0,accum=0;

  frames.forEach(src=>{const p=new Image();p.src=src});

  function render(){
    img.src=frames[frame];
    img.style.transform=`translateX(-50%) translateY(${offsetY}px) scale(${zoom})`;
  }

  viewer.addEventListener("pointerdown",e=>{
    dragging=true;startX=lastX=e.clientX;startY=lastY=e.clientY;viewer.setPointerCapture?.(e.pointerId);
  });
  viewer.addEventListener("pointermove",e=>{
    if(!dragging)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;
    lastX=e.clientX;lastY=e.clientY;
    if(Math.abs(dx)>=Math.abs(dy)){
      accum+=dx;
      if(Math.abs(accum)>22){
        frame=(frame+(accum>0?-1:1)+frames.length)%frames.length;
        accum=0;render();
      }
    }else{
      offsetY=Math.max(-80,Math.min(80,offsetY+dy*.35));render();
    }
  });
  const stop=e=>{dragging=false;accum=0};
  viewer.addEventListener("pointerup",stop);
  viewer.addEventListener("pointercancel",stop);
  viewer.addEventListener("wheel",e=>{
    e.preventDefault();
    zoom=Math.max(.72,Math.min(1.65,zoom+(e.deltaY<0?.08:-.08)));render();
  },{passive:false});

  document.getElementById("ken-fullscreen")?.addEventListener("click",()=>viewer.requestFullscreen?.());

  // subtle automatic life: gently alternate between front and 3/4 when idle
  let idleTimer=setInterval(()=>{
    if(dragging)return;
    if(frame===0){frame=1;render();setTimeout(()=>{if(!dragging){frame=0;render()}},900)}
  },9000);

  render();
})();
