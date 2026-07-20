
(function(){
"use strict";
if(!window.THREE)return;
const T=window.THREE;
const C={skin:0xc98761,skin2:0xb97654,hair:0x241811,beard:0x3a251b,navy:0x0d3146,navy2:0x071e2b,shirt:0x163f57,denim:0x102f43,brown:0x5d3823,boot:0x6b4428,white:0xf6f4ef,copper:0xb86f36,steel:0x98a7a9,dark:0x132028,teeth:0xfdfdf8};
function m(c,r=.65,met=.03){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:met})}
function mesh(g,mat){const x=new T.Mesh(g,mat);x.castShadow=true;x.receiveShadow=true;return x}
function cyl(r1,r2,h,c){return mesh(new T.CylinderGeometry(r1,r2,h,24),m(c))}
function sph(r,c,sx=1,sy=1,sz=1){const x=mesh(new T.SphereGeometry(r,32,20),m(c));x.scale.set(sx,sy,sz);return x}
function box(x,y,z,c){return mesh(new T.BoxGeometry(x,y,z),m(c))}
function torus(r,t,c){return mesh(new T.TorusGeometry(r,t,10,30),m(c,.45,.08))}
function limb(radius,length,color){
  const g=new T.Group();
  const body=cyl(radius*.92,radius,length,color);body.position.y=-length/2;g.add(body);
  const cap1=sph(radius,color);cap1.position.y=0;g.add(cap1);
  const cap2=sph(radius*.92,color);cap2.position.y=-length;g.add(cap2);
  return g;
}
function makeWrench(){
  const g=new T.Group();const handle=cyl(.035,.045,.62,C.steel);handle.rotation.z=Math.PI/2;handle.position.x=.29;g.add(handle);
  const jaw=torus(.11,.035,C.steel);jaw.rotation.y=Math.PI/2;jaw.position.x=.61;g.add(jaw);g.rotation.z=.28;return g;
}
function makeKen(){
  const root=new T.Group();

  // legs, trousers, boots
  const leftLeg=cyl(.16,.19,.92,C.denim);leftLeg.position.set(-.20,.72,0);root.add(leftLeg);
  const rightLeg=cyl(.16,.19,.92,C.denim);rightLeg.position.set(.20,.72,0);root.add(rightLeg);
  const lb=box(.36,.20,.52,C.boot);lb.position.set(-.20,.18,.08);root.add(lb);
  const rb=box(.36,.20,.52,C.boot);rb.position.set(.20,.18,.08);root.add(rb);

  // torso shaped using lathe
  const points=[new T.Vector2(.30,0),new T.Vector2(.36,.12),new T.Vector2(.40,.45),new T.Vector2(.48,.72),new T.Vector2(.45,.94)];
  const torso=mesh(new T.LatheGeometry(points,36),m(C.shirt,.6,.02));torso.position.y=1.18;root.add(torso);

  // collar
  const collarL=box(.24,.09,.05,C.white);collarL.position.set(-.12,2.05,.31);collarL.rotation.z=-.28;root.add(collarL);
  const collarR=box(.24,.09,.05,C.white);collarR.position.set(.12,2.05,.31);collarR.rotation.z=.28;root.add(collarR);

  // KPS chest patch
  const patch=box(.28,.10,.025,C.white);patch.position.set(.14,1.77,.405);root.add(patch);
  const patchInk=box(.20,.018,.03,C.navy);patchInk.position.set(.14,1.77,.425);root.add(patchInk);

  // belt and pouches
  const belt=box(.83,.12,.12,C.brown);belt.position.set(0,1.23,.32);root.add(belt);
  const buckle=box(.16,.12,.035,0xb58a48);buckle.position.set(0,1.23,.40);root.add(buckle);
  [-.42,.42].forEach(x=>{const pouch=box(.21,.27,.13,C.brown);pouch.position.set(x,1.11,.26);root.add(pouch)});
  // tools sticking from belt
  [-.50,.50].forEach((x,i)=>{const tool=cyl(.022,.022,.28,i?0xd96532:0x487a9a);tool.position.set(x,1.34,.29);tool.rotation.z=(i?-.18:.18);root.add(tool)});

  // neck/head
  const neck=cyl(.13,.15,.22,C.skin2);neck.position.y=2.14;root.add(neck);
  const head=sph(.32,C.skin,1,.98,.88);head.position.y=2.46;root.add(head);

  // ears
  const le=sph(.065,C.skin,.72,1.15,.55);le.position.set(-.31,2.47,0);root.add(le);
  const re=sph(.065,C.skin,.72,1.15,.55);re.position.set(.31,2.47,0);root.add(re);

  // hair - several rounded tufts
  for(let i=0;i<7;i++){
    const a=(i-3)*.12;
    const h=sph(.13,C.hair,1.15,.7,.9);
    h.position.set(a,2.72+.03*Math.cos(i),.02+.03*Math.sin(i));h.rotation.z=(i-3)*.09;root.add(h);
  }
  const backHair=sph(.29,C.hair,1.03,.46,.92);backHair.position.set(0,2.66,-.05);root.add(backHair);

  // beard/jaw styling
  const beard=sph(.305,C.beard,.98,.58,.91);beard.position.set(0,2.34,-.005);root.add(beard);
  const faceMask=sph(.285,C.skin,.98,.66,.89);faceMask.position.set(0,2.49,.025);root.add(faceMask);

  // eyes
  const eyes=[];
  [-.105,.105].forEach(x=>{
    const eye=sph(.043,C.white,1,.75,.55);eye.position.set(x,2.51,.276);root.add(eye);
    const pupil=sph(.020,C.dark,1,1,.6);pupil.position.set(x,2.51,.307);root.add(pupil);eyes.push(eye,pupil);
    const brow=box(.105,.018,.018,C.hair);brow.position.set(x,2.58,.295);brow.rotation.z=x<0?.08:-.08;root.add(brow);
  });

  // nose
  const nose=sph(.044,C.skin2,.72,1.15,.86);nose.position.set(0,2.44,.305);root.add(nose);

  // smile + teeth
  const mouth=torus(.095,.013,C.dark);mouth.position.set(0,2.35,.294);mouth.rotation.z=Math.PI;mouth.scale.y=.55;root.add(mouth);
  const teeth=box(.13,.025,.015,C.teeth);teeth.position.set(0,2.37,.311);root.add(teeth);

  // arms, pivots
  const leftShoulder=new T.Group();leftShoulder.position.set(-.45,1.92,0);root.add(leftShoulder);
  const rightShoulder=new T.Group();rightShoulder.position.set(.45,1.92,0);root.add(rightShoulder);
  const leftUpper=limb(.115,.55,C.shirt);leftShoulder.add(leftUpper);
  const rightUpper=limb(.115,.55,C.shirt);rightShoulder.add(rightUpper);
  const leftElbow=new T.Group();leftElbow.position.y=-.55;leftShoulder.add(leftElbow);
  const rightElbow=new T.Group();rightElbow.position.y=-.55;rightShoulder.add(rightElbow);
  const leftFore=limb(.10,.47,C.skin);leftElbow.add(leftFore);
  const rightFore=limb(.10,.47,C.skin);rightElbow.add(rightFore);
  const lh=sph(.115,C.skin);lh.position.y=-.49;leftElbow.add(lh);
  const rh=sph(.115,C.skin);rh.position.y=-.49;rightElbow.add(rh);

  // relaxed pose
  leftShoulder.rotation.z=-.10;rightShoulder.rotation.z=.10;
  leftShoulder.rotation.x=-.08;rightShoulder.rotation.x=-.04;

  // wrench in right hand
  const wrench=makeWrench();wrench.position.set(.01,-.50,.03);wrench.scale.setScalar(.78);rightElbow.add(wrench);

  root.userData={leftShoulder,rightShoulder,leftElbow,rightElbow,eyes,mouth,teeth,wrench,torso};
  root.scale.setScalar(1.34);
  return root;
}
function makeStage(){
  const g=new T.Group();
  const base=mesh(new T.CylinderGeometry(1.42,1.52,.12,64),m(0x173d45,.58,.18));base.position.y=.04;g.add(base);
  const ring=torus(1.20,.025,C.copper);ring.rotation.x=Math.PI/2;ring.position.y=.12;g.add(ring);
  const ring2=torus(1.34,.010,0x5c8b91);ring2.rotation.x=Math.PI/2;ring2.position.y=.10;g.add(ring2);
  return g;
}
function makeBathroomHints(){
  const g=new T.Group();
  // low-detail fixtures, purely environmental
  const toilet=new T.Group();
  const bowl=sph(.33,0xe9ece8,1,.55,1.05);bowl.position.y=.34;toilet.add(bowl);
  const tank=box(.55,.58,.28,0xe9ece8);tank.position.set(0,.74,-.18);toilet.add(tank);
  toilet.position.set(-1.75,0,-.85);toilet.scale.setScalar(.8);g.add(toilet);

  const rad=new T.Group();for(let i=0;i<7;i++){const p=box(.09,.76,.12,0xdfe5e2);p.position.set((i-3)*.11,.52,0);rad.add(p)}rad.position.set(1.78,0,-.95);g.add(rad);
  return g;
}
function setup(host,mini=false){
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(mini?24:32,1,.1,100);
  if(mini){
    camera.position.set(0,2.44,2.10);
    camera.lookAt(0,2.42,0);
  }else{
    camera.position.set(0,1.62,4.05);
  }
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;host.appendChild(renderer.domElement);

  scene.add(new T.HemisphereLight(0xffffff,0x1f363a,2.0));
  const key=new T.DirectionalLight(0xfff4e7,3.0);key.position.set(3.5,5,4);key.castShadow=true;scene.add(key);
  const fill=new T.DirectionalLight(0x87c8dd,1.15);fill.position.set(-4,2.4,2);scene.add(fill);
  const rim=new T.DirectionalLight(0xffb06f,.8);rim.position.set(0,3,-4);scene.add(rim);

  const ken=makeKen();
  if(mini){
    ken.scale.multiplyScalar(1.22);
    ken.position.y=-.06;
  }
  scene.add(ken);
  if(!mini){scene.add(makeStage());scene.add(makeBathroomHints())}

  let controls=null,lastInteract=0;
  if(!mini&&T.OrbitControls){
    controls=new T.OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.07;controls.target.set(0,1.52,0);
    controls.minDistance=2.15;controls.maxDistance=6.3;controls.enablePan=true;controls.autoRotate=true;controls.autoRotateSpeed=.45;
    const stop=()=>{lastInteract=performance.now();controls.autoRotate=false};
    controls.addEventListener("start",stop);
    renderer.domElement.addEventListener("wheel",stop,{passive:true});
  }

  function resize(){
    const r=host.getBoundingClientRect();renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);camera.aspect=Math.max(1,r.width)/Math.max(1,r.height);camera.updateProjectionMatrix()
  }
  resize();addEventListener("resize",resize);
  return{scene,camera,renderer,controls,ken,lastInteract,resize};
}

