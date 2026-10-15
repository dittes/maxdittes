'use strict';
/* MAX SMASH — combat, player, enemy AI, physics, waves, main step */
/* =====================================================================
   COMBAT
   ===================================================================== */
function inRange(a,t,h,d){
  const rx=(t.x-a.x)*d,dy=t.hy-a.hy;
  return rx>=h.r0*FS-6&&rx<=h.r1*FS+6*t.sc&&abs(dy)<(h.vy||75);
}
const SKIP=new Set(['lying','getup','dodge','held']);
function doHit(a,h){
  const targets=a.team==='p'?G.en:[G.p];
  const dirs=h.both?[1,-1]:[a.face];
  let any=false;
  for(const t of targets){
    if(t.dead||SKIP.has(t.state)||t.inv>0)continue;
    if(a.hitSet&&a.hitSet.has(t))continue;
    for(const d of dirs){
      if(inRange(a,t,h,d)){hurt(t,a,h,d);any=true;if(a.hitSet)a.hitSet.add(t);break}
    }
  }
  return any;
}
function disarm(t,d){
  t.armed=false;t.rng=54;t.atk=null;
  const h=t.pts.h1;
  G.items.push({x:h.x,y:t.hy+h.y,vx:d*R(3,6),vy:-R(7,10),r:0,vr:R(.3,.5)*d,t:0,landed:false,bounced:false});
  floatText(t.x,t.hy-100,'DISARMED!',18);snd('clang');burst(h.x,t.hy+h.y,34);
}
function hurt(t,a,h,d){
  const hx=t.x-d*8,hyy=t.hy-14;
  if(t.state!=='slam')t.lift=0;
  let dmg=h.dmg,crit=false;
  if(a.team==='e'&&a.dmgm)dmg*=a.dmgm;
  if(a.team==='p'&&!h.nocrit){
    const base=h.crit!==undefined?h.crit:(h.dmg>=13?.28:h.dmg>=10?.14:.05);
    if(!G.auto?rnd()<base:rnd()<base*1.4){crit=true;h=Object.assign({},h,{dmg:h.dmg*1.8,launch:Math.max(h.launch||0,8),kb:(h.kb||3)+3,stop:9,sh:14,big:1,snd:'heavy'});dmg=h.dmg}
  }
  if(t.auto)dmg*=.4;
  if(t.guard&&t.state==='idle'&&t.face===-d){
    dmg=Math.ceil(dmg*.15);t.hp-=dmg;snd('block');burst(hx-d*4,hyy,22);freeze=3;shake=Math.max(shake,3);
    t.vx=d*2.4;dust(t.x,3,d);if(t.hp<=0)die(t,a,h,d);return;
  }
  t.hp-=dmg;t.lastHit=h.nm||'';
  if(t.auto)t.hp=Math.max(t.hp,14);
  if(t.armed&&a.team==='p'&&((t.atk&&t.atk.gun)||rnd()<.35))disarm(t,d);
  t.emq.length=0;
  if(a.team==='p'){
    G.combo++;G.comboT=100;G.maxCombo=Math.max(G.maxCombo,G.combo);
    if(!(a.atk&&a.atk.special)&&!a.specialReady&&++G.hits>=G.nextSp){      // a special move every 10-20 hits
      a.specialReady=true;G.rings.push({x:a.x,y:a.hy-30,t:0});snd('pickup');
    }
    G.rage=Math.min(100,G.rage+dmg*.9);
    if(a.weapon){a.wuses--;if(a.wuses<=0){a.weapon=null;snd('breakBat');floatText(a.x,a.hy-90,'BAT BROKE',16)}}
  }
  snd(h.snd||'punch');
  freeze=Math.max(freeze,h.stop||4);shake=Math.max(shake,h.sh||4);
  burst(hx,hyy,h.big?64:40);
  blood(hx,hyy,bcol(t),d,h.big?14:7,h.big?1.3:1);
  if(h.big)invT=2;
  t.flash=4;
  if(crit){
    floatText(t.x,t.hy-125,'POWER '+(h.nm||'HIT')+'!',22);
    quake(t.x,'p',2);G.rings.push({x:hx,y:hyy,t:0},{x:hx,y:hyy,t:-5},{x:hx,y:hyy,t:-10});
    if(rnd()<.5)bulletTime(34,hx,hyy,0);
  }
  const fromBehind=t.face===d;t.sgn=fromBehind?1:-1;
  if(t.hp<=0){die(t,a,h,d);return}
  snd(t.team==='e'?'grunt':'hurt');
  if(t.T.armor&&!h.launch){
    t.vx=d*1.2;
    if(t.state==='atk'&&rnd()<.25){t.state='idle';t.atk=null;t.cd=40}
    return;
  }
  if(h.launch){launch(t,d,h.kb,h.launch);t.inv=h.inv?6:0}
  else{
    t.state='hurt';t.st=h.stun||16;t.atk=null;t.airAtk=false;
    t.vx=d*(h.kb||3);setPose(t,posed(P.hu),.5);
    t.cp.t=-.35*(fromBehind?-1:1);
    if(t.team==='p')t.inv=40;
  }
}
function launch(t,d,kb,up){
  t.state='fly';t.atk=null;t.airAtk=false;t.vx=d*kb;t.vy=-Math.max(up,3);t.st=0;
  t.spin=(t.face===d?1:-1)*(.07+up*.012);t.sgn=t.face===d?1:-1;
  setPose(t,posed(P.fl),.3);
}
function die(t,a,h,d){
  t.hp=0;t.dead=true;t.guard=false;
  launch(t,d,(h.kb||4)+2,Math.max(h.launch||0,5));
  snd('death');
  if(t.team==='e'){
    G.kills++;G.score+=t.T.pts+G.combo*10;G.rage=Math.min(100,G.rage+12);
    G.p.hp=Math.min(G.p.hpMax,G.p.hp+4);
    floatText(t.x,t.hy-100,'+'+t.T.pts,16);
    const last=G.en.every(e=>e.dead)&&!G.queue.length;
    freeze=Math.max(freeze,8);shake=Math.max(shake,10);
    if(t.type==='boss')bulletTime(110,t.x,t.hy-40,1);
    else if(last)bulletTime(80,t.x,t.hy-40,1);
    else if(h.launch&&rnd()<(G.auto?.2:.08))bulletTime(40,t.x,t.hy-40,0);
    else invT=2;
  }else{
    slowT=120;freeze=10;shake=14;invT=3;snd('over');
  }
}
function startAtk(f,atk){
  f.state='atk';f.atk=atk;f.fi=0;f.ft=0;f.guard=false;f.emq.length=0;
  if(atk.spin){f.hitSet=null;snd('spin')}
}
function runAtk(f){
  const atk=f.atk,fr=atk.frames[f.fi];
  if(f.ft===0){
    if(fr.turn)f.face*=-1;
    setPose(f,posed(fr.p,fr.sw!==undefined?fr.sw:(atk.sw!==undefined?atk.sw:f.swap)),fr.k||.5);
    if(fr.lift!==undefined)f.lift=fr.lift;
    if(fr.wh)snd(fr.hit&&fr.hit.big?'whoosh2':'whoosh');
    if(fr.lunge)f.vx=f.face*fr.lunge;
    if(fr.hit)doHit(f,fr.hit);
    if(fr.quake)quake(f.x+f.face*40,f.team==='p'?'p':'e',2);
    if(fr.fire)shoot(f);
  }
  if(atk.spin){
    if(f.ft%6===0&&f.ft>0)f.face*=-1;
    if(f.ft%6===3)doHit(f,{r0:0,r1:92,both:1,dmg:atk.sdmg||10,kb:6,launch:5,stop:3,snd:'kick',sh:4,big:1,vy:90,nm:atk.snm||'SPIN',crit:.1});
    f.vx=(f.ft<24?1:0)*f.face*2.2;
  }
  f.ft++;
  if(f.ft>=fr.d){f.fi++;f.ft=0;if(f.fi>=atk.frames.length)endAtk(f)}
  f.vx*=.82;
}
function endAtk(f){
  f.state='idle';f.atk=null;f.lift=0;f.fresh=1;
  if(f.team==='p')f.comboT=22;else f.cd=f.T.cd*f.cdm*R(.8,1.3);
}
function shoot(f){
  const h=f.pts.h1,x=h.x+f.face*14,y=f.hy+h.y;
  G.bullets.push({x,y,vx:f.face*(G.lv.mult.gunSp||12),dmg:10,dir:f.face,l:90,from:f,t:0});
  burst(x+f.face*4,y,30);snd('gun');shake=Math.max(shake,2);f.vx=-f.face*1.6;
}

