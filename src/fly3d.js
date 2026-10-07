// ===== Fly3D: anatomically detailed fruit fly for three.js =====
// Meshes + skeleton: flybody (Vaxenburg et al. 2024, Apache-2.0), via Lulzx/fly-brain (MIT).
// Walking gait: FlySuite real-fly kinematics fit (Lulzx/fly-brain).
(function(){
const PHASE={T1_left:0,T2_right:0,T3_left:0,T1_right:Math.PI,T2_left:Math.PI,T3_right:Math.PI};
let asset=null,mats=null;const tmpQ=new THREE.Quaternion(),tmpV=new THREE.Vector3();
function makeMats(){
  const S=(c,o={})=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.55,metalness:0.0},o));
  return {
    eye:S('#b3150d',{roughness:0.28,emissive:'#3a0000',emissiveIntensity:0.6}),
    ocelli:S('#2a1206',{roughness:0.3}),
    bristle:S('#24160b',{roughness:0.6}),
    wing:new THREE.MeshStandardMaterial({color:'#cfe0f5',transparent:true,opacity:0.28,roughness:0.15,metalness:0.1,side:THREE.DoubleSide,depthWrite:false}),
    vein:S('#5c4228'),claw:S('#2e1d10'),pale:S('#c9ad78'),
    abdomen:S('#a8732f',{roughness:0.42}),leg:S('#a87b3c'),antenna:S('#8a5e2c'),thorax:S('#8c6230',{roughness:0.45}),head:S('#9b6a2f')
  };
}
function matFor(n){
  if(n==='head_red')return mats.eye;if(n==='head_ocelli')return mats.ocelli;
  if(/black|bristle/.test(n))return mats.bristle;if(/membrane/.test(n))return mats.wing;
  if(/wing_.*brown/.test(n))return mats.vein;if(/claw/.test(n))return mats.claw;if(/lower/.test(n))return mats.pale;
  if(/^abdomen/.test(n))return mats.abdomen;if(/coxa|femur|tibia|tarsus|haltere/.test(n))return mats.leg;
  if(/^antenna/.test(n))return mats.antenna;if(/thorax/.test(n))return mats.thorax;return mats.head;
}
async function load(base){
  if(asset)return asset;
  const [j,b]=await Promise.all([fetch(base+'fly3d.json').then(r=>{if(!r.ok)throw new Error('fly3d.json');return r.json();}),fetch(base+'fly_mesh.json').then(r=>{if(!r.ok)throw new Error('fly_mesh.json');return r.json();}).then(m=>{const s=atob(m.b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u.buffer;})]);
  mats=makeMats();const geoms={};
  for(const p of j.parts){const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(b,p.vOff,p.vCount*3),3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(b,p.iOff,p.iCount),1));g.computeVertexNormals();geoms[p.geom]=g;}
  asset={j,geoms};return asset;
}
class Fly{
  constructor(scale=1){
    const J=asset.j;this.root=new THREE.Group();this.inner=new THREE.Group();this.inner.rotation.x=-Math.PI/2;this.inner.scale.setScalar(scale);this.root.add(this.inner);
    this.b={};this.q={};
    for(const n in J.bodies){const g=new THREE.Group();g.name=n;this.b[n]=g;}
    for(const n in J.bodies){const d=J.bodies[n],g=this.b[n];(d.p&&this.b[d.p]?this.b[d.p]:this.inner).add(g);
      g.position.fromArray(d.pos);g.userData.q0=new THREE.Quaternion(d.q[1],d.q[2],d.q[3],d.q[0]);g.quaternion.copy(g.userData.q0);
      g.userData.j=d.j.map(x=>({n:x.n,ax:new THREE.Vector3().fromArray(x.ax).normalize()}));}
    for(const p of J.parts){const m=new THREE.Mesh(asset.geoms[p.geom],matFor(p.geom));m.castShadow=!/membrane/.test(p.geom);if(/membrane/.test(p.geom))m.renderOrder=2;this.b[p.body].add(m);}
  }
  apply(){for(const n in this.b){const g=this.b[n],js=g.userData.j;if(!js.length)continue;const q=g.userData.q0.clone();
    for(const j of js){const a=this.q[j.n];if(a)q.multiply(tmpQ.setFromAxisAngle(j.ax,a));}g.quaternion.copy(q);}}
  gait(phase,amp){const G=asset.j.gait;
    for(const leg of ['T1','T2','T3'])for(const sd of ['left','right']){const key=leg+'_'+sd,phi=phase+PHASE[key];
      for(const jn of G.joints){const [off,a1,p1,a2,p2]=G.params[leg][jn];const q=a1*Math.cos(phi+p1)+a2*Math.cos(2*phi+p2);this.q[jn+'_'+key]=amp*(off+q);}}}
  wings(open,flap){ // open 0 = folded over the back, 1 = spread; flap = stroke phase (radians) when flying
    for(const [sd,s] of [['left',1],['right',-1]]){
      this.q['wing_yaw_'+sd]=s*(open*1.1+(flap!==undefined?Math.sin(flap)*0.9:0));
      this.q['wing_roll_'+sd]=flap!==undefined?0.4+Math.cos(flap)*0.5:0;
      this.q['wing_pitch_'+sd]=flap!==undefined?Math.sin(flap+0.6)*0.6:0;}}
  fold(on){ // folded-at-rest wings (pose from the flybody reference)
    for(const sd of ['left','right']){const g=this.b['wing_'+sd],f=asset.j.fold&&asset.j.fold['wing_'+sd];if(!f)continue;
      if(on){if(!g.userData.qs)g.userData.qs=g.userData.q0;g.userData.q0=new THREE.Quaternion(f[1],f[2],f[3],f[0]);}else if(g.userData.qs){g.userData.q0=g.userData.qs;}}}
  set(n,v){this.q[n]=v;}
  world(body,out){return this.b[body].getWorldPosition(out||new THREE.Vector3());}
}
window.Fly3D={load,Fly,ready:()=>!!asset};
})();
