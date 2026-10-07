// ===== 3D arcade scenes (three.js r128 + Fly3D) =====
(function(){
const MONO='"JetBrains Mono", ui-monospace, Consolas, monospace';
const C={fg:'#e9eef5',mu:'#8d9bb0',g:'#5fe39a',p:'#b18cff',b:'#56b4ff',m:'#ff5fb8',w:'#ffb454',red:'#ff5f6d'};
const S3={ok:false,failed:false,renderer:null,scenes:{},canvas:null};
const V=new THREE.Vector3(),V2=new THREE.Vector3(),Q=new THREE.Quaternion(),UP=new THREE.Vector3(0,1,0),DOWN=new THREE.Vector3(0,-1,0);

function std(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.7,metalness:0},o||{}));}
function glow(c,i){return new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i===undefined?1:i,roughness:0.4});}
function canvasTex(w,h,draw,rep){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const t=new THREE.CanvasTexture(cv);if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.anisotropy=4;return t;}
function lights(sc,o){
  o=o||{};sc.add(new THREE.HemisphereLight(o.sky||'#cfe0ff',o.ground||'#2a2018',o.hemi||0.75));
  const d=new THREE.DirectionalLight(o.sun||'#fff3e0',o.sunI||1.25);d.position.set(...(o.pos||[4,8,6]));d.castShadow=true;
  d.shadow.mapSize.set(1024,1024);const cam=d.shadow.camera;const e=o.ext||8;cam.left=-e;cam.right=e;cam.top=e;cam.bottom=-e;cam.near=0.5;cam.far=40;d.shadow.bias=-0.0008;
  if(o.target){d.target.position.set(...o.target);sc.add(d.target);}sc.add(d);return d;}
function skyTex(top,mid,bot){return canvasTex(4,256,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,top);g.addColorStop(0.62,mid);g.addColorStop(1,bot);x.fillStyle=g;x.fillRect(0,0,w,h);});}

/* ---------------- Fly Runner ---------------- */
function buildDino(){
  const sc=new THREE.Scene();sc.background=skyTex('#0b1020','#3a2a4a','#e08a4c');sc.fog=new THREE.Fog('#5a3a44',14,34);
  lights(sc,{pos:[-3,7,6],ext:9,target:[3,0,0],sun:'#ffe2c4'});
  const groundTex=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#b98d55';x.fillRect(0,0,w,h);for(let i=0;i<900;i++){x.fillStyle=`rgba(${80+Math.random()*60|0},${55+Math.random()*40|0},30,${Math.random()*0.35})`;x.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*3,1+Math.random()*2);}x.strokeStyle='rgba(90,60,30,.35)';x.lineWidth=2;x.beginPath();x.moveTo(0,0);x.lineTo(0,h);x.stroke();},[30,6]);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,24),std('#ffffff',{map:groundTex,roughness:0.95}));ground.rotation.x=-Math.PI/2;ground.position.set(6,0,2);ground.receiveShadow=true;sc.add(ground);
  // distant dunes
  for(let i=0;i<7;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(3+i%3,24,12,0,Math.PI*2,0,Math.PI/2),std(i%2?'#7a5238':'#6a4632',{roughness:1}));d.scale.y=0.35;d.position.set(-6+i*5,0,-11-(i%3));sc.add(d);}
  // receptive fields
  const rf=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.02,1.4),new THREE.MeshBasicMaterial({color:C.p,transparent:true,opacity:0.1,depthWrite:false}));m.position.set((100+i*40+20-80)/60,0.012,0.2);sc.add(m);rf.push(m);}
  // cactus pool
  const cg=std('#3f9a5c',{roughness:0.6}),cacti=[];
  function mkCactus(){const g=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.18,1,14),cg);trunk.position.y=0.5;trunk.castShadow=true;g.add(trunk);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.16,14,8),cg);cap.position.y=1;g.add(cap);
    for(const s of [-1,1]){const a=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.34,10),cg);a.position.set(s*0.24,0.62+(s>0?0.1:0),0);a.castShadow=true;g.add(a);const b=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.18,10),cg);b.rotation.z=Math.PI/2;b.position.set(s*0.16,0.47+(s>0?0.1:0),0);g.add(b);}
    sc.add(g);return g;}
  for(let i=0;i<6;i++)cacti.push(mkCactus());
  const fly=new Fly3D.Fly(5);fly.fold(true);sc.add(fly.root);
  const cam=new THREE.PerspectiveCamera(30,960/360,0.1,80);cam.position.set(3.2,1.05,7.4);cam.lookAt(3.2,0.6,0);
  let phase=0;
  return {sc,cam,update(G){
    groundTex.offset.x=(G.t*G.speed/60)/2;
    for(let i=0;i<10;i++){const r=G.B.ext[G.LC.start+i];rf[i].material.opacity=0.12+Math.min(1,r/220)*0.45+G.B.flash[G.LC.start+i]*0.25;}
    cacti.forEach((c,k)=>{const d=G.cacti[k];c.visible=!!d;if(d){c.position.set((d.x+d.w/2-80)/60,0,0);c.scale.set(d.w/26,d.h/60*1.0,1);}});
    phase+=G.air?0:0.06+G.speed*0.25;
    fly.q={};
    if(G.air){fly.fold(false);fly.wings(0,G.t*0.9);fly.gait(phase,0.25);fly.set('coxa_T1_right',1.7);fly.set('tibia_T1_right',1.2);fly.set('coxa_T1_left',1.4);}
    else{fly.fold(true);fly.gait(phase,1);}
    fly.apply();fly.root.position.set(0,0.24+G.y/60,0.2);fly.root.rotation.z=G.air?Math.max(-0.25,Math.min(0.25,G.vy*0.35)):0;
  }};
}

