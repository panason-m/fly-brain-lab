// ===== Fly Brain Arcade core: tiny LIF engine + four tasks (pure logic, no DOM) =====
function makeRng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};}

class Brain{
  constructor(R){this.R=R;this.groups=[];this.N=0;this.v=[];this.spk=[];this.tr=[];this.ext=[];this.kind=[];this.th=[];this.noise=[];this.out=[];this.syn=[];this.flash=[];this.count=[];this.st=[];}
  group(name,n,o={}){
    const g={name,start:this.N,n,label:o.label||name,color:o.color||'#8d9bb0',type:o.type||'lif'};
    for(let i=0;i<n;i++){this.v.push(0);this.spk.push(0);this.tr.push(0);this.ext.push(0);this.kind.push(g.type);this.th.push(o.th||1);this.noise.push(o.noise||0);this.out.push([]);this.flash.push(0);this.count.push(0);this.st.push(0);}
    this.N+=n;this.groups.push(g);return g;
  }
  connect(pre,post,w,plastic=false){const s={pre,post,w,plastic};this.syn.push(s);this.out[pre].push(s);return s;}
  idx(g,i){return g.start+i;}
  setRate(g,i,hz){this.ext[g.start+i]=hz;}
  step(){ // dt = 1 ms
    const R=this.R,N=this.N,v=this.v,spk=this.spk;
    for(let i=0;i<N;i++){
      if(this.kind[i]==='input'){spk[i]=R()<this.ext[i]*0.001?1:0;}
      else{v[i]+= -v[i]*0.05 + (this.noise[i]?(R()-0.5)*this.noise[i]:0) + this.ext[i]*0.001;
        if(v[i]>=this.th[i]){spk[i]=1;v[i]=0;}else{spk[i]=0;if(v[i]<-1)v[i]=-1;}}
    }
    for(let i=0;i<N;i++){
      this.tr[i]=this.tr[i]*0.996+spk[i]; // ~250 ms trace
      this.st[i]=this.st[i]*0.97+spk[i]; // ~33 ms trace
      if(spk[i]){this.flash[i]=1;this.count[i]++;const o=this.out[i];for(let k=0;k<o.length;k++){v[o[k].post]+=o[k].w;}}
    }
  }
  decayFlash(f){for(let i=0;i<this.N;i++)this.flash[i]*=f;}
  snapshotTr(g){const a=[];for(let i=0;i<g.n;i++)a.push(this.tr[g.start+i]);return a;}
}
function clip(x,a,b){return x<a?a:x>b?b:x;}

