// Direct transcription from official Centauri Versions 2 and 3: 2E/SF PDFs.
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
// Source: centauri razik light fighter.pdf, Ships of the Fleet, Version 2: 2E/SF.
export const RAZIK_FLIGHT_DATA={
 id:'centauri-razik-v2-2e-sf',name:'Razik Light Fighter',faction:'Centauri',class:'light fighter',serviceYear:2105,
 fighterCount:6,flightsPerPrintedSheet:8,combatPoints:30,fullFlightCombatPoints:180,
 rammingFactor:14,structureBoxes:8,jinkingLimit:10,freeThrust:14,initiativeBonus:20,offensiveBonus:5,
 defence:{forward:6,aft:6,port:5,starboard:5},
 turnCostDivisor:3,turnDelay:0,accelerationCost:1,decelerationCost:1,pivotCost:1,rollCost:1,
 armour:{forward:1,port:2,starboard:2,aft:1},
 weapon:{name:'Ultralight Particle Beam',guns:2,linked:true,damage:'1d6+1',rangePenaltyPerHex:-2,fireControl:null,rateOfFire:'once per turn',firingArc:'standard-fighter-forward'},
 flightLevelCombat:[{relative:'5 or more above',fraction:'0'},{relative:'3–4 above',fraction:'1/6'},{relative:'1–2 above',fraction:'1/3'},{relative:'0–2 below',fraction:'1/2'},{relative:'3–4 below',fraction:'2/3'},{relative:'5–6 below',fraction:'5/6'},{relative:'7 or more below',fraction:'all'}]
};

// Fighter Flight Level Combat: Damage Tracks & Armour / Damage Allocation to Flights.
export function fighterFlightData(flightType){
 const data=[SENTRI_FLIGHT_DATA,RAZIK_FLIGHT_DATA].find(x=>x.id===flightType);
 if(!data)throw new RangeError('unknown fighter type');
 return data;
}
export function newFighterFlight(flightType,count=6){
 const data=fighterFlightData(flightType);
 if(!Number.isInteger(count)||count<1||count>data.fighterCount)throw new RangeError('flight size 1–6');
 return {schemaVersion:1,flightType:data.id,speed:0,initiative:null,thrustUsed:0,jinking:0,fighters:Array.from({length:count},(_,i)=>({slot:i+1,damage:0,droppedOut:false,destroyed:false}))};
}
export function newSentriFlight(count=6){return newFighterFlight(SENTRI_FLIGHT_DATA.id,count);}
export function newRazikFlight(count=6){return newFighterFlight(RAZIK_FLIGHT_DATA.id,count);}
function active(fighter,data){return !fighter.destroyed&&!fighter.droppedOut&&fighter.damage<data.structureBoxes;}
export function eligibleFighterSlots(flight){
 const data=fighterFlightData(flight.flightType);
 return flight.fighters.filter(f=>active(f,data)).map(f=>f.slot);
}
export function fighterFlightStatus(flight){
 const data=fighterFlightData(flight.flightType);
 const destroyed=flight.fighters.filter(f=>f.destroyed||f.damage>=data.structureBoxes).length;
 const droppedOut=flight.fighters.filter(f=>f.droppedOut&&!f.destroyed&&f.damage<data.structureBoxes).length;
 const activeSlots=eligibleFighterSlots(flight);
 return {activeSlots,activeCount:activeSlots.length,destroyedCount:destroyed,droppedOutCount:droppedOut,eliminated:destroyed===flight.fighters.length,inactive:activeSlots.length===0};
}
function checkDamage(damage){if(!Number.isSafeInteger(damage)||damage<0)throw new RangeError('damage');}
function selectedFighter(flight,slot){
 const data=fighterFlightData(flight.flightType);
 const fighter=flight.fighters.find(f=>f.slot===slot);
 if(!fighter||!active(fighter,data))throw new RangeError('ineligible fighter');
 return {data,fighter};
}
// Internal damage already reduced by armour. Preserve the existing Sentri API.
export function damageFighter(flight,slot,damage){
 checkDamage(damage);
 const {data,fighter}=selectedFighter(flight,slot);
 const total=fighter.damage+Math.min(damage,data.structureBoxes-fighter.damage);
 return {...flight,fighters:flight.fighters.map(f=>f.slot===slot?{...f,damage:total,destroyed:total===data.structureBoxes}:f)};
}
export function damageSentriFighter(flight,slot,damage){
 if(flight.flightType!==SENTRI_FLIGHT_DATA.id)throw new RangeError('not a Sentri flight');
 return damageFighter(flight,slot,damage);
}
// One selection per standard volley, or per explicitly linked group. Direction is
// supplied by the combat geometry layer; each linked shot penetrates armour separately.
export function resolveFighterVolleys(flight,{slot,direction,volleys,linked=false}){
 const {data}=selectedFighter(flight,slot);
 if(!Object.hasOwn(data.armour,direction))throw new RangeError('invalid incoming direction');
 if(!Array.isArray(volleys)||volleys.length===0||(!linked&&volleys.length!==1))throw new RangeError('one volley or a linked group required');
 for(const damage of volleys)checkDamage(damage);
 let next=flight;
 const results=[];
 for(const rawDamage of volleys){
  const fighter=next.fighters.find(f=>f.slot===slot);
  if(fighter.destroyed){results.push({slot,rawDamage,armourApplied:0,structureDamage:0,overkill:0,wasted:true,destroyed:true});continue;}
  const armourApplied=Math.min(rawDamage,data.armour[direction]);
  const penetrating=rawDamage-armourApplied;
  const structureDamage=Math.min(penetrating,data.structureBoxes-fighter.damage);
  next=damageFighter(next,slot,structureDamage);
  results.push({slot,rawDamage,armourApplied,structureDamage,overkill:penetrating-structureDamage,wasted:false,destroyed:next.fighters.find(f=>f.slot===slot).destroyed});
 }
 return {flight:next,results,status:fighterFlightStatus(next)};
}

