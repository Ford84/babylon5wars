import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3,Euler} from 'three';
import {advanceHex} from '../shared/movement-rules.mjs';
import {hexWorld} from '../shared/map-camera.mjs';
import {facingSVGDegrees,facingYawRadians,FACING_NAMES} from '../shared/ship-facing.mjs';
test('all six rendered noses point through the edge towards the next movement hex',()=>{
 for(let f=0;f<6;f++){
  const next=advanceHex({q:0,r:0},f),p=hexWorld(next.q,next.r),n=Math.hypot(p.x,p.z),angle=facingSVGDegrees(f)*Math.PI/180;
  assert.ok(Math.abs(Math.sin(angle)-p.x/n)<1e-12);assert.ok(Math.abs(-Math.cos(angle)-p.z/n)<1e-12);
  const nose=new Vector3(0,0,-1).applyAxisAngle(new Vector3(0,1,0),facingYawRadians(f));
  assert.ok(Math.abs(nose.x-p.x/n)<1e-12);assert.ok(Math.abs(nose.z-p.z/n)<1e-12);
 }
 assert.equal(FACING_NAMES.length,6);
});
test('STL forward axis is normalised to the same nose direction as the fallback model',()=>{
 const nose=new Vector3(0,-1,0).applyEuler(new Euler(-Math.PI/2,0,Math.PI));
 assert.ok(nose.distanceTo(new Vector3(0,0,-1))<1e-12);
});