let large=null,mini=null,mood="idle";
function mountMini(){
  if(mini)return;
  const mh=document.getElementById("ken-mini-3d");
  if(mh)mini=setup(mh,true);
}
function init(){
  const lh=document.getElementById("ken-large-3d");
  if(lh&&!large)large=setup(lh,false);
  mountMini();
  document.addEventListener("ken-chat-ready",mountMini);
  const observer=new MutationObserver(()=>mountMini());
  observer.observe(document.body,{childList:true,subtree:true});
  document.getElementById("ken-fullscreen")?.addEventListener("click",()=>document.getElementById("ken-viewer")?.requestFullscreen?.());
  requestAnimationFrame(tick);
}
function animate(model,time,miniMode=false){
  if(!model)return;
  const u=model.userData;
  const breathe=Math.sin(time*.002)*.008;
  model.position.y=breathe;
  if(miniMode)model.rotation.y=.08*Math.sin(time*.0007);

  // blinking
  const blinkPhase=time%4200;
  const blink=blinkPhase<110?Math.max(.05,blinkPhase/55):1;
  u.eyes.forEach((e,i)=>{if(i%2===0)e.scale.y=.75*blink});

  // subtle friendly smile pulse
  const smile=1+.05*Math.sin(time*.0012);
  u.mouth.scale.x=smile;u.teeth.scale.x=smile;

  // reset toward relaxed pose
  u.leftShoulder.rotation.z+=(-.10-u.leftShoulder.rotation.z)*.06;
  u.rightShoulder.rotation.z+=(.10-u.rightShoulder.rotation.z)*.06;
  u.leftShoulder.rotation.x+=(-.08-u.leftShoulder.rotation.x)*.06;
  u.rightShoulder.rotation.x+=(-.04-u.rightShoulder.rotation.x)*.06;
  u.leftElbow.rotation.z+=(0-u.leftElbow.rotation.z)*.07;
  u.rightElbow.rotation.z+=(0-u.rightElbow.rotation.z)*.07;

  // automatic wave every ~12s
  const cycle=time%24000;
  if(cycle>5500&&cycle<7600){
    const p=(cycle-5500)/2100;
    const lift=Math.sin(Math.min(1,p)*Math.PI);
    u.leftShoulder.rotation.z=-.10-1.35*lift;
    u.leftElbow.rotation.z=-.4-.35*Math.sin(p*Math.PI*6);
  }
  // automatic wrench lift
  if(cycle>14500&&cycle<16600){
    const p=(cycle-14500)/2100;
    const lift=Math.sin(Math.min(1,p)*Math.PI);
    u.rightShoulder.rotation.z=.10+1.0*lift;
    u.rightElbow.rotation.z=-.65*lift;
  }
  // thinking mood from chat
  if(mood==="thinking"){
    u.leftElbow.rotation.z=-.75;
    u.leftShoulder.rotation.z=-.72;
    model.rotation.y=.05*Math.sin(time*.006);
  }
  if(mood==="success"){
    u.leftShoulder.rotation.z=-.85;
    u.rightShoulder.rotation.z=.85;
  }
}
function tick(time){
  requestAnimationFrame(tick);
  if(large){
    if(large.controls&&!large.controls.autoRotate&&performance.now()-large.lastInteract>7000)large.controls.autoRotate=true;
    large.controls?.update();animate(large.ken,time,false);large.renderer.render(large.scene,large.camera)
  }
  if(mini){animate(mini.ken,time,true);mini.renderer.render(mini.scene,mini.camera)}
}
window.Ken3D={setMood(v){mood=v||"idle";if(v==="success")setTimeout(()=>{if(mood==="success")mood="idle"},1400)}};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
