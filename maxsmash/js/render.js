'use strict';
/* MAX SMASH — backgrounds, fighters, effects and UI drawing */
/* =====================================================================
   DRAWING — backgrounds
   ===================================================================== */
function Ln(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
const Rc=(x,y,w,h)=>ctx.strokeRect(x,y,w,h);
// per-level layout variation: a seed plus three knobs (0..1) shift, resize and add/remove scenery
let VS=0,VA=.5,VB=.5,VC=.5;
const vh=n=>hash(n+VS*.37);
function bgOffice(){
  const per=700+VA*180,k0=Math.floor(cam/per),n=Math.ceil(W/per)+2;
  const s1=GY-236+(VC-.5)*44,s2=s1+12;
  Ln(0,s1,W,s1);Ln(0,s2,W,s2);
  for(let k=k0;k<k0+n;k++){
    const ox=k*per-cam,alt=(k+VS)&1;
    const px=ox+(alt?per*.4:per*.62)+VB*40;Ln(px,0,px,GY);Ln(px+7,0,px+7,GY);
    const dx=ox+(alt?per*.14:per*.08)+VB*30;
    Rc(dx,s1-104,88,104);Ln(dx+44,s1-104,dx+44,s1);Rc(dx+8,s1-94,28,32);Rc(dx+52,s1-94,28,32);
    const wx=ox+per*(alt?.76:.82);
    Rc(wx,s1-140,60,60);Ln(wx+30,s1-140,wx+30,s1-80);Ln(wx,s1-110,wx+60,s1-110);
    if(VC>.55){Rc(wx-84,s1-140,60,60);Ln(wx-54,s1-140,wx-54,s1-80);Ln(wx-84,s1-110,wx-24,s1-110)}
    const gx=ox+(alt?per*.05:per*.88);Rc(gx,GY-100,54,100);Rc(gx+8,GY-92,38,36);Ln(gx+44,GY-38,gx+44,GY-26);
    const tx=ox+(alt?per*.27:per*.3);Rc(tx,GY-32,62,32);Rc(tx+8,GY-44,20,12);
    if(VA>.5){const lx=ox+per*.55;Ln(lx,0,lx,34+VB*30);ctx.beginPath();ctx.arc(lx,34+VB*30,13,0,PI);ctx.stroke()}
    if(VB>.45){const x=ox+per*.5;Rc(x,GY-18,18,18);Ln(x+9,GY-18,x+9,GY-46);Ln(x+9,GY-34,x-6,GY-48);Ln(x+9,GY-30,x+24,GY-46)}
    if(VC<.45){const cx=ox+per*.45,cy=s1-90;ctx.beginPath();ctx.arc(cx,cy,14,0,7);ctx.stroke();Ln(cx,cy,cx,cy-9);Ln(cx,cy,cx+7,cy+3)}
  }
}
function bgNight(){
  ctx.fillStyle=TH.fg;ctx.globalAlpha=.8;
  const ns=lowQ?35:70;
  for(let i=0;i<ns;i++){
    const x=((vh(i)*1800-cam*.08)%W+W*3)%W,y=vh(i+99)*(GY-60);
    ctx.fillRect(x,y,i%7?1.4:2.2,i%7?1.4:2.2);
  }
  ctx.globalAlpha=1;
  const mx=W*(.5+VB*.4)-cam*.03,my0=GY-290+(VC-.5)*70,my=my0<50?70:my0;
  ctx.fillStyle='#f3ecc8';ctx.beginPath();ctx.arc(mx,my,34,0,7);ctx.fill();
  ctx.fillStyle=TH.bg;ctx.beginPath();ctx.arc(mx+12,my-6,30,0,7);ctx.fill();
  const par=.35,w0=58+VA*40,i0=Math.floor(cam*par/w0)-1,n=Math.ceil(W/w0)+3;
  for(let i=i0;i<i0+n;i++){
    const bw=44+vh(i)*60,bx=i*w0-cam*par,bh=80+vh(i+7)*(150+VC*110);
    ctx.fillStyle='#0d1020';ctx.fillRect(bx,GY-bh,bw,bh);
    ctx.strokeStyle='#262c4a';ctx.lineWidth=1;ctx.strokeRect(bx,GY-bh,bw,bh);
    if(vh(i+3)>.8){ctx.beginPath();ctx.moveTo(bx+bw/2,GY-bh);ctx.lineTo(bx+bw/2,GY-bh-24);ctx.stroke()}   // antenna
    if(!lowQ){
      ctx.fillStyle='#e3cf7e';
      for(let r=0;r<bh/22-1;r++)for(let c=0;c<bw/16-1;c++){
        if(vh(i*31+r*7+c)>.78)ctx.fillRect(bx+8+c*16,GY-bh+10+r*22,6,9);
      }
    }
  }
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.6;
  const per=480+VB*240,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+200+VA*160-cam,dbl=((k+VS)&1);
    Ln(x,GY,x,GY-150);Ln(x,GY-150,x+26,GY-150);if(dbl){Ln(x,GY-130,x-24,GY-130)}
    ctx.fillStyle='rgba(240,220,140,.10)';ctx.beginPath();ctx.moveTo(x+22,GY-148);ctx.lineTo(x+70,GY);ctx.lineTo(x-26,GY);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f3e19a';ctx.fillRect(x+20,GY-150,12,4);
    if(VB>.5&&k%3===0){ctx.strokeStyle=TH.fg;ctx.strokeRect(x+160,GY-120,70,40);Ln(x+180,GY-120,x+180,GY);Ln(x+210,GY-120,x+210,GY)}   // billboard
  }
}
function bgDesert(){
  const sx=W*(.18+VB*.6)-cam*.04;
  ctx.fillStyle='#f19a62';ctx.beginPath();ctx.arc(sx,GY-70-VC*70,70+VC*40,0,7);ctx.fill();
  const dune=(par,amp,base,col,wl)=>{
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,GY);
    for(let x=0;x<=W+20;x+=20){const wx=x+cam*par+VS*37;ctx.lineTo(x,GY-base-Math.sin(wx/wl)*amp-Math.sin(wx/(wl*.43)+1)*amp*.4)}
    ctx.lineTo(W,GY);ctx.closePath();ctx.fill();
  };
  dune(.25,24+VA*30,80,'#e9bb86',170+VC*140);dune(.5,16+VA*20,34,'#dca66e',120+VB*100);
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.6;
  const per=560+VA*260,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+160+VB*100-cam;
    Ln(x,GY,x,GY-190);Ln(x-26,GY-175,x+26,GY-175);Ln(x-20,GY-158,x+20,GY-158);
    ctx.beginPath();ctx.moveTo(x-26,GY-175);ctx.quadraticCurveTo(x+per/2,GY-140,x+per+26,GY-175);ctx.stroke();
    const cx=x+per*.45;Ln(cx,GY,cx,GY-64);Ln(cx,GY-26,cx-16,GY-26);Ln(cx-16,GY-26,cx-16,GY-46);Ln(cx,GY-38,cx+14,GY-38);Ln(cx+14,GY-38,cx+14,GY-54);
    if(VC>.5){const bx=x+per*.78;ctx.beginPath();ctx.moveTo(bx-30,GY);ctx.lineTo(bx-14,GY-26);ctx.lineTo(bx+14,GY-26);ctx.lineTo(bx+30,GY);ctx.stroke()}   // rock
    if(VA<.4){const sx2=x+per*.2;Ln(sx2,GY,sx2,GY-56);ctx.strokeRect(sx2-18,GY-56,36,20)}   // sign
  }
}
function bgFactory(){
  ctx.strokeStyle='#8e979e';ctx.lineWidth=1.4;
  const par=.3,cw=300+VA*160,i0=Math.floor(cam*par/cw)-1;
  for(let i=i0;i<i0+Math.ceil(W/cw)+3;i++){
    const x=i*cw+100-cam*par,h=170+vh(i)*(100+VC*80);
    ctx.fillStyle='#cdd3d8';ctx.fillRect(x,GY-h,46,h);Rc(x,GY-h,46,h);Ln(x-4,GY-h,x+50,GY-h);
    ctx.fillStyle='rgba(120,128,136,.35)';ctx.beginPath();ctx.arc(x+30,GY-h-24-Math.sin(tick*.02+i)*3,18,0,7);ctx.arc(x+52,GY-h-46-Math.sin(tick*.02+i+1)*4,24,0,7);ctx.fill();
  }
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.4;
  const per=340+VA*150,k0=Math.floor(cam/per),pipe=GY-170-VC*50;
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per-cam;
    Ln(x,0,x,GY);Ln(x+8,0,x+8,GY);
    if(VB>.35){Ln(x+8,GY-250,x+per,GY-30);Ln(x+per,GY-250,x+8,GY-30)}
    else{Ln(x+8,GY-120,x+per,GY-120);Ln(x+8,GY-132,x+per,GY-132);for(let q=0;q<per;q+=34)Ln(x+q+8,GY-132,x+q+8,GY-120)}   // catwalk
    Ln(x+8,pipe,x+per,pipe);Ln(x+8,pipe+10,x+per,pipe+10);
    ctx.fillStyle=TH.fg;ctx.fillRect(x+per/2-3,pipe-4,6,18);
    Ln(x+per/2,0,x+per/2,GY-300);ctx.fillStyle='#f0c040';ctx.beginPath();ctx.arc(x+per/2,GY-296,7,0,7);ctx.fill();
  }
  const gp=800+VA*300,g0=Math.floor(cam/gp),gr=36+VC*20;
  for(let k=g0;k<g0+Math.ceil(W/gp)+2;k++){
    const gx=k*gp+gp*.6+VB*60-cam,gy=GY-100-VC*30,rot=tick*.01*(k&1?1:-1);
    ctx.beginPath();ctx.arc(gx,gy,gr,0,7);ctx.stroke();ctx.beginPath();ctx.arc(gx,gy,10,0,7);ctx.stroke();
    for(let i=0;i<12;i++){const a=rot+i*PI/6;Ln(gx+Math.cos(a)*gr,gy+Math.sin(a)*gr,gx+Math.cos(a)*(gr+10),gy+Math.sin(a)*(gr+10))}
  }
}
function bgSnow(){
  const mt=(par,base,amp,col,wl)=>{
    ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,GY);
    for(let x=0;x<=W+30;x+=30){const wx=x+cam*par+VS*53;ctx.lineTo(x,GY-base-Math.abs(Math.sin(wx/wl))*amp-Math.sin(wx/(wl*.37))*amp*.25)}
    ctx.lineTo(W,GY);ctx.closePath();ctx.fill();
  };
  mt(.15,80+VC*50,110+VA*90,'#b7cbe0',200+VB*120);mt(.3,40+VC*20,60+VA*60,'#c6d8e9',140+VB*80);
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.5;ctx.lineJoin='round';
  const per=240+VB*200,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+vh(k)*per*.6-cam,h=80+vh(k+3)*(60+VC*50);
    Ln(x,GY,x,GY-18);
    for(let i=0;i<3;i++){
      const y=GY-18-i*h/3.4,w=(h/2.4)*(1-i*.24);
      ctx.fillStyle='#f4f9fd';ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x,y-h/2.6);ctx.lineTo(x+w,y);ctx.closePath();ctx.fill();ctx.stroke();
    }
    if(VA>.55&&vh(k+9)>.6){ctx.fillStyle='#f4f9fd';ctx.beginPath();ctx.arc(x+60,GY-14,22,PI,0);ctx.fill();ctx.stroke()}   // snow mound
  }
  ctx.fillStyle='#fff';ctx.strokeStyle='#a9bdd1';ctx.lineWidth=.8;
  const nf=((lowQ?28:64)*(.6+VC*.8))|0;
  for(let i=0;i<nf;i++){
    const sp=.4+vh(i)*1.2,w2=W+60;
    const x=(((vh(i+5)*w2+Math.sin(tick*.02+i)*20-cam*.3*sp)%w2)+w2)%w2-30;
    const y=(vh(i+9)*H+tick*sp*1.4)%(H+20);
    ctx.beginPath();ctx.arc(x,y,1.2+vh(i+2)*1.6,0,7);ctx.fill();ctx.stroke();
  }
}
function bgVolcano(){
  ctx.fillStyle='rgba(255,90,20,.10)';ctx.fillRect(0,GY-280,W,280);
  ctx.fillStyle='rgba(255,90,20,.09)';ctx.fillRect(0,GY-120,W,120);
  const cone=(par,sp,h,w,col)=>{
    const i0=Math.floor(cam*par/sp)-1;
    for(let i=i0;i<i0+Math.ceil(W/sp)+3;i++){
      const x=i*sp-cam*par+vh(i)*sp*.5,hh=h*(.6+vh(i+3)*.6);
      ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x-w,GY);ctx.lineTo(x-w*.18,GY-hh);ctx.lineTo(x+w*.18,GY-hh);ctx.lineTo(x+w,GY);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ff7a2a';ctx.fillRect(x-w*.18,GY-hh-2,w*.36,4);
      ctx.strokeStyle='#ff7a2a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-3,GY-hh);ctx.lineTo(x-w*.35,GY-hh*.45);ctx.lineTo(x-w*.5,GY-hh*.1);ctx.stroke();
    }
  };
  cone(.2,400+VA*240,230+VC*80,180+VB*60,'#2b1315');cone(.45,340+VB*200,150+VC*50,130+VA*40,'#3b1b1a');
  ctx.fillStyle='#ffb050';
  const ne=((lowQ?18:44)*(.6+VB*.8))|0;
  for(let i=0;i<ne;i++){
    const x=(((vh(i)*W*1.2+Math.sin(tick*.03+i)*30-cam*.2)%W)+W)%W,y=H-((vh(i+7)*H+tick*(.5+vh(i+2)*1.4))%H);
    ctx.globalAlpha=.35+.65*vh(i+4);ctx.fillRect(x,y,1.8,1.8);
  }
  ctx.globalAlpha=1;
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.5;ctx.lineJoin='round';
  const per=420+VB*220,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+vh(k)*200-cam,h=36+vh(k+1)*(50+VC*50);
    ctx.fillStyle='#1d0e0e';ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x+14,GY-h*.7);ctx.lineTo(x+34,GY-h);ctx.lineTo(x+58,GY-h*.55);ctx.lineTo(x+80,GY-h*.8);ctx.lineTo(x+104,GY);ctx.closePath();ctx.fill();ctx.stroke();
    if(VA>.5&&vh(k+4)>.5){ctx.strokeStyle='#ff7a2a';ctx.beginPath();ctx.moveTo(x+110,GY+2);ctx.lineTo(x+150,GY+6);ctx.lineTo(x+190,GY+2);ctx.stroke();ctx.strokeStyle=TH.fg}   // lava crack
  }
}
function bgHarbor(){
  ctx.fillStyle='#f6a47c';ctx.beginPath();ctx.arc(W*(.4+VB*.45)-cam*.03,GY-60-VC*30,60+VC*26,0,7);ctx.fill();
  ctx.fillStyle='#8da3c8';ctx.fillRect(0,GY-56,W,56);
  ctx.fillStyle='rgba(255,255,255,.3)';
  for(let i=0;i<14;i++){const x=(((i*173-cam*.1)%(W+120))+W+120)%(W+120)-60;ctx.fillRect(x,GY-50+((i*37)%40),40+((i*53)%40),2)}
  const sx=(((W*(.1+VA*.5)-cam*.12)%(W+500))+W+500)%(W+500)-250;
  ctx.fillStyle='#6a7592';ctx.beginPath();ctx.moveTo(sx,GY-56);ctx.lineTo(sx+260,GY-56);ctx.lineTo(sx+230,GY-30);ctx.lineTo(sx+20,GY-30);ctx.closePath();ctx.fill();
  ctx.fillRect(sx+150,GY-92,40,36);ctx.fillRect(sx+160,GY-110,10,18);
  ctx.strokeStyle=TH.fg;ctx.lineWidth=2;ctx.lineJoin='miter';
  const cp=.45,cw=560+VA*320,i0=Math.floor(cam*cp/cw)-1,ch=190+VC*60;
  for(let i=i0;i<i0+Math.ceil(W/cw)+3;i++){
    const x=i*cw+160-cam*cp;
    Ln(x,GY,x+14,GY-ch);Ln(x+90,GY,x+76,GY-ch);Ln(x+14,GY-ch,x+76,GY-ch);Ln(x-20,GY-ch-12,x+190,GY-ch-12);
    Ln(x+14,GY-ch,x+60,GY-ch-12);Ln(x+140,GY-ch-12,x+140,GY-ch+50);ctx.strokeRect(x+130,GY-ch+50,20,16);
  }
  const cols=['#8396b0','#b08e72','#76a08e','#a287a4'];
  const per=400+VB*220,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+100+vh(k)*90-cam,n=1+((vh(k+5)*3)|0),wide=(VA>.5||k%2)?2:1;
    for(let r=0;r<n;r++)for(let c=0;c<wide;c++){
      const cx=x+c*58,cy=GY-(r+1)*30;
      ctx.fillStyle=cols[(k+r+c+VS)&3];ctx.fillRect(cx,cy,56,29);ctx.lineWidth=2;ctx.strokeRect(cx,cy,56,29);
      ctx.lineWidth=1;for(let i=1;i<6;i++)Ln(cx+i*9,cy+3,cx+i*9,cy+26);
    }
    if(VC>.55&&k%3===1){Ln(x+200,GY,x+200,GY-70);Ln(x+200,GY-70,x+226,GY-70);ctx.fillStyle='#f3e19a';ctx.fillRect(x+222,GY-72,10,4)}   // lamp
  }
}
function bgNeon(){
  const cols=['#ff2bd6','#2bf0ff','#ffe22b','#7b5cff'];
  const par=.3,w0=68+VA*40,i0=Math.floor(cam*par/w0)-1,n=Math.ceil(W/w0)+3;
  for(let i=i0;i<i0+n;i++){
    const bw=50+vh(i)*70,bx=i*w0-cam*par,bh=100+VC*60+vh(i+7)*190,c=cols[(i+8+VS)%4];
    ctx.fillStyle='#120a26';ctx.fillRect(bx,GY-bh,bw,bh);
    ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.strokeRect(bx,GY-bh,bw,bh);
    ctx.fillStyle=cols[(i+3)%4];
    for(let r=0;r<bh/26-1;r++)for(let q=0;q<bw/18-1;q++)if(vh(i*29+r*5+q)>.8)ctx.fillRect(bx+9+q*18,GY-bh+12+r*26,7,10);
    if(vh(i+2)>.55){ctx.strokeStyle=cols[(i+1)%4];ctx.lineWidth=3;ctx.strokeRect(bx+6,GY-bh+20,bw-12,16)}
  }
  const per=440+VB*240,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+180-cam,c=cols[(k+VS)&3],tall=(VA>.5&&k%2);
    ctx.fillStyle=c;ctx.globalAlpha=.16;ctx.fillRect(x-60,GY-190,120,190);ctx.globalAlpha=1;
    ctx.strokeStyle=c;ctx.lineWidth=2.6;Ln(x,GY,x,GY-120-(tall?30:0));ctx.strokeRect(x-48,GY-170-(tall?30:0),96,50);
    ctx.lineWidth=1.6;Ln(x-34,GY-155-(tall?30:0),x+10,GY-155-(tall?30:0));Ln(x-34,GY-138-(tall?30:0),x+30,GY-138-(tall?30:0));
  }
  ctx.strokeStyle='rgba(190,200,255,.28)';ctx.lineWidth=1;
  const nd=lowQ?25:55,sl=3+VC*8;
  for(let i=0;i<nd;i++){const x=(vh(i)*W*1.3+tick*1.5*(.6+vh(i+3)))%(W+60),y=(vh(i+9)*H+tick*9*(.7+vh(i+1)))%H;Ln(x,y,x-sl*.4,y+11)}
}
function bgTemple(){
  const blob=(par,sp,y0,r,col)=>{
    const i0=Math.floor(cam*par/sp)-1;ctx.fillStyle=col;
    for(let i=i0;i<i0+Math.ceil(W/sp)+3;i++){const x=i*sp-cam*par+vh(i)*30;ctx.beginPath();ctx.arc(x,GY-y0-vh(i+4)*30,r*(.8+vh(i+2)*.5),0,7);ctx.fill()}
  };
  blob(.2,130+VA*60,140+VC*40,80+VB*30,'#b4d8a8');blob(.35,100+VB*50,90,60+VA*20,'#9fcb92');
  const px=W*(.3+VB*.5)-cam*.1,pw=170+VC*90;ctx.fillStyle='#a9b99c';
  for(let i=0;i<5;i++)ctx.fillRect(px-pw/2+i*pw*.065,GY-60-i*26,pw-i*pw*.13,26);
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.6;
  const per=280+VA*180,k0=Math.floor(cam/per);
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per+vh(k)*100-cam,h=150+vh(k+1)*(70+VC*60);
    ctx.fillStyle='#8a6b45';ctx.fillRect(x,GY-h,16,h);ctx.strokeRect(x,GY-h,16,h);
    ctx.fillStyle='#5aa85a';ctx.beginPath();ctx.arc(x+8,GY-h-6,46,0,7);ctx.arc(x-26,GY-h+12,32,0,7);ctx.arc(x+44,GY-h+10,34,0,7);ctx.fill();
    ctx.beginPath();ctx.moveTo(x+4,GY-h+30);ctx.quadraticCurveTo(x-18,GY-h/2,x+2,GY-24);ctx.stroke();
    if(vh(k+6)>.5-VB*.3){ctx.fillStyle='#b9c4a6';ctx.fillRect(x+90,GY-62,26,62);ctx.strokeRect(x+90,GY-62,26,62);Ln(x+96,GY-50,x+110,GY-50);Ln(x+96,GY-36,x+110,GY-36)}
    if(VC>.6&&k%3===0){ctx.fillStyle='#b9c4a6';ctx.fillRect(x+150,GY-30,60,30);ctx.strokeRect(x+150,GY-30,60,30);Ln(x+150,GY-18,x+210,GY-18)}   // low wall
  }
}
function bgSpace(){
  ctx.fillStyle=TH.fg;
  const ns=lowQ?40:90;
  for(let i=0;i<ns;i++){
    const x=((vh(i)*2000-cam*.05)%W+W*3)%W,y=vh(i+99)*GY,tw=.4+.6*Math.abs(Math.sin(tick*.03+i));
    ctx.globalAlpha=tw;ctx.fillRect(x,y,i%9?1.3:2.2,i%9?1.3:2.2);
  }
  ctx.globalAlpha=1;
  const pr=64+VC*40,pxx=W*(.45+VB*.45)-cam*.02,pyy=GY-120-VA*90;
  ctx.fillStyle='#26398c';ctx.beginPath();ctx.arc(pxx,pyy,pr,0,7);ctx.fill();
  ctx.fillStyle='#3a52b8';ctx.beginPath();ctx.arc(pxx-12,pyy-10,pr*.7,0,7);ctx.fill();
  ctx.strokeStyle='#8fa6ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(pxx,pyy,pr*1.5,pr*.26,(VA-.5)*1.1,0,7);ctx.stroke();
  ctx.strokeStyle=TH.fg;ctx.lineWidth=2;
  const per=360+VA*160,k0=Math.floor(cam/per),ww=120+VC*70;
  for(let k=k0;k<k0+Math.ceil(W/per)+2;k++){
    const x=k*per-cam;
    Ln(x,0,x,GY);Ln(x+10,0,x+10,GY);
    ctx.fillStyle='rgba(120,160,255,.18)';ctx.fillRect(x+50,GY-250,ww,100);
    ctx.strokeRect(x+50,GY-250,ww,100);Ln(x+50+ww/2,GY-250,x+50+ww/2,GY-150);
    ctx.fillStyle=((k+VS)&1)?'#27e07a':'#ff4a5a';ctx.beginPath();ctx.arc(x+5,GY-210,4+Math.sin(tick*.08+k)*1.2,0,7);ctx.fill();
    for(let i=0;i<5;i++)Ln(x+220+i*22,GY-12,x+232+i*22,GY-12);
    if(VB>.5&&k%2===0){ctx.strokeRect(x+240,GY-110,50,110);Ln(x+265,GY-110,x+265,GY)}   // door
  }
}
function drawBG(){
  const lvv=LEVELS[curLevel].v;VS=lvv.s;VA=lvv.a;VB=lvv.b;VC=lvv.c;
  ctx.fillStyle=TH.bg;ctx.fillRect(-W,-H,W*3,H*3);
  ctx.strokeStyle=TH.fg;ctx.lineWidth=1.4;ctx.lineJoin='miter';ctx.lineCap='butt';
  const t=LEVELS[curLevel].th;
  if(t==='office')bgOffice();else if(t==='night')bgNight();else if(t==='desert')bgDesert();else if(t==='factory')bgFactory();else if(t==='snow')bgSnow();else if(t==='volcano')bgVolcano();else if(t==='harbor')bgHarbor();else if(t==='neon')bgNeon();else if(t==='temple')bgTemple();else bgSpace();
  ctx.fillStyle=TH.dark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';ctx.fillRect(-W,GY,W*3,H);
  ctx.strokeStyle=TH.fg;ctx.lineWidth=2.6;Ln(-W,GY,W*2,GY);
  // cracks from power hits
  ctx.lineWidth=1.6;
  for(const c of G.cracks){
    const x=c.x-cam;if(x<-120||x>W+120)continue;
    ctx.beginPath();ctx.moveTo(x-c.w/2,GY);
    let cx=x-c.w/2,cy=GY;
    for(let i=0;i<6;i++){cx+=c.w/5;cy=GY+(i%2?4:14+i*2);ctx.lineTo(cx,cy)}
    ctx.stroke();
  }
}
function drawStairs(){
  for(const s of TERR){
    const x0=s.x-cam;if(x0>W+20||x0+2*s.run+s.top<-20)continue;
    const cx=x0+s.run+s.top/2,up=[];
    up.push([x0,GY]);
    for(let i=0;i<s.n;i++){up.push([x0+i*s.sw,GY-(i+1)*s.sh]);up.push([x0+(i+1)*s.sw,GY-(i+1)*s.sh])}
    const dn=up.slice().reverse().map(([x,y])=>[2*cx-x,y]);
    ctx.fillStyle=TH.bg;ctx.beginPath();ctx.moveTo(x0,GY);
    for(const [x,y] of up)ctx.lineTo(x,y);
    for(let i=0;i<dn.length;i++)ctx.lineTo(dn[i][0],dn[i][1]);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle=TH.fg;ctx.lineWidth=2;ctx.lineJoin='miter';
    ctx.beginPath();ctx.moveTo(up[0][0],up[0][1]);
    for(const [x,y] of up)ctx.lineTo(x,y);
    for(let i=0;i<dn.length;i++)ctx.lineTo(dn[i][0],dn[i][1]);
    ctx.stroke();
    ctx.lineWidth=1.3;
    Ln(x0+s.sw,GY,x0+s.run,GY-s.h+10);Ln(x0+2*s.run+s.top-s.sw,GY,x0+s.run+s.top,GY-s.h+10);
    Ln(x0+s.run,GY-s.h+10,x0+s.run+s.top,GY-s.h+10);
    for(const px of [x0+s.run+8,cx,x0+s.run+s.top-8])Ln(px,GY-s.h+10,px,GY);
    ctx.lineWidth=1.6;
    const rx1=x0+s.run+6,rx2=x0+s.run+s.top-6,ry=GY-s.h-36;
    Ln(rx1,GY-s.h,rx1,ry);Ln(rx2,GY-s.h,rx2,ry);Ln(rx1,ry,rx2,ry);Ln(cx,GY-s.h,cx,ry);
    Ln(x0+s.sw,GY-s.sh-34,rx1,ry);Ln(x0+2*s.run+s.top-s.sw,GY-s.sh-34,rx2,ry);
    Ln(x0+s.sw,GY-s.sh,x0+s.sw,GY-s.sh-34);Ln(x0+2*s.run+s.top-s.sw,GY-s.sh,x0+2*s.run+s.top-s.sw,GY-s.sh-34);
  }
}

