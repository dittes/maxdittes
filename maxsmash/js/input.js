'use strict';
/* MAX SMASH — keyboard, pointer and multi-touch controls */
/* =====================================================================
   INPUT  (keyboard + pointer / multitouch)
   ===================================================================== */
const keys={},buf={j:0,k:0,l:0,up:0},vk={left:0,right:0,down:0};
const BUF=8;
let paused=false,helpOpen=false,settingsOpen=false,pendingShare=false,toastS='',toastT=0;
let bloodOn=false;try{bloodOn=localStorage.getItem('sb_blood')==='1'}catch(e){}
function toast(s){toastS=s;toastT=150}
addEventListener('keydown',e=>{
  if(imprintBox&&!imprintBox.hidden)return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  initAudio();
  if(e.repeat)return;
  keys[e.code]=1;
  if(paused){paused=false;keys[e.code]=0;return}      // any key continues a paused game
  if(settingsOpen){if(e.code==='Escape'||e.code==='Enter')settingsOpen=false;if(e.code==='KeyB')toggleBlood();return}
  if(helpOpen){if(e.code==='Escape'||e.code==='Enter'||e.code==='Slash'||e.code==='KeyH')helpOpen=false;return}
  if(e.code==='KeyM')setMute(!muted);
  if(e.code==='KeyH'||e.code==='Slash')helpOpen=true;
  if(e.code==='KeyB')toggleBlood();
  if(mode==='play'||mode==='watch'){
    if(e.code==='KeyJ'||e.code==='KeyZ')buf.j=BUF;
    if(e.code==='KeyK'||e.code==='KeyX')buf.k=BUF;
    if(e.code==='KeyL'||e.code==='KeyC')buf.l=BUF;
    if(e.code==='ArrowUp'||e.code==='KeyW'||e.code==='Space')buf.up=BUF;
    if(e.code==='KeyP')paused=!paused;
    if((e.code==='Enter'||e.code==='Space')&&G&&G.endT>60&&G.endT<761)G.endT=761;
    if(e.code==='Escape')act('home');
  }else if(mode==='title'){
    if(e.code==='ArrowLeft'||e.code==='KeyA'){selLevel=Math.max(0,selLevel-1);selChanged()}
    if(e.code==='ArrowRight'||e.code==='KeyD'){selLevel=Math.min(unlocked,selLevel+1);selChanged()}
    if(e.code==='ArrowUp'||e.code==='KeyW'){selLevel=Math.max(0,selLevel-LPW);selChanged()}
    if(e.code==='ArrowDown'||e.code==='KeyS'){selLevel=Math.min(unlocked,selLevel+LPW);selChanged()}
    if(e.code==='Enter'||e.code==='Space')act('play');
  }else if(mode==='over'){if(e.code==='Enter'||e.code==='Space')act('retry');if(e.code==='Escape')act('home')}
  else if(mode==='clear'){if(e.code==='Enter'||e.code==='Space')act('next');if(e.code==='Escape')act('home');if(e.code==='KeyS')shareResult()}
  else if(mode==='win'){if(e.code==='Enter'||e.code==='Space'||e.code==='Escape')act('home');if(e.code==='KeyS')shareResult()}
});
addEventListener('keyup',e=>{keys[e.code]=0});
const inL=p=>p.auto?p.ai.l:(keys.ArrowLeft||keys.KeyA||vk.left);
const inR=p=>p.auto?p.ai.r:(keys.ArrowRight||keys.KeyD||vk.right);
const inD=p=>p.auto?p.ai.d:(keys.ArrowDown||keys.KeyS||vk.down);

