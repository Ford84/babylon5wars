import test from 'node:test';
import assert from 'node:assert/strict';
import {pivotStart,pivotHalt,rollStart,rollHalt,orientationAtMovementStart} from '../shared/orientation-stage.mjs';
import {newStagedMovement,stagedMove} from '../shared/staged-movement.mjs';
import {validateManoeuvreThrusters} from '../shared/manoeuvre-thrusters.mjs';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
const base=(speed=3)=>({...newStagedMovement({q:4,r:10,facing:0,speed}),turn:1});
test('reverse speed advances opposite facing and reverse side thrust is enforced',()=>{
 const s=base(-2);const next=stagedMove(s,{type:'advance',hexes:1},{availableThrust:10,accelCost:2});
 assert.equal(next.remaining,1);assert.equal(next.facing,0);
 assert.throws(()=>validateManoeuvreThrusters({action:{type:'slide',direction:1},oldState:s,cost:1,allocation:{port_thrust:1}}),/not eligible/);
 assert.equal(validateManoeuvreThrusters({action:{type:'slide',direction:1},oldState:s,cost:1,allocation:{starboard_thrust:1}}),true);
});
test('pivot requires directional starting pair and opposite stopping pair',()=>{
 const s=base();
 assert.throws(()=>pivotStart(s,{direction:1,cost:2,thrusterPair:'forward-starboard'}),/Wrong pivot/);
 const a=pivotStart(s,{direction:1,cost:2,thrusterPair:'forward-port'});
 assert.equal(a.facing,1);assert.equal(a.motionFacing,0);
 assert.throws(()=>pivotHalt(a,{cost:2,thrusterPair:'aft-starboard'}),/Opposing/);
 const b=pivotHalt(a,{cost:2,thrusterPair:'aft-port'});
 assert.equal(b.pivotInProgress,false);
});
test('roll flips on next turn and cannot halt in starting turn',()=>{
 const a=rollStart(base(),1);
 assert.throws(()=>rollHalt(a,1),/next turn/);
 const b=orientationAtMovementStart(a,2);
 assert.equal(b.rolled,true);
 assert.equal(rollHalt(b,1).rollInProgress,false);
});
test('slide direction cannot reverse and a normal advance is required between slides',()=>{
 const limits={availableThrust:10,accelCost:2};
 const a=stagedMove(base(3),{type:'slide',direction:1,cost:1},limits);
 assert.throws(()=>stagedMove(a,{type:'slide',direction:1,cost:1},limits),/interval/);
 const b=stagedMove(a,{type:'advance',hexes:1},limits);
 assert.throws(()=>stagedMove(b,{type:'slide',direction:-1,cost:1},limits),/direction/);
});
test('extended turn cannot be cancelled voluntarily',()=>{
 const ship={q:4,r:10,facing:0,speed:6};const trial=newVorchanTrialState('a','b',4,10,0);
 const a=applyVorchanStage({ship,privateState:{trial},turn:1,action:{type:'extended-start',direction:1,initialThrust:1,thrusters:{aft_port_thrust:1}}});
 const b=applyVorchanStage({ship,privateState:a.nextPrivateState,turn:1,action:{type:'advance',hexes:6}});
 assert.throws(()=>applyVorchanStage({ship:{...ship,...b.nextShip},privateState:b.nextPrivateState,turn:2,action:{type:'extended-cancel',thrusters:{}}}),/Voluntary/);
});

test('pivoted ship may turn into motion direction, but not away from it',()=>{
 const s={...base(3),facing:1,motionFacing:0,pivotActive:true,pivotInProgress:false};
 const limits={availableThrust:10,accelCost:2};
 assert.throws(()=>stagedMove(s,{type:'turn',direction:1,cost:2,delay:1},limits),/turn into/);
 const aligned=stagedMove(s,{type:'turn',direction:-1,cost:2,delay:1},limits);
 assert.equal(aligned.pivotActive,false);
 assert.equal(aligned.facing,0);
 assert.equal(aligned.motionFacing,0);
});
