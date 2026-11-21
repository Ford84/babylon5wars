// B5W Second Edition Compendium: Pre-Turn Allocations (Ship Power, Initiative, EW).
// Pure calculations; ship-specific values must come from a validated SCS.
const integer=(v,name,min=0)=>{if(!Number.isInteger(v)||v<min)throw new RangeError(name);return v;};
export function powerBudget({extraPower=0,reactorLoss=0,systems=[]}){
 if(!Number.isInteger(extraPower))throw new RangeError('extraPower');
 integer(reactorLoss,'reactorLoss');
 let recovered=0;
 for(const s of systems){
  integer(s.power,'system power');
  if(s.deactivated&&s.destroyed)throw new RangeError('destroyed systems cannot recover power');
  if(s.deactivated&&s.deactivatable===false)throw new RangeError('system cannot be deactivated');
  if(s.deactivated)recovered+=s.power;
 }
 const available=extraPower-reactorLoss+recovered;
 return {available,recovered,shortage:Math.max(0,-available),reactorShutdown:available<0};
}
// Extra EW costs original sensor strength +1, then +2, etc. Even a damaged
// sensor uses its undamaged rating as the cost basis.
export function extraEWCost(originalRating,points){
 integer(originalRating,'original sensor rating');integer(points,'extra EW');
 return points*originalRating+points*(points+1)/2;
}
export function ewAllocation({sensors,extra=[],defensive=0,offensive={},closeCombat=0,unitType='ship'}){
 if(!Array.isArray(sensors)||!Array.isArray(extra)||sensors.length!==extra.length)throw new RangeError('sensor arrays');
 integer(defensive,'defensive EW');integer(closeCombat,'close combat EW');
 let total=0,powerCost=0;
 if(unitType!=='ship'&&unitType!=='base')throw new RangeError('unit type');
 if(unitType==='ship'&&extra.some(x=>x>0)){
  const strongest=Math.max(...sensors.filter(s=>s.active!==false).map(s=>s.current),-Infinity);
  if(extra.some((x,i)=>x>0&&(sensors[i].active===false||sensors[i].current!==strongest)))throw new RangeError('ships may boost only a strongest active sensor');
 }
 sensors.forEach((s,i)=>{
  integer(s.original,'original sensor rating');if(!Number.isInteger(s.current))throw new RangeError('current sensor rating');
  const purchased=integer(extra[i],'purchased EW');
  if(s.active===false&&purchased)throw new RangeError('inactive sensor');
  total+=s.active===false?0:Math.max(0,s.current+purchased);
  powerCost+=extraEWCost(s.original,purchased);
 });
 if(!offensive||Array.isArray(offensive)||typeof offensive!=='object')throw new RangeError('offensive EW');
 let spent=defensive+closeCombat;
 for(const [target,value] of Object.entries(offensive)){if(!target)throw new RangeError('target');spent+=integer(value,'offensive EW');}
 if(spent>total)throw new RangeError('EW allocation exceeds sensor output');
 return {total,spent,unallocated:total-spent,powerCost,defensive,offensive,closeCombat};
}
export function initiative({roll,bonus=0,speed=0,immobile=false,launchPenalty=0,otherModifier=0,voluntaryReduction=0}){
 integer(roll,'d20 roll',1);if(roll>20)throw new RangeError('d20 roll');
 for(const [n,v] of Object.entries({bonus,speed,launchPenalty,otherModifier,voluntaryReduction}))integer(v,n,n==='bonus'||n==='otherModifier'||n==='launchPenalty'?-999:0);
 if(voluntaryReduction>20)throw new RangeError('voluntary initiative reduction');
 const slowness=immobile?0:-2*Math.max(0,5-speed);
 return {roll,modifier:bonus+slowness+launchPenalty+otherModifier-voluntaryReduction,total:roll+bonus+slowness+launchPenalty+otherModifier-voluntaryReduction,slowness};
}
export function initiativeOrder(units){
 // Higher total moves later; ties in total favour higher base initiative bonus.
 // Exact ties between opposing units require a roll-off, never a silent ID sort.
 const sorted=[...units].sort((a,b)=>a.total-b.total||a.bonus-b.bonus);
 const unresolved=[];
 for(let i=1;i<sorted.length;i++)if(sorted[i].total===sorted[i-1].total&&sorted[i].bonus===sorted[i-1].bonus)unresolved.push([sorted[i-1].id,sorted[i].id]);
 return {units:sorted,unresolved};
}
