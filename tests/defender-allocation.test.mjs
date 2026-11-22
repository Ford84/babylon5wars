import test from 'node:test';import assert from 'node:assert/strict';import app,{SHIP_PRESETS,resolveAllocation,damagePenalty,applyDamageControl} from '../worker/index.mjs';
test('defender allocation controls appear in deployed page source',async()=>{const r=await app.fetch(new Request('https://test.invalid/'),{DB:{}});const html=await r.text();assert.match(html,/Defender weapon allocation/);assert.match(html,/data-weapon/);assert.match(html,/\/allocate/);});
test('weapon damage cannot be assigned to invalid mount or exceed remaining capacity',()=>{
 const ship={stats:{training:5,weapons:[{name:'A',spaces:2,arc:'fore',offence:10},{name:'B',spaces:2,arc:'fore',offence:10}],technicalSkills:{engineering:8,electronics:8,mechanical:8},damageState:{remaining:{Weapons:4},weaponDamage:{},disabledWeapons:[],impairedWeapons:[],pendingAllocation:{id:'abc',arc:'fore',roll:9,amount:2,overflow:0,choices:[{index:0,name:'A',remaining:2},{index:1,name:'B',remaining:2}],events:[]}}}};
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

test('all 30 preloaded ships have complete individual weapon spaces matching printed structural totals',()=>{
 assert.equal(SHIP_PRESETS.length,30);let mounts=0;for(const ship of SHIP_PRESETS){const pool=Number(ship.stats.structuralAreas.match(/Weapons\\s+(\\d+)/i)?.[1]||0);const sum=ship.stats.weapons.reduce((n,w)=>{assert.ok(Number.isInteger(w.spaces)&&w.spaces>0,ship.id);mounts++;return n+w.spaces},0);assert.equal(sum,pool,ship.id)}assert.equal(mounts,125);
});
test('brace, route, emergency restoration and hold obey prerequisites and round limits',()=>{
 const ship={remaining:2,stats:{structure:5,training:4,operationsSystems:100,technicalSkills:{engineering:100,electronics:100,mechanical:100},features:'Jump Point',structuralAreas:'Control 2, Engine 2, Weapons 1',weapons:[{name:'A',arc:'fore',spaces:1}],damageState:{initial:{Engines:2,Control:2,Crew:0,Cargo:0,Hangar:0,Weapons:1},remaining:{Engines:0,Control:0,Crew:0,Cargo:0,Hangar:0,Weapons:1},impaired:{},destroyed:{Engines:true,Control:true},disabledWeapons:[],impairedWeapons:[],weaponDamage:{},destroyedFeatures:[],weaponsByArc:{fore:[0],port:[],starboard:[],aft:[],turret:[]}}}};
 assert.throws(()=>applyDamageControl(ship,'online',{area:'Engines'},1),/Route Control first/);
 const routed=applyDamageControl(ship,'route',{},1);assert.equal(routed.check.success,true);assert.equal(ship.stats.damageState.remaining.Control,1);
 assert.throws(()=>applyDamageControl(ship,'route',{},1),/destroyed Control/);
 const repaired=applyDamageControl(ship,'online',{area:'Engines'},1);assert.equal(repaired.check.success,true);assert.equal(ship.stats.damageState.remaining.Engines,1);
 assert.throws(()=>applyDamageControl(ship,'online',{area:'Engines'},1),/already received/);
 const brace=applyDamageControl(ship,'brace',{},1);assert.equal(brace.braceActive,true);
 assert.throws(()=>applyDamageControl(ship,'brace',{},1),/once per round/);
});
