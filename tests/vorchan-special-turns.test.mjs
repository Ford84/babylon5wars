import test from 'node:test';import assert from 'node:assert/strict';
import {turnCostAtSpeed,vorchanTurnDelayAtSpeed,newStagedMovement,stagedMove} from '../shared/staged-movement.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
test('stationary turn costs one thrust and creates zero delay',()=>{
 assert.equal(turnCostAtSpeed(0,LIB.turnCost),1);
 assert.equal(vorchanTurnDelayAtSpeed(0,LIB.turnDelay),0);
 const trial={libraryId:LIB.id};
 const r=applyVorchanStage({ship:{q:3,r:10,facing:0,speed:0},privateState:{trial},turn:1,action:{type:'turn',direction:1,thrusters:{aft_port_thrust:1}}});
 assert.equal(r.nextShip.facing,1);
 assert.equal(r.movement.turnDelayRemaining,0);
});
test('fractional rule extends verified Vorchan tables beyond speed twelve',()=>{
 assert.equal(turnCostAtSpeed(15,LIB.turnCost),8);
 assert.equal(vorchanTurnDelayAtSpeed(15,LIB.turnDelay),5);
 assert.equal(turnCostAtSpeed(-13,LIB.turnCost),7);
});
test('shortened turn pays extra thrust immediately and records reduced delay',()=>{
 const state=newStagedMovement({q:3,r:10,facing:0,speed:9});
 const r=stagedMove(state,{type:'turn',direction:1,cost:5,delay:3,shortenBy:2},{availableThrust:10,accelCost:2});
 assert.equal(r.thrustSpent,7);assert.equal(r.turnDelayRemaining,1);
 assert.equal(r.history.at(-1).shortenBy,2);
 assert.throws(()=>stagedMove(state,{type:'turn',direction:1,cost:5,delay:3,shortenBy:3},{availableThrust:10,accelCost:2}),/shortening/);
});