let uiBtns=[];
const ptrMap=new Map();
const toL=e=>[e.clientX/S,e.clientY/S];
function touchLayout(){
  const u=clamp(.95/S,1,1.45),b=H-62*u-SA.b,l=SA.l,r=SA.r;
  let L;
  if(W<680){ // narrow (portrait phones): stack guard above the d-pad, spin beside jump
    L=[
      {id:'left',x:l+46*u,y:b,r:33*u},{id:'right',x:l+122*u,y:b,r:33*u},{id:'down',x:l+84*u,y:b-72*u,r:27*u,label:'GUARD'},
      {id:'punch',x:W-r-48*u,y:b,r:35*u,label:'PUNCH'},{id:'kick',x:W-r-122*u,y:b+8*u,r:30*u,label:'KICK'},
      {id:'jump',x:W-r-86*u,y:b-74*u,r:28*u,label:'JUMP'}
    ];
    if(G&&G.rage>=50)L.push({id:'spin',x:W-r-160*u,y:b-72*u,r:25*u,label:'SPIN'});
  }else{
    L=[
      {id:'left',x:l+52*u,y:b,r:34*u},{id:'right',x:l+134*u,y:b,r:34*u},{id:'down',x:l+214*u,y:b+4*u,r:28*u,label:'GUARD'},
      {id:'punch',x:W-r-54*u,y:b,r:36*u,label:'PUNCH'},{id:'kick',x:W-r-132*u,y:b+6*u,r:31*u,label:'KICK'},
      {id:'jump',x:W-r-94*u,y:b-68*u,r:29*u,label:'JUMP'}
    ];
    if(G&&G.rage>=50)L.push({id:'spin',x:W-r-172*u,y:b-54*u,r:26*u,label:'SPIN'});
  }
  return L;
}
function tpress(id){
  if(id==='left')vk.left=1;else if(id==='right')vk.right=1;else if(id==='down')vk.down=1;
  else if(id==='punch')buf.j=BUF;else if(id==='kick')buf.k=BUF;else if(id==='jump')buf.up=BUF;else if(id==='spin')buf.l=BUF;
}
function trelease(id){if(id==='left')vk.left=0;else if(id==='right')vk.right=0;else if(id==='down')vk.down=0}
function hitTouch(x,y){
  let best=null,bd=1e9;
  for(const b of touchLayout()){const d=Math.hypot(x-b.x,y-b.y);if(d<b.r+14&&d<bd){best=b.id;bd=d}}
  return best;
}
cv.addEventListener('pointerdown',e=>{
  e.preventDefault();initAudio();
  if(paused&&!helpOpen&&!settingsOpen){paused=false;return}   // a click / tap continues a paused game
  if(mode==='play'&&G&&G.endT>60&&G.endT<761)G.endT=761;
  if(e.pointerType==='touch')setTouch(true);
  try{cv.setPointerCapture(e.pointerId)}catch(_){}
  const [x,y]=toL(e);
  for(let i=uiBtns.length-1;i>=0;i--){
    const b=uiBtns[i];
    if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){
      if(b.id==='share'||b.id==='invite')pendingShare=b.id;   // share needs a pointerup (user activation)
      else act(b.id);
      return;
    }
  }
  if(touchOn&&mode==='play'&&!helpOpen&&!settingsOpen&&!paused){
    const t=hitTouch(x,y);if(t){ptrMap.set(e.pointerId,t);tpress(t)}
  }
});
cv.addEventListener('pointermove',e=>{
  if(!ptrMap.has(e.pointerId))return;
  const [x,y]=toL(e),t=hitTouch(x,y),old=ptrMap.get(e.pointerId);
  if(t!==old){trelease(old);if(t){ptrMap.set(e.pointerId,t);tpress(t)}else ptrMap.delete(e.pointerId)}
});
const pup=e=>{
  const t=ptrMap.get(e.pointerId);if(t){trelease(t);ptrMap.delete(e.pointerId)}
  if(pendingShare&&e.type==='pointerup'){const k=pendingShare;pendingShare=false;snd('ui');shareResult(k==='invite')}
  pendingShare=false;
};
cv.addEventListener('pointerup',pup);cv.addEventListener('pointercancel',pup);
cv.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('blur',()=>{for(const k in keys)keys[k]=0;vk.left=vk.right=vk.down=0;ptrMap.clear()});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(mode==='play')paused=true;if(AC&&AC.state==='running')AC.suspend()}
  else if(AC&&!muted)AC.resume();
});