/* =====================================================================
   DRAWING — fighters & fx
   ===================================================================== */
function drawFighter(f,pts,hy,ghost){
  const s=f.sc*FS,w=Math.pow(s,.8)*6.4;
  const flatHead=(FLATTY.has(f.state)&&abs(f.rotT)>1)?.8:1;
  const flashing=f.flash>0&&!ghost;
  const base=flashing?(TH.dark?'#777':'#999'):(f.team==='p'?TH.hero:rc(f.col));
  ctx.save();ctx.translate(0,hy);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=w;
  if(ghost)ctx.globalAlpha=ghost;
  const pl=(a,b,c)=>{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);if(c)ctx.lineTo(c.x,c.y);ctx.stroke()};
  const body=col=>{
    ctx.strokeStyle=col;ctx.fillStyle=col;
    pl(pts.sh,pts.e2,pts.h2);pl(pts.hip,pts.k2,pts.p2);
    pl(pts.hip,pts.neck);
    ctx.beginPath();ctx.arc(pts.head.x,pts.head.y,HR*s*flatHead,0,7);ctx.fill();
    pl(pts.hip,pts.k1,pts.p1);pl(pts.sh,pts.e1,pts.h1);
  };
  // enemy life = water level: the figure is an empty glass that drains from the head down
  const frac=(f.team==='e'&&!ghost&&!flashing)?clamp(f.hp/f.hpMax,0,1):1;
  if(frac>=.999)body(base);
  else{
    body(mixHex(base,TH.bg,.5));
    if(frac>0){
      let top=1e9,bot=-1e9;
      for(const k of JK){const y=pts[k].y;if(y<top)top=y;if(y>bot)bot=y}
      top-=HR*s;bot+=w/2;
      const lvl=bot-(bot-top)*frac;
      ctx.save();ctx.beginPath();ctx.rect(-6000,lvl,12000,12000);ctx.clip();body(base);ctx.restore();
    }
  }
  if(!ghost){
    const hd=pts.h1,d=f.face,a=f.cp.f1,ex=Math.sin(a)*d,ey=Math.cos(a);
    if(f.armed||(f.atk&&f.atk.gun)){
      ctx.strokeStyle=TH.dark?'#aaa':'#333';ctx.lineWidth=4.5*Math.pow(s,.8);
      ctx.beginPath();ctx.moveTo(hd.x,hd.y);ctx.lineTo(hd.x+ex*16*s,hd.y+ey*16*s);ctx.stroke();
      ctx.beginPath();ctx.moveTo(hd.x+ex*3*s,hd.y+ey*3*s);ctx.lineTo(hd.x+ex*2*s,hd.y+ey*3*s+8*s);ctx.stroke();
    }
    if(f.weapon==='bat'){
      ctx.strokeStyle='#8a5a2b';ctx.lineWidth=5.5;
      ctx.beginPath();ctx.moveTo(hd.x-ex*7,hd.y-ey*7);ctx.lineTo(hd.x+ex*31,hd.y+ey*31);ctx.stroke();
    }
  }
  ctx.restore();
}
function drawBurst(b){
  const k=b.t/b.l,s=b.s*(.5+k*.7);
  ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.rot);ctx.globalAlpha=1-k*k;
  ctx.fillStyle=TH.fg;ctx.beginPath();
  const n=9;
  for(let i=0;i<n*2;i++){
    const r=i%2?s*.34:s*(.85+(i%4===0?.35:0)),a=i*PI/n;
    ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();ctx.fill();
  ctx.fillStyle=TH.bg;ctx.beginPath();ctx.arc(0,0,s*.22,0,7);ctx.fill();
  ctx.restore();
}
function drawBeam(p){
  const t=p.em.t,h=p.pts.h1,x=h.x,y=p.hy+h.y,d=p.face;
  ctx.save();
  if(t<38){
    const r=3+t*.42+Math.sin(t*.8)*1.5;
    ctx.fillStyle='rgba(79,134,255,.28)';ctx.beginPath();ctx.arc(x+d*6,y,r*1.9,0,7);ctx.fill();
    ctx.fillStyle=TH.bg;ctx.strokeStyle='#4f86ff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x+d*6,y,r,0,7);ctx.fill();ctx.stroke();
    ctx.lineWidth=1.3;
    for(let i=0;i<6;i++){const a=i*1.05+t*.3,r0=r*2.4+10,r1=r*1.2;Ln(x+d*6+Math.cos(a)*r0,y+Math.sin(a)*r0,x+d*6+Math.cos(a)*r1,y+Math.sin(a)*r1)}
  }else if(t<80){
    const u=t-38,th=34*Math.sin(clamp(u/5,0,1)*PI/2)*(1-clamp((u-28)/14,0,1));
    const x2=x+d*W*1.2;
    ctx.fillStyle='rgba(79,134,255,.45)';ctx.fillRect(Math.min(x,x2),y-th/2,abs(x2-x),th);
    ctx.fillStyle=TH.bg;ctx.fillRect(Math.min(x,x2),y-th*.2,abs(x2-x),th*.4);
    ctx.fillStyle='rgba(79,134,255,.3)';ctx.beginPath();ctx.arc(x,y,th*.9,0,7);ctx.fill();
  }
  ctx.restore();
}
function drawGun(it){
  ctx.save();ctx.translate(it.x,it.y);ctx.rotate(it.r);
  ctx.strokeStyle=TH.dark?'#aaa':'#333';ctx.lineWidth=4.5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-6,7);ctx.stroke();
  ctx.restore();
}
function drawWorld(){
  ctx.save();
  if(shake>0)ctx.translate(R(-shake,shake),R(-shake,shake)*.6);
  if(mode!=='title'&&(abs(zoom-1)>.002||abs(tilt)>.002)){
    const sx=fx-cam,sy=fy;
    ctx.translate(sx,sy);ctx.rotate(tilt*clamp((zoom-1)*3,0,1));ctx.scale(zoom,zoom);ctx.translate(-sx,-sy);
  }
  drawBG();
  drawStairs();
  for(const p of G.pools){
    const x=p.x-cam;if(x<-80||x>W+80)continue;
    ctx.fillStyle=rc(p.col);ctx.beginPath();ctx.ellipse(x,p.y+1,p.w/2,p.big?3.2:2.4,0,0,7);ctx.fill();
  }
  ctx.save();ctx.translate(-cam,0);
  // quake ripples along the ground
  for(const q of G.quakes){
    const r0=q.r||0,fade=1-q.t/55;
    ctx.strokeStyle=TH.fg;
    for(let k=0;k<3;k++){
      const r=r0-k*34;if(r<4)continue;
      ctx.globalAlpha=fade*(1-k*.3);ctx.lineWidth=3-k*.8;
      ctx.beginPath();ctx.ellipse(q.x,GY+3,r,Math.min(22,r*.1),0,0,7);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  for(const k of G.pick){
    ctx.save();ctx.translate(k.x,GY-6);
    ctx.strokeStyle='#8a5a2b';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-26,2);ctx.lineTo(28,-4);ctx.stroke();
    ctx.fillStyle=TH.fg;ctx.font='bold 12px '+FONT;ctx.textAlign='center';
    ctx.fillText('▼',0,-38+Math.sin(k.t*.12)*4);ctx.restore();
  }
  for(const it of G.items){drawGun(it)}
  const order=G.all.slice().sort((a,b)=>(b.dead?1:0)-(a.dead?1:0)||(a===G.p?1:0)-(b===G.p?1:0));
  for(const f of order){
    if(!f.pts)continue;
    const pts=lerpPts(f.pp,f.pts,alpha),hy=f.phy!==undefined?f.phy+(f.hy-f.phy)*alpha:f.hy;
    if(!lowQ&&f.team==='p'&&f.trail.length>1)f.trail.forEach((t,i)=>{if(i<f.trail.length-1)drawFighter(f,t.pts,t.hy,.07*(i+1))});
    drawFighter(f,pts,hy);
  }
  if(G.p.state==='emote'&&G.p.em&&G.p.em.n==='beam')drawBeam(G.p);
  for(const m of G.smoke){
    ctx.globalAlpha=m.a;ctx.fillStyle=TH.dark?'#c9ced9':'#8b8b8b';
    ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,7);ctx.fill();
  }
  ctx.globalAlpha=1;
  for(const b of G.bullets){
    const bx=b.x-b.vx*(1-alpha);
    ctx.save();ctx.translate(bx,b.y);ctx.scale(b.dir,1);
    ctx.globalAlpha=.35;ctx.strokeStyle=TH.fg;ctx.lineWidth=1.6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-34,0);ctx.lineTo(-9,0);ctx.stroke();ctx.globalAlpha=1;
    // bullet: ink-coloured casing with a pale tip (black on light worlds, white on dark ones)
    ctx.fillStyle=TH.fg;ctx.strokeStyle=TH.fg;ctx.lineWidth=.8;
    ctx.beginPath();ctx.roundRect(-9,-2.4,11,4.8,1.6);ctx.fill();
    ctx.beginPath();ctx.moveTo(2,-2.4);ctx.quadraticCurveTo(7,-2,9.5,0);ctx.quadraticCurveTo(7,2,2,2.4);ctx.closePath();ctx.fillStyle=TH.bg;ctx.fill();ctx.stroke();
    ctx.fillStyle=TH.bg;ctx.globalAlpha=.5;ctx.fillRect(-7,-1.6,8,.9);ctx.globalAlpha=1;
    ctx.restore();
    if(mxA>.15){
      ctx.lineWidth=1;ctx.strokeStyle=TH.fg;
      for(let i=1;i<=4;i++){ctx.globalAlpha=mxA*(.4-i*.08);ctx.beginPath();ctx.ellipse(bx-b.dir*i*18,b.y,3+i*3,5+i*6,0,0,7);ctx.stroke()}
      ctx.globalAlpha=1;
    }
  }
  for(const r of G.rings){
    if(r.t<0)continue;
    ctx.globalAlpha=1-r.t/40;ctx.strokeStyle=TH.fg;ctx.lineWidth=2.5*(1-r.t/40)+.5;
    ctx.beginPath();ctx.arc(r.x,r.y,r.t*7,0,7);ctx.stroke();ctx.globalAlpha=1;
  }
  for(const b of G.bursts)drawBurst(b);
  for(const q of G.parts){
    const px=q.x-(q.vx||0)*(1-alpha),py=q.y-(q.vy||0)*(1-alpha);
    if(q.fw){ctx.globalAlpha=Math.min(1,q.l/28);ctx.fillStyle=q.col;ctx.beginPath();ctx.arc(px,py,q.r,0,7);ctx.fill();ctx.globalAlpha=1;continue}
    if(q.conf){
      ctx.save();ctx.translate(px,py);ctx.rotate(q.rot);ctx.fillStyle=q.col;ctx.fillRect(-q.r,-q.r*.5,q.r*2,q.r);ctx.restore();continue;
    }
    if(q.dust)ctx.globalAlpha=Math.max(0,q.l/22)*.5;
    ctx.fillStyle=q.dust?(TH.dark?'#889':'#999'):rc(q.col);ctx.beginPath();ctx.arc(px,py,q.r,0,7);ctx.fill();ctx.globalAlpha=1;
  }
  for(const t of G.texts){
    if(!t.s)continue;
    const pop=1+Math.max(0,(8-t.t)/8)*.6;
    ctx.save();ctx.globalAlpha=Math.min(1,(1-t.t/t.l)*1.6);ctx.translate(t.x,t.y);ctx.scale(pop,pop);
    ctx.font=`italic 900 ${t.sz}px "Arial Black",Impact,sans-serif`;
    ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle=TH.bg;ctx.lineJoin='round';ctx.strokeText(t.s,0,0);ctx.fillStyle=TH.fg;ctx.fillText(t.s,0,0);ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}
