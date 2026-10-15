'use strict';
/* MAX SMASH — skeleton/poses, enemy types, attacks, emotes, worlds & level generator */
/* =====================================================================
   SKELETON / POSES  (angle from straight-down, positive = forward)
   ===================================================================== */
const FS=.8;                       // global figure scale (20% smaller than the original)
const UA=19,FA=19,TH_=23,SH_=23,TOR=32,HR=9;
const STANCE={t:.1,hd:0,a1:.9,f1:2.0,a2:.4,f2:2.2,l1:.45,s1:.12,l2:-.4,s2:-.3};
const P={
  jw:{t:-.05,a1:-.2,f1:1.0,a2:.5,f2:2.2,l1:.6,s1:.25,l2:-.55,s2:-.4},
  js:{t:.45,hd:.1,a1:1.56,f1:1.57,a2:-.3,f2:1.3,l1:1.0,s1:.45,l2:-.8,s2:-.55},
  uw:{t:-.25,a1:.3,f1:.5,a2:.2,f2:.6,l1:1.0,s1:.05,l2:-1.0,s2:-.3},
  us:{t:.2,a1:2.7,f1:3.0,a2:-.3,f2:1.2,l1:.6,s1:.2,l2:-.4,s2:-.4},
  kw:{t:-.1,a1:.9,f1:2.0,a2:.5,f2:2.2,l1:1.1,s1:-.5,l2:-.1,s2:-.05},
  ks:{t:-.55,hd:.2,a1:-1.0,f1:-.5,a2:.9,f2:1.9,l1:1.5,s1:1.57,l2:-.15,s2:-.1},
  fk:{t:-.5,hd:.1,a1:-.9,f1:-.2,a2:-1.4,f2:-.8,l1:1.45,s1:1.55,l2:-.5,s2:-1.1},
  jm:{t:.1,a1:1.2,f1:2.3,a2:-.5,f2:1.2,l1:1.0,s1:.2,l2:.2,s2:-.9},
  sp:{t:0,a1:1.57,f1:1.57,a2:-1.57,f2:-1.57,l1:1.57,s1:1.57,l2:-.15,s2:-.05},
  bw:{t:-.25,a1:-2.3,f1:-2.9,a2:.2,f2:1.6,l1:.7,s1:.3,l2:-.6,s2:-.4},
  bs:{t:.5,hd:.1,a1:1.1,f1:1.55,a2:.2,f2:1.3,l1:1.0,s1:.4,l2:-.8,s2:-.5},
  gd:{t:.3,hd:.1,a1:1.15,f1:2.75,a2:1.0,f2:2.6,l1:.4,s1:.2,l2:-.4,s2:-.3},
  gn:{t:.15,a1:1.57,f1:1.57,a2:.8,f2:1.9,l1:.5,s1:.2,l2:-.5,s2:-.3},
  hu:{t:-.35,hd:-.3,a1:-.4,f1:.4,a2:-.8,f2:.0,l1:.3,s1:.1,l2:-.6,s2:-.5},
  fl:{t:0,a1:2.4,f1:2.8,a2:-2.2,f2:-2.6,l1:.6,s1:.9,l2:-.6,s2:-.9},
  // lying flat: everything straight along the body, hands by the sides
  ly:{t:0,hd:0,a1:.05,f1:.05,a2:-.05,f2:-.05,l1:.02,s1:.02,l2:-.02,s2:-.02},
  // knocked down but alive: on all fours / kneeling, so it's obvious who is still in the fight
  fours:{t:1.25,hd:.55,a1:.1,f1:.1,a2:-.12,f2:-.12,l1:.06,s1:-1.5,l2:-.1,s2:-1.5},
  oneknee:{t:.3,hd:.55,a1:.9,f1:.8,a2:.25,f2:.55,l1:1.45,s1:.02,l2:.05,s2:-1.5},
  hips:{t:.6,hd:.65,a1:.5,f1:-1.15,a2:.45,f2:-1.1,l1:.5,s1:-.2,l2:-.35,s2:-.55},
  stomach:{t:.75,hd:.5,a1:.5,f1:-1.85,a2:.3,f2:-1.7,l1:.55,s1:-.15,l2:-.1,s2:-.6},
  head:{t:.35,hd:.4,a1:2.4,f1:3.2,a2:2.0,f2:3.4,l1:.05,s1:-1.5,l2:-.12,s2:-1.5},
  // karate / judo move poses (wind-up 'w', strike 's')
  csw:{t:-.15,a1:.5,f1:2.2,a2:-.6,f2:.8,l1:.5,s1:.2,l2:-.7,s2:-.5},
  css:{t:.65,hd:.1,a1:.2,f1:1.6,a2:1.56,f2:1.57,l1:1.05,s1:.5,l2:-.85,s2:-.6},
  hkw:{t:-.1,a1:-.9,f1:-.2,a2:.5,f2:2.2,l1:.6,s1:.25,l2:-.55,s2:-.4},
  hks:{t:.55,hd:.1,a1:1.35,f1:2.35,a2:.3,f2:1.9,l1:.9,s1:.4,l2:-.7,s2:-.5},
  bfw:{t:-.3,a1:2.5,f1:2.9,a2:.5,f2:2.2,l1:.7,s1:.3,l2:-.5,s2:-.4},
  bfs:{t:.5,hd:.1,a1:1.45,f1:.95,a2:.3,f2:2.0,l1:1.0,s1:.4,l2:-.8,s2:-.5},
  pmw:{t:-.1,a1:.4,f1:1.9,a2:.3,f2:2.0,l1:.7,s1:.3,l2:-.55,s2:-.4},
  pms:{t:.4,hd:.05,a1:1.5,f1:1.5,a2:1.4,f2:1.45,l1:1.0,s1:.4,l2:-.8,s2:-.5},
  chw:{t:-.35,a1:2.7,f1:2.7,a2:.4,f2:2.0,l1:.7,s1:.3,l2:-.6,s2:-.4},
  chs:{t:.6,hd:.2,a1:.9,f1:.8,a2:.2,f2:1.5,l1:1.0,s1:.4,l2:-.8,s2:-.55},
  elw:{t:-.1,a1:.2,f1:2.6,a2:.3,f2:2.0,l1:.7,s1:.3,l2:-.5,s2:-.4},
  els:{t:.5,hd:.1,a1:1.5,f1:3.0,a2:.2,f2:1.6,l1:1.0,s1:.45,l2:-.75,s2:-.5},
  frw:{t:-.05,a1:.9,f1:2.0,a2:.5,f2:2.2,l1:1.35,s1:-.9,l2:-.1,s2:-.05},
  frs:{t:-.3,hd:.1,a1:.4,f1:1.6,a2:-.4,f2:1.2,l1:1.55,s1:1.57,l2:-.1,s2:-.05},
  sdw:{t:-.5,hd:.1,a1:-.4,f1:.3,a2:1.0,f2:1.9,l1:1.0,s1:-.4,l2:-.05,s2:-.05},
  sds:{t:-.95,hd:.25,a1:-1.2,f1:-.9,a2:1.1,f2:1.5,l1:1.55,s1:1.57,l2:.05,s2:.0},
  ax1:{t:-.45,hd:.1,a1:.3,f1:1.6,a2:-.7,f2:.4,l1:2.85,s1:2.9,l2:-.12,s2:-.05},
  ax2:{t:.3,hd:.1,a1:.9,f1:1.9,a2:.4,f2:2.0,l1:.6,s1:.5,l2:-.2,s2:-.4},
  sbk0:{t:.8,hd:.3,a1:.7,f1:1.6,a2:.5,f2:1.5,l1:.8,s1:-.4,l2:-.5,s2:-.8},
  sbk1:{t:-.1,a1:1.9,f1:2.1,a2:-1.6,f2:-1.9,l1:1.5,s1:1.55,l2:-.3,s2:-.1},
  sw1:{t:.6,hd:.2,a1:.3,f1:.9,a2:-.3,f2:.5,l1:1.0,s1:.2,l2:.9,s2:-.6},
  sw2:{t:.7,hd:.25,a1:.4,f1:.6,a2:-.9,f2:-.4,l1:1.5,s1:1.55,l2:.95,s2:-.55},
  fall:{t:.1,a1:1.2,f1:2.3,a2:-.5,f2:1.2,l1:.6,s1:.3,l2:.2,s2:-.5},
  siuAir:{t:-.1,hd:-.1,a1:2.2,f1:2.5,a2:-2.2,f2:-2.5,l1:.5,s1:.2,l2:-.5,s2:-.2},
  kneel:{t:.4,hd:.5,a1:.35,f1:.55,a2:.12,f2:.4,l1:.05,s1:-1.5,l2:-.12,s2:-1.5},
  dg:{t:-1.2,hd:-.25,a1:-1.0,f1:-.4,a2:-1.7,f2:-1.2,l1:.75,s1:-.15,l2:.3,s2:-.6},
  cr:{t:.32,a1:.8,f1:1.9,a2:.3,f2:2.0,l1:.85,s1:-.3,l2:.1,s2:-.6}
};
const KEYS=Object.keys(STANCE);
function posed(p,sw){
  const o=Object.assign({},STANCE,p);
  if(sw){let x=o.a1;o.a1=o.a2;o.a2=x;x=o.f1;o.f1=o.f2;o.f2=x}
  return o;
}
// phase advance per pixel travelled, so feet plant instead of skating (stride = 4 * leg length * sin(swing))
function gaitRate(k,sc){return PI/(2*(TH_+SH_)*sc*FS*Math.sin(.28+.34*k))}
function gait(ph,k,guard){
  const o=Object.assign({},STANCE),A=.28+.34*k,F=.6+.5*k;
  const leg=p=>{
    const th=Math.sin(p)*A+.05;
    const sw=Math.max(0,Math.cos(p+.25));                       // swing phase: leg travelling forward, knee folds
    const q=((p-PI/2)%(2*PI)+2*PI)%(2*PI);                      // 0 at heel strike
    const give=q<PI/2?.2*Math.sin(q*2):0;                       // small knee give while loading the leg
    return [th,th-F*Math.pow(sw,1.25)-give];
  };
  [o.l1,o.s1]=leg(ph);[o.l2,o.s2]=leg(ph+PI);
  o.t=.05+.22*k+Math.sin(2*ph-.6)*.03*k;                       // forward lean with a little bob
  o.hd=-(o.t-.1)*.55;                                           // head stays level
  if(!guard){
    const sw=.36+.42*k;
    o.a1=-Math.sin(ph)*sw+.18;o.f1=o.a1+.9+.55*k+.5*Math.max(0,-Math.sin(ph));
    o.a2=Math.sin(ph)*sw+.18;o.f2=o.a2+.9+.55*k+.5*Math.max(0,Math.sin(ph));
  }
  return o;
}
function skel(f){
  const c=f.cp,s=f.sc*FS,fc=f.face,r=f.rot+(f.tilt||0),cr=Math.cos(r),sr=Math.sin(r);
  const M=(x,y)=>({x:f.x+(x*cr-y*sr)*fc,y:x*sr+y*cr});
  const nx=Math.sin(c.t)*TOR*s,ny=-Math.cos(c.t)*TOR*s;
  const hx=nx+Math.sin(c.t+c.hd)*(HR-2.5)*s,hy=ny-Math.cos(c.t+c.hd)*(HR-2.5)*s;
  const sh0={x:nx*.95,y:ny*.95+2};
  const arm=(a,fo)=>{
    const ex=sh0.x+Math.sin(a)*UA*s,ey=sh0.y+Math.cos(a)*UA*s;
    return [M(ex,ey),M(ex+Math.sin(fo)*FA*s,ey+Math.cos(fo)*FA*s)];
  };
  const leg=(l,sa)=>{
    const kx=Math.sin(l)*TH_*s,ky=Math.cos(l)*TH_*s;
    return [M(kx,ky),M(kx+Math.sin(sa)*SH_*s,ky+Math.cos(sa)*SH_*s)];
  };
  const [e1,h1]=arm(c.a1,c.f1),[e2,h2]=arm(c.a2,c.f2),[k1,p1]=leg(c.l1,c.s1),[k2,p2]=leg(c.l2,c.s2);
  const o={hip:M(0,0),neck:M(nx,ny),head:M(hx,hy),sh:M(sh0.x,sh0.y),e1,h1,e2,h2,k1,p1,k2,p2};
  let low=-1e9,lf=-1e9;
  for(const k of ['p1','p2','h1','h2','head'])low=Math.max(low,o[k].y+(k==='head'?HR*s:3));
  for(const k in o)lf=Math.max(lf,o[k].y+2.4);
  o.low=low;o.lowFlat=lf;return o;
}
const JK=['hip','neck','head','sh','e1','h1','e2','h2','k1','p1','k2','p2'];
function lerpPts(a,b,t){
  if(!a||t>=.995)return b;
  const o={low:b.low,lowFlat:b.lowFlat};
  for(const k of JK){const p=a[k],q=b[k];o[k]={x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t}}
  return o;
}