/* =====================================================================
   PLAYER
   ===================================================================== */
function trySpecial(p){
  if(p.state==='air')return false;
  const near=G.en.some(e=>!e.dead&&!SKIP.has(e.state)&&abs(e.x-p.x)<150&&abs(e.hy-p.hy)<70);
  if(!near)return false;
  let kind=pick(['dragon','tornado','flurry','seoi','heel','dragon','flurry']),atk=null;
  if(kind==='seoi'&&!tryThrow(p,'seoi'))kind='flurry';
  if(kind==='dragon')atk=A.dragon();
  else if(kind==='tornado')atk=A.spin(true);
  else if(kind==='flurry')atk=A.flurry();
  else if(kind==='heel')atk=A.heel();
  if(atk){
    startAtk(p,atk);
    floatText(p.x,p.hy-135,{dragon:'DRAGON UPPERCUT',tornado:'TORNADO KICK',flurry:'HUNDRED FISTS',heel:'HEEL DROP'}[kind],20);
  }
  p.specialReady=false;G.hits=0;G.nextSp=10+((rnd()*11)|0);
  if(rnd()<.6)bulletTime(40,p.x+p.face*40,p.hy-40,0);
  return true;
}
function startPlayerAtk(p,btn){
  if(p.specialReady&&trySpecial(p)){p.comboT=0;return}
  const c=p.comboT>0?p.combo:0;
  let atk;
  if(btn==='j'){
    if(p.weapon)atk=A.bat();
    else if(c>=2){atk=pick([A.upper,A.chop,A.elbow])();p.combo=0}
    else{
      p.swap=!p.swap;
      atk=pick(c===0?[A.jab,A.cross,A.hook]:[A.backfist,A.palm,A.jab,A.cross])(p.swap);
      p.combo=c+1;
    }
  }else{
    if(c>=2){atk=pick([A.axe,A.spinback,A.side])();p.combo=0}
    else{atk=pick(c===0?[A.kick,A.front,A.side,A.sweep]:[A.kick,A.side,A.spinback,A.axe])();p.combo=c+1}
  }
  p.comboT=0;startAtk(p,atk);
}
function bulletThreat(p){
  return G.bullets.find(b=>b.dir*(p.x-b.x)>0&&abs(p.x-b.x)<200&&abs(b.y-(p.hy-10))<90);
}
function startDodge(p,b){
  p.state='dodge';p.st=0;p.inv=70;p.vx=0;p.face=-b.dir;p.guard=false;p.emq.length=0;
  setPose(p,posed(P.dg),.25);snd('dodge');
  bulletTime(115,p.x,p.hy-40,1);G.dodgeCd=120;
}
function tryThrow(p,kind){
  kind=kind||pick(['overhead','hip']);
  let v=null,bd=80;
  for(const e of G.en){
    if(e.dead||e.type==='boss'||(e.T.armor&&kind!=='seoi')||!['idle','walk','hurt'].includes(e.state))continue;
    const dx=(e.x-p.x)*p.face;
    if(dx>-10&&dx<(kind==='seoi'?78:60)&&abs(e.hy-p.hy)<50&&dx<bd){bd=dx;v=e}
  }
  if(!v)return false;
  buf.j=0;p.state='throw';p.thr={v,ft:0,kind};p.vx=0;p.guard=false;p.emq.length=0;
  v.state='held';v.atk=null;v.guard=false;v.face=-p.face;v.sgn=-1;v.emq.length=0;
  floatText(p.x,p.hy-125,{overhead:'JUDO THROW',hip:'HIP THROW',seoi:'SEOI-NAGE'}[kind]+'!',20);snd('whoosh2');
  return true;
}
function throwStep(p){
  const T=p.thr,v=T.v;T.ft++;const ft=T.ft;p.vx=0;p.inv=Math.max(p.inv,3);
  if(v.dead||v.state!=='held'){p.state='idle';return}
  if(ft<8){
    setPose(p,posed({t:.3,a1:1.4,f1:1.5,a2:1.2,f2:1.4,l1:.7,s1:.2,l2:-.6,s2:-.4}),.5);
    v.x=p.x+p.face*(34-ft*1.8);v.hy=p.hy-ft*2;
  }else if(ft<20){
    const u=(ft-8)/12;
    if(T.kind==='hip'){          // O-goshi: bend forward, the opponent rolls over the hip
      setPose(p,posed({t:.3+u*.7,a1:1.2,f1:1.5,a2:1.0,f2:1.4,l1:.7,s1:.1,l2:-.5,s2:-.3}),.5);
      v.x=p.x+p.face*(16-u*8);v.hy=p.hy-10-u*44;v.rot=v.rotT=u*PI;
    }else if(T.kind==='seoi'){   // shoulder throw: deep crouch, opponent flipped over the shoulder
      setPose(p,posed({t:.85+u*.15,a1:1.6,f1:2.2,a2:1.2,f2:1.8,l1:.9,s1:-.2,l2:-.6,s2:-.8}),.5);
      v.x=p.x+p.face*(8-u*14);v.hy=p.hy-14-u*60;v.rot=v.rotT=u*PI*1.05;
    }else{
      setPose(p,posed({t:-.25-u*.2,a1:2.2+u*.8,f1:2.6+u*.4,a2:2.0+u*.8,f2:2.5+u*.4,l1:.5,s1:.1,l2:-.5,s2:-.3}),.5);
      v.x=p.x+p.face*(18-u*14);v.hy=p.hy-16-u*70;v.rot=v.rotT=u*PI*.95;
    }
  }else if(ft===20){
    setPose(p,posed({t:.5,a1:1.0,f1:1.2,a2:.9,f2:1.1,l1:1.0,s1:.4,l2:-.8,s2:-.5}),.6);
    snd('heavy');
    hurt(v,p,{dmg:T.kind==='seoi'?32:22,kb:8,launch:9,stop:6,snd:'heavy',sh:7,big:1,nocrit:1,nm:'THROW'},p.face);
    if(!v.dead||v.state==='fly'){v.vx=p.face*8.5;v.vy=-5;v.thrown=1;v.hitSet=new Set([v])}
    if(T.kind==='seoi')quake(v.x,'p',2);
    G.score+=150;
  }else if(ft>=34)p.state='idle';
  if(ft<20){v.rotT=v.rot;setPose(v,posed(P.fl),.4)}
}

