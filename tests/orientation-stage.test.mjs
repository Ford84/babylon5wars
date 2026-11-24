import {movementHeading} from '../shared/movement-rules.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {pivotStart,pivotHalt,rollStart,rollHalt,orientationAtMovementStart} from '../shared/orientation-stage.mjs';
test('pivot changes facing without changing motion heading',()=>{const base={turn:1,facing:0,motionFacing:0,rolled:false};const p=pivotStart(base,{direction:1,cost:2,thrusterPair:'forward-port'});assert.equal(p.facing,1);assert.equal(p.motionFacing,0);assert.throws(()=>pivotStart(p,{direction:1,cost:2,thrusterPair:'forward-port'}));const halted=pivotHalt(p,{cost:2,thrusterPair:'aft-port'});assert.equal(halted.pivotInProgress,false);assert.equal(halted.pivotActive,true);});
test('ongoing pivot shifts facing next turn',()=>{const p=pivotStart({turn:1,facing:0,motionFacing:0,rolled:false},{direction:1,cost:2,thrusterPair:'forward-port'});assert.equal(orientationAtMovementStart(p,2).facing,2);});
test('ordinary roll flips at next movement step, then can halt',()=>{const r=rollStart({turn:1,facing:0,rolled:false},1);assert.throws(()=>rollHalt(r,1));const next=orientationAtMovementStart(r,2);assert.equal(next.rolled,true);assert.equal(rollHalt(next,1).rollInProgress,false);});

test('halting a 180-degree pivot changes to reverse speed while preserving physical travel',()=>{
 for(const speed of [3,-3]){
  let p=pivotStart({turn:1,facing:0,motionFacing:0,speed},{direction:1,cost:2,thrusterPair:'forward-port'});p=orientationAtMovementStart(p,2);p=orientationAtMovementStart(p,3);
  const heading=movementHeading(p),halted=pivotHalt(p,{cost:2,thrusterPair:'aft-port'});assert.equal(halted.facing,3);assert.equal(halted.motionFacing,3);assert.equal(halted.speed,-speed);assert.equal(halted.pivotActive,false);assert.equal(movementHeading(halted),heading);
 }
});
test('a stopped pivot may restart on a later turn but never twice in the same turn',()=>{
 let p=pivotStart({turn:1,facing:0,motionFacing:0,speed:3},{direction:1,cost:2,thrusterPair:'forward-port'});p=pivotHalt(p,{cost:2,thrusterPair:'aft-port'});
 assert.throws(()=>pivotStart(p,{direction:1,cost:2,thrusterPair:'forward-port'}));p=orientationAtMovementStart(p,2);const again=pivotStart(p,{direction:1,cost:2,thrusterPair:'forward-port'});assert.equal(again.facing,2);assert.equal(again.motionFacing,0);
});
