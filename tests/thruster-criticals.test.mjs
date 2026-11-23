import test from 'node:test';import assert from 'node:assert/strict';
import {effectiveThrusterRating,resolveOverthrustCritical,thrusterCostForOutput,overthrustChecksForTurn} from '../shared/thruster-criticals.mjs';
test('overthrust checks are once per thruster and add marked damage',()=>{
 const checks=overthrustChecksForTurn({port:{used:6,rating:5},aft:{used:5,rating:5}},{port:3});
 assert.deepEqual(checks,[{id:'port',used:6,rating:5,markedDamage:3,modifier:4,phase:'end-of-turn-actions'}]);
});
test('d20 critical thresholds and accumulated persistent effects',()=>{
 const base={id:'port',used:6,rating:5,markedDamage:0};
 assert.equal(resolveOverthrustCritical({...base,roll:10}).result,'none');
 const outlet=resolveOverthrustCritical({...base,roll:14});
 assert.equal(outlet.result,'outlet-failure');assert.equal(outlet.ratingAfterCritical,4);
 const efficiency=resolveOverthrustCritical({...base,roll:19});
 assert.equal(efficiency.result,'efficiency-reduced');assert.equal(efficiency.effects.efficiencyLosses,1);
 const both=resolveOverthrustCritical({...base,markedDamage:10,roll:20});
 assert.equal(both.result,'both');
 assert.equal(effectiveThrusterRating(3,{outletFailures:2}),1);
 assert.equal(thrusterCostForOutput(3,{outletFailures:1,efficiencyLosses:1}),7);
});
test('outlet failures may destroy a one-rating thruster',()=>{
 const result=resolveOverthrustCritical({id:'retro',used:2,rating:1,roll:14});
 assert.equal(result.destroyedByOutlet,true);
 assert.throws(()=>resolveOverthrustCritical({id:'retro',used:1,rating:1,roll:20}),/did not overthrust/);
});
