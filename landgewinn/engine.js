export const FOODS = [
 ['🥑','Avo, die Eroberin'],['🍕','Pizza Paco'],['🍩','Donut Doro'],['🍔','Burger Bruno'],['🍓','Erdbeer Elli'],['🍣','Sushi Suki'],['🌮','Taco Toni'],['🍉','Melonen Momo'],['🍦','Eis Elsa'],['🥨','Brezel Ben'],['🍍','Ananas Nani'],['🥐','Croissant Coco'],['🧁','Cupcake Cleo'],['🍒','Kirsch Kiki'],['🥝','Kiwi Kim'],['🍋','Zitronen Zizi'],['🍇','Trauben Theo'],['🥥','Kokos Koko']
];
export const WORLDS = [ ['Picknickpark','🌱'],['Beerengarten','🍓'],['Zuckerwiese','🍬'],['Taco-Tal','🌮'],['Sushi-Bucht','🍣'],['Eiszeit','🍦'],['Chili-Canyon','🌶️'],['Melonenmond','🍉'],['Sternenküche','✨'],['Snack-Olymp','👑'] ];
export const COLORS=['#75b59a','#e8a1b5','#9b91d4','#e6b45f','#6caecc','#d48668','#a4be65','#d789b0','#7bb7b0','#a4947a','#d99963','#8eacd4','#c3aa62','#a795d2','#d98890','#7ab388','#cb9879','#9ca7c4'];
export function levelConfig(level){level=Math.max(1,Math.min(100,Math.floor(level)||1));return {level,bots:2+Math.floor((level-1)/6),speed:5.1+(level-1)*.034,aggression:.035+(level-1)*.0055,turn:2.3+(level-1)*.033,target:18+Math.floor((level-1)*.34),world:Math.floor((level-1)/10),reach:5+(level-1)*.075};}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class Game {
 constructor(level=1,skin=0,rng=Math.random){this.n=72;this.rng=rng;this.config=levelConfig(level);this.grid=new Int16Array(this.n*this.n);this.trails=new Int16Array(this.n*this.n);this.entities=[];this.items=[];this.events=[];this.time=0;this.crumbs=0;this.kills=0;this.fuel=100;this.status='ready';this.spawnTimer=0;this.freeze=0;this.player=this.spawn(1,36,36,skin);for(let i=0;i<this.config.bots;i++){const a=i/this.config.bots*Math.PI*2+.3;const r=25+(i%2)*3;this.spawn(i+2,36+Math.cos(a)*r,36+Math.sin(a)*r,(i+1)%FOODS.length);}for(let i=0;i<22;i++)this.spawnItem();this.updateArea();}
 emit(type,data={}){this.events.push({type,...data});}
 cell(x,y){return clamp(Math.floor(y),0,this.n-1)*this.n+clamp(Math.floor(x),0,this.n-1);}
 spawn(id,x,y,skin){const e={id,x,y,skin,color:COLORS[(id-1)%COLORS.length],angle:-Math.PI/2,wanted:-Math.PI/2,trail:[],alive:true,shield:id===1?3:1,boost:0,magnet:0,route:[],think:0,respawn:0,wall:false,home:{x,y},cells:0};this.entities.push(e);this.seed(e,id===1?6:3);return e;}
 seed(e,r){for(let y=Math.floor(e.y-r);y<=Math.ceil(e.y+r);y++)for(let x=Math.floor(e.x-r);x<=Math.ceil(e.x+r);x++)if(x>=0&&y>=0&&x<this.n&&y<this.n&&Math.hypot(x+.5-e.x,y+.5-e.y)<r)this.grid[this.cell(x,y)]=e.id;}
 spawnItem(){for(let i=0;i<20;i++){const x=3+this.rng()*(this.n-6),y=3+this.rng()*(this.n-6);if(this.grid[this.cell(x,y)]===0){const r=this.rng();this.items.push({x,y,type:r<.64?'crumb':r<.75?'shield':r<.85?'chili':r<.94?'magnet':'freeze',phase:this.rng()*7});return;}}}
 start(){this.status='playing';}
 updateArea(){for(const e of this.entities)e.cells=0;for(const id of this.grid)if(id)this.entities[id-1].cells++;this.area=this.player.cells/this.grid.length*100;}
 clearTrail(e){for(const k of e.trail)if(this.trails[k]===e.id)this.trails[k]=0;e.trail=[];}
 capture(e){if(!e.trail.length)return 0;const old=e.cells;for(const k of e.trail)this.grid[k]=e.id;this.clearTrail(e);
 // Flood from every board edge. Anything unreachable through non-owned cells is enclosed.
 const seen=new Uint8Array(this.grid.length),queue=new Int32Array(this.grid.length);let head=0,tail=0;
 const add=k=>{if(!seen[k]&&this.grid[k]!==e.id){seen[k]=1;queue[tail++]=k;}};
 for(let i=0;i<this.n;i++){add(i);add((this.n-1)*this.n+i);add(i*this.n);add(i*this.n+this.n-1);}
 while(head<tail){const k=queue[head++],x=k%this.n;if(x>0)add(k-1);if(x<this.n-1)add(k+1);if(k>=this.n)add(k-this.n);if(k<this.grid.length-this.n)add(k+this.n);}
 let added=0;for(let k=0;k<this.grid.length;k++)if(!seen[k]&&this.grid[k]!==e.id){this.grid[k]=e.id;added++;}
 this.updateArea();this.emit('capture',{id:e.id,x:e.x,y:e.y,amount:e.cells-old});
 for(const other of this.entities)if(other.alive&&other.id!==e.id&&other.cells===0)this.eliminate(other,e);
 if(this.area>=this.config.target&&this.player.alive)this.win();return added;}
 win(){if(this.status==='won')return;this.status='won';this.emit('win',{area:this.area,crumbs:this.crumbs,kills:this.kills});}
 eliminate(e,killer){if(!e.alive||this.status!=='playing')return;if(e.shield>0){e.shield=0;this.clearTrail(e);this.emit('shield',{id:e.id,x:e.x,y:e.y});return;}
 e.alive=false;e.respawn=4;this.clearTrail(e);for(let k=0;k<this.grid.length;k++)if(this.grid[k]===e.id)this.grid[k]=0;
 this.emit('eliminate',{id:e.id,x:e.x,y:e.y});if(e.id===1){this.status='lost';this.emit('lose');}else if(killer?.id===1){this.kills++;this.crumbs+=5;this.emit('reward',{text:'+5 Krümel · Bot erwischt!'});}this.updateArea();}
 respawnBot(e){let best=null;for(let i=0;i<100;i++){const x=5+this.rng()*62,y=5+this.rng()*62;if(this.grid[this.cell(x,y)]===0&&Math.hypot(x-this.player.x,y-this.player.y)>15){best={x,y};break;}}if(!best){e.respawn=2;return;}Object.assign(e,best,{alive:true,shield:2,route:[],trail:[],home:best});this.seed(e,2.5);this.updateArea();}
 nearestHome(e){let best={x:e.home.x,y:e.home.y},d=Infinity;for(let k=0;k<this.grid.length;k++)if(this.grid[k]===e.id){let x=k%this.n+.5,y=Math.floor(k/this.n)+.5;let nd=(x-e.x)**2+(y-e.y)**2;if(nd<d){d=nd;best={x,y};}}return best;}
 plan(e){const home=this.nearestHome(e);if(e.trail.length>this.config.reach*5||this.grid[this.cell(e.x,e.y)]!==e.id){e.route=[home];return;}const a=this.rng()*Math.PI*2,r=this.config.reach+this.rng()*5;const dx=Math.cos(a)*r,dy=Math.sin(a)*r;const p={x:clamp(e.x+dx,1.5,70.5),y:clamp(e.y+dy,1.5,70.5)};const side=this.rng()<.5?1:-1;const q={x:clamp(p.x-dy*.65*side,1.5,70.5),y:clamp(p.y+dx*.65*side,1.5,70.5)};e.route=[p,q,home];}
 botThink(e,dt){e.think-=dt;if(e.think<=0){e.think=.24+this.rng()*.35;if(!e.route.length)this.plan(e);if(this.player.trail.length&&e.trail.length<12&&this.rng()<this.config.aggression){let nearest=null,dist=Infinity;for(const k of this.player.trail){const p={x:k%this.n+.5,y:Math.floor(k/this.n)+.5};const d=Math.hypot(p.x-e.x,p.y-e.y);if(d<dist){nearest=p;dist=d;}}if(nearest&&dist<8+this.config.level*.11)e.route=[nearest,this.nearestHome(e)];}}
 if(e.route.length){let p=e.route[0];if(Math.hypot(p.x-e.x,p.y-e.y)<1.35){e.route.shift();p=e.route[0];}if(p)e.wanted=Math.atan2(p.y-e.y,p.x-e.x);} }
 visit(e,k){const trailId=this.trails[k];if(trailId&&trailId!==e.id){this.eliminate(this.entities[trailId-1],e);if(this.status!=='playing')return;}
 if(this.grid[k]===e.id){if(e.trail.length>1)this.capture(e);else if(e.trail.length)this.clearTrail(e);}else if(this.trails[k]!==e.id){this.trails[k]=e.id;e.trail.push(k);} }
 collect(e,item){if(e.id!==1)return;const type=item.type;if(type==='crumb'){this.crumbs++;this.fuel=Math.min(100,this.fuel+7);}if(type==='shield')e.shield=8;if(type==='chili')e.boost=6;if(type==='magnet')e.magnet=10;if(type==='freeze')this.freeze=4;this.emit('pickup',{...item,kind:item.type,type:'pickup'});}
 step(dt,input={}){if(this.status!=='playing')return;dt=Math.min(dt,.05);this.time+=dt;this.freeze=Math.max(0,this.freeze-dt);this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=1.3;if(this.items.length<28)this.spawnItem();}
 const turbo=!!input.turbo&&this.fuel>0;this.fuel=clamp(this.fuel+(turbo?-30:14)*dt,0,100);this.turbo=turbo;
 for(const e of this.entities){if(!e.alive){if(e.id!==1&&(e.respawn-=dt)<=0)this.respawnBot(e);continue;}e.shield=Math.max(0,e.shield-dt);e.boost=Math.max(0,e.boost-dt);e.magnet=Math.max(0,e.magnet-dt);
 if(e.id===1&&Number.isFinite(input.angle))e.wanted=input.angle;if(e.id!==1)this.botThink(e,dt);
 const diff=Math.atan2(Math.sin(e.wanted-e.angle),Math.cos(e.wanted-e.angle));const turn=(e.id===1?9:this.config.turn)*dt;e.angle+=clamp(diff,-turn,turn);
 e.wall=Math.min(e.x,e.y,this.n-e.x,this.n-e.y)<2.3;let speed=e.id===1?8.3:this.config.speed;speed*=e.wall?1.48:1;speed*=e.boost>0||(e.id===1&&turbo)?1.72:1;speed*=e.id!==1&&this.freeze>0?.15:1;
 const distance=speed*dt,steps=Math.max(1,Math.ceil(distance/.22));for(let s=0;s<steps;s++){const nx=e.x+Math.cos(e.angle)*distance/steps,ny=e.y+Math.sin(e.angle)*distance/steps;e.x=clamp(nx,.65,this.n-.65);e.y=clamp(ny,.65,this.n-.65);if(e.id!==1&&(nx!==e.x||ny!==e.y)){e.route=[];e.wanted=e.angle+Math.PI/2;}
 this.visit(e,this.cell(e.x,e.y));if(this.status!=='playing')break;}
 if(this.status!=='playing')break;
 if(e.id===1){for(let i=this.items.length-1;i>=0;i--){const it=this.items[i],d=Math.hypot(e.x-it.x,e.y-it.y);if(e.magnet>0&&d<9){it.x+=(e.x-it.x)*dt*5;it.y+=(e.y-it.y)*dt*5;}if(d<1.4){this.collect(e,it);this.items.splice(i,1);}}}
 }
 if(this.player.wall&&!this.wasWall)this.emit('wall');this.wasWall=this.player.wall;
 }
}
