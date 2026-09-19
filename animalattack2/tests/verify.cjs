// No npm install needed. Exercises the exact pure simulation shipped in index.html.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(new URL('../index.html',`file://${__filename}`),'utf8');
const core=html.slice(html.indexOf('// ═══════════════════ CONFIG'),html.indexOf('// CORE_END'));
const context={structuredClone,URLSearchParams,navigator:{language:'en'},location:{search:''},document:{querySelector:()=>null},matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null,setItem:()=>{}}};
vm.createContext(context);vm.runInContext(core+'\nglobalThis.api={generateLevel,createState,playRound,solve,winningFirst,addSpot,exposed,ART};',context);
const {generateLevel,createState,playRound,solve,winningFirst,addSpot}=context.api;
const snapshot=s=>JSON.stringify(s);
const nest=(color,bites=1,type='ant',id=0)=>({color,bites,type,id});
const fixture=(layers,columns)=>createState({w:layers[0][0].length,h:layers[0].length,layers},columns);
let s=fixture([['G'],['R']],[[nest('G')],[nest('R',1,'ant',1)],[],[],[]]);
const before=snapshot(s);let r=playRound(s,0);assert.equal(snapshot(s),before,'input must be immutable');assert.equal(r.state.active[0].bites,1,'blocked squads wait');assert.equal(r.events.length,1);s=r.state;
r=playRound(s,1);assert.equal(r.state.status,'win','a revealed color resumes in the SAME round');assert.equal(r.events.filter(e=>e.kind==='bite').length,2);
assert.equal(snapshot(playRound(s,1)),snapshot(playRound(s,1)),'replay must be deterministic');
s=fixture([['RR']],[[nest('R',1,'ladybug')],[],[],[],[]]);r=playRound(s,0);assert.equal(r.state.status,'win','ladybug eats adjacent pair for one bite');assert.equal(r.events[1].ids.length,2);
s=fixture([['G'],['R']],[[nest('G',1,'grasshopper')],[],[],[],[]]);r=playRound(s,0);assert.equal(r.state.cells[0],'.','hopper can eat one layer below');assert.equal(r.state.cells[1],'R');
s=fixture([['G'],['R']],[[nest('G')],[],[],[],[]]);r=playRound(s,0);assert.equal(r.state.cells[0],'G','ant cannot eat covered food');
s=fixture([['GGGGG'],['RRRRR']],[[nest('G'),nest('R',5,'ant',6)],...Array.from({length:4},(_,i)=>[nest('G',1,'ant',i+1)])]);for(let i=0;i<5;i++)s=playRound(s,i).state;assert.equal(s.status,'lose','five waiting squads cause loss');assert.equal(playRound(s,0).valid,false);const saved=snapshot(s),extra=addSpot(s);assert.equal(snapshot(s),saved);assert.equal(extra.active.length,6);assert.equal(extra.status,'playing');assert.equal(addSpot(extra).active.length,6,'only one extra slot');assert.equal(playRound(extra,0).state.status,'win');
const results=[],started=Date.now();for(const animals of [false,true])for(let i=0;i<24;i++){const level=generateLevel(i,animals);let state=createState(level);for(const col of level.route){const frozen=snapshot(state),a=playRound(state,col);assert.equal(snapshot(state),frozen);assert(a.valid);state=a.state;}assert.equal(state.status,'win',`level ${i+1}, animals ${animals}`);assert.equal(state.active.length,5,'solution uses no booster');assert.equal(state.cells.filter(c=>c!=='.').length,0);if(i>=18){const first=winningFirst(createState(level));assert.equal(first.unknown,false);assert.equal(first.safe.length,1);}results.push({level:i+1,animals,rounds:level.route.length,verified:true});}
assert.equal(context.api.ART.length,8);console.log(`PASS: ${results.length} level variants; pure rounds; waiting/resumption; loss; extra slot; ladybug clusters; covered hopper bites; deterministic replay; expert opening proofs. ${Date.now()-started} ms.`);
fs.writeFileSync(new URL('../verification.json',`file://${__filename}`),JSON.stringify({checks:results,expertSafeOpenings:1},null,2)+'\n');