function crowdCount(p){let n=0;for(const e of G.en)if(!e.dead&&!SKIP.has(e.state)&&abs(e.x-p.x)<125)n++;return n}
function startSlam(p){
  p.state='slam';p.st=0;p.vx=0;p.guard=false;p.emq.length=0;p.atk=null;p.inv=Math.max(p.inv,80);
  bulletTime(72,p.x,p.hy-40,1);snd('charge');
}
function slamImpact(p){
  freeze=Math.max(freeze,7);shake=Math.max(shake,16);invT=2;
  quake(p.x,'p',3,true);dust(p.x,16);
  G.rings.push({x:p.x,y:p.hy+10,t:0},{x:p.x,y:p.hy+10,t:-5},{x:p.x,y:p.hy+10,t:-10});
  burst(p.x+p.face*16,p.hy+28,76);snd('heavy');
}
function updatePlayer(p){
  const celeb=mode==='clear'||mode==='win'||G.endT>0;
  const intro=G.banner>0&&!G.demo&&!celeb;     // level intro: the hero runs in, input is locked
  if(celeb||intro){buf.j=buf.k=buf.l=buf.up=0}
  const dir=celeb?0:intro?(p.x<150?1:0):(inR(p)?1:0)-(inL(p)?1:0),down=(celeb||intro)?0:inD(p);
  const anyIn=dir||down||buf.j||buf.k||buf.up||buf.l;
  if(p.inv>0)p.inv--;
  if(p.comboT>0&&--p.comboT===0)p.combo=0;
  switch(p.state){
    case 'idle':case 'run':{
      if(p.emoGap>0)p.emoGap--;
      if(p.emq.length){
        if(anyIn&&!p.auto){p.emq.length=0}
        else if(p.emoGap>0){}                                   // breathe between dances
        else if(!(p.auto&&G.active)){startEmote(p,p.emq.shift());break}
        else p.emq.length=0;
      }
      p.guard=!!down;
      const thr=G.dodgeCd<=0&&bulletThreat(p);
      if(p.guard&&thr){startDodge(p,thr);break}
      if(p.guard&&buf.j&&tryThrow(p))break;
      if(p.guard){p.vx*=.6;p.state='idle';setPose(p,posed(P.gd),.4);p.idleT=0}
      else{
        p.vx=dir*p.sp*(intro?.55:1);
        if(dir&&dir!==p.face&&p.state==='run'&&abs(p.vx)>1)dust(p.x,2,-dir);
        if(dir)p.face=dir;
        p.state=dir?'run':'idle';
        if(p.crouch>0){p.crouch--;setPose(p,posed(P.cr),.5)}
        else if(dir){const kk=clamp(abs(p.vx)/3.6,.3,1);p.ph+=p.vx*p.face*gaitRate(kk,p.sc);setPose(p,gait(p.ph,kk,false),.6)}
        else{
          p.ph2+=.05;const o=Object.assign({},STANCE),b=Math.sin(p.ph2*2.2);
          o.t+=Math.sin(p.ph2)*.025;o.l1+=b*.04;o.l2-=b*.04;o.a1+=Math.sin(p.ph2*1.3)*.06;o.hd=Math.sin(p.ph2*.7)*.08;
          setPose(p,o,.3);
        }
      }
      if(!p.guard){
        if(buf.up){buf.up=0;p.vy=-11.2;p.state='air';p.hy-=3;snd('jump');dust(p.x,4);p.idleT=0}
        else if(buf.l&&G.rage>=50){buf.l=0;G.rage-=50;startAtk(p,A.spin());floatText(p.x,p.hy-110,'SPIN!',18)}
        else if(buf.j){buf.j=0;startPlayerAtk(p,'j')}
        else if(buf.k){buf.k=0;startPlayerAtk(p,'k')}
        else if(!dir||celeb){
          // idle emotes: only when calm, after a few seconds, and never more than once per 15 s
          const calm=celeb||(!G.active&&G.en.every(e=>e.dead||abs(e.x-p.x)>520));
          if(calm&&(celeb||!p.auto)){
            p.idleT++;
            const ready=celeb?(p.idleT>40&&p.emoGap<=0):(p.idleT>180&&tick-p.lastEmote>900);
            if(ready)startEmote(p,pick(celeb?BIG:SMALL.concat(BIG)));
          }
        }
        if(dir||anyIn)p.idleT=0;
      }
      if(anyIn)p.idleStreak=0;
      break}
    case 'emote':{
      const e=p.em;e.t++;p.vx=0;
      EMO[e.n].f(p,e.t);
      if((anyIn&&!p.auto)||(p.auto&&G.active)){p.state='idle';p.emq.length=0;p.idleStreak=0;break}
      if(e.t>=e.d){p.state='idle';p.idleT=0;if(celeb)p.emoGap=170+((rnd()*90)|0)}
      break}
    case 'dodge':
      p.vx=0;p.st++;
      if(p.st>38){p.state='idle';p.inv=Math.max(p.inv,8)}
      break;
    case 'throw':throwStep(p);break;
    case 'slam':{                                   // crowd-breaker: leap, fist to the ground, shockwave
      const ft=++p.st;p.vx=0;p.inv=Math.max(p.inv,4);
      if(ft<16){const u=ft/16;p.lift=Math.sin(u*PI/2)*78;setPose(p,posed({t:-.25,a1:2.9,f1:3.1,a2:2.7,f2:3.0,l1:1.0,s1:.3,l2:.4,s2:-.5}),.45)}
      else if(ft<24){const u=(ft-16)/8;p.lift=78*(1-u*u);setPose(p,posed({t:.9,hd:.3,a1:.15,f1:.05,a2:-.7,f2:-1.0,l1:.5,s1:-.3,l2:-.5,s2:-.9}),.7)}
      else{
        if(ft===24){p.lift=0;slamImpact(p)}
        setPose(p,posed({t:.95,hd:.35,a1:.1,f1:.02,a2:-.8,f2:-1.1,l1:.9,s1:-.4,l2:-.4,s2:-1.2}),.5);
      }
      if(ft>=54){p.state='idle';p.lift=0;p.crouch=6}
      break}
    case 'air':{
      p.vx+=(dir*p.sp*1.05-p.vx)*.2;
      if(p.siu){
        setPose(p,posed(p.siuTurned?P.siuAir:P.jm),.4);
        if(!p.siuTurned&&p.vy>0){p.siuTurned=1;p.face*=-1}                // the famous mid-air 180
      }else if(p.flip){
        setPose(p,posed(P.jm),.35);p.rot-=.172;p.rotT=p.rot;
        if(p.vy>-6&&p.vy<-5.5)snd('whoosh');
      }else if(!p.airAtk){
        setPose(p,posed(P.jm),.3);
        if(buf.j||buf.k){buf.j=buf.k=0;p.airAtk=true;p.hitSet=new Set();snd('whoosh2');setPose(p,posed(P.fk),.6)}
      }
      if(p.airAtk&&doHit(p,{r0:-4,r1:76,dmg:12,kb:6,launch:3,stop:5,snd:'kick',sh:5,big:1,vy:80,nm:'FLYING KICK'}))p.vy=-3;
      break}
    case 'atk':
      runAtk(p);
      if(p.atk&&!p.atk.spin&&p.fi>=p.atk.frames.length-1&&p.ft>1){
        if(buf.j){buf.j=0;startPlayerAtk(p,'j')}
        else if(buf.k){buf.k=0;startPlayerAtk(p,'k')}
      }
      break;
    case 'hurt':if(--p.st<=0)p.state='idle';p.vx*=.85;break;
    case 'lying':{
      const o=Object.assign({},p.rest||posed(P.kneel));o.t+=Math.sin(p.st*.3)*.05;setPose(p,o,.3);
      if(++p.st>38){p.state='getup';p.st=0;p.inv=60;p.rotT=2*PI*Math.round(p.rot/(2*PI))}
      break}
    case 'getup':setPose(p,posed(P.cr),.3);if(++p.st>14){p.state='idle';p.rot=p.rotT=0}break;
  }
}

