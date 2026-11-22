// Rules Compendium, Thrusters / Thruster Criticals.
// One overthrust critical check per overthrusted thruster in End of Turn Actions.
// Damage critical checks are additional, never replaced by this check.
const integer=(v)=>Number.isInteger(v)&&v>=0;
export function effectiveThrusterRating(printedRating,effects={}){
 if(!integer(printedRating)||!integer(effects.outletFailures??0))throw new RangeError('Invalid rating or outlet failures');
 return Math.max(0,printedRating-(effects.outletFailures??0));
}
export function resolveOverthrustCritical({id,used,rating,markedDamage=0,roll,effects={}}){
 if(!id||![used,rating,markedDamage].every(integer)||!Number.isInteger(roll)||roll<1||roll>20)throw new RangeError('Invalid overthrust critical input');
 const overthrust=used-rating;
 if(overthrust<=0)throw new RangeError('Thruster did not overthrust');
 if(used>2*rating)throw new RangeError('Over twice thruster rating');
 const modifiedRoll=roll+markedDamage+overthrust;
 const outlet=modifiedRoll>=15&&modifiedRoll<=19||modifiedRoll>=25;
 const efficiency=modifiedRoll>=20;
 const updated={outletFailures:(effects.outletFailures??0)+(outlet?1:0),efficiencyLosses:(effects.efficiencyLosses??0)+(efficiency?1:0)};
 const newRating=effectiveThrusterRating(rating+(effects.outletFailures??0), updated);
 return {id,roll,markedDamage,overthrust,modifiedRoll,result:modifiedRoll<15?'none':outlet&&efficiency?'both':outlet?'outlet-failure':'efficiency-reduced',effects:updated,ratingAfterCritical:newRating,destroyedByOutlet:newRating===0&&outlet};
}
export function thrusterCostForOutput(output,effects={}){
 if(!integer(output)||!integer(effects.outletFailures??0)||!integer(effects.efficiencyLosses??0))throw new RangeError('Invalid thruster output');
 // Outlet failure consumes one additional input per failed outlet, but does not
 // count against the thruster rating. Efficiency loss increases input per output.
 return output===0?0:output*(1+(effects.efficiencyLosses??0))+(effects.outletFailures??0);
}
export function overthrustChecksForTurn(ledger,damageById={}){
 return Object.entries(ledger).filter(([,s])=>s.used>s.rating).map(([id,s])=>{
  const markedDamage=damageById[id]??0;
  if(!integer(markedDamage))throw new RangeError('Invalid marked damage');
  return {id,used:s.used,rating:s.rating,markedDamage,modifier:markedDamage+s.used-s.rating,phase:'end-of-turn-actions'};
 });
}

// Ledger usage measures delivered thrust (the amount counted against thruster
// ratings). Engine spending includes efficiency and outlet losses separately.
export function manoeuvreEngineCost(allocation,effectsById={}){
 let cost=0;
 for(const [id,output] of Object.entries(allocation)){
  if(!integer(output))throw new RangeError('Invalid thruster output');
  cost+=thrusterCostForOutput(output,effectsById[id]??{});
 }
 return cost;
}

export function manoeuvreIncrementalEngineCost(allocation,ledger,effectsById={}){
 let cost=0;
 for(const [id,output] of Object.entries(allocation)){
  if(!integer(output)||!ledger[id])throw new RangeError('Invalid thruster output');
  const effects=effectsById[id]??{};
  if(!integer(effects.efficiencyLosses??0)||!integer(effects.outletFailures??0))throw new RangeError('Invalid critical effect');
  cost+=output*(1+(effects.efficiencyLosses??0));
  if(output>0&&ledger[id].used===0)cost+=(effects.outletFailures??0);
 }
 return cost;
}
