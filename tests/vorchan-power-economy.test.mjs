import test from 'node:test';import assert from 'node:assert/strict';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {vorchanPowerBudget} from '../shared/vorchan-power-economy.mjs';
import {commitVorchanPower} from '../shared/vorchan-preturn.mjs';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
const trial=()=>newVorchanTrialState('ship','owner',3,10,0);
test('working mounts release printed power and permit purchases beyond base surplus',()=>{
 const t=commitVorchanPower({trial:trial(),turn:1,purchasedThrust:4,deactivated:['plasma_forward']});
 assert.equal(t.powerAllocation.freedPower,5);
 assert.equal(t.powerAllocation.unusedPower,1);
 assert.equal(t.powerAllocation.availableThrust,14);
});
test('destroyed systems do not release power and shortage must be covered',()=>{
 assert.throws(()=>vorchanPowerBudget({trial:{...trial(),destroyedSystems:['plasma_forward']},turn:1,deactivated:['plasma_forward']}),/Destroyed/);
 assert.throws(()=>vorchanPowerBudget({trial:{...trial(),verifiedReactorPowerLoss:5},turn:1}),/shortage/);
 const t=vorchanPowerBudget({trial:{...trial(),verifiedReactorPowerLoss:5},turn:1,deactivated:['twin_forward_port']});
 assert.equal(t.availablePower,1);
});
test('engine losses reduce free thrust and destruction prevents powered manoeuvres',()=>{
 assert.equal(vorchanPowerBudget({trial:{...trial(),verifiedEngineThrustLoss:3},turn:1}).freeThrust,7);
 const dead={...trial(),destroyedSystems:['engine']};
 assert.equal(vorchanPowerBudget({trial:dead,turn:1}).availableThrust,0);
 assert.throws(()=>vorchanPowerBudget({trial:dead,turn:1,purchasedThrust:1}),/Destroyed engine/);
});
test('movement uses committed power rather than the original two-thrust purchase cap',()=>{
 const t=commitVorchanPower({trial:trial(),turn:1,purchasedThrust:4,deactivated:['plasma_forward']});
 const r=applyVorchanStage({ship:{q:3,r:10,facing:0,speed:0},privateState:{trial:t},action:{type:'speed',change:1,purchasedThrust:4,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}},turn:1});
 assert.equal(r.nextPrivateState.trial.movement.purchasedThrust,4);
});

test('Vorchan Warship SCS shows +4 extra power: two thrust purchased without deactivation',()=>{
 const t=vorchanPowerBudget({trial:trial(),turn:1,purchasedThrust:2});
 assert.equal(t.availablePower,4);
 assert.equal(t.requiredPower,4);
 assert.equal(t.unusedPower,0);
 assert.equal(t.freeThrust,10);
 assert.equal(t.availableThrust,12);
 assert.throws(()=>vorchanPowerBudget({trial:trial(),turn:1,purchasedThrust:3}),/Insufficient reactor power/);
});
