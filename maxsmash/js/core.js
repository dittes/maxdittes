'use strict';
/* =====================================================================
   MAX SMASH — minimalist stick-figure beat-'em-up
   fullscreen · phone/tablet/desktop · 10 worlds, 100 levels · watch mode · bullet-time
   emotes · judo throws · power hits · share & challenge links
   ===================================================================== */
if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){r=Math.min(r,w/2,h/2);this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath()};
const cv=document.getElementById('c'),imprintEl=document.getElementById('imprint');
const imprintBox=document.getElementById('imprintBox');
const setImprint=v=>{if(!imprintBox)return;imprintBox.hidden=!v;if(v)document.getElementById('impClose').focus()};
if(imprintEl&&imprintBox){
  imprintEl.addEventListener('click',e=>{e.preventDefault();setImprint(true)});
  imprintBox.addEventListener('click',e=>{if(e.target===imprintBox||e.target.id==='impClose')setImprint(false)});
  addEventListener('keydown',e=>{if(!imprintBox.hidden&&e.code==='Escape')setImprint(false)},true);
}
let imprintKey='';
function syncImprint(){
  const show=(mode==='title'||helpOpen||settingsOpen),key=show+TH.fg;
  if(key===imprintKey)return;imprintKey=key;
  if(imprintEl){imprintEl.style.display=show?'block':'none';imprintEl.style.color=TH.fg}
}
let ctx=cv.getContext('2d');
const PI=Math.PI,rnd=Math.random,abs=Math.abs;
const R=(a,b)=>a+rnd()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
const pick=a=>a[(rnd()*a.length)|0];
const FONT='"Helvetica Neue",Helvetica,Arial,sans-serif';
const BASE_H=470,MIN_W=500;
let W=800,H=470,S=1,GY=400,touchOn=false,portrait=false,qScale=1,lowQ=false,alpha=1;
const SA={t:0,r:0,b:0,l:0};
const forceTouch=/[?&]touch=1/.test(location.search);
try{if(forceTouch||(matchMedia&&matchMedia('(pointer:coarse)').matches))touchOn=true}catch(e){}
if(touchOn&&(navigator.hardwareConcurrency||8)<=4){lowQ=true;qScale=.85}   // modest phones start in the lighter mode

const probe=document.createElement('div');
probe.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
document.body.appendChild(probe);
let vig=null;
function resize(){
  const iw=innerWidth,ih=innerHeight;
  const dpr=clamp(Math.min(devicePixelRatio||1,touchOn?1.75:2,Math.sqrt((touchOn?1.8e6:2.8e6)/(iw*ih)))*qScale,.6,2);
  let s=ih/BASE_H,w=iw/s;
  if(w<MIN_W){s=iw/MIN_W;w=MIN_W}
  S=s;W=w;H=ih/s;portrait=H>W*1.15;
  cv.width=Math.round(iw*dpr);cv.height=Math.round(ih*dpr);
  ctx.setTransform(cv.width/W,0,0,cv.height/H,0,0);
  const cs=getComputedStyle(probe);
  SA.t=(parseFloat(cs.paddingTop)||0)/S;SA.r=(parseFloat(cs.paddingRight)||0)/S;
  SA.b=(parseFloat(cs.paddingBottom)||0)/S;SA.l=(parseFloat(cs.paddingLeft)||0)/S;
  if(touchOn)GY=portrait?Math.min(H-200-SA.b,H*.66):H-116-SA.b;else GY=H-70;
  // cached vignette for bullet-time
  vig=document.createElement('canvas');vig.width=256;vig.height=Math.max(64,Math.round(256*H/W));
  const g=vig.getContext('2d'),gr=g.createRadialGradient(128,vig.height/2,vig.height*.3,128,vig.height/2,Math.max(128,vig.height)*.85);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.75)');g.fillStyle=gr;g.fillRect(0,0,256,vig.height);
}
addEventListener('resize',resize);addEventListener('orientationchange',()=>setTimeout(resize,200));resize();
function setTouch(v){if(touchOn!==v){touchOn=v;resize()}}