/* =====================================================================
   TYPES / ATTACKS
   ===================================================================== */
const TYPES={
  hero:  {col:'#000',hp:100,sp:3.3,sc:1.0},
  grunt: {col:'#ee2d2d',hp:40,sp:1.5,sc:1.0,range:52,cd:75,pts:100},
  runner:{col:'#ff8a00',hp:22,sp:3.2,sc:.95,range:50,cd:50,pts:120},
  kicker:{col:'#12c26b',hp:38,sp:2.2,sc:1.0,range:74,cd:65,pts:150},
  heavy: {col:'#2f6cf5',hp:100,sp:1.1,sc:1.25,range:70,cd:100,pts:300,armor:1},
  gunner:{col:'#a63cf0',hp:30,sp:1.5,sc:1.0,range:300,cd:140,pts:200},
  ninja: {col:'#f0289c',hp:46,sp:3,sc:.98,range:60,cd:48,pts:220},
  samurai:{col:'#14bfd0',hp:80,sp:2.5,sc:1.1,range:82,cd:70,pts:350,armor:1},
  boss:  {col:'#f2c200',hp:340,sp:1.9,sc:1.45,range:80,cd:55,pts:2000,armor:1}
};
function F(type,x,face,lv){
  const T=TYPES[type],m=lv||{hp:1,sp:1,cd:1,dmg:1};
  const hp=Math.round(T.hp*(type==='hero'?1:m.hp)*(type==='boss'?(m.bossK||1):1));
  return {type,T,team:type==='hero'?'p':'e',col:(type==='boss'&&lv&&lv.bossCol)||T.col,sc:T.sc,hpMax:hp,hp,sp:T.sp*(type==='hero'?1:m.sp),cdm:m.cd*(type==='gunner'?(m.gunCd||1):1),dmgm:m.dmg||1,retreat:0,lastEmote:-99999,
    x,face,vx:0,vy:0,hy:GY-50,state:'idle',st:0,cp:Object.assign({},STANCE),tp:Object.assign({},STANCE),k:.3,
    rot:0,rotT:0,sgn:-1,spin:0,guard:false,inv:0,cd:type==='gunner'?R(90,180)*(m.gunCd||1):R(30,90),atk:null,fi:0,ft:0,swap:false,
    ph:rnd()*6,ph2:rnd()*100,dead:false,airAtk:false,hitSet:null,weapon:null,wuses:0,combo:0,comboT:0,
    trail:[],flash:0,pts:null,pp:null,air:false,fresh:1,auto:false,ai:null,
    armed:type==='gunner',rng:T.range||0,crouch:0,idleT:0,idleStreak:0,emq:[],em:null,flip:0,thrown:0,thr:null,
    tauntT:(rnd()*200)|0,lift:0,emoGap:0,specialReady:false,llift:0,lastHit:'',tilt:0,siu:0,siuTurned:0};
}
function setPose(f,p,k){f.tp=p;f.k=k||.35}
function stepPose(f){for(const key of KEYS)f.cp[key]+=(f.tp[key]-f.cp[key])*f.k}

