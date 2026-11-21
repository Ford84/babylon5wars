// Server-side deterministic hit-chart resolution. Caller supplies dice function;
// production callers MUST use crypto-backed dice, never player-supplied rolls.
// Do not invent system mounts or armour from SCS illustrations.
import {hitLocation,validateHitChart} from './centauri-combat-data.mjs';
export function rollD20(randomBytes=crypto.getRandomValues.bind(crypto)){
 const bytes=new Uint8Array(1);
 // Rejection sampling avoids modulo bias (256 is not divisible by 20).
 for(let n=0;n<1000;n++){randomBytes(bytes);if(bytes[0]<240)return bytes[0]%20+1;}
 throw new Error('Random source unavailable');
}
export function resolveChartHit({charts,section,roll,primaryRoll,maximumDepth=2}){
 if(!charts||!validateHitChart(charts[section]))throw new RangeError('Undefined or invalid section chart');
 if(!Number.isInteger(roll)||roll<1||roll>20)throw new RangeError('Invalid initial d20');
 const history=[],nextRoll=typeof primaryRoll==='function'?primaryRoll:()=>{throw new RangeError('Primary reroll required');};
 let current=section,value=roll;
 for(let depth=0;depth<maximumDepth;depth++){
  const location=hitLocation(charts[current],value);
  history.push({chart:current,roll:value,location});
  if(location!=='primary')return {location,history,complete:true};
  if(!validateHitChart(charts.primary))throw new RangeError('Primary chart missing');
  current='primary';value=nextRoll();
  if(!Number.isInteger(value)||value<1||value>20)throw new RangeError('Invalid primary d20');
 }
 throw new RangeError('Primary chart recursion limit reached');
}
export function planHitResolution({volleys,charts,rollD20:die}){
 if(!Array.isArray(volleys)||!volleys.length||typeof die!=='function')throw new RangeError('Invalid volleys or dice');
 return volleys.map((volley,i)=>{
  if(!Number.isInteger(volley.damage)||volley.damage<0)throw new RangeError('Invalid volley damage');
  const hit=resolveChartHit({charts,section:volley.section,roll:die(),primaryRoll:die});
  return {volley:i+1,section:volley.section,incomingDamage:volley.damage,...hit,requiresSystemSelection:true,damageApplied:false};
 });
}
// The printed chart names a SYSTEM TYPE, not necessarily an individual mount.
// Until each system's armour and boxes have been verified, do not alter ship state.
export function applyVerifiedSystemDamage({systems,systemId,amount,armour=0,armourAlreadyApplied=false}){
 if(!systems||!Object.hasOwn(systems,systemId))throw new RangeError('Unknown system');
 const old=systems[systemId];
 if(!Number.isInteger(old.boxes)||old.boxes<1||!Number.isInteger(old.damage)||old.damage<0||old.damage>old.boxes)throw new RangeError('Invalid system damage track');
 if(!Number.isInteger(amount)||amount<0||!Number.isInteger(armour)||armour<0)throw new RangeError('Invalid damage or armour');
 const penetrating=Math.max(0,amount-(armourAlreadyApplied?0:armour));
 const actual=Math.min(penetrating,old.boxes-old.damage);
 return {systems:{...systems,[systemId]:{...old,damage:old.damage+actual}},result:{systemId,armourAbsorbed:armourAlreadyApplied?0:Math.min(amount,armour),penetrating,marked:actual,excess:penetrating-actual,destroyed:old.damage+actual===old.boxes}};
}