// ---------- 1. DINO: LC10 detectors -> AOTU relays (plastic) -> DNs -> leg motor neurons ----------
function makeDino(seed){
  const R=makeRng(seed),B=new Brain(R);
  const LC=B.group('LC10',10,{type:'input',label:'LC10a object detectors',color:'#b18cff'});
  const AO=B.group('AOTU',10,{label:'AOTU relays',color:'#ffb454'});
  const DN=B.group('DN',4,{label:'Descending neurons',color:'#56b4ff',noise:0.04});
  const MN=B.group('MN',3,{label:'Front-leg motor neurons',color:'#5fe39a'});
  for(let i=0;i<10;i++)for(let j=0;j<10;j++)B.connect(LC.start+i,AO.start+j,R()*0.02,true);
  for(let j=0;j<10;j++)for(let k=0;k<4;k++)B.connect(AO.start+j,DN.start+k,0.3);
  for(let k=0;k<4;k++)for(let m=0;m<3;m++)B.connect(DN.start+k,MN.start+m,0.55);
  const G={name:'dino',B,LC,AO,DN,MN,R,t:0,speed:0.32,cacti:[],nextGap:300,y:0,vy:0,air:false,jumpT:-1e9,jumpTr:null,
    score:0,best:0,lives:0,history:[],learn:true,events:[],lastMsg:'Naive fly: it has never seen a cactus.'};
  G.reset=function(){G.cacti=[];G.nextGap=250+R()*200;G.y=0;G.vy=0;G.air=false;G.score=0;G.speed=0.32;G.distSinceSpawn=0;};
  G.reset();
  const DX=100,BIN=40,GRAV=0.0029,VY0=0.74;
  G.tick=function(){
    G.t++;
    // world
    for(const c of G.cacti)c.x-=G.speed;
    G.distSinceSpawn+=G.speed;
    if(G.distSinceSpawn>=G.nextGap){G.cacti.push({x:900,w:16+R()*18,h:32+R()*18,passed:false});G.distSinceSpawn=0;G.nextGap=280+R()*340;}
    while(G.cacti.length&&G.cacti[0].x+G.cacti[0].w<0)G.cacti.shift();
    // detectors
    for(let i=0;i<10;i++){const a=DX+i*BIN,b=a+BIN;let cov=0;for(const c of G.cacti){const o=Math.min(b,c.x+c.w)-Math.max(a,c.x);if(o>0)cov+=o;}B.setRate(LC,i,cov>0?60+160*Math.min(1,cov/20):2);}
    B.step();
    // motor -> jump
    let m=0;for(let k=0;k<3;k++)m+=B.spk[MN.start+k];
    if(m>0&&!G.air){G.air=true;G.vy=VY0;G.jumpT=G.t;G.jumpTr=B.snapshotTr(LC);}
    if(G.air){G.y+=G.vy;G.vy-=GRAV;if(G.y<=0){G.y=0;G.air=false;G.vy=0;}}
    // collisions / scoring
    for(const c of G.cacti){
      if(!c.passed&&c.x+c.w<60){c.passed=true;G.score++;G.speed=Math.min(0.5,G.speed+0.004);}
      if(c.x<DX&&c.x+c.w>60&&G.y<c.h){crash(G.air&&G.vy<0?'early':'late');return;}
    }
  };
  function crash(kind){
    G.lives++;G.history.push(G.score);G.best=Math.max(G.best,G.score);
    if(G.learn){
      if(kind==='late'){const tr=B.snapshotTr(LC);applyLC(tr,+0.03);G.lastMsg='Crash: jumped too late → strengthen synapses from detectors active just before.';}
      else{applyLC(G.jumpTr||B.snapshotTr(LC),-0.03);G.lastMsg='Crash: jumped too early → weaken synapses active at take-off.';}
    } else G.lastMsg='Crash ('+kind+'). Learning is off.';
    G.events.push({t:G.t,kind});G.reset();
  }
  function applyLC(tr,eta){for(const s of B.syn){if(!s.plastic)continue;const i=s.pre-LC.start;s.w=clip(s.w+eta*Math.min(1,tr[i]/40),0,0.32);}}
  G.plasticStats=()=>B.syn.filter(s=>s.plastic);
  return G;
}