/* ---------------- Parallel Parking ---------------- */
function mkCar(color,opts){
  opts=opts||{};const car=new THREE.Group();const paint=std(color,{roughness:0.35,metalness:0.3});
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.3,0.74),paint);body.position.y=0.28;body.castShadow=true;car.add(body);
  if(opts.open){
    const hood=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.08,0.7),paint);hood.position.set(0.52,0.46,0);car.add(hood);
    const trunk=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.08,0.7),paint);trunk.position.set(-0.56,0.46,0);car.add(trunk);
    for(const s of [-1,1]){const side=new THREE.Mesh(new THREE.BoxGeometry(0.72,0.1,0.06),paint);side.position.set(-0.02,0.47,s*0.34);car.add(side);}
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.08,0.6),std('#1a1d24'));seat.position.set(-0.08,0.44,0);car.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.3,0.6),std('#1a1d24'));back.position.set(-0.32,0.58,0);car.add(back);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.22,0.68),new THREE.MeshStandardMaterial({color:'#9fd0ff',transparent:true,opacity:0.3,roughness:0.05}));glass.position.set(0.31,0.6,0);glass.rotation.z=0.5;car.add(glass);
  }else{
    const cab=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.26,0.66),std('#1d2733',{roughness:0.1,metalness:0.5}));cab.position.set(-0.05,0.56,0);cab.castShadow=true;car.add(cab);
  }
  const wheelM=std('#16181c',{roughness:0.9}),wheels=[];
  for(const [wx,wz] of [[0.48,0.38],[0.48,-0.38],[-0.48,0.38],[-0.48,-0.38]]){const w=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.1,18),wheelM);t.rotation.x=Math.PI/2;w.add(t);w.position.set(wx,0.15,wz);car.add(w);wheels.push(w);}
  const headM=glow('#fff6c8',opts.open?0.9:0.15),brakeM=glow('#ff3c50',0.25),revM=glow('#ffffff',0.05);
  for(const s of [-1,1]){const hl=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.07,0.12),headM);hl.position.set(0.76,0.32,s*0.26);car.add(hl);
    const bl=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.07,0.12),brakeM);bl.position.set(-0.76,0.32,s*0.26);car.add(bl);
    const rl=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.05,0.06),revM);rl.position.set(-0.76,0.32,s*0.12);car.add(rl);}
  return {car,wheels,brakeM,revM};
}
function buildPark(){
  const sc=new THREE.Scene();sc.background=new THREE.Color('#0d1219');sc.fog=new THREE.Fog('#0d1219',14,30);
  lights(sc,{pos:[2,10,6],ext:9,target:[1,0,0],hemi:0.6});
  const S=60,X=px=>(px-265)/S,Z=py=>(py-250)/S;         // 1 px = 1 cm; rear-axle poses
  const asphalt=canvasTex(256,256,(x,w,h)=>{x.fillStyle='#2b3038';x.fillRect(0,0,w,h);for(let i=0;i<2500;i++){const v=40+Math.random()*30|0;x.fillStyle=`rgba(${v},${v+4},${v+10},.5)`;x.fillRect(Math.random()*w,Math.random()*h,1.5,1.5);}},[8,4]);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(30,12),std('#ffffff',{map:asphalt,roughness:0.95}));road.rotation.x=-Math.PI/2;road.position.z=-5;road.receiveShadow=true;sc.add(road);
  const curb=new THREE.Mesh(new THREE.BoxGeometry(30,0.16,0.18),std('#a7adb6'));curb.position.set(0,0.08,Z(300)+0.09);curb.receiveShadow=true;sc.add(curb);
  const walk=new THREE.Mesh(new THREE.BoxGeometry(30,0.14,4),std('#3a404a',{roughness:0.95}));walk.position.set(0,0.07,Z(300)+2.18);walk.receiveShadow=true;sc.add(walk);
  for(let i=-12;i<13;i+=1.2){const tile=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.005,4),std('#2e333b'));tile.position.set(i,0.145,Z(300)+2.18);sc.add(tile);}
  const lineM=new THREE.MeshBasicMaterial({color:'#d9dee6'});
  for(let px=-400;px<1000;px+=42){const l=new THREE.Mesh(new THREE.BoxGeometry(24/S,0.01,0.05),lineM);l.position.set(X(px),0.006,Z(160));sc.add(l);}
  // parked cars (fixed), our car (moves)
  const W={rear:[100,190],front:[340,430],slotY:272,ovR:14,carL:90};
  const r=mkCar('#7a8494');r.car.position.set(X((W.rear[0]+W.rear[1])/2),0,Z(W.slotY));sc.add(r.car);
  const f=mkCar('#a8573a');f.car.position.set(X((W.front[0]+W.front[1])/2),0,Z(W.slotY));sc.add(f.car);
  // slot marking + detectors
  const slot=new THREE.Mesh(new THREE.PlaneGeometry(150/S,48/S),new THREE.MeshBasicMaterial({color:C.g,transparent:true,opacity:0.12,depthWrite:false}));slot.rotation.x=-Math.PI/2;slot.position.set(X(265),0.007,Z(W.slotY));sc.add(slot);
  const pos=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(14/S,0.02,0.12),new THREE.MeshBasicMaterial({color:C.p,transparent:true,opacity:0.1}));m.position.set(X(W.front[0]-60+i*15+7.5),0.01,Z(232));sc.add(m);pos.push(m);}
  const dis=[];for(let i=0;i<10;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(14/S,0.02,0.1),new THREE.MeshBasicMaterial({color:C.b,transparent:true,opacity:0.1}));m.position.set(X(W.rear[1]+i*15+7.5),0.01,Z(297));sc.add(m);dis.push(m);}
  const me=mkCar('#2f8be0',{open:true});const pivot=new THREE.Group();me.car.position.x=(W.carL/2-W.ovR)/S;pivot.add(me.car);sc.add(pivot);
  const steer=new THREE.Mesh(new THREE.TorusGeometry(0.09,0.015,8,20),std('#c5cfdc'));steer.position.set(0.18,0.6,0);steer.rotation.y=Math.PI/2;steer.rotation.x=0.4;me.car.add(steer);
  const brakeLight=new THREE.PointLight('#ff2040',0,2.5);brakeLight.position.set(-0.9,0.35,0);me.car.add(brakeLight);
  const fly=new Fly3D.Fly(2.7);fly.fold(true);fly.root.position.set(-0.04,0.52,0);me.car.add(fly.root);
  const cam=new THREE.PerspectiveCamera(36,960/360,0.1,80);cam.position.set(0.9,5.2,4.2);cam.lookAt(0.9,0,-0.55);
  return {sc,cam,update(G){
    for(let i=0;i<10;i++){pos[i].material.opacity=0.08+Math.min(1,G.B.ext[G.PS.start+i]/220)*0.75;dis[i].material.opacity=0.08+Math.min(1,G.B.ext[G.DD.start+i]/220)*0.75;}
    pivot.position.set(X(G.x),0,Z(G.y));pivot.rotation.y=-G.th;
    me.wheels.forEach((w,k)=>{w.children[0].rotation.y=G.x/9;if(k<2)w.rotation.y=-(G.steer||0)*0.5;});
    steer.rotation.z=(G.steer||0)*1.2;
    const br=Math.min(1,(G.brake||0)/6);me.brakeM.emissiveIntensity=0.25+br*3;brakeLight.intensity=br*2.2;me.revM.emissiveIntensity=G.v<0?2.2:0.05;
    fly.q={};fly.gait(0,0.6);
    for(const sd of ['left','right']){fly.set('coxa_T1_'+sd,1.7);fly.set('femur_T1_'+sd,1.0+(G.steer||0)*(sd==='left'?0.25:-0.25));fly.set('tibia_T1_'+sd,-0.2-br*0.4);}
    fly.apply();
  }};
}

