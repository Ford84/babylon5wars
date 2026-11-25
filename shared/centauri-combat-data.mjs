// Direct transcription from official Centauri Version 3: 2E/SF PDFs.
// Inclusive d20 ranges; PRIMARY is a second roll on the primary chart.
export const CENTAURI_HIT_CHARTS={
 'centauri-primus-v3-2e-sf':{
  forward:[[1,3,'retro_thrust'],[4,7,'twin_array'],[8,18,'forward_structure'],[19,20,'primary']],
  side:[[1,3,'side_thrust'],[4,7,'battle_laser'],[8,11,'twin_array'],[12,18,'side_structure'],[19,20,'primary']],
  aft:[[1,7,'main_thrust'],[8,12,'jump_drive'],[13,18,'aft_structure'],[19,20,'primary']],
  primary:[[1,9,'primary_structure'],[10,12,'sensors'],[13,15,'engine'],[16,17,'hangar'],[18,19,'reactor'],[20,20,'command']]
 },
 'centauri-vorchan-v3-2e-sf':{
  forward:[[1,3,'retro_thrust'],[4,5,'plasma_accelerator'],[6,9,'twin_array'],[10,18,'forward_structure'],[19,20,'primary']],
  aft:[[1,5,'main_thrust'],[6,9,'jump_drive'],[10,18,'aft_structure'],[19,20,'primary']],
  primary:[[1,7,'primary_structure'],[8,10,'side_thrust'],[11,12,'sensors'],[13,15,'engine'],[16,17,'hangar'],[18,19,'reactor'],[20,20,'command']]
 }
};
export function validateHitChart(chart){
 if(!Array.isArray(chart))return false;
 let expected=1;
 for(const row of chart){if(!Array.isArray(row)||row.length!==3||row[0]!==expected||!Number.isInteger(row[1])||row[1]<row[0]||row[1]>20||typeof row[2]!=='string'||!row[2])return false;expected=row[1]+1;}
 return expected===21;
}
export function hitLocation(chart,roll){if(!validateHitChart(chart))throw new RangeError('Invalid hit chart');if(!Number.isInteger(roll)||roll<1||roll>20)throw new RangeError('d20');return chart.find(([lo,hi])=>roll>=lo&&roll<=hi)[2];}
export const SENTRI_FLIGHT_DATA={
 // Source: centauri sentri medium fighters.pdf, Ships of the Fleet, Version 3: 2E/SF.
 id:'centauri-sentri-v3-2e-sf',name:'Sentri Medium Fighter',faction:'Centauri',class:'medium fighter',serviceYear:2202,
 fighterCount:6,flightsPerPrintedSheet:8,combatPoints:42,fullFlightCombatPoints:252,
 rammingFactor:21,structureBoxes:10,jinkingLimit:8,freeThrust:12,initiativeBonus:18,offensiveBonus:7,
 defence:{forward:7,aft:7,port:5,starboard:5},
 // Turn cost is the printed ratio; rounding belongs to the fighter movement engine.
 turnCostDivisor:3,turnDelay:0,accelerationCost:1,decelerationCost:1,pivotCost:1,rollCost:1,
 armour:{forward:3,port:3,starboard:3,aft:2},
 // The sheet uses the standard narrow fighter hex diagram, not a numeric ship arc.
 weapon:{name:'Light Particle Gun',guns:2,linked:true,damage:'1d6+2',rangePenaltyPerHex:-2,fireControl:null,rateOfFire:'once per turn',firingArc:'standard-fighter-forward'},
 flightLevelCombat:[{relative:'5 or more above',fraction:'0'},{relative:'3–4 above',fraction:'1/6'},{relative:'1–2 above',fraction:'1/3'},{relative:'0–2 below',fraction:'1/2'},{relative:'3–4 below',fraction:'2/3'},{relative:'5–6 below',fraction:'5/6'},{relative:'7 or more below',fraction:'all'}]
};
export function newSentriFlight(count=6){
 if(!Number.isInteger(count)||count<1||count>6)throw new RangeError('flight size 1–6');
 return {schemaVersion:1,flightType:SENTRI_FLIGHT_DATA.id,speed:0,initiative:null,thrustUsed:0,jinking:0,fighters:Array.from({length:count},(_,i)=>({slot:i+1,damage:0,droppedOut:false,destroyed:false}))};
}
export function damageSentriFighter(flight,slot,damage){
 if(!Number.isInteger(damage)||damage<0)throw new RangeError('damage');
 const fighter=flight.fighters.find(f=>f.slot===slot);
 if(!fighter||fighter.destroyed||fighter.droppedOut)throw new RangeError('ineligible fighter');
 return {...flight,fighters:flight.fighters.map(f=>f.slot===slot?{...f,damage:f.damage+damage}:f)};
}