// Rules Compendium: Fighter Flight Level Combat Resolution.
// chanceToHit is the final modified target number, not clamped to the d20 range.
export function resolveFlightAttack(flight,chanceToHit,roll){
 if(!Number.isSafeInteger(chanceToHit))throw new RangeError('chance to hit');
 if(!Number.isInteger(roll)||roll<1||roll>20)throw new RangeError('d20');
 const data=fighterFlightData(flight.flightType);
 const activeCount=eligibleFighterSlots(flight).length;
 const margin=chanceToHit-roll;
 const sixths=margin>=7?6:margin>=5?5:margin>=3?4:margin>=0?3:margin>=-2?2:margin>=-4?1:0;
 const hits=Math.floor((activeCount*sixths+3)/6);
 return {chanceToHit,roll,margin,activeCount,fraction:data.flightLevelCombat[sixths].fraction,hits,misses:activeCount-hits,weapon:data.weapon.name,gunHits:hits*data.weapon.guns,linked:data.weapon.linked};
}

 // Compendium: Jinking, Fighter and Shuttle EW, Applying EW Modifiers.
 export function fighterEWModifiers({attacker,target,range,ballistic=false,shipOffensiveEW=0,shipDefensiveEW=0,loanedOffensiveEW=0,loanedDefensiveEW=0,closeCombatEW=0}){
  if(!Number.isInteger(range)||range<0)throw new RangeError('invalid range');
  const af=attacker.kind==='fighter-flight',tf=target.kind==='fighter-flight';
  if(!af&&!tf)throw new RangeError('fighter engagement required');
  const jink=u=>{const j=u.jinking??0;if(!Number.isInteger(j)||j<0||j>fighterFlightData(u.flightType).jinkingLimit)throw new RangeError('invalid jinking');return j;};
  for(const n of [shipOffensiveEW,shipDefensiveEW,loanedOffensiveEW,loanedDefensiveEW,closeCombatEW])if(!Number.isInteger(n)||n<0)throw new RangeError('invalid EW');
  const attackerJinking=af?jink(attacker):0,targetJinking=tf?jink(target):0;
  const modifiers={offensive:af?fighterFlightData(attacker.flightType).offensiveBonus:shipOffensiveEW,
   ownJinking:-attackerJinking,targetJinking:tf&&!(af&&range===0&&attackerJinking===0)?-targetJinking:0,
   defensive:tf||af&&!ballistic?0:-shipDefensiveEW,
   elintOffensive:loanedOffensiveEW,elintDefensive:af&&!ballistic&&!tf?0:-loanedDefensiveEW,
   closeCombat:!af&&tf&&range<=10?closeCombatEW:0};
  return {...modifiers,total:Object.values(modifiers).reduce((a,b)=>a+b,0)};
 }
