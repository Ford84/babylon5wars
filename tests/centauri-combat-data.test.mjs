import test from 'node:test';
import assert from 'node:assert/strict';
import {CENTAURI_HIT_CHARTS,validateHitChart,hitLocation,SENTRI_FLIGHT_DATA,RAZIK_FLIGHT_DATA,newSentriFlight,damageSentriFighter} from '../shared/centauri-combat-data.mjs';
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
