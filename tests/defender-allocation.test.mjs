import test from 'node:test';import assert from 'node:assert/strict';import app,{SHIP_PRESETS,resolveAllocation,damagePenalty} from '../worker/index.mjs';
test('defender allocation controls appear in deployed page source',async()=>{const r=await app.fetch(new Request('https://test.invalid/'),{DB:{}});const html=await r.text();assert.match(html,/Defender weapon allocation/);assert.match(html,/data-weapon/);assert.match(html,/\/allocate/);});
test('weapon damage cannot be assigned to invalid mount or exceed remaining capacity',()=>{
 const ship={stats:{training:5,weapons:[{name:'A',spaces:2,arc:'fore',offence:10},{name:'B',spaces:2,arc:'fore',offence:10}],damageState:{remaining:{Weapons:4},weaponDamage:{},disabledWeapons:[],impairedWeapons:[],pendingAllocation:{id:'abc',arc:'fore',roll:9,amount:2,overflow:0,choices:[{index:0,name:'A',remaining:2},{index:1,name:'B',remaining:2}],events:[]}}}};
 assert.throws(()=>resolveAllocation(ship,'abc',{'0':3,'1':0}),/Invalid spaces/);
 assert.throws(()=>resolveAllocation(ship,'abc',{'0':1,'1':0}),/exactly 2/);
 const r=resolveAllocation(ship,'abc',{'0':2,'1':0});
 assert.equal(r.pending,false);assert.equal(ship.stats.damageState.remaining.Weapons,2);
 assert.deepEqual(ship.stats.damageState.disabledWeapons,[0]);
 assert.equal(ship.stats.damageState.pendingAllocation,undefined);
});
test('damage penalty rules reflect engine, control and crew impairment',()=>{
 const ship={stats:{damageState:{impaired:{Engines:true,Control:true,Crew:true},destroyed:{}}}};
 const p=damagePenalty(ship);assert.equal(p.handling,-4);assert.equal(p.sensors,-4);assert.equal(p.training,-2);assert.equal(p.bab,-2);assert.equal(p.attack,-2);assert.equal(p.drifting,false);
 ship.stats.damageState.destroyed.Engines=true;assert.equal(damagePenalty(ship).drifting,true);
});
test('Tri-Star source catalogue remains intact',()=>{const t=SHIP_PRESETS.find(s=>s.id==='tri-star');assert.equal(t.stats.structure,52);assert.equal(t.stats.weapons.length,5);});
