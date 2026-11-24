import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponCritical,criticalCandidatesForTurn,applyWeaponCriticalEffects} from '../shared/vorchan-criticals.mjs';
import {initialVorchanDamage} from '../shared/vorchan-damage.mjs';
test('weapon critical d20 plus all damage boxes, with cumulative effects',()=>{
 assert.deepEqual(weaponCritical({systemId:'plasma_forward',roll:10,marked:4}).effects,['range_penalty_worsened']);
 assert.deepEqual(weaponCritical({systemId:'plasma_forward',roll:18,marked:4}).effects,['damage_minus_2_per_die_minimum_1']);
 assert.deepEqual(weaponCritical({systemId:'plasma_forward',roll:20,marked:5}).effects,['range_penalty_worsened','damage_minus_2_per_die_minimum_1']);
 assert.equal(weaponCritical({systemId:'plasma_forward',roll:8,marked:5}).requiresRuleClarification,true);
 assert.equal(weaponCritical({systemId:'plasma_forward',roll:20,marked:10}).eligible,false);
});
test('critical candidates are once per surviving damaged nonstructure system',()=>{
 const before=initialVorchanDamage(),after=structuredClone(before);
 after.tracks.plasma_forward.marked=3;after.tracks.forward_structure.marked=7;after.tracks.twin_nose_port.marked=6;
 const candidates=criticalCandidatesForTurn({before,after});
 assert.deepEqual(candidates.map(c=>c.systemId),['plasma_forward']);
});
test('range and damage penalties accumulate; individual damage dice floor at one',()=>{
 const x=applyWeaponCriticalEffects({rangePenaltyPerHex:-1,damageDice:[1,4,10],criticalEffects:['range_penalty_worsened','damage_minus_2_per_die_minimum_1','damage_minus_2_per_die_minimum_1']});
 assert.equal(x.rangePenaltyPerHex,-2);assert.deepEqual(x.damageDice,[1,1,6]);
});