/* ---------- autopilot (WATCH mode / menu backdrop) ---------- */
function autopilot(p){
  const c=p.ai;c.l=c.r=c.d=0;
  if(p.dead)return;
  if(G.auto&&p.hp<p.hpMax*.5)p.hp+=.05;
  if(p.state==='emote'||p.flip||p.emq.length)return;
  if(c.blk>0){c.blk--;c.d=1}
  const thr=G.dodgeCd<=0&&bulletThreat(p);
  if(thr&&(p.state==='idle'||p.state==='run')&&rnd()<.6){c.d=1;return}
  const live=G.en.filter(e=>!e.dead&&e.state!=='lying'&&e.state!=='getup'&&e.state!=='held');
  let t=null,bd=1e9;
  for(const e of live){const d=abs(e.x-p.x);if(d<bd){bd=d;t=e}}
  if(!t){
    if(!G.active&&G.wave<WAVES.length&&G.queue.length===0){c.r=1}
    else{const mid=cam+W*.38;if(p.x<mid-40)c.r=1;else if(p.x>mid+40)c.l=1}
    return;
  }
  const dx=t.x-p.x,dist=abs(dx),sgn=dx>=0?1:-1;
  if(p.state==='idle'||p.state==='run'){if(dist<90||p.state==='idle')p.face=sgn}
  const near=live.filter(e=>abs(e.x-p.x)<110).length;
  if(p.state==='atk'&&c.chain>0&&p.atk&&p.fi===p.atk.frames.length-1&&!p.atk.spin){buf.j=BUF;c.chain--}
  if(p.state==='air'){if(dist<95&&!p.airAtk)buf.k=BUF;if(sgn>0)c.r=1;else c.l=1;return}
  if(p.state!=='idle'&&p.state!=='run')return;
  c.t--;
  if(t.armed&&dist>150){ if(sgn>0)c.r=1;else c.l=1; if(dist>200&&c.t<=0&&rnd()<.03){buf.up=BUF;c.t=40} return}
  if(dist>72){
    if(sgn>0)c.r=1;else c.l=1;
    if(dist>110&&dist<190&&c.t<=0&&rnd()<.02){buf.up=BUF;c.t=50}
    return;
  }
  if(t.state==='atk'&&rnd()<.04&&c.blk<=0){c.blk=22;return}
  if(c.t>0)return;
  const r=rnd();
  if(!t.T.armor&&r<.16){c.d=1;buf.j=BUF;c.t=40}                        // judo throw
  else if(near>=2&&G.rage>=50&&r<.5){buf.l=BUF;c.t=40}
  else if(r<.6){buf.j=BUF;c.chain=2;c.t=24}
  else if(r<.85){buf.k=BUF;c.t=26}
  else{ if(sgn>0)c.l=1;else c.r=1; c.t=10 }
}