/* ---------------- downloaded glTF models (Sketchfab, CC BY 4.0) ---------------- */
const glbCache={};
function loadGLB(name){
  if(!glbCache[name])glbCache[name]=fetch(name).then(r=>{if(!r.ok)throw new Error(name);return r.json();}).then(m=>{
    const s=atob(m.glb_b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
    return new Promise((res,rej)=>new THREE.GLTFLoader().parse(u.buffer,'',g=>res({gltf:g,meta:m}),rej));});
  return glbCache[name];
}
function linearMaps(mat){for(const k of ["map","emissiveMap"]){if(mat[k]){mat[k].encoding=THREE.LinearEncoding;if(mat[k].image)mat[k].needsUpdate=true;}}mat.needsUpdate=true;}
const MEAT_UV=[0.012,0.115,0.585,0.575];   // u0,v0,u1,v1 of the meat in the model's texture atlas
// Split the doner machine into a static machine mesh and a rotating meat mesh whose strips can be raw or cooked.
function setupDoner(gltf,H,meatTris,texUris){
  const MT=new Set(meatTris||[]);
  const root=gltf.scene;root.updateMatrixWorld(true);let src=null;root.traverse(o=>{if(o.isMesh&&!src)src=o;});
  const g=src.geometry.clone().applyMatrix4(src.matrixWorld).toNonIndexed();
  const P=g.attributes.position,N=g.attributes.normal,UV=g.attributes.uv,tri=P.count/3;
  const inMeat=i=>{const u=UV.getX(i),v=UV.getY(i);return u>MEAT_UV[0]&&u<MEAT_UV[2]&&v>MEAT_UV[1]&&v<MEAT_UV[3];};
  const mp=[],mn=[],mu=[],op=[],on=[],ou=[];const ORD=src.matrixWorld.determinant()<0?[0,2,1]:[0,1,2];
  for(let t=0;t<tri;t++){const isM=MT.size?MT.has(t):(inMeat(3*t)&&inMeat(3*t+1)&&inMeat(3*t+2));const [p,n,u]=isM?[mp,mn,mu]:[op,on,ou];
    for(const k of ORD){const i=3*t+k;p.push(P.getX(i),P.getY(i),P.getZ(i));n.push(N.getX(i),N.getY(i),N.getZ(i));u.push(UV.getX(i),UV.getY(i));}}
  const mk=(p,n,u)=>{const b=new THREE.BufferGeometry();b.setAttribute('position',new THREE.Float32BufferAttribute(p,3));b.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));b.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));b.setAttribute('uv2',new THREE.Float32BufferAttribute(u,2));return b;};
  const meatG=mk(mp,mn,mu),machG=mk(op,on,ou);
  const all=new THREE.Box3().setFromBufferAttribute(g.attributes.position);meatG.computeBoundingBox();const mb=meatG.boundingBox;
  const cx=(mb.min.x+mb.max.x)/2,cz=(mb.min.z+mb.max.z)/2,sc=H/(all.max.y-all.min.y);
  for(const b of [meatG,machG]){b.translate(-cx,-all.min.y,-cz);b.scale(sc,sc,sc);}
  // turn the machine so its grill is behind the meat (camera looks from +z)
  meatG.computeBoundingBox();const ymid=(meatG.boundingBox.min.y+meatG.boundingBox.max.y)/2,MPp=machG.attributes.position;let gx=0,gz=0,gn=0;
  for(let i=0;i<MPp.count;i++){if(MPp.getY(i)>ymid){gx+=MPp.getX(i);gz+=MPp.getZ(i);gn++;}}
  const rot=Math.PI-Math.atan2(gx/gn,gz/gn);
  meatG.rotateY(rot);machG.rotateY(rot);
  meatG.computeBoundingBox();const R=Math.max(meatG.boundingBox.max.x,meatG.boundingBox.max.z,-meatG.boundingBox.min.x,-meatG.boundingBox.min.z);
  // angle around the spit for every meat vertex (0..1) -> which of the 24 strips it belongs to
  const MP=meatG.attributes.position,ang=new Float32Array(MP.count);
  for(let i=0;i<MP.count;i++){let a=Math.atan2(MP.getX(i),MP.getZ(i));if(a<0)a+=Math.PI*2;ang[i]=a/(Math.PI*2);}
  meatG.setAttribute('aAng',new THREE.BufferAttribute(ang,1));
  const base=src.material.clone();
  if(texUris){ // textures shipped as data: URIs (hosted pages can block the blob: URLs embedded glTF images need)
    const tl=new THREE.TextureLoader(),T=k=>{if(!texUris[k])return null;const t=tl.load(texUris[k]);t.flipY=false;return t;};
    base.map=T('map');base.normalMap=T('normalMap');const orm=T('orm');base.aoMap=orm;base.aoMapIntensity=0.87;base.roughnessMap=orm;base.metalnessMap=orm;
    base.emissiveMap=T('emissiveMap');if(base.emissiveMap)base.emissive=new THREE.Color(1,1,1);base.needsUpdate=true;}
  linearMaps(base);base.metalness=0.35;base.roughness=0.9;base.vertexTangents=false;if(base.normalScale)base.normalScale.set(1,-1);
  const machine=new THREE.Mesh(machG,base);machine.castShadow=true;machine.receiveShadow=true;
  const meatMat=base.clone();linearMaps(meatMat);meatMat.vertexTangents=false;meatMat.emissiveMap=null;meatMat.emissive=new THREE.Color(0,0,0);meatMat.metalness=0;meatMat.metalnessMap=null;
  const uDone={value:new Float32Array(25)};
  meatMat.onBeforeCompile=sh=>{
    sh.uniforms.uDone=uDone;
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aAng;\nuniform float uDone[25];\nvarying float vDone;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        float fa=aAng*24.0; int ia=int(floor(fa)); float fr=fa-float(ia);
        float dn=0.0; for(int k=0;k<24;k++){ if(k==ia){ dn=mix(uDone[k],uDone[k+1],smoothstep(0.25,0.75,fr)); } }
        vDone=dn;
        float shave=(1.0-smoothstep(0.0,0.35,dn))*0.045;   // a freshly cut strip sits slightly inward
        transformed.xz*=1.0-shave;`);
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vDone;')
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec3 tx=diffuseColor.rgb; float lum=dot(tx,vec3(0.299,0.587,0.114));
        vec3 rawC=mix(vec3(lum),tx,0.25)*vec3(1.75,0.98,0.98)+vec3(0.16,0.06,0.07);
        vec3 ckC=tx*vec3(1.12,0.88,0.58);
        float k=smoothstep(0.15,0.95,vDone);
        diffuseColor.rgb=mix(rawC,ckC,k);`)
      .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(0.28,max(roughnessFactor,0.7),smoothstep(0.15,0.95,vDone));')
      .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(0.18,0.05,0.0)*smoothstep(0.7,1.0,vDone)*0.5;');
  };
  const meat=new THREE.Mesh(meatG,meatMat);meat.castShadow=true;
  const group=new THREE.Group();group.add(machine,meat);
  meatG.computeBoundingBox();
  return {group,meat,uDone,R,y0:meatG.boundingBox.min.y,y1:meatG.boundingBox.max.y,credit:gltf};
}
// Normalise the electric doner knife: grip at the origin, blade pointing along -Y, about L long.
function setupKnife(gltf,L){
  const root=gltf.scene;root.updateMatrixWorld(true);const parts=[];root.traverse(o=>{if(o.isMesh)parts.push(o);});
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const cm=k=>new THREE.Box3().setFromObject(parts[k]).getCenter(new THREE.Vector3());
  const blade=cm(0),motor=parts[1]?cm(1):c.clone();
  const holder=new THREE.Group();const inner=new THREE.Group();holder.add(inner);inner.add(root);
  root.position.sub(motor);const s=L/Math.max(size.x,size.y,size.z);inner.scale.setScalar(s);
  const dir=blade.clone().sub(motor).normalize();inner.quaternion.setFromUnitVectors(dir,new THREE.Vector3(0,-1,0));
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;const m=o.material;if(m.name==='theChrome'){m.color.set('#c9d1db');m.metalness=0.6;m.roughness=0.25;m.emissive=new THREE.Color('#2a3038');}else{m.color.set('#1b1d22');}m.needsUpdate=true;}});
  return holder;
}