// generic karate/judo strike: wind-up, strike (with hit spec), recovery
const mkA=(wp,sp,wd,sd,hit,extra)=>()=>({melee:1,sw:false,frames:[
  {d:wd,p:wp},Object.assign({d:sd,p:sp,wh:1,lunge:2.4,k:.6,hit},extra||{}),{d:9,p:STANCE,k:.3}]});
const A={
  jab:sw=>({melee:1,sw,frames:[
    {d:3,p:P.jw},
    {d:4,p:P.js,wh:1,lunge:2.6,hit:{r0:4,r1:68,dmg:7,kb:2.8,stop:3,snd:'punch',sh:3,nm:'PUNCH'}},
    {d:6,p:STANCE,k:.3}]}),
  upper:()=>({melee:1,frames:[
    {d:5,p:P.uw},
    {d:5,p:P.us,wh:1,lunge:2.2,k:.6,hit:{r0:0,r1:58,dmg:13,kb:3,launch:9,stop:7,snd:'heavy',sh:7,big:1,inv:1,nm:'UPPERCUT'}},
    {d:12,p:STANCE,k:.25}]}),
  kick:()=>({melee:1,frames:[
    {d:5,p:P.kw},
    {d:6,p:P.ks,wh:1,lunge:3,k:.6,hit:{r0:6,r1:90,dmg:11,kb:6,launch:4,stop:5,snd:'kick',sh:5,big:1,nm:'KICK'}},
    {d:10,p:STANCE,k:.3}]}),
  bat:()=>({melee:1,frames:[
    {d:7,p:P.bw},
    {d:6,p:P.bs,wh:1,lunge:2,k:.6,hit:{r0:6,r1:96,dmg:20,kb:7,launch:5,stop:6,snd:'heavy',sh:6,big:1,nm:'HOME RUN',crit:.25}},
    {d:12,p:STANCE,k:.25}]}),
  spin:big=>({melee:1,spin:1,special:!!big,sdmg:big?15:10,snm:big?'TORNADO KICK':'SPIN',frames:[{d:big?46:34,p:P.sp,k:.7}]}),
  // --- punches ---
  cross:mkA(P.csw,P.css,4,4,{r0:4,r1:70,dmg:9,kb:3.6,stop:4,snd:'punch',sh:4,nm:'CROSS'}),
  hook:mkA(P.hkw,P.hks,4,4,{r0:4,r1:64,dmg:9,kb:4.5,stop:4,snd:'punch',sh:4,nm:'HOOK',stun:20}),
  backfist:mkA(P.bfw,P.bfs,3,3,{r0:4,r1:66,dmg:8,kb:3,stop:3,snd:'punch',sh:3,nm:'BACKFIST'}),
  palm:mkA(P.pmw,P.pms,4,5,{r0:4,r1:60,dmg:8,kb:6.5,stop:4,snd:'punch',sh:4,nm:'PALM STRIKE'}),
  chop:mkA(P.chw,P.chs,5,5,{r0:4,r1:66,dmg:12,kb:3,launch:5,stop:6,snd:'heavy',sh:6,big:1,nm:'CHOP'}),
  elbow:mkA(P.elw,P.els,4,5,{r0:2,r1:52,dmg:11,kb:4,launch:3,stop:5,snd:'heavy',sh:5,big:1,nm:'ELBOW'}),
  // --- kicks ---
  front:mkA(P.frw,P.frs,5,5,{r0:6,r1:84,dmg:9,kb:8,stop:4,snd:'kick',sh:5,nm:'FRONT KICK'}),
  side:mkA(P.sdw,P.sds,6,6,{r0:6,r1:92,dmg:12,kb:9,launch:3,stop:6,snd:'kick',sh:6,big:1,nm:'SIDE KICK'}),
  axe:mkA(P.ax1,P.ax2,9,5,{r0:2,r1:72,dmg:14,kb:3,launch:2,stop:7,snd:'heavy',sh:8,big:1,nm:'AXE KICK'}),
  sweep:mkA(P.sw1,P.sw2,5,6,{r0:6,r1:84,dmg:7,kb:4,launch:3,stop:4,snd:'kick',sh:4,nm:'SWEEP'}),
  spinback:()=>({melee:1,sw:false,frames:[
    {d:3,p:P.sbk0},{d:2,p:P.sbk0,turn:1},
    {d:6,p:P.sbk1,turn:1,wh:1,lunge:2.6,k:.6,hit:{r0:6,r1:90,dmg:14,kb:8,launch:5,stop:6,snd:'kick',sh:7,big:1,nm:'BACK KICK'}},
    {d:10,p:STANCE,k:.3}]}),
  // --- specials (every 10-20 hits) ---
  dragon:()=>({melee:1,sw:false,special:true,frames:[
    {d:6,p:P.uw,k:.6},
    {d:4,p:P.us,wh:1,lunge:1.2,lift:56,k:.7,hit:{r0:0,r1:66,dmg:22,kb:3,launch:13,stop:9,snd:'heavy',sh:11,big:1,nocrit:1,nm:'DRAGON UPPERCUT',vy:115}},
    {d:7,p:P.us,lift:84,k:.4},{d:8,p:P.fall,lift:38,k:.4},{d:8,p:STANCE,lift:0,k:.4}]}),
  heel:()=>({melee:1,sw:false,special:true,frames:[
    {d:8,p:P.ax1,lift:46,k:.5},{d:3,p:P.ax1,lift:70,k:.5},
    {d:5,p:P.ax2,lift:0,wh:1,k:.8,quake:1,hit:{r0:0,r1:80,dmg:20,kb:4,launch:6,stop:8,snd:'heavy',sh:10,big:1,nocrit:1,nm:'HEEL DROP',vy:95}},
    {d:12,p:STANCE,k:.3}]}),
  flurry:()=>{
    const fr=[];
    for(let i=0;i<8;i++)fr.push({d:3,p:P.js,sw:i%2===1,wh:1,lunge:.8,k:.8,hit:{r0:4,r1:70,dmg:4,kb:.9,stop:1,snd:'punch',sh:2,nocrit:1,nm:'FLURRY'}});
    fr.push({d:8,p:P.js,sw:false,wh:1,lunge:3,k:.8,hit:{r0:4,r1:76,dmg:16,kb:5,launch:9,stop:8,snd:'heavy',sh:9,big:1,nocrit:1,nm:'HUNDRED FISTS'}});
    fr.push({d:10,p:STANCE,k:.3});
    return {melee:1,sw:false,special:true,frames:fr};
  },
  ePunch:(dmg,wind)=>({melee:1,frames:[
    {d:wind||16,p:P.jw},
    {d:6,p:P.js,wh:1,lunge:2.2,hit:{r0:4,r1:62,dmg,kb:3,stop:3,snd:'punch',sh:3}},
    {d:16,p:STANCE,k:.25}]}),
  eKick:(dmg,wind)=>({melee:1,frames:[
    {d:wind||18,p:P.kw},
    {d:7,p:P.ks,wh:1,lunge:2.6,k:.55,hit:{r0:6,r1:84,dmg,kb:5,launch:3,stop:4,snd:'kick',sh:4}},
    {d:20,p:STANCE,k:.25}]}),
  eGun:wind=>({gun:1,frames:[{d:wind||28,p:P.gn,k:.3},{d:3,p:P.gn,fire:1},{d:30,p:P.gn,k:.3}]}),
  eSlam:dmg=>({melee:1,frames:[
    {d:22,p:P.uw},
    {d:8,p:P.us,wh:1,lunge:2.5,k:.6,hit:{r0:0,r1:76,dmg,kb:5,launch:8,stop:6,snd:'heavy',sh:8,big:1}},
    {d:22,p:STANCE,k:.25}]})
};