// ---------- 2. PARALLEL PARKING ----------
// Two learned decisions, both with crash-gated credit:
//   TURN : position detectors (where the car is beside the front parked car) -> relays -> "start reversing in" neuron
//   BRAKE: distance detectors (gap to the rear parked car while reversing)   -> relays -> brake motor neurons
// The S-shaped steering itself (full lock, then counter-steer at ~56°) is a fixed reflex.
// Units: 1 px = 1 cm. y grows towards the curb. Car pose = rear-axle centre (x,y) + heading th.
function makePark(seed){
  const R=makeRng(seed),B=new Brain(R);
  const PS=B.group('POS',10,{type:'input',label:'Position detectors (beside the front car)',color:'#b18cff'});
  const RT=B.group('RT',6,{label:'Turn relays',color:'#ffb454'});
  const TN=B.group('TURN',2,{label:'“Reverse in” command neurons',color:'#ff5fb8'});
  const DD=B.group('DIST',10,{type:'input',label:'Distance detectors (rear car)',color:'#b18cff'});
  const RB=B.group('RB',6,{label:'Brake relays',color:'#ffb454'});
  const BR=B.group('BRAKE',3,{label:'Brake motor neurons',color:'#5fe39a'});
  for(let i=0;i<10;i++)for(let j=0;j<6;j++){B.connect(PS.start+i,RT.start+j,R()*0.02,true);B.connect(DD.start+i,RB.start+j,R()*0.02,true);}
  for(let j=0;j<6;j++){for(let k=0;k<2;k++)B.connect(RT.start+j,TN.start+k,0.4);for(let k=0;k<3;k++)B.connect(RB.start+j,BR.start+k,0.35);}
  const W={curb:300,laneY:200,slotY:272,rearCar:[100,190],frontCar:[340,430],carL:90,carW:44,ovR:14,wb:56,Rmin:80};
  W.th1=Math.acos(1-(W.slotY-W.laneY)/(2*W.Rmin));   // swing angle for the lateral shift
  const G={name:'park',B,PS,RT,TN,DD,RB,BR,R,W,t:0,attempts:0,parked:0,history:[],learn:true,
    lastMsg:'Naive fly: it has never parallel parked.',WALL:W.rearCar[1],ZONE:[2,25]};
  G.reset=function(){G.x=-60+R()*40;G.y=W.laneY;G.th=0;G.v=0.16;G.phase='drive';G.turnTr=null;G.firstBrakeTr=null;G.brake=0;G.steer=0;G.stopT=0;G.hit=null;};
  G.reset();
  // corners of a car (rear-axle pose) for collision tests
  function corners(x,y,th){const c=Math.cos(th),s=Math.sin(th),hw=W.carW/2,out=[];
    for(const [lx,ly] of [[-W.ovR,-hw],[W.carL-W.ovR,-hw],[W.carL-W.ovR,hw],[-W.ovR,hw],[W.carL/2-W.ovR,hw],[-W.ovR,0],[W.carL-W.ovR,0]])out.push([x+lx*c-ly*s,y+lx*s+ly*c]);return out;}
  G.corners=()=>corners(G.x,G.y,G.th);
  function inBox(p,b){return p[0]>b[0]&&p[0]<b[1]&&p[1]>W.slotY-W.carW/2&&p[1]<W.slotY+W.carW/2;}
  function collide(){for(const p of G.corners()){if(inBox(p,W.rearCar))return 'rear';if(inBox(p,W.frontCar))return 'front';if(p[1]>W.curb)return 'curb';}return null;}
  G.tick=function(){
    G.t++;
    // sensors
    const rel=G.x-W.frontCar[0];                     // rear axle vs the front car's rear bumper
    for(let i=0;i<10;i++){const a=-60+i*15;B.setRate(PS,i,(G.phase==='drive'&&rel>=a&&rel<a+15)?220:3);}
    const gap=(G.x-W.ovR*Math.cos(G.th))-W.rearCar[1];   // rear bumper to the rear car
    for(let i=0;i<10;i++){const a=i*15;B.setRate(DD,i,(G.phase==='straight'&&gap>=a&&gap<a+15)?220:3);}
    B.step();
    let bs=0;for(let k=0;k<3;k++)bs+=B.st[BR.start+k];G.brake=bs;
    const turnSpk=B.spk[TN.start]+B.spk[TN.start+1];
    if(G.phase==='drive'){
      G.x+=G.v;
      if(turnSpk>0){G.phase='arc1';G.turnTr=B.snapshotTr(PS);G.v=-0.12;}
      else if(rel>110){finish('missed');return;}
    }else if(G.phase==='arc1'||G.phase==='arc2'){
      const k=(G.phase==='arc1'?1:-1)/W.Rmin;       // curvature (full lock, then counter-steer)
      G.steer=G.phase==='arc1'?1:-1;
      G.x+=G.v*Math.cos(G.th);G.y+=G.v*Math.sin(G.th);G.th+=G.v*k;  // reversing: th goes negative in arc1
      if(G.phase==='arc1'&&G.th<=-W.th1)G.phase='arc2';
      if(G.phase==='arc2'&&G.th>=0){G.th=0;G.y=W.slotY;G.phase='straight';G.steer=0;G.v=-0.07;}
    }else if(G.phase==='straight'){
      if(bs>0.5&&!G.firstBrakeTr)G.firstBrakeTr=B.snapshotTr(DD);
      G.v=Math.min(0,G.v+bs*0.00045);G.x+=G.v;
      if(G.v>=-0.0005){G.stopT++;if(G.stopT>120){finish('stop');return;}}else G.stopT=0;
    }
    const c=G.phase==='drive'?null:collide();
    if(c){finish(c);}
  };
  function credit(tr,grp,dst,eta){for(const s of B.syn){if(!s.plastic)continue;if(s.post<dst.start||s.post>=dst.start+dst.n)continue;const i=s.pre-grp.start;s.w=clip(s.w+eta*Math.min(1,tr[i]/30),0,0.32);}}
  function finish(kind){
    G.attempts++;const L=G.learn;let res,msg;
    const gap=(G.x-W.ovR)-W.rearCar[1],front=G.x+W.carL-W.ovR;
    if(kind==='missed'){res=-1;if(L)credit(B.snapshotTr(PS),PS,RT,+0.03);msg='Drove past the gap → strengthen turn synapses from position detectors (turn earlier).';}
    else if(kind==='front'){res=-1;if(L)credit(G.turnTr,PS,RT,+0.025);msg='Hit the front car → started too late; strengthen earlier position synapses.';}
    else if(kind==='rear'&&G.phase!=='straight'){res=-1;if(L)credit(G.turnTr,PS,RT,-0.025);msg='Swung into the rear car → started too early; weaken the synapses that triggered the turn.';}
    else if(kind==='rear'){res=-1;if(L)credit(B.snapshotTr(DD),DD,RB,+0.03);msg='Bumped the rear car → braked too late; strengthen near-distance brake synapses.';}
    else if(kind==='curb'){res=-1;if(L)credit(G.turnTr,PS,RT,-0.02);msg='Hit the curb → turn timing off; weaken the turn trigger.';}
    else if(front>W.frontCar[0]-2){res=-1;if(L)credit(G.turnTr,PS,RT,+0.02);msg='Stopped with the nose sticking out → started too late.';}
    else if(gap>G.ZONE[1]){res=gap;if(L)credit(G.firstBrakeTr||B.snapshotTr(DD),DD,RB,-0.012);msg='Stopped '+gap.toFixed(0)+' cm from the rear car → braked too early; weaken brake synapses.';}
    else{res=gap;G.parked++;msg='Parallel parked! '+gap.toFixed(0)+' cm behind, '+(W.frontCar[0]-front).toFixed(0)+' cm in front.';}
    G.lastMsg=L?msg:msg.replace(/ → .*$/,'.')+(L?'':' (learning off)');
    G.history.push(res);G.reset();
  }
  return G;
}