/* ---------------- Doner Kebab ---------------- */
function buildKebab(){
  const sc=new THREE.Scene();sc.background=skyTex('#120d0b','#2a1810','#1a1210');
  lights(sc,{pos:[3,6,6],ext:6,target:[0.8,1,0],hemi:0.55,sun:'#fff0dc'});
  const fireLight=new THREE.PointLight('#ff7a2a',2.2,6);fireLight.position.set(0,1.3,-1.2);sc.add(fireLight);
  // counter
  const counter=new THREE.Mesh(new THREE.BoxGeometry(9,0.2,3.5),std('#5a4433',{roughness:0.8,map:canvasTex(256,64,(x,w,h)=>{x.fillStyle='#6b513c';x.fillRect(0,0,w,h);for(let i=0;i<40;i++){x.strokeStyle=`rgba(40,25,15,${Math.random()*0.4})`;x.beginPath();x.moveTo(0,Math.random()*h);x.bezierCurveTo(w/3,Math.random()*h,2*w/3,Math.random()*h,w,Math.random()*h);x.stroke();}})}));
  counter.position.set(1,-0.1,0.3);counter.receiveShadow=true;sc.add(counter);
  // grill panel
  const grill=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.8,0.2),std('#2a2f36',{metalness:0.6,roughness:0.4}));grill.position.set(0,1.4,-1.35);sc.add(grill);
  for(let i=0;i<7;i++){const e=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.08,0.06),glow('#ff6a1a',1.6));e.position.set(0,0.4+i*0.36,-1.22);sc.add(e);}
  // spit + meat
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,3.3,10),std('#b8c2d0',{metalness:0.8,roughness:0.3}));rod.position.y=1.55;sc.add(rod);
  const S=24,HS=6;let geo=new THREE.CylinderGeometry(0.95,0.72,2.4,S,HS,true).toNonIndexed();
  const pos=geo.attributes.position,cols=new Float32Array(pos.count*3),sec=new Int16Array(pos.count/3);
  for(let t=0;t<pos.count/3;t++){let cx=0,cz=0;for(let k=0;k<3;k++){cx+=pos.getX(3*t+k);cz+=pos.getZ(3*t+k);}let th=Math.atan2(cx,cz);if(th<0)th+=Math.PI*2;sec[t]=Math.min(S-1,Math.floor(th/(Math.PI*2)*S));}
  geo.setAttribute('color',new THREE.BufferAttribute(cols,3));geo.computeVertexNormals();
  const meat=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.75}));meat.position.y=1.5;meat.castShadow=true;sc.add(meat);
  const capT=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,0.04,S),std('#7a3e22'));capT.position.y=2.72;sc.add(capT);
  const tray=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,0.06,30),std('#9aa4b0',{metalness:0.7,roughness:0.3}));tray.position.y=0.2;sc.add(tray);
  // crate + chef fly
  const crate=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.8,0.9),std('#7a5a3a',{roughness:0.85}));crate.position.set(1.95,0.4,0.85);crate.castShadow=true;crate.receiveShadow=true;sc.add(crate);
  const fly=new Fly3D.Fly(4.6);fly.fold(true);fly.root.position.set(1.95,0.8+0.22,0.85);fly.root.rotation.y=Math.PI*0.86;sc.add(fly.root);
  const hat=new THREE.Group();const hatM=std('#f3f5f8',{roughness:0.9});const hb=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.14,18),hatM);hat.add(hb);const ht=new THREE.Mesh(new THREE.SphereGeometry(0.19,18,12),hatM);ht.position.y=0.15;ht.scale.y=0.7;hat.add(ht);sc.add(hat);
  const knife=new THREE.Group();const blade=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.0,0.025),std('#e6ebf2',{metalness:0.25,roughness:0.25,emissive:'#3a4048',emissiveIntensity:0.6}));blade.position.y=-0.6;knife.add(blade);
  const handle=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,0.3,10),std('#3a2a20'));handle.position.y=0.05;knife.add(handle);knife.traverse(o=>{o.castShadow=true;});sc.add(knife);
  // plate + slices
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.0,0.85,0.06,40),std('#eef1f5',{roughness:0.35}));plate.position.set(3.7,0.03,0.9);plate.receiveShadow=true;sc.add(plate);
  const sliceGeo=new THREE.SphereGeometry(0.16,14,8),brownM=std('#8a4a24',{roughness:0.7}),pinkM=std('#f19aa8',{roughness:0.6});
  const slices=[];for(let i=0;i<40;i++){const m=new THREE.Mesh(sliceGeo,brownM);m.scale.set(1,0.25,0.7);m.position.set(3.25+(i%5)*0.22,0.1+Math.floor(i/10)*0.05,0.55+(Math.floor(i/5)%2)*0.35+((i%10)>=5?0:0));m.castShadow=true;sc.add(m);slices.push(m);}
  const falling=new THREE.Mesh(sliceGeo,brownM);falling.scale.set(1,0.25,0.7);sc.add(falling);
  const cam=new THREE.PerspectiveCamera(30,960/360,0.1,80);cam.position.set(1.7,2.3,8.4);cam.lookAt(1.7,1.15,0);
  const col=new THREE.Color();
  // real models (Sketchfab, CC BY 4.0): swap them in when they load; keep the simple spit as a fallback
  const procedural=[grill,rod,meat,capT,tray];sc.children.forEach(o=>{if(o.isMesh&&o.geometry&&o.geometry.parameters&&o.geometry.parameters.width===1.7)procedural.push(o);});
  let D=null,knifeModel=null,tgtY=1.55,tgtR=0.78;
  loadGLB("doner_model.json").then(({gltf,meta})=>{D=setupDoner(gltf,3.3,meta.meatTris,meta.textures);D.group.position.set(0,0,0);sc.add(D.group);procedural.forEach(o=>o.visible=false);
    tgtR=D.R;tgtY=(D.y0+D.y1)/2;fireLight.position.set(0,1.6,-0.6);crate.position.set(1.3,0.4,0.95);fly.root.position.set(1.3,1.02,0.95);plate.position.x=3.1;slices.forEach(m=>m.position.x-=0.6);}).catch(e=>console.warn('doner model',e));
  loadGLB('knife_model.json').then(({gltf})=>{knifeModel=setupKnife(gltf,0.75);knife.children.forEach(c=>c.visible=false);knife.add(knifeModel);}).catch(e=>console.warn('knife model',e));
  return {sc,cam,update(G){
    meat.rotation.y=G.angle;capT.rotation.y=G.angle;
    if(D){D.meat.rotation.y=G.angle;const u=D.uDone.value;for(let i=0;i<24;i++)u[i]=G.done[i];u[24]=G.done[0];}
    for(let t=0;t<sec.length;t++){const d=G.done[sec[t]];col.setRGB((255-(255-140)*d)/255,(150-(150-74)*d)/255,(165-(165-40)*d)/255);for(let k=0;k<3;k++){cols[9*t+3*k]=col.r;cols[9*t+3*k+1]=col.g;cols[9*t+3*k+2]=col.b;}}
    geo.attributes.color.needsUpdate=true;
    fireLight.intensity=2+Math.sin(G.t*0.02)*0.3;
    const cutP=G.cool>380?(500-G.cool)/120:0;
    fly.q={};fly.gait(0,0.7);fly.set('coxa_T1_right',1.7);fly.set('femur_T1_right',1.0-cutP*0.4);fly.set('tibia_T1_right',1.1-cutP*1.6);fly.set('coxa_T1_left',1.2);
    fly.apply();sc.updateMatrixWorld();
    const hand=fly.world('claw_T1_right',V);knife.position.copy(hand);V2.set(tgtR*0.45,tgtY+0.45*(1-cutP)-cutP*0.55,tgtR*0.9).sub(hand).normalize();knife.quaternion.setFromUnitVectors(DOWN,V2);if(knifeModel)knifeModel.rotation.y+=G.cool>380?0.6:0.02;
    fly.world('head',V2);hat.position.set(V2.x,V2.y+0.23,V2.z);
    slices.forEach((m,k)=>{const s=G.slices[k];m.visible=s!==undefined;if(m.visible)m.material=s?brownM:pinkM;});
    falling.visible=G.cool>420;if(falling.visible){const f=(500-G.cool)/80;falling.material=G.slices[G.slices.length-1]?brownM:pinkM;falling.position.set(0.95+f*2.4,1.6-f*1.4+Math.sin(f*Math.PI)*0.6,0.7);falling.rotation.z=f*4;}
  }};
}

