import test from 'node:test';
import assert from 'node:assert/strict';
import app,{SHIP_PRESETS} from '../worker/index.mjs';
const byId=id=>SHIP_PRESETS.find(x=>x.id===id);
test('Core Rules spacecraft and Clark Tri-Star form the 30-ship preloaded catalogue',()=>{
 assert.equal(SHIP_PRESETS.length,30);
 assert.equal(SHIP_PRESETS.filter(x=>x.source.startsWith('Core Rules 2e')).length,29);
 assert.equal(new Set(SHIP_PRESETS.map(x=>x.id)).size,30);
 assert.ok(byId('nial'));
 assert.ok(byId('vorchan'));
 assert.ok(byId('omega'));
 assert.ok(byId('tri-star'));
});
test('Every preset is structurally valid for the host-controlled ship entry form',()=>{
 for(const s of SHIP_PRESETS){
  assert.ok(s.name&&s.faction&&s.source&&s.stats.size, s.id);
  assert.ok(Number.isInteger(s.stats.structure)&&s.stats.structure>0,s.id);
  assert.ok(s.stats.maxOrders>=1&&s.stats.maxOrders<=5,s.id);
  assert.ok(s.stats.weapons.length<=30,s.id);
  for(const w of s.stats.weapons){
   assert.ok(['fore','aft','port','starboard','turret'].includes(w.arc),s.id);
   assert.ok(['close','long'].includes(w.range),s.id);
   assert.ok(Number.isInteger(w.offence)&&w.offence>=0,s.id);
   if(!w.offence)assert.equal(w.automatic,false,s.id);
  }
 }
});
test('Clark Tri-Star preserves sheet-specific statistics and special systems',()=>{
 const s=byId('tri-star').stats;
 assert.equal(s.defence,40);
 assert.equal(s.armourBase,14);
 assert.equal(s.armourShielded,27);
 assert.equal(s.sensors,7);
 assert.equal(s.sensorsInstalled,21);
 assert.equal(s.stealth,48);
 assert.equal(s.stealthBase,38);
 assert.equal(s.structure,52);
 assert.equal(s.structureMaximum,60);
 assert.equal(s.maxOrders,3);
 assert.ok(s.weapons.some(x=>x.offence===58));
 assert.ok(s.weapons.some(x=>x.offence===60));
 assert.equal(s.weapons.filter(x=>x.automatic===false).length,3);
});
test('Official weapons respect multiple mounts and specialist exceptions',()=>{
 assert.equal(byId('omega').stats.weapons.filter(w=>w.arc==='port'&&w.offence===6).length,6);
 assert.equal(byId('nova').stats.weapons.filter(w=>w.arc==='starboard'&&w.offence===20).length,4);
 assert.equal(byId('vorchan').stats.weapons.filter(w=>w.offence===15).length,2);
 assert.ok(byId('victory').stats.weapons.some(w=>w.name==='Lightning Cannon'&&w.automatic===false));
});
test('Public catalogue endpoint returns all presets without requiring a session',async()=>{
 const r=await app.fetch(new Request('https://test.invalid/api/ship-presets'),{DB:{}});
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.ships.length,30);
 assert.equal(data.ships.find(s=>s.id==='tri-star').stats.armour,27);
});
