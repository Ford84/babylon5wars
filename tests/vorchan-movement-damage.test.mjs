import test from 'node:test';import assert from 'node:assert/strict';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {adjudicateVorchanMovementDamage,assertVorchanMovementDamageConsistent} from '../shared/vorchan-movement-damage.mjs';
import {vorchanPowerBudget} from '../shared/vorchan-power-economy.mjs';
import {createThrusterLedger,allocateThrusterThrust} from '../shared/thruster-ledger.mjs';
test('adjudicated engine damage reduces available thrust without fabricating damage tracks',()=>{
 let trial=newVorchanTrialState('a','b',2,3,0);
 trial=adjudicateVorchanMovementDamage(trial,{systemId:'engine',markedBoxes:3,engineThrustLoss:2});
 assert.equal(vorchanPowerBudget({trial,turn:1}).freeThrust,8);
 assert.equal(trial.systemDamage.engine,3);
});
test('destroyed thruster has zero channel capacity',()=>{
 let trial=newVorchanTrialState('a','b',2,3,0);
 trial=adjudicateVorchanMovementDamage(trial,{systemId:'port_thrust',markedBoxes:5,destroyed:true});
 assertVorchanMovementDamageConsistent(trial);
 const ledger=createThrusterLedger({port_thrust:0});
 assert.throws(()=>allocateThrusterThrust(ledger,{port_thrust:1},{availableThrust:10}),/twice/);
});
test('unknown system and unverified reactor losses are rejected',()=>{
 const trial=newVorchanTrialState('a','b',2,3,0);
 assert.throws(()=>adjudicateVorchanMovementDamage(trial,{systemId:'unmapped'}),/Unknown/);
 assert.throws(()=>adjudicateVorchanMovementDamage(trial,{systemId:'port_thrust',reactorPowerLoss:1}),/wrong system/);
});
