import test from 'node:test';import assert from 'node:assert/strict';
import {newStagedMovement,stagedMove} from '../shared/staged-movement.mjs';
const limits={availableThrust:10,accelCost:2};
test('slide consumes one movement hex and thrust without changing facing',()=>{
 let s=newStagedMovement({q:5,r:5,facing:0,speed:4});
 s=stagedMove(s,{type:'slide',direction:1,cost:1},limits);
 assert.equal(s.remaining,3);assert.equal(s.facing,0);assert.deepEqual([s.q,s.r],[6,5]);
 assert.throws(()=>stagedMove(s,{type:'slide',direction:1,cost:1},limits),/Slide direction/);
 s=stagedMove(s,{type:'advance',hexes:1},limits);
 s=stagedMove(s,{type:'slide',direction:1,cost:1},limits);
 assert.equal(s.remaining,1);
 assert.throws(()=>stagedMove(s,{type:'slide',direction:-1,cost:1},limits),/Slide direction/);
});
test('slides count towards turn delay',()=>{
 let s=newStagedMovement({q:5,r:5,facing:0,speed:4});
 s=stagedMove(s,{type:'turn',direction:1,cost:1,delay:2},limits);
 s=stagedMove(s,{type:'slide',direction:1,cost:1},limits);
 assert.equal(s.turnDelayRemaining,1);
});