/* =====================================================================
   ENEMY AI
   ===================================================================== */
function updateEnemy(e,p){
  if(e.inv>0)e.inv--;
  if(e.dead)return;
  const dx=p.x-e.x,dist=abs(dx);
  switch(e.state){
    case 'idle':case 'walk':{
      e.guard=false;e.cd--;
      const pAlive=!p.dead&&p.state!=='lying'&&p.state!=='dodge'&&p.state!=='throw';
      e.face=dx>=0?1:-1;
      const T=e.T,want=e.rng*FS;
      let mv=0;
      if(e.armed){
        if(dist<190)mv=-1.2;else if(dist>340)mv=1;
        if(e.cd<=0&&dist>120&&dist<460&&pAlive&&abs(p.hy-e.hy)<70&&G.en.filter(o=>o.state==='atk'&&o.atk&&o.atk.gun).length<(G.lv.mult.maxShooters||1)){startAtk(e,A.eGun(G.lv.mult.gunWind));break}
      }else{
        if(dist>want+6)mv=1;else if(dist<want-14&&e.cd>10)mv=-.5;
        const attackers=G.en.filter(o=>o.state==='atk'&&o.atk&&o.atk.melee).length;
        if(e.cd<=0&&dist<=want+10&&abs(p.hy-e.hy)<60&&attackers<2&&pAlive){
          const r=rnd();
          if(e.type==='boss'){
            if(r<.3)startAtk(e,A.eSlam(18));
            else if(r<.55)startAtk(e,A.eKick(15,12));
            else if(r<.8)startAtk(e,A.ePunch(14,9));
            else{e.state='air';e.vy=-12;e.vx=e.face*7;e.air=true;e.hitSet=new Set();snd('jump');break}
          }else if(e.type==='ninja'){startAtk(e,A.ePunch(8,8));e.retreat=34}
          else if(e.type==='samurai')startAtk(e,A.eSlam(13));
          else if(e.type==='kicker')startAtk(e,A.eKick(9));
          else if(e.type==='heavy')startAtk(e,rnd()<.4?A.eSlam(15):A.ePunch(13,22));
          else if(e.type==='runner'&&rnd()<.25){e.state='air';e.vy=-9;e.vx=e.face*6;e.air=true;e.hitSet=new Set();snd('jump');break}
          else startAtk(e,A.ePunch(e.type==='runner'?6:7));
        }
        if(e.type==='boss'&&e.cd<-120&&dist>200){e.state='air';e.vy=-12;e.vx=e.face*8.5;e.air=true;e.hitSet=new Set();snd('jump');e.cd=40;break}
      }
      if(e.retreat>0){mv=-1.4;e.retreat--}
      if(e.state==='atk')break;
      for(const o of G.en){if(o!==e&&!o.dead&&abs(o.x-e.x)<26&&o.state!=='lying'&&o.state!=='held')e.x+=(e.x<o.x?-.6:.6)}
      e.vx=mv*e.sp*e.face;
      if(e.x>cam+W-44){e.vx=-e.sp;mv=1}else if(e.x<cam+44){e.vx=e.sp;mv=1}
      if(e.crouch>0){e.crouch--;setPose(e,posed(P.cr),.5);e.state='idle'}
      else if(mv){const kk=clamp(abs(e.vx)/3.6,.25,1);e.ph+=e.vx*e.face*gaitRate(kk,e.sc);e.state='walk';setPose(e,gait(e.ph,kk,true),.55)}
      else{
        e.state='idle';e.ph2+=.05;e.tauntT--;
        const o=Object.assign({},STANCE),b=Math.sin(e.ph2*2.4+e.ph);
        o.t+=Math.sin(e.ph2+e.ph)*.03;o.l1+=b*.05;o.l2-=b*.05;o.hd=Math.sin(e.ph2*.8)*.1;
        // micro taunt: little head shake / fist flick while waiting to attack
        if(e.tauntT<0){o.a1=1.4;o.f1=1.4+Math.sin(e.tauntT*.5)*.6;if(e.tauntT<-30)e.tauntT=120+((rnd()*200)|0)}
        setPose(e,o,.3);
      }
      if(e.armed&&e.cd<40)setPose(e,posed(P.gn),.3);
      break}
    case 'atk':runAtk(e);break;
    case 'held':
      // released if the thrower got interrupted
      if(!(p.state==='throw'&&p.thr&&p.thr.v===e)){e.state='idle';e.rot=e.rotT=0;e.cd=30;e.fresh=1}
      break;
    case 'air':
      setPose(e,posed(P.fk),.4);
      doHit(e,{r0:-4,r1:68,dmg:e.type==='boss'?14:8,kb:5,launch:3,stop:4,snd:'kick',sh:4,vy:80});
      break;
    case 'hurt':
      e.guard=false;if(--e.st<=0){e.state='idle';e.cd=Math.max(e.cd,20)}e.vx*=.85;break;
    case 'lying':{
      const o=Object.assign({},e.rest||posed(P.kneel));o.t+=Math.sin(e.st*.3)*.05;setPose(e,o,.3);
      if(++e.st>45){e.state='getup';e.st=0;e.inv=40;e.rotT=2*PI*Math.round(e.rot/(2*PI))}
      break}
    case 'getup':
      setPose(e,posed(P.cr),.3);
      if(++e.st>16){e.state='idle';e.rot=e.rotT=0;e.cd=30}
      break;
  }
}

