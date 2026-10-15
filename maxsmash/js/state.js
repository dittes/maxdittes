'use strict';
/* MAX SMASH — game state, sharing, effects */
/* =====================================================================
   GAME STATE
   ===================================================================== */
let mode='title',G=null,cam=0,camPrev=0,lockMax=0,shake=0,freeze=0,invT=0,ts=1,slowT=0,mxOn=false,mxA=0;
let zoom=1,zoomT=1,tilt=0,tiltT=0,fx=0,fy=0,tick=0,curLevel=0;
function startLevel(li,auto,demo){
  curLevel=li;const L=LEVELS[li];
  TH=THEMES[L.th];TERR=L.stairs.map(mkStairs);WORLD=L.len;
  const gap=(L.len-1500)/(L.waves.length-1||1);
  WAVES=L.waves.map((e,i)=>({x:Math.round(430+i*gap),e,boss:e.includes('boss'),drop:i===1&&!auto}));
  const sx=demo?140:24,p=F('hero',sx,1);p.hy=gAt(sx)-50;
  if(auto){p.auto=true;p.ai={l:0,r:0,d:0,chain:0,t:0,blk:0,jmp:0}}
  G={p,en:[],parts:[],pools:[],bursts:[],bullets:[],pick:[],texts:[],rings:[],items:[],quakes:[],cracks:[],smoke:[],lv:L,
     wave:0,active:false,queue:[],score:0,kills:0,combo:0,comboT:0,maxCombo:0,rage:0,time:0,
     banner:demo?0:240,goT:0,endT:0,overT:0,all:[p],auto:!!auto,demo:!!demo,dodgeCd:0,slamCd:420,hits:0,nextSp:10+((rnd()*11)|0),celT:0,newBest:false,beat:null};
  cam=camPrev=0;lockMax=WAVES[0].x-250;shake=0;freeze=0;slowT=0;mxOn=false;zoomT=1;zoom=demo?1:(portrait?1.35:1.5);fx=110;fy=GY-60;tilt=tiltT=0;
  for(const k in keys)keys[k]=0;vk.left=vk.right=vk.down=0;
}
function act(id){
  snd('ui');
  switch(id){
    case 'sound':setMute(!muted);break;
    case 'help':helpOpen=true;break;
    case 'settings':settingsOpen=true;break;
    case 'settingsclose':settingsOpen=false;break;
    case 'blood':toggleBlood();break;
    case 'soundtoggle':setMute(!muted);break;
    case 'helpclose':helpOpen=false;break;
    case 'full':toggleFull();break;
    case 'play':mode='play';startLevel(selLevel,false);break;
    case 'watch':mode='watch';startLevel((Math.random()*LEVELS.length)|0,true);break;
    case 'retry':mode='play';startLevel(curLevel,false);break;
    case 'next':mode='play';startLevel(Math.min(curLevel+1,LEVELS.length-1),false);selLevel=curLevel;break;
    case 'home':goTitle();break;
    default:
      if(id.startsWith('lv')){const n=+id.slice(2);if(n<=unlocked){selLevel=n;selChanged()}}
      else if(id.startsWith('wd')){const w=+id.slice(2);if(w*LPW<=unlocked){selLevel=Math.min(w*LPW+(selLevel%LPW),unlocked);selChanged()}}
  }
}
function selChanged(){if(mode==='title')startLevel(selLevel,true,true)}
function goTitle(){mode='title';startLevel(selLevel,true,true)}
function toggleBlood(){bloodOn=!bloodOn;try{localStorage.setItem('sb_blood',bloodOn?'1':'0')}catch(e){}toast('Blood '+(bloodOn?'on':'off'))}
function toggleFull(){
  try{
    const d=document,e=d.documentElement;
    if(d.fullscreenElement||d.webkitFullscreenElement)(d.exitFullscreen||d.webkitExitFullscreen).call(d);
    else (e.requestFullscreen||e.webkitRequestFullscreen).call(e);
  }catch(_){}
}
const canFull=()=>!!(document.fullscreenEnabled||document.webkitFullscreenEnabled);

