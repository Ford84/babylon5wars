import test from 'node:test';
import assert from 'node:assert/strict';
import {CENTAURI_HIT_CHARTS,validateHitChart,hitLocation,SENTRI_FLIGHT_DATA,newSentriFlight,damageSentriFighter} from '../shared/centauri-combat-data.mjs';
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
