// Per-thruster thrust accounting. A rating limits channel capacity, not engine generation.
// Overthrust is permitted up to twice the current rating; its critical check is
// deferred to the post-turn step. See Rules Compendium: Movement & Maneuver.
const whole=(v)=>Number.isInteger(v)&&v>=0;
export function createThrusterLedger(ratings){
 if(!ratings||typeof ratings!=='object'||Array.isArray(ratings)||!Object.keys(ratings).length)throw new RangeError('Thruster ratings required');
 const ledger={};
 for(const [id,rating] of Object.entries(ratings)){
  if(!id||!whole(rating))throw new RangeError('Invalid thruster rating');
  ledger[id]={rating,used:0};
 }
 return ledger;
}
export function allocateThrusterThrust(ledger,allocation,{availableThrust,alreadySpent=0}={}){
 if(!ledger||!allocation||typeof allocation!=='object'||Array.isArray(allocation)||!whole(availableThrust)||!whole(alreadySpent))throw new RangeError('Invalid thrust allocation');
 const next=structuredClone(ledger);
 let spent=0;
 for(const [id,amount] of Object.entries(allocation)){
  if(!Object.hasOwn(next,id)||!whole(amount))throw new RangeError('Unknown thruster or invalid allocation');
  const entry=next[id];
  if(!whole(entry.rating)||!whole(entry.used))throw new RangeError('Invalid thruster state');
  if(entry.used+amount>entry.rating*2)throw new RangeError('Thruster exceeds twice its rating: '+id);
  entry.used+=amount;spent+=amount;
 }
 if(alreadySpent+spent>availableThrust)throw new RangeError('Insufficient engine thrust');
 return {ledger:next,spent,remaining:availableThrust-alreadySpent-spent,overthrustChecks:Object.entries(next).filter(([,v])=>v.used>v.rating).map(([id,v])=>({id,excess:v.used-v.rating,criticalModifier:v.used-v.rating}))};
}
export function pendingOverthrustChecks(ledger,damageById={}){
 return Object.entries(ledger).filter(([,v])=>v.used>v.rating).map(([id,v])=>{
  const damage=damageById[id]??0;
  if(!whole(damage))throw new RangeError('Invalid thruster damage');
  return {id,overthrust:v.used-v.rating,criticalModifier:v.used-v.rating+damage,step:'post-turn'};
 });
}
export function resetThrusterLedger(ledger){
 return Object.fromEntries(Object.entries(ledger).map(([id,v])=>[id,{rating:v.rating,used:0}]));
}