/* =====================================================================
   PHYSICS
   ===================================================================== */
const GROUNDED=new Set(['idle','run','walk','atk','hurt','getup','lying','dead','dodge','emote','throw','slam']);
const FLATTY=new Set(['lying','dead','getup']);
function pickRest(f){
  const n=f.lastHit||'';
  let o;
  if(n==='KICK'||n==='SPIN'||n==='SHOT'||n==='FLYING KICK')o=['stomach','stomach','hips','fours'];
  else if(n==='PUNCH')o=['head','kneel','oneknee','hips'];
  else if(n==='UPPERCUT'||n==='HOME RUN')o=['head','fours','oneknee'];
  else if(n==='THROW'||n==='STRIKE')o=['fours','stomach','oneknee'];
  else o=['fours','kneel','oneknee','hips','stomach','head'];
  return posed(P[pick(o)],rnd()<.5);
}
function physics(f){
  f.pp=f.pts;f.phy=f.hy;
  stepPose(f);
  if(f.state==='held'){f.rot=f.rotT}else f.rot+=(f.rotT-f.rot)*.3;
  if(f.flash>0)f.flash--;
  // lean with the stairs: grounded figures tilt a bit toward the slope's normal
  let tt=0;
  if(GROUNDED.has(f.state)&&!FLATTY.has(f.state)&&f.state!=='throw')tt=-f.face*Math.atan((hAt(f.x+16)-hAt(f.x-16))/32)*.42;
  f.tilt=(f.tilt||0)+(tt-(f.tilt||0))*.2;
  f.pts=skel(f);
  const flat=FLATTY.has(f.state)&&abs(f.rotT)>1;
  const low=flat?f.pts.lowFlat:f.pts.low;
  if(GROUNDED.has(f.state)){
    f.x+=f.vx;
    const tg=gAt(f.x)-low-(f.lift||0),df=tg-f.hy,lc=(f.lift||0)!==(f.llift||0);f.llift=f.lift||0;
    if(f.fresh||abs(df)>60||FLATTY.has(f.state)||f.state==='slam'||lc||f.lift>0){f.hy=tg;f.fresh=0}
    else f.hy+=clamp(df,-6,6);
    if(f.state==='run'&&tick%9===0)dust(f.x-f.face*10,1,-f.face);
    else if(f.state==='walk'&&tick%22===0&&rnd()<.5)dust(f.x-f.face*8,1,-f.face);
  }else if(f.state==='air'){
    f.vy+=.58;f.x+=f.vx;f.hy+=f.vy;
    const g2=gAt(f.x);
    if(f.hy+low>=g2&&f.vy>0){
      f.hy=g2-low;f.state='idle';f.airAtk=false;f.air=false;f.vx*=.3;f.hitSet=null;f.crouch=7;
      if(f.flip){f.flip=0;f.rot=f.rotT=0;snd('pop');if(G.endT>0||mode==='clear'||mode==='win')f.emoGap=170+((rnd()*90)|0)}
      if(f.siu){f.siu=0;f.siuTurned=0;f.state='emote';f.em={n:'siuhold',t:0,d:80};snd('land');shake=Math.max(shake,5);dust(f.x,10)}
      dust(f.x,6);snd('land');
      if(f.type==='boss'){snd('thud');quake(f.x,'e',2)}
      if(f.team==='e')f.cd=40;
    }
  }else if(f.state==='fly'){
    f.vy+=.5;f.x+=f.vx;f.hy+=f.vy;f.rot+=f.spin;f.vx*=.992;
    if(f.thrown)thrownHits(f);
    const g2=gAt(f.x);
    if(f.hy+low>=g2&&f.vy>0){
      f.hy=g2-low;
      if(f.vy>4.5&&!f.bounced){
        f.vy=-f.vy*.32;f.vx*=.6;f.bounced=1;snd('thud');shake=Math.max(shake,5);dust(f.x,8);
        blood(f.x,g2-4,bcol(f),f.vx>0?1:-1,6,.6);
        if(f.thrown){quake(f.x,'p',1);f.thrown=0}
      }else{
        f.vy=0;f.bounced=0;f.vx=0;f.thrown=0;
        f.state=f.dead?'dead':'lying';f.st=0;
        f.spin=0;
        if(f.dead){const k=Math.round((f.rot-f.sgn*PI/2)/(2*PI));f.rotT=f.sgn*PI/2+2*PI*k;f.rest=posed(P.ly)}
        else{f.rotT=2*PI*Math.round(f.rot/(2*PI));f.rest=pickRest(f)}   // alive: stays upright in a rest posture (knees, all fours, holding the belly, ...)
        setPose(f,f.rest,.25);snd('land');
        if(f.dead)pool(f);
      }
    }
  }
  f.x=clamp(f.x,-60,WORLD+60);
  if(f.team==='p')f.x=clamp(f.x,cam+16,cam+W-16);
  if(!lowQ&&f.team==='p'&&(f.state==='atk'||f.airAtk||(mxA>.3&&f.state!=='lying'))){
    f.trail.push({pts:f.pts,hy:f.hy});if(f.trail.length>5)f.trail.shift();
  }else if(f.trail.length)f.trail.shift();
}
function thrownHits(f){
  for(const o of G.en){
    if(o===f||o.dead||f.hitSet.has(o)||SKIP.has(o.state))continue;
    if(abs(o.x-f.x)<36&&abs(o.hy-f.hy)<80){
      f.hitSet.add(o);
      hurt(o,G.p,{dmg:24,kb:8,launch:8,stop:9,snd:'heavy',sh:12,big:1,nocrit:1,nm:'STRIKE'},f.vx>=0?1:-1);
      f.vx*=.4;floatText(o.x,o.hy-115,'STRIKE!',22);G.combo+=2;G.score+=100;
      G.rings.push({x:o.x,y:o.hy-20,t:0});
    }
  }
}
function pool(f){
  if(!bloodOn)return;
  const y=gAt(f.x);
  G.pools.push({x:f.x,y,w:R(46,74)*f.sc,col:bcol(f),big:1});
  for(let i=0;i<3;i++){const x=f.x+R(-50,50);G.pools.push({x,y:gAt(x),w:R(8,26),col:bcol(f)})}
  if(G.pools.length>260)G.pools.splice(0,G.pools.length-260);
}
function hurtDirect(f,dmg){
  if(f.dead||f.inv>0||f.state==='dodge'||f.state==='lying')return;
  f.hp-=dmg;if(f.auto)f.hp=Math.max(f.hp,14);f.flash=4;
  if(f.hp<=0)die(f,G.p,{kb:3,launch:5},1);
}

