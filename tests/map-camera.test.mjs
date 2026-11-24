import test from 'node:test';
import assert from 'node:assert/strict';
import {mapCameraTarget,hexWorld} from '../shared/map-camera.mjs';
const ships=[{id:'a',q:3,r:10},{id:'b',q:18,r:28}];
const view={zoom:4,focusId:'a',panX:0,panZ:0};
test('camera focus follows the chosen ship as it moves and supports pan offsets',()=>{
 assert.deepEqual(mapCameraTarget(view,ships,20,32),hexWorld(3,10));
 assert.deepEqual(mapCameraTarget({...view,focusId:'b'},ships,20,32),hexWorld(18,28));
 assert.deepEqual(mapCameraTarget(view,[{id:'a',q:4,r:9}],20,32),hexWorld(4,9));
 const p=hexWorld(3,10);assert.deepEqual(mapCameraTarget({...view,panX:25,panZ:-12},ships,20,32),{x:p.x+25,z:p.z-12});
});
test('whole-map reset and absent or off-board ships fall back to board centre',()=>{
 for(const focusId of [null,'missing','out'])assert.deepEqual(mapCameraTarget({...view,focusId},[...ships,{id:'out',q:99,r:99}],20,32),hexWorld(9.5,15.5));
});
