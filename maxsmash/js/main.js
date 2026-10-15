'use strict';
/* MAX SMASH — main loop, adaptive quality, boot */
/* =====================================================================
   LOOP — fixed 60Hz simulation, interpolated rendering, auto quality
   ===================================================================== */
let last=performance.now(),acc=0,fpsN=0,fpsT=0;
function frame(t){
  const dt=Math.min(.05,(t-last)/1000);last=t;
  if(!paused&&!helpOpen&&!settingsOpen)rt(dt);
  acc+=dt*ts;
  let n=0;while(acc>=1/60&&n<4){step();acc-=1/60;n++}
  if(acc>.1)acc=0;
  alpha=(freeze>0||paused||helpOpen||settingsOpen)?1:clamp(acc*60,0,1);
  draw();
  // adaptive quality for slow devices
  fpsT+=dt;fpsN++;
  if(fpsN>=90){
    const avg=fpsT/fpsN;
    if(avg>.027){if(!lowQ){lowQ=true;qScale=.8;resize()}else if(qScale>.62){qScale=.62;resize()}}
    fpsT=0;fpsN=0;
  }
  requestAnimationFrame(frame);
}
goTitle();
requestAnimationFrame(frame);
window.__dbg={A,startAtk,trySpecial,F,step,draw,rt,act,startLevel,keys,buf,vk,lock(v){lockMax=v},P,startEmote,celebrate,quake,tryThrow,disarm,makeCard,
  setAlpha(v){alpha=v},unpause(){paused=false},
  get G(){return G},get mode(){return mode},set mode(v){mode=v},get ts(){return ts},get mxA(){return mxA},
  tp(w){G.wave=w;lockMax=WAVES[w].x-250;cam=camPrev=lockMax-300;G.p.x=WAVES[w].x-100;G.p.hy=gAt(G.p.x)-50},
  get cam(){return cam},set cam(v){cam=camPrev=v}};
