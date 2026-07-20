
(function(){
  "use strict";
  if(!window.THREE){console.error("Three.js not loaded");return;}

  const THREE=window.THREE;
  const SKIN=0xd5a176, NAVY=0x123d52, NAVY2=0x082b35, WHITE=0xf5f5ef, BROWN=0x5f3b26, DARK=0x172429, COPPER=0xb86f36, STEEL=0x8d9da0;

  function mat(color,rough=.75,metal=.05){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
  function mesh(g,m){const x=new THREE.Mesh(g,m);x.castShadow=true;x.receiveShadow=true;return x}
  function roundedBody(radius,height,color){
    const g=new THREE.CapsuleGeometry?new THREE.CapsuleGeometry(radius,height-radius*2,8,16):new THREE.CylinderGeometry(radius,radius,height,20);
    return mesh(g,mat(color));
  }

  function makeWrench(){
    const group=new THREE.Group();
    const handle=mesh(new THREE.CylinderGeometry(.045,.045,.65,12),mat(STEEL,.35,.65));handle.rotation.z=Math.PI/2;handle.position.x=.25;group.add(handle);
    const head=mesh(new THREE.TorusGeometry(.12,.045,10,24,Math.PI*1.5),mat(STEEL,.3,.75));head.rotation.y=Math.PI/2;head.position.x=.58;group.add(head);
    group.scale.setScalar(1.15);return group;
  }

  function makeKen(){
    const root=new THREE.Group(); root.name="Ken";
    const skin=mat(SKIN), navy=mat(NAVY), navy2=mat(NAVY2), white=mat(WHITE), brown=mat(BROWN), dark=mat(DARK), copper=mat(COPPER), steel=mat(STEEL,.35,.65);

    // legs
    const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();
    const legGeo=new THREE.CylinderGeometry(.17,.19,.92,16);
    const lLeg=mesh(legGeo,navy2);lLeg.position.y=.72;leftLeg.add(lLeg);
    const rLeg=mesh(legGeo,navy2);rLeg.position.y=.72;rightLeg.add(rLeg);
    const bootGeo=new THREE.BoxGeometry(.38,.20,.58);
    const lb=mesh(bootGeo,brown);lb.position.set(0,.16,.10);leftLeg.add(lb);
    const rb=mesh(bootGeo,brown);rb.position.set(0,.16,.10);rightLeg.add(rb);
    leftLeg.position.x=-.23;rightLeg.position.x=.23;root.add(leftLeg,rightLeg);

    // torso / shirt / overalls
    const torso=mesh(new THREE.CylinderGeometry(.44,.36,.86,24),white);torso.position.y=1.65;root.add(torso);
    const bib=mesh(new THREE.BoxGeometry(.66,.60,.11),navy);bib.position.set(0,1.63,.38);root.add(bib);
    const strapGeo=new THREE.BoxGeometry(.11,.68,.08);
    const ls=mesh(strapGeo,navy);ls.position.set(-.25,1.88,.33);ls.rotation.z=-.08;root.add(ls);
    const rs=mesh(strapGeo,navy);rs.position.set(.25,1.88,.33);rs.rotation.z=.08;root.add(rs);
    const belt=mesh(new THREE.BoxGeometry(.83,.13,.12),brown);belt.position.set(0,1.29,.37);root.add(belt);
    const buckle=mesh(new THREE.BoxGeometry(.18,.13,.04),mat(0xc69a54,.4,.45));buckle.position.set(0,1.29,.445);root.add(buckle);
    const chestPatch=mesh(new THREE.BoxGeometry(.25,.09,.018),white);chestPatch.position.set(.10,1.67,.445);root.add(chestPatch);

    // head
    const neck=mesh(new THREE.CylinderGeometry(.14,.15,.22,16),skin);neck.position.y=2.18;root.add(neck);
    const head=mesh(new THREE.SphereGeometry(.31,28,20),skin);head.scale.set(1,.98,.88);head.position.y=2.48;root.add(head);
    const hair=mesh(new THREE.SphereGeometry(.30,24,12,0,Math.PI*2,0,Math.PI*.42),dark);hair.position.y=2.61;hair.scale.set(1.03,.62,.94);root.add(hair);

    // cap
    const cap=mesh(new THREE.SphereGeometry(.33,24,12,0,Math.PI*2,0,Math.PI*.48),navy);cap.position.y=2.69;cap.scale.set(1.08,.55,1.0);root.add(cap);
    const brim=mesh(new THREE.BoxGeometry(.34,.055,.27),navy);brim.position.set(0,2.65,.27);brim.rotation.x=-.10;root.add(brim);

    // face
    [-.11,.11].forEach(x=>{
      const eye=mesh(new THREE.SphereGeometry(.042,12,10),white);eye.position.set(x,2.50,.275);root.add(eye);
      const pupil=mesh(new THREE.SphereGeometry(.020,10,8),dark);pupil.position.set(x,2.50,.312);root.add(pupil);
    });
    const nose=mesh(new THREE.SphereGeometry(.035,10,8),skin);nose.position.set(0,2.43,.31);nose.scale.set(.8,1.1,.9);root.add(nose);
    const smile=mesh(new THREE.TorusGeometry(.085,.012,8,20,Math.PI),dark);smile.position.set(0,2.37,.292);smile.rotation.z=Math.PI;root.add(smile);

    // arms with pivots
    const leftShoulder=new THREE.Group(),rightShoulder=new THREE.Group();
    leftShoulder.position.set(-.44,1.94,0);rightShoulder.position.set(.44,1.94,0);
    const upperGeo=new THREE.CylinderGeometry(.12,.13,.58,14), foreGeo=new THREE.CylinderGeometry(.105,.115,.52,14);
    const lu=mesh(upperGeo,white);lu.position.y=-.27;leftShoulder.add(lu);
    const ru=mesh(upperGeo,white);ru.position.y=-.27;rightShoulder.add(ru);
    const leftElbow=new THREE.Group();leftElbow.position.y=-.54;leftShoulder.add(leftElbow);
    const rightElbow=new THREE.Group();rightElbow.position.y=-.54;rightShoulder.add(rightElbow);
    const lf=mesh(foreGeo,skin);lf.position.y=-.23;leftElbow.add(lf);
    const rf=mesh(foreGeo,skin);rf.position.y=-.23;rightElbow.add(rf);
    const lh=mesh(new THREE.SphereGeometry(.12,14,12),skin);lh.position.y=-.49;leftElbow.add(lh);
    const rh=mesh(new THREE.SphereGeometry(.12,14,12),skin);rh.position.y=-.49;rightElbow.add(rh);
    leftShoulder.rotation.z=-.08;rightShoulder.rotation.z=.08;root.add(leftShoulder,rightShoulder);

    // tool belt props
    const pouch=mesh(new THREE.BoxGeometry(.24,.28,.13),brown);pouch.position.set(-.40,1.13,.30);root.add(pouch);
    const wrench=makeWrench();wrench.position.set(.52,1.20,.31);wrench.rotation.z=.25;root.add(wrench);

    root.userData={leftShoulder,rightShoulder,leftElbow,rightElbow,wrench,homePos:new THREE.Vector3(0,0,0)};
    root.scale.setScalar(.92);
    return root;
  }

  function makeToilet(){
    const g=new THREE.Group(), ceramic=mat(0xf5f2e9);
    const bowl=mesh(new THREE.SphereGeometry(.32,20,14),ceramic);bowl.scale.set(1.0,.55,1.1);bowl.position.y=.35;g.add(bowl);
    const tank=mesh(new THREE.BoxGeometry(.58,.60,.30),ceramic);tank.position.set(0,.75,-.18);g.add(tank);
    const seat=mesh(new THREE.TorusGeometry(.24,.035,10,24),mat(0xdedbd1));seat.rotation.x=Math.PI/2;seat.position.set(0,.53,.06);g.add(seat);
    g.scale.setScalar(.8);return g;
  }
  function makeRadiator(){
    const g=new THREE.Group(),m=mat(0xe5e5df,.5,.1);
    for(let i=0;i<6;i++){const p=mesh(new THREE.BoxGeometry(.10,.80,.16),m);p.position.x=(i-2.5)*.12;p.position.y=.55;g.add(p)}
    return g;
  }
  function makeSink(){
    const g=new THREE.Group(),m=mat(0xece9df);
    const basin=mesh(new THREE.CylinderGeometry(.38,.30,.18,20),m);basin.scale.z=.75;basin.position.y=.78;g.add(basin);
    const pedestal=mesh(new THREE.CylinderGeometry(.13,.18,.70,16),m);pedestal.position.y=.39;g.add(pedestal);return g;
  }

  function setupScene(container,interactive){
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(interactive?34:31,1,.1,100);
    camera.position.set(0,1.7,interactive?5.0:4.6);
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.setClearColor(0x000000,0);
    renderer.shadowMap.enabled=true;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff,0x274248,2.1));
    const key=new THREE.DirectionalLight(0xffffff,2.7);key.position.set(3,5,4);key.castShadow=true;scene.add(key);
    const fill=new THREE.DirectionalLight(0xffd3af,1.1);fill.position.set(-4,2,2);scene.add(fill);

    const ken=makeKen();scene.add(ken);
    let toilet=null,radiator=null,sink=null;
    if(interactive){
      const floor=mesh(new THREE.CylinderGeometry(1.5,1.58,.10,48),mat(0x193b42,.75,.1));floor.position.y=.04;scene.add(floor);
      toilet=makeToilet();toilet.position.set(-1.75,0,-.65);scene.add(toilet);
      radiator=makeRadiator();radiator.position.set(1.85,0,-.75);scene.add(radiator);
      sink=makeSink();sink.position.set(-1.75,0,1.0);scene.add(sink);
    }

    let controls=null;
    if(interactive&&THREE.OrbitControls){
      controls=new THREE.OrbitControls(camera,renderer.domElement);
      controls.enableDamping=true;controls.target.set(0,1.35,0);controls.minDistance=2.5;controls.maxDistance=7;controls.enablePan=true;
    }

    function resize(){
      const r=container.getBoundingClientRect();
      renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);
      camera.aspect=Math.max(r.width,1)/Math.max(r.height,1);camera.updateProjectionMatrix();
    }
    resize();addEventListener("resize",resize);

    return{scene,camera,renderer,controls,ken,toilet,radiator,sink,resize};
  }

  const largeHost=document.getElementById("ken-large-3d");
  const miniHost=document.getElementById("ken-mini-3d");
  const large=largeHost?setupScene(largeHost,true):null;
  const mini=miniHost?setupScene(miniHost,false):null;

  const clock=new THREE.Clock();
  let action={type:"idle",start:0,duration:0,target:null};

  function smooth(t){return t*t*(3-2*t)}
  function setAction(type,duration=1200){action={type,start:performance.now(),duration,target:null}}
  function animateKen(sceneObj,time){
    if(!sceneObj)return;
    const k=sceneObj.ken,u=k.userData;
    const idle=Math.sin(time*.0018);
    k.position.y=.012*Math.sin(time*.002);
    if(action.type==="idle"){
      u.leftShoulder.rotation.z=-.08+.025*idle;u.rightShoulder.rotation.z=.08-.025*idle;
    }
    if(sceneObj===large&&action.type!=="idle"){
      const p=Math.min(1,(time-action.start)/action.duration),s=smooth(p);
      if(action.type==="wave"){
        u.rightShoulder.rotation.z=.08-1.35*Math.sin(Math.PI*s);
        u.rightElbow.rotation.z=-.6-.45*Math.sin(Math.PI*4*s);
      }else if(action.type==="thumbs"){
        u.rightShoulder.rotation.z=.08-1.1*s;u.rightElbow.rotation.z=-1.15*s;
      }else if(action.type==="wrench"){
        u.rightShoulder.rotation.z=.08-.7*s;u.rightElbow.rotation.z=-1.2*s;
        u.wrench.rotation.z=.25+2.0*s;
      }else if(action.type==="toilet"||action.type==="radiator"){
        const dest=action.type==="toilet"?new THREE.Vector3(-1.0,0,-.15):new THREE.Vector3(1.0,0,-.15);
        k.position.lerpVectors(new THREE.Vector3(0,0,0),dest,s);
        k.rotation.y=(action.type==="toilet"?-.65:.65)*s;
      }else if(action.type==="home"){
        k.position.lerp(new THREE.Vector3(0,0,0),s);k.rotation.y*=(1-s);
      }else if(action.type==="thinking"){
        k.rotation.y=.10*Math.sin(time*.005);u.leftElbow.rotation.z=-.55;
      }else if(action.type==="success"){
        u.leftShoulder.rotation.z=-.9*Math.sin(Math.PI*s);u.rightShoulder.rotation.z=.9*Math.sin(Math.PI*s);
      }
      if(p>=1&&["wave","thumbs","wrench","home","success"].includes(action.type)){action.type="idle";u.leftShoulder.rotation.z=-.08;u.rightShoulder.rotation.z=.08;u.leftElbow.rotation.z=0;u.rightElbow.rotation.z=0}
    }
    if(sceneObj===mini){k.rotation.y=.18*Math.sin(time*.0008);k.scale.setScalar(.88)}
  }

  function tick(time){
    requestAnimationFrame(tick);
    animateKen(large,time);animateKen(mini,time);
    if(large){large.controls?.update();large.renderer.render(large.scene,large.camera)}
    if(mini){mini.renderer.render(mini.scene,mini.camera)}
  }
  requestAnimationFrame(tick);

  document.querySelectorAll("[data-ken-action]").forEach(b=>b.addEventListener("click",()=>setAction(b.dataset.kenAction,b.dataset.kenAction==="toilet"||b.dataset.kenAction==="radiator"?1600:1200)));
  const views={front:[0,1.7,5],left:[-4.3,1.7,0],back:[0,1.7,-5],right:[4.3,1.7,0],close:[0,2.1,3.2]};
  document.querySelectorAll("[data-ken-view]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-ken-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    if(!large)return;const v=views[b.dataset.kenView];large.camera.position.set(...v);large.controls?.target.set(0,1.45,0);large.controls?.update();
  }));
  document.getElementById("ken-fullscreen")?.addEventListener("click",()=>document.getElementById("ken-stage")?.requestFullscreen?.());

  window.Ken3D={
    react(type){if(type==="thinking")setAction("thinking",5000);else if(type==="success")setAction("success",1200);else if(type==="estimate")setAction("thumbs",1200);else action.type="idle"},
    action:setAction
  };
})();