/* ---------------- Rhythm Slicer ---------------- */
function buildSaber(){
  const sc=new THREE.Scene();sc.background=new THREE.Color('#05060b');sc.fog=new THREE.Fog('#05060b',8,24);
  sc.add(new THREE.HemisphereLight('#8aa0ff','#100818',0.55));const d=new THREE.DirectionalLight('#ffffff',0.9);d.position.set(0,6,4);sc.add(d);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(4.4,40),std('#0c1220',{roughness:0.4,metalness:0.4}));floor.rotation.x=-Math.PI/2;floor.position.z=-18;sc.add(floor);
  for(const s of [-1,1]){const e=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.05,40),glow(s<0?'#ff3b5c':'#3b8cff',2.2));e.position.set(s*2.2,0.03,-18);sc.add(e);}
  const bars=[];for(let i=0;i<14;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.01,0.04),new THREE.MeshBasicMaterial({color:'#2a3a66'}));b.position.y=0.006;sc.add(b);bars.push(b);}
  // background neon rings
  for(let i=0;i<5;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(3.4,0.04,6,48),glow(i%2?'#ff3b5c':'#3b8cff',1.4));r.position.set(0,1.6,-8-i*4);sc.add(r);}
  const pool=[];
  const arrowShape=new THREE.Shape();arrowShape.moveTo(-0.14,0.06);arrowShape.lineTo(0.14,0.06);arrowShape.lineTo(0,-0.1);arrowShape.closePath();
  const arrowGeo=new THREE.ShapeGeometry(arrowShape),arrowM=new THREE.MeshBasicMaterial({color:'#ffffff'});
  function mkBlock(){const g=new THREE.Group();const halves=[];for(const s of [-1,1]){const h=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.45,0.45),glow('#ff3b5c',0.6));h.position.x=s*0.115;g.add(h);halves.push(h);}
    const a=new THREE.Mesh(arrowGeo,arrowM);a.position.z=0.226;g.add(a);sc.add(g);return {g,halves,a};}
  for(let i=0;i<8;i++)pool.push(mkBlock());
  const fly=new Fly3D.Fly(3.4);fly.fold(true);fly.root.rotation.y=Math.PI/2;fly.root.position.set(0,0.17,0);sc.add(fly.root);
  function mkSaber(c){const g=new THREE.Group();const hilt=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.22,10),std('#c5cfdc',{metalness:0.8,roughness:0.2}));hilt.position.y=0.11;g.add(hilt);
    const core=new THREE.Mesh(new THREE.CylinderGeometry(0.016,0.016,1.0,10),new THREE.MeshBasicMaterial({color:'#ffffff'}));core.position.y=0.22+0.5;g.add(core);
    const halo=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.045,1.02,12),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:0.6,blending:THREE.AdditiveBlending,depthWrite:false}));halo.position.y=0.22+0.5;g.add(halo);
    const l=new THREE.PointLight(c,0.9,2.2);l.position.y=0.9;g.add(l);sc.add(g);return g;}
  const sabL=mkSaber('#ff3b5c'),sabR=mkSaber('#3b8cff');
  const cam=new THREE.PerspectiveCamera(50,960/360,0.05,60);cam.position.set(0,1.55,3.3);cam.lookAt(0,0.45,-4);
  const dirIdle=new THREE.Vector3(),dirSwing=new THREE.Vector3();
  return {sc,cam,update(G){
    bars.forEach((b,i)=>{b.position.z=-((i*2.8+G.t*0.0094)%39)+0.5;});
    const vis=G.blocks.filter(b=>b.z>-0.3);
    pool.forEach((p,k)=>{const b=vis[k];p.g.visible=!!b;if(!b)return;
      const col=b.miss?'#3a4658':b.c==='r'?'#ff3b5c':'#3b8cff';p.halves.forEach(h=>{h.material.color.set(col);h.material.emissive.set(col);h.material.emissiveIntensity=b.miss?0.1:0.7;});
      const z=-0.7-b.z*17;p.g.position.set(b.lane?0.62:-0.62,0.62,z);
      if(b.hit){const f=Math.min(1,(-b.z+0.22)*3);p.halves[0].position.set(-0.115-f*0.5,-f*0.3,0);p.halves[1].position.set(0.115+f*0.5,-f*0.3,0);p.halves.forEach((h,i)=>{h.rotation.z=(i?-1:1)*f*1.2;});p.a.visible=false;}
      else{p.halves[0].position.set(-0.115,0,0);p.halves[1].position.set(0.115,0,0);p.halves.forEach(h=>{h.rotation.z=0;});p.a.visible=!b.miss;}
      p.g.rotation.z=b.lane?0:0;});
    fly.q={};fly.gait(0,0.75);
    for(const [sd,sw] of [['left',G.swingL],['right',G.swingR]]){fly.set('coxa_T1_'+sd,1.7);fly.set('femur_T1_'+sd,sw*1.0);fly.set('tibia_T1_'+sd,1.2-sw*1.5);}
    fly.apply();sc.updateMatrixWorld();
    for(const [sab,sd,sw,s] of [[sabL,'left',G.swingL,-1],[sabR,'right',G.swingR,1]]){
      fly.world('claw_T1_'+sd,V);sab.position.copy(V);
      dirIdle.set(s*1.1,1,0.15).normalize();dirSwing.set(-s*0.25,-0.1,-1).normalize();
      V2.copy(dirIdle).lerp(dirSwing,Math.min(1,sw)).normalize();sab.quaternion.setFromUnitVectors(UP,V2);}
  }};
}

