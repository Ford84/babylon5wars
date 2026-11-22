// Second Edition Rules Compendium: Movement & Maneuver, Rolls and Pivots.
// Pure manoeuvre state machine. Thruster availability and critical effects are
// checked by the caller; no game-state persistence is implied.
const whole=(n,label)=>{if(!Number.isInteger(n)||n<0)throw new RangeError(label);return n;};
const direction=d=>{if(!['clockwise','counterclockwise'].includes(d))throw new RangeError('direction');return d;};
export function pivotThrusterPairs(directionName,stopping=false){
 const d=direction(directionName);
 const clockwise=[['forward','port'],['aft','starboard']];
 const counterclockwise=[['forward','starboard'],['aft','port']];
 return (d==='clockwise')===(stopping===false)?clockwise:counterclockwise;
}
export function splitPairCost(cost,oddTo='first'){
 whole(cost,'cost');if(!['first','second'].includes(oddTo))throw new RangeError('oddTo');
 const first=Math.floor(cost/2),second=Math.floor(cost/2);
 return oddTo==='first'?[first+cost%2,second]:[first,second+cost%2];
}
export function beginPivot({facing,direction:dir,startCost,stopCost,agile=false,hexsides=1,pivotAllowed=true}){
 whole(facing,'facing');if(facing>5)throw new RangeError('facing');
 whole(startCost,'startCost');whole(stopCost,'stopCost');direction(dir);
 if(!pivotAllowed)throw new RangeError('Pivot not permitted by SCS');
 if(!Number.isInteger(hexsides)||hexsides<1||hexsides>(agile?3:1))throw new RangeError('hexsides');
 const delta=(dir==='clockwise'?1:-1)*hexsides;
 return {facing:(facing+delta+6)%6,orientationChange:hexsides*60,
  thrustCost:agile?startCost*hexsides:startCost,haltCost:agile?0:stopCost,
  active:!agile,direction:dir,agile,weaponPenalty:-3,hangarOperationsForbidden:true,
  thrusterPairs:agile?null:pivotThrusterPairs(dir)};
}
export function advancePivotAtMovementStart(pivot,facing){
 if(!pivot?.active||pivot.agile)throw new RangeError('No continuing pivot');
 whole(facing,'facing');if(facing>5)throw new RangeError('facing');
 return {...pivot,facing:(facing+(pivot.direction==='clockwise'?1:-1)+6)%6,
  orientationChange:60,weaponPenalty:-3,hangarOperationsForbidden:true};
}
export function haltPivot(pivot){
 if(!pivot?.active||pivot.agile)throw new RangeError('No continuing pivot');
 return {...pivot,active:false,thrustCost:pivot.haltCost,thrusterPairs:pivotThrusterPairs(pivot.direction,true),
  weaponPenalty:-3,hangarOperationsForbidden:true,restrictedAfterHalt:true};
}
export function beginRoll({rolled=false,startCost,stopCost,agile=false}){
 whole(startCost,'startCost');whole(stopCost,'stopCost');
 return {rolled,active:!agile,agile,thrustCost:startCost,
  stopCost:agile?0:stopCost,weaponPenalty:-3,hangarOperationsForbidden:!agile,
  maneuverRestrictions:!agile,flipsAtNextMovement:!agile};
}
export function advanceRollAtMovementStart(roll){
 if(!roll?.active||roll.agile)throw new RangeError('No continuing roll');
 return {...roll,rolled:!roll.rolled,weaponPenalty:-3};
}
export function haltRoll(roll){
 if(!roll?.active||roll.agile)throw new RangeError('No continuing roll');
 return {...roll,active:false,thrustCost:roll.stopCost,weaponPenalty:0,
  hangarOperationsForbidden:false,maneuverRestrictions:false,flipsAtNextMovement:false};
}
export function maneuverFirePenalty({rolling=false,pivotedThisTurn=false}){
 return (rolling?-3:0)+(pivotedThisTurn?-3:0);
}