// ---------- 3. DONER KEBAB: colour inputs -> Kenyon cells (sparse) -> MBON "cut" (dopamine-gated plasticity) ----------
function makeKebab(seed){
  const R=makeRng(seed),B=new Brain(R);
  const CI=B.group('COL',8,{type:'input',label:'Colour inputs (brown / pink)',color:'#b18cff'});
  const KC=B.group('KC',30,{label:'Kenyon cells (mushroom body)',color:'#ffb454',th:1});
  const MB=B.group('MBON',2,{label:'MBON “cut” output',color:'#5fe39a',noise:0.02});
  for(let k=0;k<30;k++){const base=k%2?0:4;const pick=new Set();while(pick.size<3)pick.add(R()<0.9?base+Math.floor(R()*4):Math.floor(R()*8));for(const i of pick)B.connect(CI.start+i,KC.start+k,0.4);}
  for(let k=0;k<30;k++)for(let m=0;m<2;m++)B.connect(KC.start+k,MB.start+m,0.065+R()*0.01,true);
  const G={name:'kebab',B,CI,KC,MB,R,t:0,learn:true,good:0,bad:0,history:[],lastMsg:'Naive fly: cuts anything that passes the knife.',slices:[],angle:0,cool:0,window:[]};
  const S=24;G.S=S;G.done=[];for(let i=0;i<S;i++)G.done.push(R());
  G.tick=function(){
    G.t++;
    G.angle=(G.angle+0.0009)%(Math.PI*2);
    // sector facing knife (front at angle 0)
    const front=((Math.round((-G.angle)/(Math.PI*2)*S)%S)+S)%S;G.front=front;
    for(let i=0;i<S;i++){ if(i!==front)G.done[i]=Math.min(1,G.done[i]+0.00002); }
    const d=G.done[front];
    for(let i=0;i<4;i++)B.setRate(CI,i,d>0.6?40+150*d:4);       // brown channels
    for(let i=4;i<8;i++)B.setRate(CI,i,d<0.6?40+150*(1-d):4);   // pink channels
    B.step();
    if(G.cool>0)G.cool--;
    G.drive=B.st[MB.start]+B.st[MB.start+1];
    if(G.drive>8&&G.cool===0){cut(front);}
  };
  function cut(i){
    const d=G.done[i],brown=d>0.6;G.cool=500;
    G.slices.push(brown?1:0);if(G.slices.length>40)G.slices.shift();
    if(brown)G.good++;else G.bad++;
    G.history.push(brown?1:0);
    if(G.learn){const eta=brown?0.004:-0.02;for(const s of B.syn){if(!s.plastic)continue;const k=s.pre-KC.start;s.w=clip(s.w+eta*Math.min(1,B.st[s.pre]/1.5),0,0.4);}
      G.lastMsg=brown?'Crispy slice! Reward dopamine (PAM) → strengthen active Kenyon-cell synapses.':'Raw slice! Punishment dopamine (PPL1) → weaken active Kenyon-cell synapses.';}
    else G.lastMsg=brown?'Crispy slice.':'Raw slice.';
    G.done[i]=0.05;
  }
  return G;
}

