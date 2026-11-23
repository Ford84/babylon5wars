import test from 'node:test';import assert from 'node:assert/strict';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
function setup(){return {ship:{q:3,r:10,facing:0,speed:6},privateState:{trial:newVorchanTrialState('a','p',3,10,0)}};}
test('extended turn deposits at least 25%, does not rotate until following turn',()=>{
 const {ship,privateState}=setup();
 const a=applyVorchanStage({ship,privateState,turn:1,action:{type:'extended-start',direction:1,initialThrust:1,thrusters:{aft_port_thrust:1}}});
 assert.equal(a.nextShip.facing,0);
 assert.equal(a.movement.extendedTurn.totalCost,3);
 assert.throws(()=>applyVorchanStage({ship:{...ship,...a.nextShip},privateState:a.nextPrivateState,turn:1,action:{type:'turn',direction:1,thrusters:{aft_port_thrust:2,port_thrust:1}}}),/Extended turn/);
});
test('extended turn completes before next-turn movement, charges remaining thrust and then rotates',()=>{
 const {ship,privateState}=setup();
 let a=applyVorchanStage({ship,privateState,turn:1,action:{type:'extended-start',direction:1,initialThrust:1,thrusters:{aft_port_thrust:1}}});
 let s={...ship,...a.nextShip},p=a.nextPrivateState;
 a=applyVorchanStage({ship:s,privateState:p,turn:1,action:{type:'advance',hexes:6}});s={...s,...a.nextShip};p=a.nextPrivateState;
 assert.throws(()=>applyVorchanStage({ship:s,privateState:p,turn:2,action:{type:'advance',hexes:1}}),/Complete extended turn/);
 const complete=applyVorchanStage({ship:s,privateState:p,turn:2,action:{type:'extended-complete',thrusters:{aft_port_thrust:1,port_thrust:1}}});
 assert.equal(complete.nextShip.facing,1);
 assert.equal(complete.movement.extendedTurn,null);
 assert.equal(complete.movement.thrustSpent,2);
});
