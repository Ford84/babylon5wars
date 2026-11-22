// Narrow, directly sourced B5W 2E rules. Not a full movement/critical engine.
// Rules Compendium: Movement & Maneuver > Overthrusting;
// Critical Hits > Critical Hits and When to Roll Critical Hits.
const whole=(n)=>Number.isInteger(n)&&n>=0;
export function thrusterExpenditure({rating,spent,damage=0}){
 if(!whole(rating)||!whole(spent)||!whole(damage))throw new RangeError('Invalid thruster values');
 if(spent>rating*2)throw new RangeError('Thruster cannot expend more than twice its rating');
 const overthrust=Math.max(0,spent-rating);
 return {rating,spent,overthrust,requiresAdditionalCritical:overthrust>0,overthrustCriticalModifier:overthrust>0?overthrust+damage:null};
}
export function criticalCheckEligibility({kind,boxes,damageBefore,damageAfter,overthrust=0,destroyed=false,missileMagazine=false,externalFighterRail=false,specialWeaponEffect=false}){
 if(!whole(boxes)||boxes<1||!whole(damageBefore)||!whole(damageAfter)||damageBefore>damageAfter||damageAfter>boxes||!whole(overthrust))throw new RangeError('Invalid critical track');
 const newDamage=damageAfter>damageBefore;
 const checks=[];
 // Ordinary checks are delayed until after all weapon fire, and destroyed
 // systems do not take the ordinary check.
 if(kind!=='structure'&&newDamage&&!destroyed&&damageAfter<boxes)checks.push({cause:'damage',modifier:damageAfter});
 if(kind==='thruster'&&overthrust>0&&!destroyed&&damageAfter<boxes)checks.push({cause:'overthrust',modifier:damageAfter+overthrust});
 if(kind==='structure'&&externalFighterRail&&newDamage)checks.push({cause:'external_fighter_rail',modifier:0});
 if(missileMagazine&&newDamage)checks.push({cause:'missile_magazine',specialChartRequired:true});
 if(specialWeaponEffect)checks.push({cause:'special_weapon',specialChartRequired:true});
 return {checks,needsSystemCriticalChart:checks.some(x=>!x.specialChartRequired)};
}