/* ---------------- HUD overlays (2D, transparent) ---------------- */
function hud(x,lines,right){x.clearRect(0,0,x.W,x.H);x.textAlign=right?'right':'left';const X0=right?x.W-24:24;
  lines.forEach((l,i)=>{x.font=i===0?`600 22px ${MONO}`:`13px ${MONO}`;x.fillStyle='rgba(5,7,10,.55)';const w=x.measureText(l).width;x.fillRect(right?X0-w-8:X0-8,(i===0?18:46+(i-1)*20),w+16,i===0?30:20);x.fillStyle=i===0?C.fg:'#c5cfdc';x.fillText(l,X0,i===0?40:61+(i-1)*20);});x.textAlign='left';}
const HUD={
  dino(x,G){hud(x,[String(G.score).padStart(4,'0'),'BEST '+String(G.best).padStart(4,'0')+'  ·  LIFE '+(G.lives+1),'purple strips = LC10a receptive fields'],true);},
  park(x,G){const W=G.W,gap=(G.x-W.ovR)-W.rearCar[1];const ph={drive:'Driving past the gap',arc1:'Reversing in · full lock',arc2:'Counter-steering',straight:'Straightening · '+gap.toFixed(0)+' cm to the rear car'}[G.phase]||'';hud(x,[ph,'attempt '+(G.attempts+1)+' · parked '+G.parked+' · target 2–25 cm behind','purple = position detectors · blue = distance detectors']);},
  kebab(x,G){const tot=G.good+G.bad;hud(x,[G.good+' crispy · '+G.bad+' raw',tot?Math.round(G.good/tot*100)+'% crispy overall':'waiting for the first cut'],true);
    const dr=Math.min(1,(G.drive||0)/12);x.fillStyle='rgba(5,7,10,.55)';x.fillRect(16,14,320,58);x.fillStyle=C.mu;x.font=`12px ${MONO}`;x.fillText('MBON drive → cut threshold',26,34);
    x.fillStyle='#243042';x.fillRect(26,44,300,10);x.fillStyle=C.g;x.fillRect(26,44,300*dr,10);x.fillStyle=C.w;x.fillRect(26+300*8/12-1,40,2,18);
    const d=G.done[G.front];x.fillStyle=d>0.6?'#8c4a28':'#ff96a5';x.beginPath();x.arc(36,88,9,0,Math.PI*2);x.fill();x.fillStyle=C.mu;x.fillText('colour the fly sees',52,92);},
  saber(x,G){hud(x,['×'+G.combo,G.hits+' hits · '+G.misses+' misses · '+G.wrong+' wrong swings','red → left saber · blue → right saber']);}
};