/* =====================================================================
   WAVES / FLOW
   ===================================================================== */
function updateWaves(){
  const p=G.p;
  if(!G.active&&G.wave<WAVES.length&&p.x>=WAVES[G.wave].x){
    const w=WAVES[G.wave];G.active=true;lockMax=w.x-250;
    G.queue=w.e.map((t,i)=>({t,d:i*38+10,side:i%2?1:-1}));
    snd('go');
  }
  if(G.active){
    for(const q of G.queue)q.d--;
    while(G.queue.length&&G.queue[0].d<=0){
      const q=G.queue.shift();
      const x=q.side>0?cam+W+50:cam-50;
      const e=F(q.t,x,-q.side,G.lv.mult);G.en.push(e);G.all.push(e);
      if(q.t==='boss')floatText(cam+W/2,GY-230,'BOSS',38);
    }
    if(!G.queue.length&&G.en.every(e=>e.dead)){
      G.active=false;
      const w=WAVES[G.wave];
      if(w.drop)G.pick.push({x:w.x+120,type:'bat',t:0});
      G.wave++;G.goT=0;G.celT=50;
      if(G.wave<WAVES.length)lockMax=WAVES[G.wave].x-250;else lockMax=WORLD-W;
      if(G.wave>=WAVES.length){G.endT=1;celebrate(p,shuffled(['siu','dab','getbusy','flex','saysoo','beam','twirl','jacks','flip']));snd('tada')}
    }
  }
  if(G.endT>0){
    G.endT++;
    if(G.endT%7===0)confetti(4);
    if(G.endT>760){
      zoomT=1;
      if(mode==='play'){
        const last=curLevel>=LEVELS.length-1;
        if(!last)saveUnlock(curLevel+1);
        if(G.score>best[curLevel]){best[curLevel]=G.score;G.newBest=true;saveBest()}
        if(challenge&&challenge.lv===curLevel+1)G.beat=G.score>challenge.score;
        mode=last?'win':'clear';snd('clear');
      }else if(mode==='watch'||mode==='title'){
        startLevel((curLevel+1)%LEVELS.length,true,G.demo);
      }
    }
  }
  if(!G.active&&G.wave<WAVES.length&&G.banner<=0)G.goT++;
}

/* =====================================================================
   MAIN STEP
   ===================================================================== */
