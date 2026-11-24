import test from 'node:test';
import assert from 'node:assert/strict';
import {attackCalculation,damageCalculation} from '../shared/roll-presentation.mjs';
import {vorchanTargetingPreview} from '../shared/weapon-targeting.mjs';
import {rollVorchanDamage} from '../shared/vorchan-damage.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
const shooter={id:'a',q:0,r:0,facing:1,libraryId:LIB.id,hullClass:LIB.class};
const target={...shooter,id:'b',q:3,facing:4};
test('running hit calculation includes range, EW, fire control, condition and interception',()=>{
 const p=vorchanTargetingPreview({shooter,target,mountId:'plasma_forward',attackerOffensiveEW:8,targetDefensiveEW:3,otherModifiers:[{value:-1,reason:'Condition',verified:true}]});
 const steps=attackCalculation({breakdown:p.breakdown,intercept:{total:-2}});
 assert.deepEqual(steps,['Defence (12)','−1 Per Hex × 3 (9)','OEW +8 (17)','DEW −3 (14)','Fire Control +3 (17)','Condition / Other −1 (16)','Interception −2 (14)']);
 assert.equal(p.hitOnD20AtOrBelow-2,14);
 const noLock=vorchanTargetingPreview({shooter,target,mountId:'plasma_forward'});
 assert.equal(attackCalculation({breakdown:noLock.breakdown})[1],'−2 Per Hex × 3 · No Lock-On (6)');
 assert.equal(attackCalculation({breakdown:noLock.breakdown}).at(-1),`Fire Control +3 (${noLock.hitOnD20AtOrBelow})`);
});
test('damage formula exposes fixed bonus and range loss for every plasma strength',()=>{
 for(const [chargeTurns,count,bonus] of [[1,1,4],[2,2,8],[3,4,12]]){
  const r=rollVorchanDamage({mountId:'plasma_forward',chargeTurns,dice:Array(count).fill(8),range:3});
  const d=damageCalculation(r);assert.equal(d.formula,`${count}d10 + ${bonus} − 3 Range`);assert.ok(d.arithmetic.endsWith(`= ${r.damage}`));assert.equal(r.damage,count*8+bonus-3);
 }
 const twin=rollVorchanDamage({mountId:'twin_nose_port',dice:[7],range:3});
 assert.equal(damageCalculation(twin).formula,'1d10 + 4');assert.equal(damageCalculation(twin).arithmetic,'7 + 4 = 11');
});
test('critical damage presentation uses adjusted dice with minimum one and retains the fixed bonus',()=>{
 const r=rollVorchanDamage({mountId:'plasma_forward',chargeTurns:2,dice:[1,8],damageLoss:2,range:30});
 const d=damageCalculation(r);assert.equal(r.raw,15);assert.equal(r.damage,0);assert.equal(d.arithmetic,'1 + 6 + 8 − 30 = 0 (Minimum 0)');assert.match(d.penalty,/Minimum 1/);
 // Existing saved volleys lacking metadata remain readable without inventing modifiers.
 assert.equal(damageCalculation({dice:[7],damage:11}).arithmetic,'7 · Total 11');
});