// ---------- 4. BEAT SABER: colour x depth detectors -> DN_L / DN_R (plastic) -> saber motor neurons ----------
function makeSaber(seed){
  const R=makeRng(seed),B=new Brain(R);
  const VD=B.group('VIS',8,{type:'input',label:'Visual detectors (colour × depth)',color:'#b18cff'});
  const DL=B.group('DNL',3,{label:'DN left (red saber)',color:'#ff5f6d',noise:0.03});
  const DR=B.group('DNR',3,{label:'DN right (blue saber)',color:'#56b4ff',noise:0.03});
  const ML=B.group('ML',1,{label:'Left swing MN',color:'#ff5f6d'});
  const MR=B.group('MR',1,{label:'Right swing MN',color:'#56b4ff'});
  for(let i=0;i<8;i++){for(let k=0;k<3;k++){B.connect(VD.start+i,DL.start+k,R()*0.03,true);B.connect(VD.start+i,DR.start+k,R()*0.03,true);}}
  for(let k=0;k<3;k++){B.connect(DL.start+k,ML.start,0.55);B.connect(DR.start+k,MR.start,0.55);B.connect(DL.start+k,DR.start+k,-0.3);B.connect(DR.start+k,DL.start+k,-0.3);}
  const G={name:'saber',B,VD,DL,DR,ML,MR,R,t:0,learn:true,blocks:[],hits:0,misses:0,wrong:0,combo:0,history:[],lastMsg:'Naive fly: it has never held a saber.',swingL:0,swingR:0,coolL:0,coolR:0,next:600};
  // block z: 1 (far) -> 0 (hit plane). hit window z in [0,0.08]
  G.tick=function(){
    G.t++;
    G.next--;if(G.next<=0){G.blocks.push({z:1,c:R()<0.5?'r':'b',lane:R()<0.5?0:1,done:false});G.next=650+R()*600;}
    for(const b of G.blocks)b.z-=0.00055;
    for(let i=0;i<8;i++)B.setRate(VD,i,2);
    for(const b of G.blocks){if(b.done||b.z<-0.05)continue;const bin=b.z>0.4?-1:b.z>0.3?0:b.z>0.2?1:b.z>0.1?2:3;if(bin<0)continue;B.setRate(VD,(b.c==='r'?0:4)+bin,200);}
    B.step();
    if(G.coolL>0)G.coolL--;if(G.coolR>0)G.coolR--;
    if(B.spk[ML.start]&&G.coolL===0){G.coolL=300;G.swingL=1;swing('r',DL);}
    if(B.spk[MR.start]&&G.coolR===0){G.coolR=300;G.swingR=1;swing('b',DR);}
    G.swingL*=0.985;G.swingR*=0.985;
    for(const b of G.blocks){if(!b.done&&b.z<-0.04){b.done=true;b.miss=true;G.misses++;G.combo=0;G.history.push(0);
      if(G.learn){adj(b.c==='r'?DL:DR,+0.04);G.lastMsg='Missed a '+(b.c==='r'?'red':'blue')+' block → strengthen synapses onto the '+(b.c==='r'?'left':'right')+' saber DNs.';}else G.lastMsg='Missed.';}}
    G.blocks=G.blocks.filter(b=>b.z>-0.3);
  };
  function swing(col,DN){
    const tgt=G.blocks.find(b=>!b.done&&b.z<=0.22&&b.z>=-0.04);
    if(tgt&&tgt.c===col){tgt.done=true;tgt.hit=true;G.hits++;G.combo++;G.history.push(1);if(G.learn)adj(DN,+0.01);G.lastMsg='Slice! Combo ×'+G.combo+'.';}
    else{G.wrong++;G.combo=0;if(G.learn){adj(DN,-0.05,true);}G.lastMsg=tgt?'Wrong saber colour → weaken synapses that triggered this swing.':'Swung at nothing → weaken synapses that triggered this swing.';G.history.push(0);}
  }
  function adj(DN,eta,short){for(const s of B.syn){if(!s.plastic)continue;if(s.post<DN.start||s.post>=DN.start+DN.n)continue;const e=short?Math.min(1,B.st[s.pre]/4):Math.min(1,B.tr[s.pre]/40);s.w=clip(s.w+eta*e,0,0.35);}}
  return G;
}

if(typeof module!=='undefined')module.exports={makeDino,makePark,makeKebab,makeSaber};
if(typeof window!=='undefined')window.FlyCore={makeDino,makePark,makeKebab,makeSaber};
