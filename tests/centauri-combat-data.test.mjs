import test from 'node:test';
import assert from 'node:assert/strict';
import {CENTAURI_HIT_CHARTS,validateHitChart,hitLocation,SENTRI_FLIGHT_DATA,RAZIK_FLIGHT_DATA,newSentriFlight,damageSentriFighter,newRazikFlight,newFighterFlight,damageFighter,eligibleFighterSlots,fighterFlightStatus,resolveFighterVolleys,resolveFlightAttack} from '../shared/centauri-combat-data.mjs';
test('all transcribed d20 charts cover each face exactly once',()=>{
 for(const charts of Object.values(CENTAURI_HIT_CHARTS))for(const chart of Object.values(charts)){
  assert.equal(validateHitChart(chart),true);
  for(let roll=1;roll<=20;roll++)assert.equal(typeof hitLocation(chart,roll),'string');
 }
});
test('Primus and Vorchan chart boundaries and primary reroll',()=>{
 const p=CENTAURI_HIT_CHARTS['centauri-primus-v3-2e-sf'];
 assert.equal(hitLocation(p.forward,3),'retro_thrust');
 assert.equal(hitLocation(p.forward,4),'twin_array');
 assert.equal(hitLocation(p.side,19),'primary');
 assert.equal(hitLocation(p.primary,20),'command');
 const v=CENTAURI_HIT_CHARTS['centauri-vorchan-v3-2e-sf'];
 assert.equal(hitLocation(v.forward,5),'plasma_accelerator');
 assert.equal(hitLocation(v.forward,6),'twin_array');
 assert.equal(hitLocation(v.primary,10),'side_thrust');
 assert.throws(()=>hitLocation(v.forward,21));
});
test('Sentri flight has six separately tracked fighters',()=>{
 const f=newSentriFlight();
 assert.equal(f.fighters.length,6);
 const updated=damageSentriFighter(f,3,2);
 assert.equal(updated.fighters[2].damage,2);
 assert.equal(f.fighters[2].damage,0);
 assert.equal(SENTRI_FLIGHT_DATA.armour.aft,2);
 assert.throws(()=>newSentriFlight(7));
});

test('Sentri statistics match the official Version 3 2E/SF fighter sheet',()=>{
 const s=SENTRI_FLIGHT_DATA;
 assert.equal(s.name,'Sentri Medium Fighter');
 assert.equal(s.faction,'Centauri');
 assert.equal(s.class,'medium fighter');
 assert.equal(s.serviceYear,2202);
 assert.equal(s.combatPoints,42);
 assert.equal(s.fullFlightCombatPoints,s.combatPoints*s.fighterCount);
 assert.equal(s.fullFlightCombatPoints,252);
 assert.equal(s.fighterCount,6);
 assert.equal(s.flightsPerPrintedSheet,8);
 assert.equal(s.rammingFactor,21);
 assert.equal(s.structureBoxes,10);
 assert.equal(s.jinkingLimit,8);
 assert.equal(s.freeThrust,12);
 assert.equal(s.initiativeBonus,18);
 assert.equal(s.offensiveBonus,7);
 assert.deepEqual(s.defence,{forward:7,aft:7,port:5,starboard:5});
 assert.deepEqual(s.armour,{forward:3,port:3,starboard:3,aft:2});
 assert.deepEqual([s.turnCostDivisor,s.turnDelay,s.accelerationCost,s.decelerationCost,s.pivotCost,s.rollCost],[3,0,1,1,1,1]);
 assert.deepEqual(s.weapon,{name:'Light Particle Gun',guns:2,linked:true,damage:'1d6+2',rangePenaltyPerHex:-2,fireControl:null,rateOfFire:'once per turn',firingArc:'standard-fighter-forward'});
 assert.deepEqual(s.flightLevelCombat.map(x=>x.fraction),['0','1/6','1/3','1/2','2/3','5/6','all']);
});