/* =====================================================================
   EMOTES — idle moves, victory dances (the "viral" bits)
   ===================================================================== */
const EMO={
  look:{d:70,f:(p,t)=>{const o=Object.assign({},STANCE);o.hd=Math.sin(t*.12)*.55;o.t=.1+Math.sin(t*.06)*.05;setPose(p,o,.3);if(t===36&&rnd()<.5)p.face*=-1}},
  bounce:{d:80,f:(p,t)=>{const o=Object.assign({},STANCE),b=Math.sin(t*.5);
    o.l1=.45+b*.2;o.s1=o.l1-.35*Math.max(0,b);o.l2=-.4-b*.2;o.s2=o.l2-.35*Math.max(0,-b);o.t=.12+b*.04;setPose(p,o,.5)}},
  stretch:{d:100,f:(p,t)=>{const s=Math.sin(t*.07),o=Object.assign({},STANCE);
    o.a1=2.9;o.f1=3.05;o.a2=-2.8;o.f2=-3.0;o.t=s*.28;o.l1=.2;o.s1=.1;o.l2=-.2;o.s2=-.1;setPose(p,o,.2)}},
  taunt:{d:80,f:(p,t)=>{const o=Object.assign({},STANCE);
    o.a1=1.35;o.f1=1.45+Math.sin(t*.45)*.85;o.a2=.55;o.f2=-.5;o.hd=-.25;o.t=-.05;setPose(p,o,.4)}},
  box:{d:100,f:(p,t)=>{const ph=(t%20)<10,b=Math.sin(t*.4);
    const o=posed(P.js,ph);o.t=.25+b*.05;o.l1=.5+b*.1;o.l2=-.5-b*.1;o.s1=.15;o.s2=-.2;
    if(ph){o.a2=.5;o.f2=2.2}else{o.a1=.5;o.f1=2.2}setPose(p,o,.55);
    if(t%10===1)snd('whoosh')}},
  dab:{d:90,f:(p,t)=>{
    if(t===45)p.face*=-1;
    const o=Object.assign({},STANCE,{t:.4,hd:.75,a1:2.45,f1:2.45,a2:.85,f2:2.95,l1:.35,s1:.1,l2:-.3,s2:-.2});
    if(t===8)snd('pop');setPose(p,o,.35)}},
  getbusy:{d:140,f:(p,t)=>{
    const b=Math.sin(t*.5),c=Math.cos(t*.5),o=Object.assign({},STANCE);
    o.t=.28+Math.abs(b)*.06;o.hd=-.15;
    o.l1=.7+b*.18;o.s1=o.l1-.55-Math.max(0,b)*.2;o.l2=-.15+b*.18;o.s2=o.l2-.6-Math.max(0,-b)*.2;
    o.a1=1.0+b*.6;o.f1=o.a1+1.5+c*.4;o.a2=1.0-b*.6;o.f2=o.a2+1.5-c*.4;
    setPose(p,o,.5);if(t%12===1)snd('pop')}},
  saysoo:{d:160,f:(p,t)=>{
    const ph=((t/40)|0)%2,s=Math.sin(t*.2),o=Object.assign({},STANCE);
    o.a1=2.75+Math.sin(t*.4)*.2;o.f1=3.0;o.a2=.55;o.f2=-.5;     // one arm up over the head, other hand on the hip
    o.t=s*.3;o.hd=-s*.2;o.l1=.4+s*.2;o.s1=o.l1-.15;o.l2=-.3+s*.2;o.s2=o.l2-.25;
    setPose(p,ph?posed(o,true):o,.4);if(t%20===1)snd('pop')}},
  siuhold:{d:80,f:(p,t)=>{
    const pu=Math.sin(t*.35)*.05,o={t:-.2,hd:-.38,a1:2.1+pu,f1:2.3+pu,a2:-2.1-pu,f2:-2.3-pu,l1:.55,s1:.1,l2:-.55,s2:-.1};
    setPose(p,posed(o),.35)}},
  flex:{d:80,f:(p,t)=>{const pu=Math.sin(t*.3)*.18,o={t:0,hd:0,a1:1.5,f1:3.1+pu,a2:-1.5,f2:-3.1-pu,l1:.6,s1:.3,l2:-.6,s2:-.3};
    if(t===10)snd('pop');setPose(p,posed(o),.3)}},
  moon:{d:100,f:(p,t)=>{const ph=t*.2,o=Object.assign({},STANCE);
    o.l1=Math.sin(ph)*.38;o.s1=o.l1+.05;o.l2=-Math.sin(ph)*.38;o.s2=o.l2+.05;o.t=-.12;
    o.a1=2.6;o.f1=2.7;o.a2=.3;o.f2=.7;setPose(p,o,.5);p.vx=-p.face*1.3;if(t%14===0)dust(p.x,1)}},
  twirl:{d:70,f:(p,t)=>{const o={t:0,a1:1.57,f1:1.57,a2:-1.57,f2:-1.57,l1:.15,s1:.0,l2:-.15,s2:-.0};
    if(t%4===0)p.face*=-1;setPose(p,posed(o),.6);if(t%12===1)snd('whoosh')}},
  jacks:{d:100,f:(p,t)=>{const op=((t/9)|0)%2===0;
    const o=op?{t:0,a1:2.85,f1:3.0,a2:-2.8,f2:-3.0,l1:.55,s1:.5,l2:-.55,s2:-.5}:{t:.05,a1:.12,f1:.14,a2:-.1,f2:-.12,l1:.05,s1:.0,l2:-.05,s2:-.0};
    setPose(p,posed(o),.55);if(t%9===1)snd('pop')}},
  beam:{d:96,f:(p,t)=>{
    let o;
    if(t<38){const c=t/38;o={t:-.1,hd:0,a1:-.1,f1:1.55,a2:-.25,f2:1.4,l1:.75+c*.1,s1:-.1,l2:-.7,s2:-.9};
      if(t===1)snd('charge');p.vx=0}
    else{o={t:.4,hd:.05,a1:1.57,f1:1.57,a2:1.4,f2:1.57,l1:.9,s1:.3,l2:-.9,s2:-.5};
      if(t===38){snd('heavy');shake=Math.max(shake,12);quake(p.x+p.face*60,'p',1)}
      p.vx=-p.face*(t<48?1.6:0)}
    setPose(p,posed(o),.35)}}
};
const SMALL=['look','bounce','stretch','taunt','box'];
const BIG=['dab','flex','moon','twirl','jacks','flip','beam','siu','getbusy','saysoo'];
function startEmote(p,n){
  p.idleT=0;p.crouch=0;p.lastEmote=tick;
  if(n==='flip'){
    p.state='air';p.vy=-10.8;p.vx=0;p.flip=1;p.rot=p.rotT=0;p.airAtk=false;
    snd('jump');dust(p.x,4);p.em={n,t:0,d:1};return;
  }
  if(n==='siu'){
    p.state='air';p.vy=-10.2;p.vx=0;p.siu=1;p.siuTurned=0;p.airAtk=false;snd('jump');dust(p.x,4);p.em={n,t:0,d:1};return;
  }
  p.state='emote';p.em={n,t:0,d:EMO[n].d};
}
function celebrate(p,list){
  p.emq=list.slice();
}
function shuffled(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=(rnd()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}

/* =====================================================================
   LEVELS / THEMES
   ===================================================================== */
const THEMES={
  office:{bg:'#ffffff',fg:'#000000',hero:'#000000',dark:0},
  night: {bg:'#070913',fg:'#e8ebf5',hero:'#ffffff',dark:1},
  desert:{bg:'#f6d9ae',fg:'#2a1608',hero:'#000000',dark:0},
  factory:{bg:'#dde2e6',fg:'#10161c',hero:'#000000',dark:0},
  snow:  {bg:'#d8e6f3',fg:'#13202e',hero:'#000000',dark:0},
  volcano:{bg:'#14090b',fg:'#ffe2c4',hero:'#ffffff',dark:1},
  harbor:{bg:'#f2cbb4',fg:'#2a1c3a',hero:'#000000',dark:0},
  neon:  {bg:'#0c0719',fg:'#f3eaff',hero:'#ffffff',dark:1},
  temple:{bg:'#d3ebc8',fg:'#14301a',hero:'#000000',dark:0},
  space: {bg:'#05060e',fg:'#d9e7ff',hero:'#ffffff',dark:1}
};
const LPW=10;                      // levels per world
const WORLDS=[
  {name:'NIGHT CITY',th:'night',boss:'#18c8d8',lv:['BACK ALLEY','SUBWAY','DOWNTOWN','PARKING LOT','DINER','BRIDGE','CLUB ROW','FIRE ESCAPE','SKYLINE','NEON ROOFTOP']},
  {name:'OFFICE',th:'office',boss:'#f2c200',lv:['LOBBY','RECEPTION','OPEN PLAN','COPY ROOM','CAFETERIA','SERVER ROOM','EXEC FLOOR','ROOF GARDEN','STAIRWELL','BOARDROOM']},
  {name:'DESERT',th:'desert',boss:'#ff5a1f',lv:['DUNES','OASIS','CANYON','MESA','OLD MINE','RAILROAD','SALOON','BONEYARD','SAND STORM','GHOST TOWN']},
  {name:'FACTORY',th:'factory',boss:'#c43bff',lv:['LOADING DOCK','ASSEMBLY','CONVEYOR','PRESS ROOM','FURNACE','PIPE MAZE','COOLING TOWER','WAREHOUSE','GENERATOR','CONTROL ROOM']},
  {name:'SNOWFALL',th:'snow',boss:'#3aa0ff',lv:['BASE CAMP','PINE TRAIL','FROZEN LAKE','ICE CAVE','ICE BRIDGE','BLIZZARD','AVALANCHE','WATCHTOWER','THE RIDGE','THE SUMMIT']},
  {name:'VOLCANO',th:'volcano',boss:'#ff2d55',lv:['ASH FIELDS','OBSIDIAN PATH','LAVA RIVER','STEAM VENTS','BURNING FOREST','MAGMA BRIDGE','THE FORGE','ROCKFALL','CALDERA RIM','THE CRATER']},
  {name:'HARBOR',th:'harbor',boss:'#ffd21f',lv:['DOCKS','FISH MARKET','CONTAINER YARD','WAREHOUSES','CRANE ROW','LIGHTHOUSE','FERRY','BREAKWATER','DRY DOCK','CARGO SHIP']},
  {name:'NEON DISTRICT',th:'neon',boss:'#00f0b5',lv:['ARCADE','RAMEN ALLEY','NIGHT MARKET','KARAOKE ROW','HOLO PLAZA','TRAIN YARD','DATA CENTER','SKY TRAM','ROOF CLUB','SKY BRIDGE']},
  {name:'TEMPLE',th:'temple',boss:'#ff6a00',lv:['JUNGLE PATH','RIVER CROSSING','OLD RUINS','VINE BRIDGE','HIDDEN VALLEY','STONE GARDEN','WATER TEMPLE','SUN GATE','INNER COURT','THE ALTAR']},
  {name:'SPACE STATION',th:'space',boss:'#ff3df0',lv:['AIRLOCK','HANGAR','CARGO BAY','CREW QUARTERS','MESS HALL','THE LAB','REACTOR','ENGINE ROOM','OBSERVATORY','THE BRIDGE']}
];
function genLevels(){
  const out=[],NL=WORLDS.length*LPW;
  WORLDS.forEach((w,wi)=>w.lv.forEach((nm,li)=>{
    const idx=wi*LPW+li,n=idx*29/(NL-1),D=idx/(NL-1),boss=li===LPW-1||li===4,r=k=>hash(idx*17+k);   // n: 0..29 difficulty scale
    const len=Math.min(5000,Math.round(2800+n*75));
    const sc=n<2?1:n<8?2:3,stairs=[];
    for(let i=0;i<sc;i++)stairs.push(Math.round(650+(i+.12+r(i)*.6)*(len-1500)/sc));
    const mult={hp:.85+.075*n,sp:Math.min(1.34,.92+.02*n),cd:Math.max(.5,1.5-.04*n),dmg:.6+.65*D,
      gunCd:2.6-1.6*D,gunWind:Math.round(46-22*D),gunSp:8.5+4.5*D,maxShooters:n<9?1:n<14?2:n<22?3:4,
      bossCol:w.boss,bossK:(li===4?.72:1)*(n<3?.62:n<6?.85:1)};
    const caps={gunner:n<4?0:n<8?1:n<12?2:n<18?3:4,heavy:n<5?0:n<9?1:n<15?2:3,ninja:n<9?0:n<13?1:n<19?2:3,samurai:n<15?0:n<22?1:2,kicker:n<2?0:9,runner:n<1?0:9,grunt:9};
    const wts={grunt:Math.max(1.2,5-n*.22),runner:3,kicker:3,gunner:2,heavy:1.5,ninja:2,samurai:1.6};
    const mk=(k,count,noGun)=>{
      const e=[],cnt={};
      for(let i=0;i<count;i++){
        let tot=0;const ok=[];
        for(const t in wts){if(caps[t]>0&&(cnt[t]||0)<caps[t]&&!(noGun&&t==='gunner')){ok.push(t);tot+=wts[t]}}
        let x=hash(idx*101+k*13+i*7+3)*tot,pick_=ok[0];
        for(const t of ok){x-=wts[t];if(x<=0){pick_=t;break}}
        e.push(pick_);cnt[pick_]=(cnt[pick_]||0)+1;
      }
      return e;
    };
    const nw=3+(n>=3?1:0)+(n>=8?1:0)+(n>=13?1:0)+(n>=19?1:0)+(n>=25?1:0),waves=[];
    for(let k=0;k<nw;k++){
      const size=Math.min(10,2+Math.floor(n/3.6)+(k===nw-1?1:0));
      if(boss&&k===nw-1)waves.push(['boss'].concat(mk(k,Math.min(6,2+Math.floor(n/5)),n<6)));
      else waves.push(n===0?Array(size).fill('grunt'):mk(k,size,false));
    }
    out.push({v:{s:(idx*37+11)%97,a:hash(idx*3+1),b:hash(idx*3+2),c:hash(idx*3+3)},name:nm,world:wi,wname:w.name,tag:(wi+1)+'-'+(li+1),th:w.th,len,stairs,mult,waves});
  }));
  return out;
}
const LEVELS=genLevels();
let unlocked=0,selLevel=0,best=new Array(LEVELS.length).fill(0),challenge=null;
try{
  unlocked=clamp(parseInt(localStorage.getItem('sb_unlock')||'0'),0,LEVELS.length-1);selLevel=unlocked;
  const b=JSON.parse(localStorage.getItem('sb_best')||'[]');if(Array.isArray(b))b.forEach((v,i)=>{if(i<best.length)best[i]=v|0});
}catch(e){}
(function(){ // incoming challenge link  ?c=score&l=level
  const m=/[?&]c=(\d+)&l=(\d+)/.exec(location.search);
  if(m){const sc=+m[1],lv=clamp(+m[2],1,LEVELS.length);challenge={score:sc,lv};unlocked=Math.max(unlocked,lv-1);selLevel=lv-1}
})();
function saveUnlock(n){if(n>unlocked){unlocked=n;try{localStorage.setItem('sb_unlock',String(n))}catch(e){}}}
function saveBest(){try{localStorage.setItem('sb_best',JSON.stringify(best))}catch(e){}}

let TH=THEMES.office,TERR=[],WAVES=[],WORLD=3000;
const mixCache={};
function mixHex(c,t,a){
  const key=c+t+a;if(mixCache[key])return mixCache[key];
  const n=parseInt(c.slice(1),16),m=parseInt(t.slice(1),16);
  const ch=s=>Math.round(((n>>s)&255)*(1-a)+((m>>s)&255)*a);
  return mixCache[key]='#'+((1<<24)|(ch(16)<<16)|(ch(8)<<8)|ch(0)).toString(16).slice(1);
}
function rc(c){return c==='H'?TH.hero:(TH.dark?mixHex(c,'#ffffff',.14):c)}
// life indicator: enemies wash out toward the background as their health drops
function washCol(f){
  const base=rc(f.col),w=Math.round((1-clamp(f.hp/f.hpMax,0,1))*8)/8;
  return w?mixHex(base,TH.bg,w*.8):base;
}

function mkStairs(x){const h=96,n=7;return {x,h,n,run:140,top:130,sh:h/n,sw:140/n}}
function hAt(x){
  let h=0;
  for(const s of TERR){
    const dx=x-s.x;if(dx<0||dx>2*s.run+s.top)continue;
    let v;
    if(dx<s.run)v=Math.min(s.h,(Math.floor(dx/s.sw)+1)*s.sh);
    else if(dx<=s.run+s.top)v=s.h;
    else v=Math.min(s.h,(Math.floor((2*s.run+s.top-dx)/s.sw)+1)*s.sh);
    if(v>h)h=v;
  }
  return h;
}
const gAt=x=>GY-hAt(x);
