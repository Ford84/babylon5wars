import test from 'node:test';import assert from 'node:assert/strict';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
function setup(){const trial=newVorchanTrialState('a','p',3,10,0);return {ship:{id:'a',q:3,r:10,facing:0,speed:0},privateState:{trial}};}
test('player chooses speed, then advances in independently committed segments',()=>{let {ship,privateState}=setup();for(const action of [{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}},{type:'advance',hexes:1}]){const r=applyVorchanStage({ship,privateState,action,turn:1});ship={...ship,...r.nextShip};privateState=r.nextPrivateState;}assert.equal(privateState.trial.movement.state.remaining,0);assert.equal(privateState.trial.movement.state.history.length,2);});
test('turn cost is derived server-side and untrusted cost is rejected',()=>{const {ship,privateState}=setup();assert.throws(()=>applyVorchanStage({ship,privateState,action:{type:'turn',direction:1,cost:0},turn:1}),/Client cannot/);});
test('movement allows ordinary ship stacking but rejects excessive power purchases',()=>{const {ship,privateState}=setup();assert.throws(()=>applyVorchanStage({ship,privateState,action:{type:'speed',change:1,purchasedThrust:3,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}},turn:1}),/pre-turn power phase/);const r=applyVorchanStage({ship,privateState,action:{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}},turn:1});assert.doesNotThrow(()=>applyVorchanStage({ship:{...ship,...r.nextShip},privateState:r.nextPrivateState,action:{type:'advance',hexes:1},turn:1,otherShips:[{id:'b',q:4,r:9}]}));});

test('staged movement persists separate physical thruster spending and resets next turn',()=>{
 let {ship,privateState}=setup();
 const r=applyVorchanStage({ship,privateState,action:{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}},turn:1});
 assert.equal(r.nextPrivateState.trial.movement.thrusterLedger.aft_port_thrust.used,1);
 assert.equal(r.nextPrivateState.trial.movement.thrusterLedger.aft_starboard_thrust.used,1);
 assert.deepEqual(r.nextPrivateState.trial.movement.pendingOverthrustChecks,[]);
 assert.throws(()=>applyVorchanStage({ship,privateState,action:{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:2,aft_starboard_thrust:1}},turn:1}),/exactly equal/);
 assert.throws(()=>applyVorchanStage({ship,privateState,action:{type:'speed',change:1,purchasedThrust:0},turn:1}),/exactly equal/);
 const moved=applyVorchanStage({ship:{...ship,...r.nextShip},privateState:r.nextPrivateState,action:{type:'advance',hexes:1},turn:1});
 assert.equal(moved.nextPrivateState.trial.movement.thrusterLedger.aft_port_thrust.used,1);
});