const BUILD={dino:buildDino,park:buildPark,kebab:buildKebab,saber:buildSaber};
S3.init=async function(canvas,base){
  try{
    if(!window.THREE||!window.Fly3D)throw new Error('three.js not loaded');
    S3.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    
    S3.renderer.shadowMap.enabled=true;S3.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    await Fly3D.load(base||'');S3.canvas=canvas;S3.ok=true;return true;
  }catch(e){console.warn('3D unavailable, using 2D scenes:',e.message);S3.failed=true;return false;}
};
S3.render=function(id,G,hudCtx){
  if(!S3.ok)return false;
  if(!S3.scenes[id])S3.scenes[id]=BUILD[id]();
  const s=S3.scenes[id],cv=S3.canvas,w=cv.clientWidth,h=cv.clientHeight;
  if(w&&h&&(cv._w!==w||cv._h!==h)){S3.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));S3.renderer.setSize(w,h,false);cv._w=w;cv._h=h;}
  if(s.cam.aspect!==w/h&&h){   // keep the designed horizontal view (960:360) when the panel is taller
    const a0=960/360,a=w/h,f0=s.cam.userData.f0||(s.cam.userData.f0=s.cam.fov),r=Math.PI/180;
    s.cam.fov=a>=a0?f0:2*Math.atan(Math.tan(f0*r/2)*a0/a)/r;s.cam.aspect=a;s.cam.updateProjectionMatrix();}
  s.update(G);S3.renderer.render(s.sc,s.cam);HUD[id](hudCtx,G);return true;
};
S3._setupDoner=setupDoner;S3._loadGLB=loadGLB;window.S3=S3;
})();
