// ===== Fly Brain Lab app: routing, arcade rendering, charts =====
(function(){
const C=window.FlyCore;
const $=s=>document.querySelector(s);
const COL={bg:'#0a0e14',panel:'#121823',line:'#243042',dim:'#3a4658',fg:'#e9eef5',mu:'#8d9bb0',g:'#5fe39a',p:'#b18cff',b:'#56b4ff',m:'#ff5fb8',w:'#ffb454',red:'#ff5f6d'};
const MONO='"JetBrains Mono", ui-monospace, Consolas, monospace';

/* ---------------- canvas helper ---------------- */
function fitView(x){const cv=x.canvas,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;const d=Math.min(2,window.devicePixelRatio||1);
  if(cv._w!==w||cv._h!==h||cv._d!==d){cv.width=Math.round(w*d);cv.height=Math.round(h*d);cv._w=w;cv._h=h;cv._d=d;}x.setTransform(d,0,0,d,0,0);x.W=w;x.H=h;x.dpr=d;}
function setup(cv,w,h){const d=Math.min(2,window.devicePixelRatio||1);cv.width=w*d;cv.height=h*d;const x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);x.W=w;x.H=h;return x;}

/* ---------------- game definitions ---------------- */
const GAMES={
  dino:{make:C.makeDino,title:'Fly Runner',tag:'Chrome Dino-style',color:COL.g,icon:'i-walk',
    circuit:'10 LC10a object detectors → 10 AOTU relays → 4 descending neurons → 3 front-leg motor neurons. Detector → relay synapses are plastic.',
    rule:'Crash-gated credit assignment. Jumped too late: strengthen synapses from detectors active in the last ~0.5 s. Jumped too early: weaken synapses active at take-off. Clean jumps change nothing.',
    refs:[['shovon/malecns-v1-dinosaur-game (GitHub)','https://github.com/shovon/malecns-v1-dinosaur-game'],['Fly Dino · connectome learning experiment','https://flydino.cobanov.dev/']]},
  park:{make:C.makePark,title:'Parallel Parking',tag:'parallel-parking meme',color:COL.b,icon:'i-car',
    circuit:'Two pathways. Turn: 10 position detectors (where the car is beside the front parked car) → 6 relays → 2 “reverse in” command neurons. Brake: 10 distance detectors (gap to the rear car) → 6 relays → 3 brake motor neurons. The S-shaped steering (full lock, then counter-steer) is a fixed reflex. Both detector → relay layers are plastic.',
    rule:'Crash-gated credit on two decisions. Drove past the gap or hit the front car: started too late, strengthen the position synapses traced at the turn. Swung into the rear car: started too early, weaken them. Bumped the rear car while straightening: strengthen near-distance brake synapses; stopped short: weaken them. Success: car inside the gap, 2–25 cm behind, nose clear.',
    refs:[['@alright_mark · fly brain parallel parks (X)','https://x.com/alright_mark/status/2098085928489177142']]},
  kebab:{make:C.makeKebab,title:'Doner Kebab',tag:'kebab-cutting meme',color:COL.w,icon:'i-knife',
    circuit:'8 colour inputs (brown / pink) → 30 Kenyon cells with sparse random wiring → 2 mushroom-body output neurons that trigger the knife. Kenyon cell → MBON synapses are plastic.',
    rule:'Dopamine-gated learning, as in the fly mushroom body. Crispy slice: reward dopamine (PAM) strengthens recently active Kenyon-cell synapses. Raw slice: punishment dopamine (PPL1) weakens them.',
    refs:[['@oozn · fly brain cuts doner kebab (X)','https://x.com/oozn/status/2098508072670912833']]},
  saber:{make:C.makeSaber,title:'Rhythm Slicer',tag:'Beat Saber-style',color:COL.m,icon:'i-saber',
    circuit:'8 visual detectors (red / blue × 4 depths) → 3 left-saber and 3 right-saber descending neurons (mutually inhibitory) → 2 swing motor neurons. Detector → DN synapses are plastic.',
    rule:'Missed block: strengthen synapses onto the saber that should have swung. Wrong colour or empty swing: weaken the synapses that just triggered it. Correct slice: small reward.',
    refs:[['@_lyraaaa_ · fly brain plays Beat Saber (X)','https://x.com/_lyraaaa_/status/2097527368919470162'],['404 Media · A digital fly brain has taken over the internet','https://www.404media.co/a-digital-fly-brain-has-taken-over-the-internet/']]}
};

/* ---------------- fly characters ---------------- */
// Side view, facing right (dir=1) or left (dir=-1). Returns the world position of the front "hand" (tarsus).
function flySide(x,cx,cy,s,o={}){
  const dir=o.dir||1,t=o.t||0,arm=o.arm===undefined?0.9:o.arm,run=o.run||0,flap=o.flap||0;
  x.save();x.translate(cx,cy);x.scale(s*dir,s);x.lineCap='round';x.lineJoin='round';
  // far wing
  x.fillStyle='rgba(190,210,255,.14)';x.strokeStyle='rgba(210,225,255,.45)';x.lineWidth=0.8;
  const wa=-0.35-(flap?Math.abs(Math.sin(t*0.08))*0.9:0);
  x.save();x.translate(-2,-9);x.rotate(wa);x.beginPath();x.ellipse(-14,0,17,6,0,0,Math.PI*2);x.fill();x.stroke();x.restore();
  // legs (mid + hind), alternating when running
  x.strokeStyle='#3b2a1c';x.lineWidth=1.8;
  const ph=run?Math.sin(t*0.05):0;
  x.beginPath();
  x.moveTo(-2,5);x.lineTo(-8+ph*4,12);x.lineTo(-12+ph*6,22);
  x.moveTo(-6,5);x.lineTo(-16-ph*4,12);x.lineTo(-22-ph*6,22);
  x.moveTo(3,6);x.lineTo(2-ph*4,13);x.lineTo(4-ph*5,22);
  x.stroke();
  // abdomen (striped)
  x.fillStyle='#d9a441';x.beginPath();x.ellipse(-13,2,13,8.5,0.12,0,Math.PI*2);x.fill();
  x.fillStyle='#3b2a1c';for(const sx of [-20,-14,-8]){x.beginPath();x.ellipse(sx,2.5,2.2,8,0.12,0,Math.PI*2);x.fill();}
  // thorax
  x.fillStyle='#c98f3a';x.beginPath();x.ellipse(2,-1,9,8,0,0,Math.PI*2);x.fill();
  x.fillStyle='rgba(60,40,20,.35)';x.beginPath();x.ellipse(1,-5,6,2.5,0,0,Math.PI*2);x.fill();
  // near wing
  x.fillStyle='rgba(200,220,255,.22)';x.strokeStyle='rgba(220,232,255,.7)';x.lineWidth=0.9;
  x.save();x.translate(0,-7);x.rotate(wa+0.12);x.beginPath();x.ellipse(-15,0,18,6.5,0,0,Math.PI*2);x.fill();x.stroke();
  x.strokeStyle='rgba(220,232,255,.35)';x.beginPath();x.moveTo(-2,0);x.lineTo(-30,0);x.moveTo(-6,2);x.lineTo(-26,4);x.stroke();x.restore();
  // head + eye + antenna
  x.fillStyle='#b8823a';x.beginPath();x.arc(13,-4,6.5,0,Math.PI*2);x.fill();
  x.fillStyle='#e0302f';x.beginPath();x.ellipse(14,-5,4.6,5.4,0,0,Math.PI*2);x.fill();
  x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.arc(15.5,-7,1.4,0,Math.PI*2);x.fill();
  x.strokeStyle='#3b2a1c';x.lineWidth=1.2;x.beginPath();x.moveTo(17,-9);x.lineTo(20,-13);x.stroke();
  // front leg (the "arm")
  const sh=[8,4],L1=10,L2=11;const a1=arm,a2=arm+0.5;
  const el=[sh[0]+Math.cos(a1)*L1,sh[1]+Math.sin(a1)*L1],hd=[el[0]+Math.cos(a2)*L2,el[1]+Math.sin(a2)*L2];
  x.strokeStyle='#3b2a1c';x.lineWidth=2;x.beginPath();x.moveTo(sh[0],sh[1]);x.lineTo(el[0],el[1]);x.lineTo(hd[0],hd[1]);x.stroke();
  x.restore();
  return [cx+dir*hd[0]*s,cy+hd[1]*s];
}
// Back view (seen from behind). Returns [leftHand, rightHand].
function flyBack(x,cx,cy,s,aL,aR){
  x.save();x.translate(cx,cy);x.scale(s,s);x.lineCap='round';x.lineJoin='round';
  // wings
  x.fillStyle='rgba(200,220,255,.18)';x.strokeStyle='rgba(220,232,255,.6)';x.lineWidth=0.8;
  for(const d of [-1,1]){x.save();x.translate(d*4,-2);x.rotate(d*0.55);x.beginPath();x.ellipse(d*2,16,6.5,19,0,0,Math.PI*2);x.fill();x.stroke();x.restore();}
  // mid/hind legs
  x.strokeStyle='#3b2a1c';x.lineWidth=1.8;x.beginPath();
  for(const d of [-1,1]){x.moveTo(d*7,2);x.lineTo(d*18,8);x.lineTo(d*22,20);x.moveTo(d*6,6);x.lineTo(d*14,16);x.lineTo(d*15,28);}
  x.stroke();
  // abdomen
  x.fillStyle='#d9a441';x.beginPath();x.ellipse(0,16,10,15,0,0,Math.PI*2);x.fill();
  x.fillStyle='#3b2a1c';for(const yy of [10,17,24]){x.fillRect(-9,yy,18,2.4);}
  // thorax
  x.fillStyle='#c98f3a';x.beginPath();x.ellipse(0,-2,10,9,0,0,Math.PI*2);x.fill();
  // head + eyes (seen from behind: eyes bulge at the sides)
  x.fillStyle='#b8823a';x.beginPath();x.ellipse(0,-15,8,6.5,0,0,Math.PI*2);x.fill();
  x.fillStyle='#e0302f';x.beginPath();x.ellipse(-7.5,-15,3.5,5,0,0,Math.PI*2);x.ellipse(7.5,-15,3.5,5,0,0,Math.PI*2);x.fill();
  // arms
  const hands=[];
  for(const [d,a] of [[-1,aL],[1,aR]]){const sh=[d*8,-5];const el=[sh[0]+Math.cos(a)*9,sh[1]+Math.sin(a)*9];const hd=[el[0]+Math.cos(a)*9,el[1]+Math.sin(a)*9];
    x.strokeStyle='#3b2a1c';x.lineWidth=2.2;x.beginPath();x.moveTo(sh[0],sh[1]);x.lineTo(el[0],el[1]);x.lineTo(hd[0],hd[1]);x.stroke();hands.push([cx+hd[0]*s,cy+hd[1]*s]);}
  x.restore();return hands;
}
// Top view (driver seat). Front legs reach forward to the wheel.
function flyTop(x,cx,cy,s,t){
  x.save();x.translate(cx,cy);x.scale(s,s);x.lineCap='round';
  x.fillStyle='rgba(200,220,255,.2)';x.strokeStyle='rgba(220,232,255,.55)';x.lineWidth=0.8;
  for(const d of [-1,1]){x.save();x.rotate(d*0.35);x.beginPath();x.ellipse(-14,d*7,15,5.5,0,0,Math.PI*2);x.fill();x.stroke();x.restore();}
  x.strokeStyle='#3b2a1c';x.lineWidth=1.6;x.beginPath();
  for(const d of [-1,1]){x.moveTo(0,d*5);x.lineTo(5,d*9);x.lineTo(12,d*7);x.moveTo(-2,d*6);x.lineTo(-6,d*12);x.moveTo(-5,d*5);x.lineTo(-12,d*11);}
  x.stroke();
  x.fillStyle='#d9a441';x.beginPath();x.ellipse(-11,0,10,6.5,0,0,Math.PI*2);x.fill();
  x.fillStyle='#3b2a1c';for(const sx of [-16,-11,-6])x.fillRect(sx,-6,2,12);
  x.fillStyle='#c98f3a';x.beginPath();x.arc(1,0,6.5,0,Math.PI*2);x.fill();
  x.fillStyle='#b8823a';x.beginPath();x.arc(9,0,4.6,0,Math.PI*2);x.fill();
  x.fillStyle='#e0302f';x.beginPath();x.ellipse(10,-3.6,2.6,2.2,0,0,Math.PI*2);x.ellipse(10,3.6,2.6,2.2,0,0,Math.PI*2);x.fill();
  x.restore();
}

/* ---------------- draw: game scenes (960×360 logical) ---------------- */
function drawDino(x,G){
  const B=G.B;x.fillStyle=COL.bg;x.fillRect(0,0,x.W,x.H);
  for(let i=0;i<10;i++){const r=B.ext[G.LC.start+i];const a=Math.min(1,r/220);const f=B.flash[G.LC.start+i];
    x.fillStyle=`rgba(177,140,255,${0.05+a*0.22})`;x.fillRect(100+i*40,190,38,110);
    x.fillStyle=`rgba(177,140,255,${0.3+f*0.7})`;x.fillRect(100+i*40,304,38,4);}
  x.fillStyle=COL.mu;x.font=`12px ${MONO}`;x.fillText('what the fly’s LC10a detectors see',100,186);
  x.strokeStyle=COL.line;x.lineWidth=2;x.beginPath();x.moveTo(0,300);x.lineTo(x.W,300);x.stroke();
  for(let i=0;i<24;i++){const gx=((i*53-G.t*G.speed)%1000+1000)%1000;x.fillStyle=COL.dim;x.fillRect(gx,312+(i%3)*8,10+(i%4)*4,2);}
  for(const c of G.cacti){x.fillStyle='#3fa36b';const top=300-c.h;x.fillRect(c.x,top,c.w,c.h);x.fillRect(c.x-6,top+12,6,4);x.fillRect(c.x-6,top+4,4,10);x.fillRect(c.x+c.w,top+18,6,4);x.fillRect(c.x+c.w+2,top+8,4,12);}
  const jumping=G.air;
  flySide(x,78,278-G.y,1.25,{t:G.t,run:!jumping,flap:jumping,arm:jumping?-0.5:0.9});
  x.fillStyle=COL.fg;x.font=`600 22px ${MONO}`;x.textAlign='right';x.fillText(String(G.score).padStart(4,'0'),x.W-24,40);
  x.font=`13px ${MONO}`;x.fillStyle=COL.mu;x.fillText('BEST '+String(G.best).padStart(4,'0')+'  ·  LIFE '+(G.lives+1),x.W-24,62);x.textAlign='left';
}
function drawPark(x,G){
  const B=G.B,W=G.W,ox=40,oy=-60,sx=v=>ox+v*1.6,sy=v=>oy+v*1.2;
  x.fillStyle='#2b3038';x.fillRect(0,0,x.W,x.H);
  x.fillStyle='#8a8f98';x.fillRect(0,sy(W.curb),x.W,8);x.fillStyle='#3d4450';x.fillRect(0,sy(W.curb)+8,x.W,x.H);
  x.strokeStyle='#d9dee6';x.lineWidth=2;x.setLineDash([20,16]);x.beginPath();x.moveTo(0,sy(W.laneY-40));x.lineTo(x.W,sy(W.laneY-40));x.stroke();x.setLineDash([]);
  const car=(px,py,th,col)=>{x.save();x.translate(sx(px),sy(py));x.rotate(th);x.fillStyle=col;x.beginPath();x.roundRect(-W.ovR*1.6,-W.carW*0.6,W.carL*1.6,W.carW*1.2,8);x.fill();x.restore();};
  car(W.rearCar[0]+W.ovR,W.slotY,0,'#7a8494');car(W.frontCar[0]+W.ovR,W.slotY,0,'#9a6b4a');
  for(let i=0;i<10;i++){const a=Math.min(1,B.ext[G.PS.start+i]/220);x.fillStyle=`rgba(177,140,255,${0.08+a*0.6})`;x.fillRect(sx(W.frontCar[0]-60+i*15),sy(W.laneY-36),15*1.6-2,6);}
  for(let i=0;i<10;i++){const a=Math.min(1,B.ext[G.DD.start+i]/220);x.fillStyle=`rgba(86,180,255,${0.08+a*0.6})`;x.fillRect(sx(W.rearCar[1]+i*15),sy(W.curb)-10,15*1.6-2,6);}
  car(G.x,G.y,G.th,'#2f8be0');
  const br=Math.min(1,(G.brake||0)/6);if(br>0.2){x.fillStyle=`rgba(255,60,80,${br})`;const c=Math.cos(G.th),s=Math.sin(G.th);x.beginPath();x.arc(sx(G.x-W.ovR*c),sy(G.y-W.ovR*s),6,0,Math.PI*2);x.fill();}
  x.fillStyle=COL.fg;x.font=`600 20px ${MONO}`;x.fillText({drive:'Driving past the gap',arc1:'Reversing in · full lock',arc2:'Counter-steering',straight:'Straightening · braking'}[G.phase]||'',24,36);
  x.font=`13px ${MONO}`;x.fillStyle=COL.mu;x.fillText('attempt '+(G.attempts+1)+' · parked '+G.parked+' · target 2–25 cm behind',24,58);
}
function drawKebab(x,G){
  x.fillStyle=COL.bg;x.fillRect(0,0,x.W,x.H);
  const gr=x.createLinearGradient(160,0,260,0);gr.addColorStop(0,'rgba(255,120,40,.35)');gr.addColorStop(1,'rgba(255,120,40,0)');x.fillStyle=gr;x.fillRect(150,40,140,280);
  for(let y=60;y<310;y+=22){x.fillStyle='rgba(255,140,60,.6)';x.fillRect(160,y,10,12);}
  const cx=330;x.fillStyle='#9aa6b8';x.fillRect(cx-3,20,6,320);
  const S=G.S,top=60,bot=300,items=[];
  for(let i=0;i<S;i++){let th=i*2*Math.PI/S+G.angle;th=Math.atan2(Math.sin(th),Math.cos(th));if(Math.abs(th)<Math.PI/2)items.push([th,i]);}
  items.sort((a,b)=>Math.abs(b[0])-Math.abs(a[0]));
  for(const [th,i] of items){
    const w0=Math.sin(th-Math.PI/S),w1=Math.sin(th+Math.PI/S);
    const d=G.done[i];const r=Math.round(255-(255-140)*d),g=Math.round(150-(150-74)*d),b=Math.round(165-(165-40)*d);
    const shade=0.55+0.45*Math.cos(th);
    x.fillStyle=`rgb(${Math.round(r*shade)},${Math.round(g*shade)},${Math.round(b*shade)})`;
    x.beginPath();x.moveTo(cx+w0*95,top);x.lineTo(cx+w1*95,top);x.lineTo(cx+w1*72,bot);x.lineTo(cx+w0*72,bot);x.closePath();x.fill();
    if(i===G.front){x.strokeStyle=COL.fg;x.lineWidth=2;x.stroke();}
  }
  // the chef fly, standing on a crate, knife in its front leg
  x.fillStyle='#3a2f26';x.fillRect(440,286,130,40);x.strokeStyle='#5a4a3a';x.lineWidth=2;x.strokeRect(440,286,130,40);x.beginPath();x.moveTo(440,286);x.lineTo(570,326);x.stroke();
  const cutP=G.cool>380?(500-G.cool)/120:0;           // 0 → 1 during a cut
  const arm=-1.55+cutP*1.9;
  const hand=flySide(x,492,226,2.7,{dir:-1,t:G.t,arm});
  // chef hat
  const hx=492-13*2.7,hy=226-4*2.7;x.fillStyle='#f1f4f8';x.fillRect(hx-8,hy-24,16,10);x.beginPath();x.ellipse(hx,hy-26,13,8,0,0,Math.PI*2);x.fill();
  // knife held at the hand, blade pointing at the meat
  x.save();x.translate(hand[0],hand[1]);x.rotate(Math.PI*0.62-cutP*0.5);
  x.fillStyle='#3a2a20';x.fillRect(-4,-3,22,6);
  x.fillStyle='#d6dde8';x.beginPath();x.moveTo(18,-5);x.lineTo(78,-2);x.lineTo(82,2);x.lineTo(18,5);x.closePath();x.fill();
  x.restore();
  if(G.cool>440){x.fillStyle=G.slices[G.slices.length-1]?'#9b5a2e':'#ff9eb0';x.beginPath();x.ellipse(cx+100,140+(500-G.cool)*1.6,12,5,0.4,0,Math.PI*2);x.fill();}
  // colour sensor
  const d=G.done[G.front];x.fillStyle=d>0.6?'#8c4a28':'#ff96a5';x.beginPath();x.arc(600,96,11,0,Math.PI*2);x.fill();
  x.fillStyle=COL.mu;x.font=`12px ${MONO}`;x.fillText('colour the fly sees',618,100);
  // plate
  x.fillStyle='#e6eaf0';x.beginPath();x.ellipse(770,305,160,24,0,0,Math.PI*2);x.fill();
  G.slices.forEach((s,k)=>{const col=k%10,row=Math.floor(k/10);x.fillStyle=s?'#9b5a2e':'#ff9eb0';x.beginPath();x.ellipse(640+col*28,296-row*10,13,6,0,0,Math.PI*2);x.fill();});
  // MBON drive meter
  const dr=Math.min(1,(G.drive||0)/12);x.fillStyle=COL.line;x.fillRect(600,40,300,10);x.fillStyle=COL.g;x.fillRect(600,40,300*dr,10);x.fillStyle=COL.w;x.fillRect(600+300*8/12-1,34,2,22);
  x.fillStyle=COL.mu;x.fillText('MBON drive → cut threshold',600,28);
  const tot=G.good+G.bad;x.fillStyle=COL.fg;x.font=`600 22px ${MONO}`;x.fillText(G.good+' crispy · '+G.bad+' raw',600,150);
  x.font=`13px ${MONO}`;x.fillStyle=COL.mu;x.fillText(tot?Math.round(G.good/tot*100)+'% crispy overall':'waiting for the first cut',600,172);
}
function drawSaber(x,G){
  x.fillStyle='#090c12';x.fillRect(0,0,x.W,x.H);
  const vx=480,vy=30;
  x.fillStyle='#111a26';x.beginPath();x.moveTo(vx-30,vy);x.lineTo(vx+30,vy);x.lineTo(vx+330,360);x.lineTo(vx-330,360);x.closePath();x.fill();
  x.strokeStyle='#1e2c40';x.lineWidth=1;for(let k=0;k<12;k++){const s=((k/12+G.t*0.00055)%1);const yy=vy+(360-vy)*s*s;const hw=30+300*s*s;x.beginPath();x.moveTo(vx-hw,yy);x.lineTo(vx+hw,yy);x.stroke();}
  const hz=(z)=>vy+(330-vy)*Math.pow(1-z,1.6);
  x.fillStyle='rgba(255,95,184,.08)';x.fillRect(150,hz(0.22),660,hz(-0.04)-hz(0.22));
  const bl=[...G.blocks].sort((a,b)=>b.z-a.z);
  for(const b of bl){const s=Math.pow(1-Math.max(-0.3,b.z),1.6);const y=vy+(330-vy)*s;const sz=14+70*s;const lx=vx+(b.lane?1:-1)*(20+150*s);
    let col=b.c==='r'?COL.red:COL.b;let a=1;if(b.hit)a=Math.max(0,1+b.z*6);if(b.miss)col=COL.dim;
    x.globalAlpha=Math.max(0,a);x.fillStyle=col;
    if(b.hit){x.fillRect(lx-sz/2-8,y-sz/2,sz/2-2,sz);x.fillRect(lx+10,y-sz/2,sz/2-2,sz);}else{x.fillRect(lx-sz/2,y-sz/2,sz,sz);x.fillStyle='rgba(255,255,255,.85)';x.beginPath();x.moveTo(lx-sz*0.22,y-sz*0.1);x.lineTo(lx+sz*0.22,y-sz*0.1);x.lineTo(lx,y+sz*0.18);x.closePath();x.fill();}
    x.globalAlpha=1;}
  // the fly, seen from behind, a saber in each front leg
  const aL=-Math.PI/2-0.75+G.swingL*1.2, aR=-Math.PI/2+0.75-G.swingR*1.2;
  const [hL,hR]=flyBack(x,480,300,2.3,aL,aR);
  function saber(h,a,col){x.save();x.translate(h[0],h[1]);x.rotate(a);x.fillStyle='#c5cfdc';x.fillRect(-14,-5,18,10);x.shadowColor=col;x.shadowBlur=18;x.fillStyle=col;x.fillRect(4,-3.5,170,7);x.shadowBlur=0;x.fillStyle='rgba(255,255,255,.7)';x.fillRect(4,-1,170,2);x.restore();}
  saber(hL,aL-0.1,COL.red);saber(hR,aR+0.1,COL.b);
  x.fillStyle=COL.fg;x.font=`600 22px ${MONO}`;x.fillText('×'+G.combo,24,40);
  x.font=`13px ${MONO}`;x.fillStyle=COL.mu;x.fillText(G.hits+' hits · '+G.misses+' misses · '+G.wrong+' wrong swings',24,62);
  x.fillText('red → left saber · blue → right saber',24,82);
}

/* ---------------- anatomical brain map ---------------- */
// Schematic fly CNS (front view of brain, ventral nerve cord below). Not to scale.
const REG={
  OL_L:{t:'e',x:62,y:128,rx:50,ry:84,label:'Optic lobe (L)'},
  OL_R:{t:'e',x:358,y:128,rx:50,ry:84,label:'Optic lobe (R)'},
  AOTU_L:{t:'e',x:150,y:70,rx:15,ry:9,label:'AOTU'},
  AOTU_R:{t:'e',x:270,y:70,rx:15,ry:9,label:'AOTU'},
  CA_L:{t:'e',x:160,y:105,rx:16,ry:13,label:'MB calyx'},
  CA_R:{t:'e',x:260,y:105,rx:16,ry:13,label:'MB calyx'},
  ML_L:{t:'p',pts:[[166,116],[190,160],[190,112],[190,160],[206,160]],w:9,label:'MB lobes'},
  ML_R:{t:'p',pts:[[254,116],[230,160],[230,112],[230,160],[214,160]],w:9,label:'MB lobes'},
  PAM:{t:'d',pts:[[198,178],[204,184],[216,184],[222,178]],label:'PAM dopamine (reward)'},
  PPL1:{t:'d',pts:[[150,140],[156,146],[264,140],[270,146]],label:'PPL1 dopamine (punish)'},
  PS:{t:'e',x:210,y:150,rx:24,ry:10,label:'Posterior slope'},
  GNG:{t:'e',x:210,y:204,rx:36,ry:18,label:'GNG'},
  DN_L:{t:'p',pts:[[200,190],[200,262]],w:7,label:'Descending neurons (L)'},
  DN_R:{t:'p',pts:[[220,190],[220,262]],w:7,label:'Descending neurons (R)'},
  T1_L:{t:'e',x:189,y:290,rx:18,ry:16,label:'Front leg (L)'},
  T1_R:{t:'e',x:231,y:290,rx:18,ry:16,label:'Front leg (R)'},
  T2_L:{t:'e',x:189,y:330,rx:17,ry:15,label:'Mid leg'},
  T2_R:{t:'e',x:231,y:330,rx:17,ry:15,label:'Mid leg'},
  T3_L:{t:'e',x:190,y:368,rx:16,ry:14,label:'Hind leg'},
  T3_R:{t:'e',x:230,y:368,rx:16,ry:14,label:'Hind leg'}
};
// which regions each circuit group lives in
const MAP={
  dino:{LC10:['OL_L','OL_R'],AOTU:['AOTU_L','AOTU_R'],DN:['DN_L','DN_R','PS'],MN:['T1_R']},
  park:{POS:['OL_L','OL_R'],RT:['PS'],TURN:['DN_L','DN_R','GNG'],DIST:['OL_L','OL_R'],RB:['PS'],BRAKE:['T1_L','T1_R','T2_L','T2_R']},
  kebab:{COL:['OL_L','OL_R'],KC:['CA_L','CA_R'],MBON:['ML_L','ML_R'],_cut:['DN_R','T1_R'],_rew:['PAM'],_pun:['PPL1']},
  saber:{VIS:['OL_L','OL_R'],DNL:['DN_L'],DNR:['DN_R'],ML:['T1_L'],MR:['T1_R']}
};
const REGCOL={OL:COL.p,AOTU:COL.w,CA:COL.w,ML:COL.g,PAM:COL.g,PPL1:COL.red,PS:COL.b,GNG:COL.b,DN:COL.b,T1:COL.g,T2:COL.g,T3:COL.g};
const regAct={};
function updateRegions(id,G){
  const B=G.B,m=MAP[id],tgt={};
  for(const g of B.groups){const rs=m[g.name];if(!rs)continue;let s=0;for(let i=0;i<g.n;i++)s+=B.flash[g.start+i];const a=Math.min(1,s/g.n*2.2);for(const r of rs)tgt[r]=Math.max(tgt[r]||0,a);}
  if(id==='kebab'){const c=G.cool>380?1:0;for(const r of m._cut)tgt[r]=Math.max(tgt[r]||0,c);
    if(G.cool>300){const last=G.history[G.history.length-1];for(const r of (last?m._rew:m._pun))tgt[r]=1;}}
  for(const k in REG){const t=tgt[k]||0;regAct[k]=Math.max(t,(regAct[k]||0)*0.9);}
}
function drawAnatomy(x,id,G){
  updateRegions(id,G);
  x.fillStyle=COL.bg;x.fillRect(0,0,x.W,x.H);
  const used=new Set(Object.values(MAP[id]).flat());
  // outlines: brain + VNC
  x.strokeStyle=COL.line;x.lineWidth=1.5;x.fillStyle='#0f151f';
  x.beginPath();x.ellipse(210,128,105,92,0,0,Math.PI*2);x.fill();x.stroke();
  x.beginPath();x.moveTo(196,222);x.lineTo(196,268);x.moveTo(224,222);x.lineTo(224,268);x.stroke();
  x.beginPath();x.ellipse(210,338,48,82,0,0,Math.PI*2);x.fill();x.stroke();
  x.beginPath();x.ellipse(210,128,22,9,0,0,Math.PI*2);x.stroke(); // central complex outline
  const order=Object.keys(REG);
  for(const k of order){const r=REG[k],a=regAct[k]||0,base=used.has(k)?0.16:0.05,col=REGCOL[k.split('_')[0]]||COL.mu;
    x.globalAlpha=base+a*0.84;
    if(r.t==='e'){x.fillStyle=col;x.beginPath();x.ellipse(r.x,r.y,r.rx,r.ry,0,0,Math.PI*2);x.fill();
      if(a>0.35){x.globalAlpha=a*0.5;x.strokeStyle=col;x.lineWidth=3;x.beginPath();x.ellipse(r.x,r.y,r.rx+5,r.ry+5,0,0,Math.PI*2);x.stroke();}}
    else if(r.t==='p'){x.strokeStyle=col;x.lineWidth=r.w;x.lineCap='round';x.lineJoin='round';x.beginPath();r.pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();}
    else{x.fillStyle=col;for(const p of r.pts){x.beginPath();x.arc(p[0],p[1],4,0,Math.PI*2);x.fill();}}
  }
  x.globalAlpha=1;
  // short tags on the regions this game uses
  const TAG={OL:'OL',AOTU:'AOTU',CA:'CA',ML:'MB',PAM:'PAM',PPL1:'PPL1',PS:'PS',GNG:'GNG',DN:'DN',T1:'T1',T2:'T2',T3:'T3'};
  x.font=`600 11px ${MONO}`;x.textAlign='center';
  for(const k of order){if(!used.has(k))continue;const r=REG[k],a=regAct[k]||0,tag=TAG[k.split('_')[0]];
    let p=r.t==='e'?[r.x,r.y+4]:r.t==='p'?[r.pts[r.pts.length-1][0]+(k.endsWith('_L')?-14:14),r.pts[r.pts.length-1][1]-6]:[r.pts[0][0]-16,r.pts[0][1]+4];
    if(k.startsWith('DN'))p=[k.endsWith('_L')?182:238,236];
    x.fillStyle=a>0.35?'#ffffff':COL.mu;x.fillText(tag,p[0],p[1]);}
  x.textAlign='left';
  x.fillStyle=COL.mu;x.font=`10px ${MONO}`;x.fillText('brain',12,20);x.fillText('ventral nerve cord',12,x.H-12);
}

const NAMES={OL:'Optic lobe',AOTU:'AOTU',CA:'Mushroom body calyx',ML:'Mushroom body lobes',PAM:'PAM dopamine',PPL1:'PPL1 dopamine',PS:'Posterior slope',GNG:'GNG',DN:'Descending neurons',T1:'Front-leg neuromere',T2:'Mid-leg neuromere',T3:'Hind-leg neuromere'};
function regionNames(keys){const out=[];for(const k of keys){const n=NAMES[k.split('_')[0]];const side=k.endsWith('_L')?'L':k.endsWith('_R')?'R':'';const e=out.find(o=>o.n===n);if(e){if(side&&!e.s.includes(side))e.s.push(side);}else out.push({n,s:side?[side]:[]});}
  return out.map(o=>o.n+(o.s.length===1?' ('+o.s[0]+')':'')).join(', ');}
function anatRows(id,G){
  const m=MAP[id],rows=[];
  for(const g of G.B.groups){if(m[g.name])rows.push({c:g.color,l:g.label,keys:m[g.name]});}
  if(id==='kebab'){rows.push({c:COL.g,l:'Reward signal',keys:m._rew},{c:COL.red,l:'Punishment signal',keys:m._pun},{c:COL.w,l:'Knife leg',keys:m._cut});}
  return rows;
}
function drawAnatLegend(id,G){
  const el=document.getElementById('anat-legend');if(!el)return;
  el.innerHTML=anatRows(id,G).map(r=>{const a=Math.max(...r.keys.map(k=>regAct[k]||0));
    return `<div class="ar"><i style="background:${r.c}"></i><span><b>${r.l}</b><small>${regionNames(r.keys)}</small></span><em><u style="width:${Math.round(a*100)}%;background:${r.c}"></u></em></div>`;}).join('');
}

/* ---------------- brain view ---------------- */
let layout=null;
function makeLayout(G,W,H){
  const B=G.B,gs=B.groups,n=gs.length,pos=new Array(B.N);
  gs.forEach((g,gi)=>{const cx=40+gi*(W-80)/(n-1);const cols=g.n>16?2:1;const per=Math.ceil(g.n/cols);
    for(let i=0;i<g.n;i++){const c=Math.floor(i/per),r=i%per;const span=Math.min(H-90,per*22);const y=50+(H-70-span)/2+(per>1?r*span/(per-1):span/2);pos[g.start+i]=[cx+(cols>1?(c-0.5)*18:0),y];}});
  return {pos,W,H};
}
function drawBrain(x,G){
  const B=G.B;if(!layout||layout.G!==G){layout=makeLayout(G,x.W,x.H);layout.G=G;}
  const P=layout.pos;x.fillStyle=COL.bg;x.fillRect(0,0,x.W,x.H);
  x.lineWidth=1;
  for(const s of B.syn){const a=P[s.pre],b=P[s.post];
    if(s.plastic){const t=Math.min(1,s.w/0.32);if(t<0.03)continue;x.strokeStyle=`rgba(95,227,154,${0.05+t*0.75})`;x.lineWidth=0.5+t*2;}
    else{if(s.w<0){x.strokeStyle='rgba(255,95,109,.10)';}else x.strokeStyle='rgba(141,155,176,.07)';x.lineWidth=1;}
    x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();}
  B.groups.forEach(g=>{for(let i=0;i<g.n;i++){const k=g.start+i,p=P[k],f=B.flash[k];
    x.fillStyle=COL.panel;x.beginPath();x.arc(p[0],p[1],6,0,Math.PI*2);x.fill();
    x.globalAlpha=0.25+f*0.75;x.fillStyle=g.color;x.beginPath();x.arc(p[0],p[1],6,0,Math.PI*2);x.fill();x.globalAlpha=1;
    if(f>0.6){x.strokeStyle=g.color;x.lineWidth=1.5;x.beginPath();x.arc(p[0],p[1],10,0,Math.PI*2);x.stroke();}}
    const p0=P[g.start];x.fillStyle=g.color;x.font=`600 12px ${MONO}`;x.textAlign='center';x.fillText(g.name,p0[0]+(g.n>16?9:0),24);x.textAlign='left';});
}

/* ---------------- learning-curve chart ---------------- */
function drawChart(x,id,G){
  x.fillStyle=COL.bg;x.fillRect(0,0,x.W,x.H);
  const L=46,Rr=x.W-12,T=14,Bt=x.H-26;
  x.strokeStyle=COL.line;x.lineWidth=1;x.font=`11px ${MONO}`;x.fillStyle=COL.mu;
  let vals,ymax,ylab,kind,xlab;
  if(id==='dino'){vals=G.history.slice(-60);ymax=Math.max(10,...vals);kind='bar';ylab='cacti';xlab='life';}
  else if(id==='park'){vals=G.history.slice(-60);ymax=80;kind='dot';ylab='cm';xlab='attempt';}
  else if(id==='kebab'){const h=G.history;vals=[];for(let i=0;i<h.length;i+=5){const a=h.slice(Math.max(0,i-15),i+5);vals.push(a.reduce((p,q)=>p+q,0)/a.length*100);}vals=vals.slice(-60);ymax=100;kind='line';ylab='% crispy';xlab='cuts';}
  else{const h=G.history;vals=[];for(let i=0;i<h.length;i+=5){const a=h.slice(Math.max(0,i-15),i+5);vals.push(a.reduce((p,q)=>p+q,0)/a.length*100);}vals=vals.slice(-60);ymax=100;kind='line';ylab='% good swings';xlab='swings';}
  for(let k=0;k<=4;k++){const y=Bt-(Bt-T)*k/4;x.globalAlpha=.6;x.beginPath();x.moveTo(L,y);x.lineTo(Rr,y);x.stroke();x.globalAlpha=1;x.textAlign='right';x.fillText(Math.round(ymax*k/4),L-6,y+4);}
  x.textAlign='left';x.fillText(ylab,L,x.H-8);x.textAlign='right';x.fillText('recent '+xlab+'s →',Rr,x.H-8);x.textAlign='left';
  if(id==='park'){const y0=Bt-(Bt-T)*25/ymax,y1=Bt-(Bt-T)*2/ymax;x.fillStyle='rgba(95,227,154,.14)';x.fillRect(L,y0,Rr-L,y1-y0);}
  if(!vals.length){x.fillStyle=COL.mu;x.textAlign='center';x.fillText('no data yet',(L+Rr)/2,(T+Bt)/2);x.textAlign='left';return;}
  const n=60,dx=(Rr-L)/n;
  vals.forEach((v,i)=>{const px=L+i*dx+dx/2;
    if(kind==='bar'){const h=(Bt-T)*Math.min(1,v/ymax);x.fillStyle=COL.g;x.fillRect(px-dx*0.35,Bt-h,dx*0.7,h);}
    else if(kind==='dot'){if(v<0){x.fillStyle=COL.red;x.font=`600 12px ${MONO}`;x.textAlign='center';x.fillText('×',px,T+8);x.textAlign='left';}else{const y=Bt-(Bt-T)*Math.min(1,v/ymax);x.fillStyle=(v>=2&&v<=25)?COL.g:COL.b;x.beginPath();x.arc(px,y,3.5,0,Math.PI*2);x.fill();}}
  });
  if(kind==='line'){x.strokeStyle=GAMES[id].color;x.lineWidth=2;x.beginPath();vals.forEach((v,i)=>{const px=L+i*dx+dx/2,y=Bt-(Bt-T)*v/ymax;i?x.lineTo(px,y):x.moveTo(px,y);});x.stroke();}
}

/* ---------------- stats ---------------- */
function avg(a){return a.length?a.reduce((p,q)=>p+q,0)/a.length:0;}
function stats(id,G){
  if(id==='dino'){const h=G.history;return [['Lives',G.lives],['Score',G.score],['Best',G.best],['Avg last 10',avg(h.slice(-10)).toFixed(1)]];}
  if(id==='park'){const h=G.history.slice(-10);const ok=h.filter(v=>v>=2&&v<=25).length;const last=G.history[G.history.length-1];return [['Attempts',G.attempts],['Parked',G.parked],['Last stop',last===undefined?'–':last<0?'crash':last.toFixed(0)+' cm'],['Success last 10',h.length?Math.round(ok/h.length*100)+'%':'–']];}
  if(id==='kebab'){const h=G.history.slice(-20);return [['Cuts',G.good+G.bad],['Crispy',G.good],['Raw',G.bad],['Crispy last 20',h.length?Math.round(avg(h)*100)+'%':'–']];}
  const h=G.history.slice(-30);return [['Hits',G.hits],['Misses',G.misses],['Wrong swings',G.wrong],['Good last 30',h.length?Math.round(avg(h)*100)+'%':'–']];
}

/* ---------------- arcade controller ---------------- */
const A={cur:null,G:null,running:false,speed:1,frame:0,raf:0,gx:null,bx:null,cx:null};
function buildArcadeUI(){
  const list=$('#game-list');
  Object.entries(GAMES).forEach(([id,g])=>{const a=document.createElement('a');a.href='#arcade-'+id;a.className='game-pick';a.dataset.id=id;
    a.innerHTML=`<svg class="ico" style="color:${g.color}"><use href="#${g.icon}"/></svg><span><b>${g.title}</b><small>${g.tag}</small></span>`;list.appendChild(a);});
  $('#btn-play').onclick=()=>{A.running=!A.running;syncBtns();};
  $('#btn-learn').onclick=()=>{A.G.learn=!A.G.learn;syncBtns();};
  $('#btn-reset').onclick=()=>{newBrain();};
  document.querySelectorAll('.speed button').forEach(b=>b.onclick=()=>{A.speed=+b.dataset.s;syncBtns();});
  A.gx=setup($('#cv-game'),960,360);A.bx=setup($('#cv-brain'),420,360);A.ax=setup($('#cv-anat'),420,460);
  if(window.S3)S3.init($('#cv-3d'),'').then(ok=>{if(!ok)$('#cv-3d').hidden=true;});else $('#cv-3d').hidden=true;A.cx=setup($('#cv-chart'),620,170);
}
function syncBtns(){
  $('#btn-play').textContent=A.running?'Pause':'Play';
  $('#btn-learn').textContent=A.G&&A.G.learn?'Learning: on':'Learning: off';
  $('#btn-learn').classList.toggle('off',!(A.G&&A.G.learn));
  document.querySelectorAll('.speed button').forEach(b=>b.classList.toggle('on',+b.dataset.s===A.speed));
}
function newBrain(){A.G=GAMES[A.cur].make((Math.random()*1e9)|0);layout=null;renderInfo();syncBtns();}
function renderInfo(){
  const g=GAMES[A.cur],G=A.G;
  $('#game-title').textContent=g.title;$('#game-tag').textContent=g.tag;
  $('#game-circuit').textContent=g.circuit;$('#game-rule').textContent=g.rule;
  $('#game-refs').innerHTML=g.refs.map(r=>`<a href="${r[1]}" target="_blank" rel="noopener">${r[0]} ↗</a>`).join('');
  const nS=G.B.syn.length,nP=G.B.syn.filter(s=>s.plastic).length;
  $('#brain-meta').textContent=`${G.B.N} neurons · ${nS} synapses · ${nP} plastic`;
  $('#brain-legend').innerHTML=G.B.groups.map(gr=>`<span><i style="background:${gr.color}"></i><b>${gr.name}</b> ${gr.label} (${gr.n})</span>`).join('');
  document.querySelectorAll('.game-pick').forEach(a=>a.classList.toggle('on',a.dataset.id===A.cur));
}
const DRAW={dino:drawDino,park:drawPark,kebab:drawKebab,saber:drawSaber};
function loop(){
  A.raf=requestAnimationFrame(loop);
  const G=A.G;if(!G)return;
  const now=performance.now(),dt=Math.min(100,now-(A.last||now));A.last=now;
  if(A.running){A.acc=(A.acc||0)+dt*A.speed;const steps=Math.min(3000,Math.floor(A.acc));A.acc-=steps;if(A.acc>3000)A.acc=0;for(let i=0;i<steps;i++)G.tick();}
  G.B.decayFlash(A.speed>1?0.6:0.82);
  fitView(A.gx);
  if(!(window.S3&&S3.render(A.cur,G,A.gx))){const x=A.gx,w=x.W,h=x.H,k=Math.min(w/960,h/360),d=x.dpr;   // 2D fallback: letterbox 960x360
    x.clearRect(0,0,w,h);x.setTransform(d*k,0,0,d*k,d*(w-960*k)/2,d*(h-360*k)/2);x.W=960;x.H=360;DRAW[A.cur](x,G);}drawBrain(A.bx,G);drawAnatomy(A.ax,A.cur,G);
  if(A.frame++%6===0){drawChart(A.cx,A.cur,G);
    $('#game-stats').innerHTML=stats(A.cur,G).map(s=>`<div class="stat"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');
    $('#game-msg').textContent=G.lastMsg;drawAnatLegend(A.cur,G);}
}
A.open=function(id){
  if(!GAMES[id])id='dino';
  if(id!==A.cur){A.cur=id;newBrain();}
  A.running=true;syncBtns();
  if(!A.raf)loop();
};
A.pause=function(){A.running=false;if(A.raf){cancelAnimationFrame(A.raf);A.raf=0;}};
window.Arcade=A;

/* ---------------- router ---------------- */
const VIEWS=['home','talk','arcade','arena','cases','engine'];
function route(){
  let h=(location.hash||'').slice(1)||'home',game=null;
  if(h.startsWith('arcade-')){game=h.slice(7);h='arcade';}
  if(/^\d+$/.test(h))h='talk';
  if(!VIEWS.includes(h))h='home';
  document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+h);
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===h));
  if(h==='talk'&&window.Deck)window.Deck.fit();
  if(h==='arcade')A.open(game||A.cur||'dino');else A.pause();
  window.scrollTo(0,0);
}
buildArcadeUI();
// live arena availability (needs serve.py on localhost)
(function(){
  const st=$('#ar-status');if(!st)return;
  const set=(cls,txt,ok)=>{st.className='pill '+cls;st.querySelector('span').textContent=txt;['#ar-launch','#ar-viewer'].forEach(id=>$(id).setAttribute('aria-disabled',ok?'false':'true'));$('#ar-howto').hidden=!!ok;};
  const local=location.protocol.startsWith('http')&&/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if(!local){set('wait','Not available on this page · use the local server or the online version',false);return;}
  fetch('/arena/arena.html',{method:'HEAD'}).then(r=>{if(r.ok)set('ok','Local arena ready · full 165,122-neuron fly',true);else set('wait','Arena files not found in arena/',false);}).catch(()=>set('wait','Arena files not found in arena/',false));
})();
// engine table
const tb=$('#engine-rows');
if(tb){Object.entries(GAMES).forEach(([id,g])=>{const G=g.make(1);const nP=G.B.syn.filter(s=>s.plastic).length;
  tb.insertAdjacentHTML('beforeend',`<tr><td><a href="#arcade-${id}">${g.title}</a></td><td>${G.B.groups.map(x=>x.name+' '+x.n).join(' → ')}</td><td class="num">${G.B.N}</td><td class="num">${G.B.syn.length}</td><td class="num">${nP}</td></tr>`);});}
addEventListener('hashchange',route);
route();
})();
