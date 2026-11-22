// Compendium: Initiative, Determining Initiative and Action Initiative Modifiers.
// Tie-breaks are resolved per opposing unit, never per player.
const integer=n=>Number.isInteger(n);
export function initiativeModifiers({speed,immobile=false,launchedOrLanded=false,newlyLaunched=false,catapultOrRail=false,voluntaryPenalty=0,otherModifiers=0}){
 if(!integer(speed)||!integer(voluntaryPenalty)||!integer(otherModifiers)||voluntaryPenalty>0||voluntaryPenalty< -20)throw new RangeError('Invalid initiative modifier');
 return {slowness:immobile?0:-2*Math.max(0,5-Math.abs(speed)),
  hangar:launchedOrLanded&&!immobile?-4:0,
  launch:newlyLaunched&&!catapultOrRail?-10:0,
  voluntary:voluntaryPenalty,other:otherModifiers};
}
export function unitInitiative({roll,printedBonus,...options}){
 if(!integer(roll)||roll<1||roll>20||!integer(printedBonus))throw new RangeError('Invalid initiative roll or SCS bonus');
 const modifiers=initiativeModifiers(options);
 return {roll,printedBonus,modifiers,total:roll+printedBonus+Object.values(modifiers).reduce((a,b)=>a+b,0)};
}
export function initiativePrecedence(a,b){
 if(!integer(a.total)||!integer(b.total)||!integer(a.printedBonus)||!integer(b.printedBonus))throw new RangeError('Invalid initiative records');
 if(a.total!==b.total)return Math.sign(a.total-b.total);
 if(a.printedBonus!==b.printedBonus)return Math.sign(a.printedBonus-b.printedBonus);
 return 0; // Opposing units must roll off; never break a tie arbitrarily.
}
export function resolveInitiativeOrder(units){
 if(!Array.isArray(units)||units.some(u=>typeof u.id!=='string'||typeof u.ownerId!=='string'))throw new RangeError('Invalid units');
 const ordered=[...units].sort((a,b)=>initiativePrecedence(a,b));
 const unresolved=[];
 for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++){
  if(initiativePrecedence(ordered[i],ordered[j])!==0)break;
  if(ordered[i].ownerId!==ordered[j].ownerId)unresolved.push([ordered[i].id,ordered[j].id]);
 }
 return {ordered,unresolved,canMove:unresolved.length===0};
}