/* =====================================================================
   SHARING — native share sheet with a generated result card, link fallback
   ===================================================================== */
function baseUrl(){return location.href.split('?')[0].split('#')[0]}
function makeCard(){
  const c=document.createElement('canvas');c.width=1200;c.height=630;
  const c2=c.getContext('2d'),sv=ctx;ctx=c2;
  try{
    c2.fillStyle=TH.bg;c2.fillRect(0,0,1200,630);
    c2.fillStyle=TH.dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)';c2.fillRect(0,500,1200,130);
    c2.strokeStyle=TH.fg;c2.lineWidth=6;c2.beginPath();c2.moveTo(0,500);c2.lineTo(1200,500);c2.stroke();
    // fighters
    const hero=F('hero',150,1),foe=F('grunt',235,-1,G&&G.lv.mult);
    hero.cp=posed(P.ks);hero.pts=skel(hero);
    foe.cp=posed(P.fl);foe.rot=-1.15;foe.sgn=-1;foe.pts=skel(foe);
    c2.save();c2.scale(2.6,2.6);
    drawFighter(hero,hero.pts,500/2.6-hero.pts.low,0);
    drawFighter(foe,foe.pts,500/2.6-foe.pts.low-46,0);
    c2.restore();
    // burst
    c2.save();c2.translate(560,330);c2.fillStyle=TH.fg;c2.beginPath();
    for(let i=0;i<24;i++){const r=i%2?22:70+(i%4===0?25:0),a=i*PI/12;c2.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
    c2.closePath();c2.fill();c2.fillStyle=TH.bg;c2.beginPath();c2.arc(0,0,18,0,7);c2.fill();c2.restore();
    // text
    c2.textBaseline='middle';c2.textAlign='left';
    c2.font='italic 900 76px "Arial Black",Impact,sans-serif';c2.lineJoin='round';
    c2.lineWidth=14;c2.strokeStyle=TH.fg;c2.strokeText('MAX SMASH',60,90);c2.fillStyle='#3d6fb8';c2.fillText('MAX SMASH',60,90);
    const won=G&&mode==='win';
    c2.fillStyle=TH.fg;c2.font=`600 34px ${FONT}`;
    c2.fillText(G?(won?`ALL ${LEVELS.length} LEVELS CLEARED`:`LEVEL ${G.lv.tag} CLEARED`):'Can you beat me?',60,170);
    if(G){
      c2.textAlign='right';c2.font='italic 900 150px "Arial Black",Impact,sans-serif';
      c2.lineWidth=16;c2.strokeStyle=TH.bg;c2.strokeText(String(G.score),1140,300);c2.fillStyle=TH.fg;c2.fillText(String(G.score),1140,300);
      c2.font=`600 32px ${FONT}`;c2.fillText(`${G.kills} KOs  ·  ${G.maxCombo}x combo`,1140,395);
      c2.fillStyle='#3d6fb8';c2.font=`bold 40px ${FONT}`;c2.fillText('Think you can beat me?',1140,465);
    }
    c2.textAlign='left';c2.fillStyle=TH.fg;c2.globalAlpha=.7;c2.font=`500 26px ${FONT}`;
    c2.fillText(baseUrl().replace(/^https?:\/\//,'').replace(/index\.html$/,''),60,570);
  }finally{ctx=sv}
  return c;
}
function copyText(s){
  try{if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(s)}catch(_){}
  try{const t=document.createElement('textarea');t.value=s;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}catch(_){}
}
async function shareResult(invite){
  const L=G?G.lv:null;
  const url=(!invite&&G)?`${baseUrl()}?c=${G.score}&l=${curLevel+1}`:baseUrl();
  const text=(!invite&&G)
    ?(mode==='win'?`I beat all ${LEVELS.length} levels of MAX SMASH with ${G.score} points!`:`I cleared level ${L.tag} in MAX SMASH with ${G.score} points and a ${G.maxCombo}x combo!`)+' Think you can beat me?'
    :'Think you can beat me at MAX SMASH?';
  try{
    if(navigator.share){
      const card=makeCard();
      const blob=await new Promise(r=>card.toBlob(r,'image/png'));
      if(blob){
        const file=new File([blob],'max-smash.png',{type:'image/png'});
        if(navigator.canShare&&navigator.canShare({files:[file]})){
          await navigator.share({files:[file],title:'MAX SMASH',text:text+' '+url});return;
        }
      }
      await navigator.share({title:'MAX SMASH',text,url});return;
    }
  }catch(e){if(e&&e.name==='AbortError')return}
  copyText(text+' '+url);toast('Challenge link copied — paste it to a friend!');
}

/* =====================================================================
   EFFECTS
   ===================================================================== */
const bcol=t=>t.team==='p'?'H':t.col;
function blood(x,y,col,dir,n,spd=1){
  if(!bloodOn)return;
  if(lowQ)n=Math.ceil(n/2);
  for(let i=0;i<n&&G.parts.length<(lowQ?160:350);i++)
    G.parts.push({x,y,vx:dir*R(.5,5)*spd+R(-1.5,1.5),vy:R(-7,.5)*spd,col,r:R(1.2,3.4),l:R(30,70)});
}
function burst(x,y,s){G.bursts.push({x,y,t:0,l:10,s,rot:R(0,6.28)})}
function dust(x,n,dir=0){
  if(lowQ)n=Math.ceil(n/2);
  for(let i=0;i<n;i++)G.parts.push({x:x+R(-8,8),y:gAt(x)-2,vx:R(-1.5,1.5)+dir*1.2,vy:R(-1.2,-.1),col:'#888',r:R(2,4.5),l:R(12,22),dust:1});
}
function floatText(x,y,s,sz){G.texts.push({x,y,s,sz:sz||20,l:55,t:0})}
function confetti(n){
  const cols=['#3d6fb8','#e0b030','#d04040','#30a060',TH.fg];
  for(let i=0;i<n&&G.parts.length<420;i++)
    G.parts.push({conf:1,x:cam+R(0,W),y:-10,vx:R(-1,1),vy:R(1,3),col:pick(cols),r:R(3,5),l:260,rot:R(0,6),vr:R(-.3,.3)});
}
function bulletTime(frames,x,y,strong){
  if(slowT>frames*.5&&mxOn)return;
  slowT=Math.max(slowT,frames);mxOn=true;fx=x;fy=y;zoomT=strong?(portrait?1.4:1.65):(portrait?1.2:1.3);
  tiltT=(rnd()<.5?-1:1)*(strong?.045:.025);
  G.rings.push({x,y,t:0},{x,y,t:-6});snd('matrix');
}
function quake(x,team,pow,push){
  G.quakes.push({x,t:0,pow,team,push:!!push,hit:new Set()});
  G.cracks.push({x,w:R(40,80)*pow});
  if(G.cracks.length>14)G.cracks.shift();
  shake=Math.max(shake,Math.min(pow*9,18));snd('quake');
}
function rt(dt){
  if(slowT>0){slowT-=dt*60;if(slowT<=0){slowT=0;mxOn=false;zoomT=1;tiltT=0}}
  const tg=slowT>0?(mxOn?.27:.4):1;ts+=(tg-ts)*Math.min(1,dt*9);
  mxA+=((mxOn&&slowT>0?1:0)-mxA)*Math.min(1,dt*5);
  zoom+=(zoomT-zoom)*Math.min(1,dt*4.5);tilt+=(tiltT-tilt)*Math.min(1,dt*4);
  if(G&&mxOn&&G.p){fx+=((G.p.x+fx)/2-fx)*.05;fy+=((G.p.hy-45)-fy)*.1}
}