function firework(){
  const p=G.p,x=p.x+R(-W*.3,W*.3),y=p.hy-R(130,270),c=pick(['#e0b030','#d04040','#3d6fb8','#30a060','#c050d0']);
  snd('pop');
  const n=lowQ?16:28;
  for(let i=0;i<n;i++){const a=i/n*2*PI+R(-.1,.1),v=R(1.2,3.6);G.parts.push({fw:1,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,col:c,r:R(1.5,2.6),l:R(40,70)})}
  G.rings.push({x,y,t:0});
}
function updateQuakes(){
  for(const q of G.quakes){
    q.t++;const r=q.t*12;q.r=r;
    if(q.push){                                            // shockwave that throws a crowd off its feet
      if(q.t%2===0&&q.t<40)for(const sd of [-1,1]){const x=q.x+sd*r;if(x>cam-20&&x<cam+W+20)G.parts.push({x,y:gAt(x)-2,vx:sd*R(.5,2.4),vy:-R(1,5),col:'#777',r:R(1.5,3.4),l:R(14,26),dust:1})}
      for(const f of G.en){
        if(f.dead||q.hit.has(f)||SKIP.has(f.state))continue;
        if(abs(abs(f.x-q.x)-r)<26){
          q.hit.add(f);
          hurt(f,G.p,{dmg:12,kb:10,launch:8,stop:3,snd:'heavy',sh:6,big:1,nocrit:1,nm:'SHOCKWAVE'},f.x>=q.x?1:-1);
        }
      }
      continue;
    }
    if(q.t%2===0&&q.t<40){
      for(const s of [-1,1]){const x=q.x+s*r;if(x>cam-20&&x<cam+W+20)G.parts.push({x,y:gAt(x)-2,vx:s*R(.5,2),vy:-R(1,4),col:'#777',r:R(1.5,3),l:R(14,26),dust:1})}
    }
    for(const f of G.all){
      if(f.dead||f.team===q.team||q.hit.has(f))continue;
      if(!(f.state==='idle'||f.state==='walk'||f.state==='run'||f.state==='atk'||f.state==='hurt'||f.state==='emote'))continue;
      if(abs(abs(f.x-q.x)-r)<16){
        q.hit.add(f);
        if(f.armed)f.cd=Math.max(f.cd,40);
        f.state='air';f.vy=-3.5-q.pow*1.5;f.vx*=.3;f.atk=null;f.hitSet=null;f.emq.length=0;f.em=null;
        hurtDirect(f,q.pow>1?6:3);
      }
    }
  }
  G.quakes=G.quakes.filter(q=>q.t<55);
}
function step(){
  tick++;
  if(!G||paused||helpOpen||settingsOpen)return;
  const celeb=mode==='clear'||mode==='win';
  if(mode!=='play'&&mode!=='watch'&&mode!=='title'&&!celeb)return;
  if(freeze>0){freeze--;return}
  camPrev=cam;
  const p=G.p;
  G.time+=celeb?0:1;
  if(G.banner>0)G.banner--;
  if(G.dodgeCd>0)G.dodgeCd--;
  if(G.comboT>0&&--G.comboT===0)G.combo=0;
  if(celeb){
    updatePlayer(p);physics(p);updateQuakes();
    if(tick%7===0)confetti(3);
  }else{
    if(G.slamCd>0)G.slamCd--;
    if(!p.dead&&(p.state==='idle'||p.state==='run')&&G.slamCd<=0&&G.banner<=0&&G.endT===0&&rnd()<.04&&crowdCount(p)>=4){startSlam(p);G.slamCd=700}
    if(p.auto)autopilot(p);
    if(!p.dead)updatePlayer(p);
    else if(p.state==='dead'){G.overT++;if(G.overT>110&&mode==='play'){mode='over'}}
    for(const e of G.en)updateEnemy(e,p);
    for(const f of G.all)physics(f);
    updateWaves();
    updateQuakes();
    // victory sequence: camera pushes in on the hero, fireworks + confetti, banner (drawn in HUD)
    if(G.endT>0&&G.endT<=760){
      if(G.endT>20){zoomT=portrait?1.18:1.3;fx=p.x;fy=p.hy-50}
      if(G.endT>24&&G.endT%34===0)firework();
    }
    // level intro cues
    if(!G.demo){
      if(G.banner===150)celebrate(p,['bounce']);
      if(G.banner===100)snd('go');
      if(G.banner>170){zoomT=portrait?1.35:1.5;fx=p.x+30;fy=p.hy-40}else if(G.banner===170)zoomT=1;
    }
    // brief celebration after a wave when nothing is going on
    if(G.celT>0&&--G.celT===0&&G.endT===0&&(p.state==='idle')&&tick-p.lastEmote>900&&!(p.auto?false:(keys.ArrowLeft||keys.ArrowRight||keys.KeyA||keys.KeyD||vk.left||vk.right)))
      celebrate(p,[pick(['dab','flex','getbusy','saysoo','siu','twirl','jacks','flip','beam'])]);
  }
  for(const k in buf)if(buf[k]>0)buf[k]--;   // input buffers expire after a few ticks
  for(const b of G.bullets){
    b.x+=b.vx;b.l--;b.t++;
    if(G.smoke.length<300)for(let j=0;j<(lowQ?2:4);j++)G.smoke.push({x:b.x-b.dir*10-b.vx*j/(lowQ?2:4),y:b.y+R(-1.2,1.2),r:2.6,a:.42,vy:-.12,vx:-b.dir*.12});
    if(!p.dead&&p.inv<=0&&p.state!=='lying'&&p.state!=='dodge'&&abs(b.x-p.x)<12&&b.y>p.hy-62&&b.y<p.hy+50){
      b.l=0;hurt(p,b.from,{dmg:b.dmg,kb:3,stop:4,snd:'punch',sh:4,nm:'SHOT'},b.dir);
    }
  }
  G.bullets=G.bullets.filter(b=>b.l>0&&b.x>cam-200&&b.x<cam+W+200);
  for(const k of G.pick){
    k.t++;
    if(!k.gone&&abs(p.x-k.x)<28&&!p.dead&&p.state!=='air'&&!p.auto){k.gone=1;p.weapon='bat';p.wuses=14;snd('pickup');floatText(p.x,p.hy-100,'BAT!',20)}
  }
  G.pick=G.pick.filter(k=>!k.gone);
  for(const it of G.items){
    it.t++;
    if(!it.landed){
      it.vy+=.5;it.x+=it.vx;it.y+=it.vy;it.r+=it.vr;
      const g=gAt(it.x);
      if(it.y>=g-3){it.y=g-3;if(!it.bounced){it.bounced=true;it.vy=-it.vy*.4;it.vx*=.5;it.vr*=.5;snd('land')}else{it.landed=true;it.r=Math.round(it.r/PI)*PI+.15}}
    }
  }
  for(const q of G.parts){
    if(q.fw){q.vy+=.05;q.vx*=.985;q.vy*=.985;q.x+=q.vx;q.y+=q.vy;q.l--;continue}
    if(q.conf){q.vy=Math.min(q.vy+.05,2.4);q.x+=q.vx+Math.sin(q.l*.15)*.5;q.y+=q.vy;q.rot+=q.vr;q.l--;continue}
    q.vy+=q.dust?0:.45;q.x+=q.vx;q.y+=q.vy;q.l--;
    if(q.dust){q.r+=.2;q.vx*=.95}
    else{const g=gAt(q.x);if(q.y>=g-1&&q.vy>0){q.l=0;if(G.pools.length<300&&q.r>1.8)G.pools.push({x:q.x,y:g,w:q.r*R(2,4),col:q.col})}}
  }
  G.parts=G.parts.filter(q=>q.l>0);
  for(const m of G.smoke){m.r+=.18;m.a*=.86;m.y+=m.vy;m.x+=m.vx}G.smoke=G.smoke.filter(m=>m.a>.035);
  for(const b of G.bursts)b.t++;G.bursts=G.bursts.filter(b=>b.t<b.l);
  for(const r of G.rings)r.t++;G.rings=G.rings.filter(r=>r.t<40);
  for(const t of G.texts){t.t++;t.y-=.6}G.texts=G.texts.filter(t=>t.t<t.l);
  if(p.hp<=0&&!p.dead)p.dead=true;
  // camera with a little look-ahead in the facing direction
  const target=clamp(p.x-W*.36+p.face*36,0,Math.min(lockMax,WORLD-W));
  cam+=(target-cam)*.1;cam=clamp(cam,0,Math.max(0,lockMax));
  if(shake>0)shake*=.82;if(shake<.3)shake=0;
  if(invT>0)invT--;
  intensity=G.active?1:0;
  if(G.all.length>60){
    const dead=G.all.filter(f=>f.dead&&f.state==='dead'&&f!==p);
    if(dead.length>25){const rm=dead[0];G.all.splice(G.all.indexOf(rm),1);G.en.splice(G.en.indexOf(rm),1)}
  }
}