// bullet-time look: cheap darkened vignette (no colour tint, no per-frame gradients)
function drawMatrix(){
  if(mxA<.02||!vig)return;
  ctx.save();ctx.globalAlpha=mxA*.55;ctx.drawImage(vig,0,0,W,H);ctx.restore();
}
// "tiny earthquake": a wave of vertical displacement rolling out from the epicentre
let warpBuf=null;
function quakeWarp(){
  if(!G||!G.quakes.length||(lowQ&&(touchOn||G.quakes.length>1)))return;
  const q=G.quakes[G.quakes.length-1];if(q.t>46)return;
  if(!warpBuf)warpBuf=document.createElement('canvas');
  if(warpBuf.width!==cv.width||warpBuf.height!==cv.height){warpBuf.width=cv.width;warpBuf.height=cv.height}
  const wc=warpBuf.getContext('2d');wc.setTransform(1,0,0,1,0,0);wc.drawImage(cv,0,0);
  const k=cv.width/W,sw=Math.max(6,Math.round(12*k)),amp=Math.min(q.pow,2.4)*4.5*(1-q.t/46)*k,ex=(q.x-cam)*k,front=(q.r||0)*k;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  for(let x=0;x<cv.width;x+=sw){
    const dist=abs(x+sw/2-ex),env=Math.exp(-Math.pow((dist-front)/(70*k),2))+.25*Math.exp(-dist/(200*k));
    const off=Math.round(amp*env*Math.sin(dist/(16*k)-q.t*.55));
    if(off)ctx.drawImage(warpBuf,x,0,sw,cv.height,x,off,sw,cv.height);
  }
  ctx.restore();
}

