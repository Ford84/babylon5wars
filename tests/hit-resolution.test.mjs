import test from 'node:test';import assert from 'node:assert/strict';
import {resolveChartHit,planHitResolution,applyVerifiedSystemDamage,rollD20} from '../shared/hit-resolution.mjs';
import {CENTAURI_HIT_CHARTS} from '../shared/centauri-combat-data.mjs';
const p=CENTAURI_HIT_CHARTS['centauri-primus-v3-2e-sf'];
test('Primus forward hit primary rerolls on primary chart',()=>{
 const result=resolveChartHit({charts:p,section:'forward',roll:19,primaryRoll:()=>20});
 assert.equal(result.location,'command');assert.deepEqual(result.history.map(h=>h.chart),['forward','primary']);
 assert.throws(()=>resolveChartHit({charts:p,section:'side',roll:20}),/Primary reroll required/);
});
test('independent raking subvolleys each roll hit locations',()=>{
 const r=planHitResolution({charts:p,volleys:[{section:'forward',damage:10},{section:'forward',damage:5}],rollD20:(()=>{let i=0;return ()=>[4,8][i++];})()});
 assert.deepEqual(r.map(x=>x.location),['twin_array','forward_structure']);assert.ok(r.every(x=>!x.damageApplied&&x.requiresSystemSelection));
});
test('damage is bounded by verified boxes and excess is reported',()=>{
 const s={engine:{boxes:5,armour:2,damage:3}};
 const a=applyVerifiedSystemDamage({systems:s,systemId:'engine',amount:9,armour:2});
 assert.deepEqual(a.result,{systemId:'engine',armourAbsorbed:2,penetrating:7,marked:2,excess:5,destroyed:true});
 assert.equal(s.engine.damage,3);assert.equal(a.systems.engine.damage,5);
 assert.throws(()=>applyVerifiedSystemDamage({systems:s,systemId:'unknown',amount:2}));
});
test('d20 rejects biased bytes and accepts uniform 0..239',()=>{let i=0;assert.equal(rollD20(a=>{a[0]=[255,239][i++];}),20);});
