'use strict';
/* MAX SMASH — synthesized sound effects + music sequencer */
/* =====================================================================
   AUDIO — synthesized lo-fi one-shots + tiny sequencer
   ===================================================================== */
let AC=null,master,noiseBuf,muted=false;
try{muted=localStorage.getItem('sb_mute')==='1'}catch(e){}
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain();master.gain.value=muted?0:.7;
    const comp=AC.createDynamicsCompressor();master.connect(comp);comp.connect(AC.destination);
    noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
    const d=noiseBuf.getChannelData(0);let v=0;
    for(let i=0;i<d.length;i++){if(i%3===0)v=rnd()*2-1;d[i]=v}
    startMusic();
  }catch(e){AC=null}
}
function setMute(m){muted=m;try{localStorage.setItem('sb_mute',m?'1':'0')}catch(e){}if(AC)master.gain.value=m?0:.7}
function tone(type,f0,f1,dur,vol,delay=0){
  if(!AC||muted)return;
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);
}
function noise(dur,vol,ftype,f0,f1,q=1,delay=0){
  if(!AC||muted)return;
  const t=AC.currentTime+delay,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=noiseBuf;s.loop=true;f.type=ftype;f.Q.value=q;
  f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f);f.connect(g);g.connect(master);s.start(t,rnd()*.5);s.stop(t+dur+.02);
}
const SFX={
  whoosh(){noise(.14,.22,'bandpass',500,2600,.8)},
  whoosh2(){noise(.2,.28,'bandpass',300,3200,.7)},
  punch(){noise(.07,.55,'bandpass',1500,500,1.2);tone('sine',170,45,.13,.8);tone('square',90,40,.06,.12)},
  kick(){noise(.1,.7,'lowpass',2400,300,.9);tone('sine',130,35,.2,1);tone('sawtooth',110,40,.1,.15)},
  heavy(){noise(.16,.8,'lowpass',3000,200,.8);tone('sine',100,25,.34,1.1);tone('square',70,30,.12,.2)},
  block(){tone('square',950,380,.07,.22);noise(.05,.3,'highpass',2500,2000,1)},
  hurt(){noise(.09,.4,'bandpass',900,400,1.4);tone('sawtooth',240,110,.12,.14)},
  grunt(){tone('sawtooth',R(110,160),R(60,80),.14,.12);noise(.1,.12,'lowpass',700,300,1)},
  death(){tone('sawtooth',R(380,440),R(70,90),.55,.15);tone('sine',R(140,170),30,.5,.5);noise(.3,.3,'lowpass',1800,150,.8)},
  thud(){tone('sine',90,28,.22,1);noise(.12,.45,'lowpass',800,120,.8)},
  land(){tone('sine',80,35,.1,.35);noise(.05,.15,'lowpass',900,300,1)},
  jump(){tone('triangle',220,520,.12,.15)},
  gun(){noise(.2,.9,'lowpass',5000,260,.7);tone('square',200,40,.14,.35);noise(.35,.25,'bandpass',600,200,.5,.03)},
  clang(){tone('square',1900,900,.12,.22);tone('square',2400,1300,.1,.12,.03);noise(.05,.3,'highpass',3500,3000,1)},
  pickup(){tone('square',660,660,.06,.12);tone('square',990,990,.1,.12,.07)},
  breakBat(){noise(.18,.5,'bandpass',2000,400,2);tone('square',300,90,.12,.2)},
  go(){tone('square',440,440,.09,.1);tone('square',660,660,.12,.1,.1)},
  ui(){tone('square',520,780,.07,.1)},
  spin(){for(let i=0;i<4;i++)noise(.12,.2,'bandpass',500+i*250,1500+i*250,.9,i*.08)},
  over(){tone('sawtooth',300,40,1.1,.3);tone('sine',90,25,1.2,.6)},
  clear(){[392,494,587,784].forEach((f,i)=>tone('square',f,f,.2,.12,i*.12))},
  matrix(){tone('sine',70,26,.9,.7);noise(.7,.25,'lowpass',3200,160,.7);tone('triangle',500,110,.6,.06)},
  dodge(){noise(.4,.3,'bandpass',2800,300,1.2);tone('sine',200,60,.4,.3)},
  quake(){tone('sine',58,18,1,1);noise(.9,.5,'lowpass',500,50,.8);tone('sine',90,30,.5,.4,.05)},
  charge(){tone('sine',120,520,.7,.18);noise(.7,.12,'bandpass',300,3000,2)},
  tada(){[523,659,784,1046].forEach((f,i)=>tone('triangle',f,f,.18,.14,i*.09))},
  pop(){tone('sine',400,900,.06,.12)},
  siu(){tone('sawtooth',430,300,.12,.17);tone('sawtooth',300,580,.42,.19,.1);tone('triangle',580,540,.55,.14,.45);noise(.5,.05,'bandpass',900,900,3,.1)}
};
const snd=n=>{try{SFX[n]&&SFX[n]()}catch(e){}};

let musicOn=false,musStep=0,musNext=0,intensity=0;
const BASS=[55,0,55,0,65.4,0,55,0, 49,0,49,0,58.3,0,61.7,0];
function startMusic(){if(musicOn)return;musicOn=true;musNext=AC.currentTime+.1;setInterval(musicTick,40)}
function musicTick(){
  if(!AC||muted||paused)return;
  const slow=ts<.6;
  while(musNext<AC.currentTime+.15){
    const t=musNext-AC.currentTime,s=musStep%16,hot=intensity>0;
    if(s%4===0)tone('sine',120,40,.16,hot?.5:.3,t);
    if(hot&&(s===4||s===12))noise(.1,.22,'bandpass',1800,900,.8,t);
    if(hot||s%2===0)noise(.03,hot?.07:.04,'highpass',7000,7000,1,t);
    if(BASS[s]&&(hot||s%8===0))tone('sawtooth',BASS[s]*(slow?.5:1),BASS[s]*(slow?.5:1),.2,hot?.13:.08,t);
    musNext+=slow?.2:(hot?.114:.139);musStep++;
  }
}
