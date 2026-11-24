import test from 'node:test';import assert from 'node:assert/strict';
import {advanceHex} from '../shared/movement-rules.mjs';
import {hexWorld} from '../shared/map-camera.mjs';
import {facingSVGDegrees,facingYawRadians,FACING_NAMES} from '../shared/ship-facing.mjs';
test('all six rendered noses point through the edge towards the next movement hex',()=>{
 for(let f=0;f<6;f++){
  const next=advanceHex({q:0,r:0},f),p=hexWorld(next.q,next.r),n=Math.hypot(p.x,p.z),angle=facingSVGDegrees(f)*Math.PI/180;
  assert.ok(Math.abs(Math.sin(angle)-p.x/n)<1e-12);assert.ok(Math.abs(-Math.cos(angle)-p.z/n)<1e-12);
  const yaw=facingYawRadians(f),nose={x:-Math.sin(yaw),z:-Math.cos(yaw)};
  assert.ok(Math.abs(nose.x-p.x/n)<1e-12);assert.ok(Math.abs(nose.z-p.z/n)<1e-12);
 }
 assert.equal(FACING_NAMES.length,6);
});