/* =====================================================================
   DRAWING — UI
   ===================================================================== */
const fg=()=>TH.fg;
function icon(id,cx,cy,fn){
  uiBtns.push({id,x:cx-22,y:cy-22,w:44,h:44});
  ctx.save();ctx.translate(cx,cy);ctx.strokeStyle=fg();ctx.fillStyle=fg();ctx.lineWidth=2;ctx.lineCap='round';ctx.lineJoin='round';
  fn();ctx.restore();
}
function drawIcons(home,share){
  const y=30+SA.t;let x=W-30-SA.r;
  icon('sound',x,y,()=>{
    ctx.beginPath();ctx.moveTo(-9,-4);ctx.lineTo(-4,-4);ctx.lineTo(2,-9);ctx.lineTo(2,9);ctx.lineTo(-4,4);ctx.lineTo(-9,4);ctx.closePath();ctx.stroke();
    if(muted){ctx.beginPath();ctx.moveTo(6,-5);ctx.lineTo(14,5);ctx.moveTo(14,-5);ctx.lineTo(6,5);ctx.stroke()}
    else{ctx.beginPath();ctx.arc(2,0,6,-.9,.9);ctx.stroke();ctx.beginPath();ctx.arc(2,0,11,-.9,.9);ctx.stroke()}
  });
  x-=44;
  icon('help',x,y,()=>{
    ctx.beginPath();ctx.arc(0,0,11,0,7);ctx.stroke();
    ctx.font='bold 15px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',0,1);ctx.textBaseline='alphabetic';
  });
  x-=44;
  icon('settings',x,y,()=>{
    ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.stroke();
    for(let i=0;i<8;i++){const a=i*PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*8.5,Math.sin(a)*8.5);ctx.lineTo(Math.cos(a)*12,Math.sin(a)*12);ctx.stroke()}
    ctx.beginPath();ctx.arc(0,0,8.5,0,7);ctx.stroke();
  });
  if(canFull()&&!touchOnPhone()){
    x-=44;
    icon('full',x,y,()=>{
      for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.beginPath();ctx.moveTo(a*10,b*4);ctx.lineTo(a*10,b*10);ctx.lineTo(a*4,b*10);ctx.stroke()}
    });
  }
  if(share){
    x-=44;
    icon('invite',x,y,()=>{
      for(const [px,py] of [[-7,0],[6,-7],[6,7]]){ctx.beginPath();ctx.arc(px,py,3.2,0,7);ctx.fill()}
      ctx.beginPath();ctx.moveTo(-7,0);ctx.lineTo(6,-7);ctx.moveTo(-7,0);ctx.lineTo(6,7);ctx.stroke();
    });
  }
  if(home)icon('home',30+SA.l,y,()=>{
    ctx.beginPath();ctx.moveTo(-10,1);ctx.lineTo(0,-9);ctx.lineTo(10,1);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-6,-2);ctx.lineTo(-6,9);ctx.lineTo(6,9);ctx.lineTo(6,-2);ctx.stroke();
  });
}
function touchOnPhone(){return touchOn&&Math.min(innerWidth,innerHeight)<500}
function chip(id,x,y,r,label,sel,lock){
  uiBtns.push({id,x:x-r-6,y:y-r-6,w:2*r+12,h:2*r+12});
  ctx.save();ctx.globalAlpha=lock?.35:1;ctx.lineWidth=2.5;ctx.strokeStyle=fg();
  ctx.beginPath();ctx.arc(x,y,r,0,7);
  if(sel){ctx.fillStyle=fg();ctx.fill()}else{ctx.fillStyle=TH.bg;ctx.fill();ctx.stroke()}
  ctx.fillStyle=sel?TH.bg:fg();ctx.font=`bold ${Math.round(r*.9)}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
  if(lock){ctx.fillRect(x-5,y-1,10,8);ctx.beginPath();ctx.arc(x,y-2,4,PI,0);ctx.stroke()}else ctx.fillText(label,x,y+1);
  ctx.restore();
}
function pill(id,label,cx,cy,w,h,primary,accent){
  uiBtns.push({id,x:cx-w/2,y:cy-h/2,w,h});
  ctx.save();
  ctx.lineWidth=2.5;ctx.strokeStyle=accent||fg();
  ctx.beginPath();ctx.roundRect(cx-w/2,cy-h/2,w,h,h/2);
  if(primary){ctx.fillStyle=accent||fg();ctx.fill()}else{ctx.fillStyle=TH.bg;ctx.globalAlpha=.8;ctx.fill();ctx.globalAlpha=1;ctx.stroke()}
  ctx.fillStyle=primary?'#fff':(accent||fg());
  if(primary&&!accent)ctx.fillStyle=TH.bg;
  ctx.font=`bold ${h*.4}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,cx,cy+1);ctx.restore();
}
function bigText(s,x,y,sz,fill,stroke,sw){
  ctx.save();ctx.translate(x,y);
  ctx.font=`italic 900 ${sz}px "Arial Black",Impact,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.lineJoin='round';ctx.lineWidth=sw||8;ctx.strokeStyle=stroke||fg();ctx.strokeText(s,0,0);
  ctx.fillStyle=fill;ctx.fillText(s,0,0);ctx.restore();
}
function drawHUD(){
  const p=G.p,cx=W/2,top=SA.t;
  drawIcons(true,false);
  ctx.textAlign='left';ctx.font=`600 12px ${FONT}`;ctx.fillStyle=fg();ctx.globalAlpha=.7;
  const lab=mode==='watch'?'WATCH · '+G.lv.tag:G.lv.tag;
  ctx.fillText(lab,58+SA.l,26+top);ctx.fillText(mode==='watch'?'autopilot':String(G.score).padStart(6,'0'),58+SA.l,42+top);ctx.globalAlpha=1;
  const bw=Math.min(200,W*.28);
  ctx.fillStyle=fg();ctx.globalAlpha=.2;ctx.fillRect(cx-bw/2,20+top,bw,6);ctx.fillRect(cx-bw/2,31+top,bw*.7,3);ctx.globalAlpha=1;
  const low=p.hp<30,pulse=low?(.55+.45*Math.sin(tick*.25)):1;
  ctx.globalAlpha=pulse;ctx.fillStyle=low?'#e04040':fg();ctx.fillRect(cx-bw/2,20+top,bw*clamp(p.hp/p.hpMax,0,1),6);ctx.globalAlpha=1;
  ctx.fillStyle=G.rage>=50?'#4f86ff':'#6f8fc8';ctx.fillRect(cx-bw/2,31+top,bw*.7*G.rage/100,3);
  if(p.specialReady){        // special move charged: star next to the HP bar
    const pu=1+Math.sin(tick*.2)*.15;
    ctx.save();ctx.translate(cx+bw/2+16,23+top);ctx.scale(pu,pu);ctx.fillStyle='#f0b400';ctx.beginPath();
    for(let i=0;i<10;i++){const r=i%2?3.6:8.5,a=-PI/2+i*PI/5;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
    ctx.closePath();ctx.fill();ctx.restore();
  }
  if(G.rage>=50&&Math.floor(tick/20)%2===0){ctx.fillStyle='#4f86ff';ctx.font=`bold 10px ${FONT}`;ctx.textAlign='left';ctx.fillText(touchOn?'SPIN':'L',cx+bw*.35+8,36+top)}
  if(p.weapon){ctx.textAlign='center';ctx.fillStyle='#b57a35';ctx.font=`bold 11px ${FONT}`;ctx.fillText('BAT ×'+p.wuses,cx,52+top)}
  const boss=G.en.find(e=>e.type==='boss'&&!e.dead);
  if(boss){ctx.fillStyle=fg();ctx.globalAlpha=.2;ctx.fillRect(cx-bw,60+top,bw*2,5);ctx.globalAlpha=1;ctx.fillStyle='#b8a420';ctx.fillRect(cx-bw,60+top,bw*2*clamp(boss.hp/boss.hpMax,0,1),5)}
  if(G.combo>=2&&G.comboT>0&&G.endT===0){
    const s=1+Math.min(.5,G.combo*.05)+(G.comboT>95?.3:0);
    ctx.save();ctx.translate(W-110-SA.r,110+top);ctx.rotate(-.1);ctx.scale(s*.8,s*.8);
    bigText(G.combo+' HIT',0,0,32,TH.bg,fg(),7);ctx.restore();
  }
  if(G.goT>40&&G.endT===0&&G.banner<=0&&!G.active&&G.wave<WAVES.length&&Math.floor(tick/22)%2===0)bigText('GO ►',W-90-SA.r,GY-200,30,TH.bg,fg(),7);
  // level intro: title card, then FIGHT!
  if(G.banner>0&&!G.demo&&G.endT===0){
    const b=G.banner,first=curLevel%LPW===0;
    if(b>100){
      ctx.globalAlpha=Math.min(1,(240-b)/16)*Math.min(1,(b-100)/12);
      const pop=1+Math.max(0,(104-b)/14)*0;
      bigText(first?'WORLD '+(G.lv.world+1):'LEVEL '+G.lv.tag,W/2,H*.26,56,'#3d6fb8',fg(),9);
      ctx.font=`600 14px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='center';ctx.fillText(first?G.lv.wname:'',W/2,H*.26+44);
      if(challenge&&challenge.lv===curLevel+1)ctx.fillText('beat your friend: '+challenge.score,W/2,H*.26+64);
    }else{
      const pop=1+Math.max(0,(b-86)/14)*.7;
      ctx.save();ctx.globalAlpha=Math.min(1,b/20);ctx.translate(W/2,H*.26);ctx.scale(pop,pop);
      bigText('FIGHT!',0,0,66,'#d04030',fg(),9);ctx.restore();
    }
    ctx.globalAlpha=1;
  }
  // victory banner
  if(G.endT>0&&mode!=='clear'&&mode!=='win'){
    const t=G.endT,pop=1+Math.max(0,(18-t)/18)*.9,a=Math.min(1,t/12)*(t>730?Math.max(0,(760-t)/30):1);
    const last=curLevel>=LEVELS.length-1,wend=curLevel%LPW===LPW-1;
    ctx.save();ctx.globalAlpha=a;ctx.translate(W/2,H*.2);ctx.scale(pop,pop);
    bigText(last?'YOU WIN!':wend?'WORLD '+(G.lv.world+1)+' CLEARED':'LEVEL CLEAR!',0,0,Math.min(66,W/8.2),'#3d6fb8',fg(),9);
    ctx.font=`600 14px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='center';ctx.fillText(`score ${G.score}   ·   ${G.kills} KOs   ·   best combo ${G.maxCombo}`,0,46);
    ctx.restore();
    if(t>60&&Math.floor(tick/30)%2===0){ctx.globalAlpha=.55;ctx.font=`600 12px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='center';ctx.fillText(touchOn?'tap to continue':'press Enter to continue',W/2,H-24-SA.b);ctx.globalAlpha=1}
  }
}
function drawTouch(){
  if(!touchOn||mode!=='play'||helpOpen||settingsOpen)return;
  for(const b of touchLayout()){
    const on=(b.id==='left'&&vk.left)||(b.id==='right'&&vk.right)||(b.id==='down'&&vk.down)||[...ptrMap.values()].includes(b.id);
    ctx.save();
    ctx.globalAlpha=on?.55:.26;ctx.fillStyle=b.id==='spin'?'#4f86ff':fg();ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fill();
    ctx.globalAlpha=.7;ctx.strokeStyle=fg();ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.stroke();
    ctx.globalAlpha=1;ctx.fillStyle=on?TH.bg:fg();ctx.strokeStyle=on?TH.bg:fg();ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
    if(b.id==='left'||b.id==='right'){const d=b.id==='left'?-1:1;ctx.beginPath();ctx.moveTo(b.x-d*7,b.y-12);ctx.lineTo(b.x+d*8,b.y);ctx.lineTo(b.x-d*7,b.y+12);ctx.stroke()}
    else{ctx.font=`bold ${Math.round(b.r*.36)}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=on?1:.9;ctx.fillText(b.label,b.x,b.y+1);ctx.textBaseline='alphabetic'}
    ctx.restore();
  }
}
function scrim(a){ctx.save();ctx.globalAlpha=a;ctx.fillStyle=TH.bg;ctx.fillRect(0,0,W,H);ctx.restore()}
function stats(cx,y){
  const s=Math.floor(G.time/60);
  ctx.font=`600 15px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='center';
  ctx.fillText(`score ${G.score}   ·   KOs ${G.kills}   ·   best combo ${G.maxCombo}   ·   ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`,cx,y);
}
function drawEnd(){
  // top of the screen stays clear so the hero's victory dance remains visible
  scrim(mode==='over'?.78:.62);
  if(mode!=='over'&&G.p.pts){ctx.save();ctx.translate(-cam,0);drawFighter(G.p,G.p.pts,G.p.hy);ctx.restore()}
  drawIcons(true,false);
  const cx=W/2,y0=Math.max(SA.t+90,H*.24),bw=Math.min(300,W-60);
  if(mode==='over'){
    bigText('YOU DIED',cx,y0,Math.min(76,W/6.5),'#c03030',fg(),10);
    stats(cx,y0+60);
    pill('retry','RETRY',cx,y0+140,bw*.8,46,true);pill('home','MENU',cx,y0+196,bw*.6,40,false);
  }else{
    const win=mode==='win';
    bigText(win?'YOU WIN':'LEVEL CLEAR',cx,y0,Math.min(win?80:70,W/(win?6:7.5)),'#3d6fb8',fg(),10);
    let y=y0+(win?44:0)+56;
    if(win){ctx.font=`600 15px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='center';ctx.fillText('all '+LEVELS.length+' levels cleared',cx,y0+46)}
    stats(cx,y+(win?12:4));
    ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    if(G.newBest){ctx.fillStyle='#d09a10';ctx.fillText('★ NEW BEST FOR THIS LEVEL ★',cx,y+34)}
    else{ctx.fillStyle=fg();ctx.globalAlpha=.6;ctx.fillText('best: '+best[curLevel],cx,y+34);ctx.globalAlpha=1}
    if(challenge&&challenge.lv===curLevel+1){
      ctx.fillStyle=G.beat?'#2a9a4a':'#c03030';
      ctx.fillText(G.beat?`you beat your friend's ${challenge.score}!`:`friend's score: ${challenge.score} — ${challenge.score-G.score+1} more to beat it`,cx,y+54);
    }
    const by=y+(win?96:104);
    if(!win){pill('next','NEXT LEVEL ▸',cx,by,bw*.8,46,true);}
    pill('share','CHALLENGE FRIENDS',cx,by+(win?0:56),bw,win?48:44,win,'#3d6fb8');
    pill('home','MENU',cx,by+(win?56:106),bw*.5,38,false);
  }
}
function drawTitle(){
  scrim(.42);
  const cx=W/2,ly=Math.max(78+SA.t,H*.16);
  const word='MAX SMASH',sz=Math.min(78,W/8.4),wd=sz*.7;
  ctx.save();ctx.translate(cx,ly);
  for(let i=0;i<word.length;i++){
    const ch=word[i];if(ch===' ')continue;
    const x=(i-(word.length-1)/2)*wd,wob=Math.sin(tick*.05+i*1.3)*3;
    ctx.save();ctx.translate(x,wob);ctx.rotate(Math.sin(tick*.04+i)*.05);
    ctx.font=`900 ${sz}px "Arial Black",Impact,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.lineWidth=sz*.2;ctx.strokeStyle=fg();ctx.strokeText(ch,3,4);
    ctx.fillStyle='#3d6fb8';ctx.lineWidth=sz*.1;ctx.strokeText(ch,0,0);ctx.fillText(ch,0,0);
    ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.ellipse(-sz*.16,-sz*.2,sz*.06,sz*.12,.5,0,7);ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // small subheadline under the logo
  ctx.save();ctx.fillStyle=fg();ctx.globalAlpha=.75;ctx.font=`600 ${W<560?13:15}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText('cartoon fighting game',cx,ly+sz*.55+16);ctx.restore();
  let y0=ly+94;
  if(challenge){
    ctx.fillStyle='#3d6fb8';ctx.font=`bold 14px ${FONT}`;ctx.textAlign='center';
    ctx.fillText(`⚔  a friend challenged you: beat ${challenge.score} on level ${LEVELS[challenge.lv-1].tag}`,cx,ly+sz*.55+38);y0+=12;
  }
  const wy=y0,ly2=wy+44,nw=WORLDS.length,selW=(selLevel/LPW)|0;
  const ws=Math.min(44,(W-80)/Math.max(nw,LPW)),wr=Math.min(15,ws*.4);
  for(let i=0;i<nw;i++)chip('wd'+i,cx+(i-(nw-1)/2)*ws,wy,wr,String(i+1),i===selW,i*LPW>unlocked);
  const ls=ws,lr=wr;          // both rows share spacing, so the chips line up column by column
  for(let i=0;i<LPW;i++){const idx=selW*LPW+i;chip('lv'+idx,cx+(i-(LPW-1)/2)*ls,ly2,lr,String(i+1),idx===selLevel,idx>unlocked)}
  ctx.font=`600 12px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='right';ctx.globalAlpha=.55;
  if(cx-(nw/2)*ws-50>0){ctx.fillText('WORLD',cx-(nw/2)*ws-4,wy+4);ctx.fillText('LEVEL',cx-(LPW/2)*ls-4,ly2+4)}
  ctx.textAlign='center';ctx.globalAlpha=.8;ctx.font=`600 13px ${FONT}`;
  const LV=LEVELS[selLevel];
  if(best[selLevel])ctx.fillText('best '+best[selLevel],cx,ly2+38);
  ctx.globalAlpha=1;pill('play','PLAY  ·  '+LV.tag,cx,ly2+88,250,52,true);
  ctx.globalAlpha=.5;ctx.font=`12px ${FONT}`;ctx.fillStyle=fg();
  ctx.fillText(touchOn?'choose world and level, then tap PLAY':'← → ↑ ↓ choose  ·  Enter play  ·  H help',cx,H-22-SA.b);
  ctx.globalAlpha=1;
  drawIcons(false,true);
}
function para(s,x,y,maxW,lh){
  const words=s.split(' ');let line='';
  for(const w of words){
    const t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,y);y+=lh;line=w}else line=t;
  }
  ctx.fillText(line,x,y);return y+lh;
}
function drawSettings(){
  uiBtns=[{id:'settingsclose',x:0,y:0,w:W,h:H}];
  ctx.save();ctx.globalAlpha=.94;ctx.fillStyle=TH.bg;ctx.fillRect(0,0,W,H);ctx.restore();
  const cx=W/2;let y=Math.max(70+SA.t,H*.22);
  bigText('SETTINGS',cx,y,40,'#3d6fb8',fg(),8);y+=70;
  pill('blood','BLOOD:  '+(bloodOn?'ON':'OFF'),cx,y,260,50,bloodOn,'#d03030');y+=64;
  pill('soundtoggle','SOUND:  '+(muted?'OFF':'ON'),cx,y,260,50,!muted);y+=78;
  pill('settingsclose','DONE',cx,y,160,42,false);
  ctx.font=`500 12.5px ${FONT}`;ctx.fillStyle=fg();ctx.globalAlpha=.6;ctx.textAlign='center';
  ctx.fillText('B toggles blood  ·  M toggles sound',cx,y+52);ctx.globalAlpha=1;
}
function drawHelp(){
  uiBtns=[{id:'helpclose',x:0,y:0,w:W,h:H}];
  ctx.save();ctx.globalAlpha=.92;ctx.fillStyle=TH.bg;ctx.fillRect(0,0,W,H);ctx.restore();
  const pw=Math.min(W-40,580),x=(W-pw)/2+4,mw=pw-8;
  let y=Math.max(40+SA.t,(H-(portrait?600:440))/2+18);
  ctx.fillStyle=fg();ctx.textAlign='left';
  bigText('HOW TO PLAY',W/2,y,32,'#3d6fb8',fg(),7);y+=36;
  ctx.font=`500 13.5px ${FONT}`;ctx.textAlign='left';
  y=para('Beat every wave, then push right. Hit gunners and the pistol flies out of their hand. Block a bullet and you slip into bullet-time. Idle for a moment and the hero shows off.',x,y,mw,18)+4;
  const rows=touchOn?[
    ['◀ ▶','move'],['JUMP','jump — PUNCH/KICK in the air = flying kick'],['PUNCH','3 in a row = uppercut finisher'],['KICK','heavy kick, launches enemies'],
    ['GUARD','hold to block (near a bullet = matrix dodge)'],['GUARD+PUNCH','judo throw: toss one enemy into the others'],['SPIN','spin kick — appears when RAGE ≥ half']
  ]:[
    ['← → / A D','move'],['↑ / W / Space','jump — J/K in the air = flying kick'],['J / Z','punch — 3 in a row = uppercut finisher'],['K / X','kick — launches enemies'],
    ['↓ / S','hold to block (near a bullet = matrix dodge)'],['↓ + J','judo throw: toss one enemy into the others'],['L / C','spin kick (costs half the RAGE bar)'],['P · M · B · H · Esc','pause · sound · blood · help · menu']
  ];
  for(const [k,v] of rows){
    ctx.font=`bold 12.5px ${FONT}`;ctx.fillText(k,x,y);
    ctx.font=`12.5px ${FONT}`;ctx.globalAlpha=.85;ctx.fillText(v,x+Math.min(130,mw*.3),y);ctx.globalAlpha=1;y+=21;
  }
  y+=6;ctx.font=`500 12.5px ${FONT}`;ctx.globalAlpha=.8;
  y=para('Lucky hits become POWER hits: ripples, a tiny earthquake and bullet-time. HP and RAGE are the bars at the top. Finish a level, then tap CHALLENGE FRIENDS to send a link with your score.',x,y,mw,17);
  ctx.globalAlpha=.55;ctx.textAlign='center';ctx.fillText('tap / press any key to close',W/2,Math.min(H-20,y+22));ctx.globalAlpha=1;
}
function draw(){
  uiBtns=[];
  const camSim=cam;
  if(G)cam=camPrev+(camSim-camPrev)*alpha;
  ctx.save();
  if(!G){ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.restore();return}
  drawWorld();
  cam=camSim;
  quakeWarp();
  if(G.banner>170&&!G.demo&&(mode==='play'||mode==='watch')){
    // iris-in: the level opens as a growing circle around the hero
    const t=clamp((240-G.banner)/70,0,1),e=t*t*(3-2*t),R_=Math.hypot(W,H)*e;
    const hx=(G.p.x-cam)*zoom+(1-zoom)*(fx-cam),hy=(G.p.hy-40)*zoom+(1-zoom)*fy;
    ctx.save();ctx.fillStyle=TH.fg;ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(hx,hy,Math.max(1,R_),0,7);ctx.fill('evenodd');ctx.restore();
  }
  if(invT>0){ctx.globalCompositeOperation='difference';ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation='source-over'}
  drawMatrix();
  if(mode==='play'||mode==='watch'){drawHUD();drawTouch()}
  else if(mode==='title')drawTitle();
  else drawEnd();
  if(paused&&!helpOpen&&!settingsOpen){scrim(.6);bigText('PAUSED',W/2,H/2,60,'#3d6fb8',fg(),9);ctx.font=`600 14px ${FONT}`;ctx.fillStyle=fg();ctx.textAlign='center';ctx.globalAlpha=.8;ctx.fillText(touchOn?'tap to continue':'click or press any key to continue',W/2,H/2+46);ctx.globalAlpha=1}
  if(helpOpen)drawHelp();
  else if(settingsOpen)drawSettings();
  syncImprint();
  if(toastT>0){
    toastT--;const a=Math.min(1,toastT/20);
    ctx.save();ctx.globalAlpha=a;ctx.font=`600 14px ${FONT}`;const tw=ctx.measureText(toastS).width+36;
    ctx.fillStyle=TH.fg;ctx.beginPath();ctx.roundRect(W/2-tw/2,H-70-SA.b,tw,36,18);ctx.fill();
    ctx.fillStyle=TH.bg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(toastS,W/2,H-52-SA.b);ctx.restore();
  }
  ctx.restore();
}