test('Razik statistics match the official Version 2 2E/SF fighter sheet',()=>{
 const r=RAZIK_FLIGHT_DATA;
 assert.deepEqual([r.id,r.name,r.faction,r.class,r.serviceYear],['centauri-razik-v2-2e-sf','Razik Light Fighter','Centauri','light fighter',2105]);
 assert.deepEqual([r.fighterCount,r.flightsPerPrintedSheet,r.combatPoints,r.fullFlightCombatPoints],[6,8,30,180]);
 assert.equal(r.fullFlightCombatPoints,r.combatPoints*r.fighterCount);
 assert.deepEqual([r.rammingFactor,r.structureBoxes,r.jinkingLimit,r.freeThrust,r.initiativeBonus,r.offensiveBonus],[14,8,10,14,20,5]);
 assert.deepEqual(r.defence,{forward:6,aft:6,port:5,starboard:5});
 assert.deepEqual(r.armour,{forward:1,port:2,starboard:2,aft:1});
 assert.deepEqual([r.turnCostDivisor,r.turnDelay,r.accelerationCost,r.decelerationCost,r.pivotCost,r.rollCost],[3,0,1,1,1,1]);
 assert.deepEqual(r.weapon,{name:'Ultralight Particle Beam',guns:2,linked:true,damage:'1d6+1',rangePenaltyPerHex:-2,fireControl:null,rateOfFire:'once per turn',firingArc:'standard-fighter-forward'});
 assert.deepEqual(r.flightLevelCombat,[{relative:'5 or more above',fraction:'0'},{relative:'3–4 above',fraction:'1/6'},{relative:'1–2 above',fraction:'1/3'},{relative:'0–2 below',fraction:'1/2'},{relative:'3–4 below',fraction:'2/3'},{relative:'5–6 below',fraction:'5/6'},{relative:'7 or more below',fraction:'all'}]);
 assert.notEqual(r.flightLevelCombat,SENTRI_FLIGHT_DATA.flightLevelCombat);
});

test('both types use independent immutable damage tracks and correct armour in every direction',()=>{
 for(const [data,make] of [[SENTRI_FLIGHT_DATA,newSentriFlight],[RAZIK_FLIGHT_DATA,newRazikFlight]]){
  for(const direction of ['forward','port','starboard','aft']){
   const f=make();
   const result=resolveFighterVolleys(f,{slot:4,direction,volleys:[5]});
   assert.equal(result.flight.fighters[3].damage,5-data.armour[direction]);
   assert.equal(result.results[0].armourApplied,data.armour[direction]);
   assert.equal(f.fighters[3].damage,0);
   assert.equal(result.flight.fighters[0].damage,0);
   assert.equal(result.status.activeCount,6);
  }
 }
});
test('armour fully absorbs weaker shots and zero damage',()=>{
 const f=newSentriFlight();
 for(const raw of [0,2,3]){
  const r=resolveFighterVolleys(f,{slot:1,direction:'forward',volleys:[raw]});
  assert.equal(r.results[0].structureDamage,0);
  assert.equal(r.flight.fighters[0].damage,0);
 }
});
test('last box destroys fighter immediately; excess is discarded; legacy API is capped',()=>{
 for(const [data,make] of [[SENTRI_FLIGHT_DATA,newSentriFlight],[RAZIK_FLIGHT_DATA,newRazikFlight]]){
  const f=damageFighter(make(),2,data.structureBoxes-1);
  const r=resolveFighterVolleys(f,{slot:2,direction:'aft',volleys:[20]});
  assert.equal(r.flight.fighters[1].damage,data.structureBoxes);
  assert.equal(r.flight.fighters[1].destroyed,true);
  assert.equal(r.results[0].overkill,19-data.armour.aft);
  assert.equal(r.status.activeCount,5);
  assert.equal(r.flight.fighters[2].damage,0);
  assert.throws(()=>resolveFighterVolleys(r.flight,{slot:2,direction:'aft',volleys:[1]}));
 }
 assert.equal(damageSentriFighter(newSentriFlight(),1,99).fighters[0].damage,10);
});
test('linked hits apply armour separately and waste remaining shots after destruction',()=>{
 const f=newSentriFlight();
 const r=resolveFighterVolleys(f,{slot:1,direction:'forward',volleys:[5,5],linked:true});
 assert.equal(r.flight.fighters[0].damage,4);
 const s=resolveFighterVolleys(damageFighter(f,1,9),{slot:1,direction:'forward',volleys:[5,8],linked:true});
 assert.equal(s.results[0].structureDamage,1);
 assert.equal(s.results[1].wasted,true);
 assert.equal(s.results[1].structureDamage,0);
 assert.equal(s.flight.fighters[1].damage,0);
 assert.throws(()=>resolveFighterVolleys(f,{slot:1,direction:'forward',volleys:[5,5]}));
});
test('defender may allocate separate volleys to distinct eligible slots; whole flight elimination',()=>{
 let f=newRazikFlight(2);
 f=resolveFighterVolleys(f,{slot:2,direction:'aft',volleys:[9]}).flight;
 assert.deepEqual(eligibleFighterSlots(f),[1]);
 f=resolveFighterVolleys(f,{slot:1,direction:'aft',volleys:[9]}).flight;
 assert.deepEqual(fighterFlightStatus(f),{activeSlots:[],activeCount:0,destroyedCount:2,droppedOutCount:0,eliminated:true,inactive:true});
});
test('drop-out flags exclude inactive fighters without counting them as destroyed',()=>{
 const f=newRazikFlight(2);f.fighters[0].droppedOut=true;
 const r=damageFighter(f,2,8);
 assert.deepEqual(fighterFlightStatus(r),{activeSlots:[],activeCount:0,destroyedCount:1,droppedOutCount:1,eliminated:false,inactive:true});
 assert.throws(()=>damageFighter(r,1,1));
});
test('invalid damage, type, slot, direction and flight size are rejected without changes',()=>{
 const f=newRazikFlight();
 for(const damage of [-1,1.5,NaN,Infinity])assert.throws(()=>damageFighter(f,1,damage));
 assert.throws(()=>newFighterFlight('unknown'));
 assert.throws(()=>newRazikFlight(0));assert.throws(()=>newRazikFlight(7));
 assert.throws(()=>damageFighter(f,7,1));
 assert.throws(()=>damageSentriFighter(f,1,1));
 for(const direction of ['rear','__proto__','constructor'])assert.throws(()=>resolveFighterVolleys(f,{slot:1,direction,volleys:[1]}));
 assert.throws(()=>resolveFighterVolleys(f,{slot:1,direction:'aft',volleys:[3,-1],linked:true}));
 assert.equal(f.fighters[0].damage,0);
});

test('flight attack covers all official margin boundaries for both fighter types',()=>{
 for(const make of [newSentriFlight,newRazikFlight]){
  for(const [margin,hits] of [[-9,0],[-5,0],[-4,1],[-3,1],[-2,2],[-1,2],[0,3],[1,3],[2,3],[3,4],[4,4],[5,5],[6,5],[7,6],[19,6]]){
   const r=resolveFlightAttack(make(),10+margin,10);
   assert.equal(r.hits,hits);assert.equal(r.gunHits,hits*2);assert.equal(r.misses,6-hits);assert.equal(r.linked,true);
  }
 }
});
test('flight attack rounds half up for every surviving flight size and band',()=>{
 const expected=[[0,0,0,1,1,1,1],[0,0,1,1,1,2,2],[0,1,1,2,2,3,3],[0,1,1,2,3,3,4],[0,1,2,3,3,4,5],[0,1,2,3,4,5,6]];
 for(let n=1;n<=6;n++)for(const [i,margin] of [-5,-4,-2,0,3,5,7].entries()){
  const r=resolveFlightAttack(newRazikFlight(n),10+margin,10);
  assert.equal(r.hits,expected[n-1][i]);
  assert.equal(r.fraction,RAZIK_FLIGHT_DATA.flightLevelCombat[i].fraction);
 }
});
test('destroyed and dropped-out fighters do not contribute to flight fire',()=>{
 let f=damageFighter(newSentriFlight(),1,10);
 f.fighters[1].droppedOut=true;
 assert.equal(resolveFlightAttack(f,10,10).hits,2);
 for(const slot of eligibleFighterSlots(f))f=damageFighter(f,slot,10);
 assert.equal(resolveFlightAttack(f,30,1).hits,0);
});
test('flight attack preserves extreme target numbers and rejects invalid rolls',()=>{
 const f=newSentriFlight();
 assert.equal(resolveFlightAttack(f,27,20).hits,6);
 assert.equal(resolveFlightAttack(f,-4,1).hits,0);
 for(const roll of [0,21,1.5,NaN])assert.throws(()=>resolveFlightAttack(f,10,roll));
 for(const chance of [NaN,Infinity,1.5])assert.throws(()=>resolveFlightAttack(f,chance,10));
});
