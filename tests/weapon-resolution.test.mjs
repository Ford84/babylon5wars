import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWeaponHistory,resolveVorchanShipFire} from '../shared/weapon-resolution.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
const make=(id,owner,q,facing)=>({id,owner_id:owner,q,r:0,facing,public_state:{libraryId:LIB.id},private_state:{trial:{libraryId:LIB.id,weaponReadiness:initialWeaponHistory(1),powerAllocation:{turn:1,deactivated:[]},ewAllocation:{turn:1,offensive:{},defensive:0}}}});
const ships=[make('a','p1',0,1),make('b','p2',4,4)];
ships[0].private_state.trial.ewAllocation.offensive.b=2;
const fire=[{playerId:'p1',fire:{shots:[{shipId:'a',mountId:'twin_nose_port',gun:1,role:'offensive',targetId:'b',order:1}]}}];
const args={turn:1,ships,declarations:fire,defences:[],rolls:[{attackId:'a:twin_nose_port:1',roll:10}],terrainVerified:true};
test('W4 hit calculation is deterministic and never mutates ship damage',()=>{
 const before=JSON.stringify(ships);
 const a=resolveVorchanShipFire(args),b=resolveVorchanShipFire(args);
 assert.deepEqual(a,b);assert.equal(a.results.length,1);assert.equal(a.results[0].blockers.length,0);
 assert.equal(a.results[0].roll,10);assert.equal(a.results[0].hit,typeof a.results[0].hit==='boolean');
 assert.equal(a.simultaneous,true);assert.equal(a.damageApplied,false);assert.equal(JSON.stringify(ships),before);
});
test('W4 fails closed without verified terrain or per-gun history',()=>{
 const blocked=resolveVorchanShipFire({...args,terrainVerified:false,rolls:[]});
 assert.equal(blocked.complete,false);assert.ok(blocked.results[0].blockers.some(x=>/terrain|line of sight/i.test(x)));assert.equal(blocked.results[0].roll,null);
 const noHistory=structuredClone(ships);delete noHistory[0].private_state.trial.weaponReadiness;
 const result=resolveVorchanShipFire({...args,ships:noHistory});
 assert.equal(result.complete,false);assert.match(result.results[0].blockers.join(' '),/arming history/);
});
test('W4 defensive interception applies a -2 penalty to the hit threshold',()=>{
 const blocked=resolveVorchanShipFire({...args,declarations:[...fire,{playerId:'p2',fire:{shots:[{shipId:'b',mountId:'twin_nose_port',gun:1,role:'defensive'}]}}],defences:[{playerId:'p2',defence:{assignments:[{shipId:'b',mountId:'twin_nose_port',gun:1,attackId:'a:twin_nose_port:1'}]}}]});
 assert.equal(blocked.complete,true);assert.equal(blocked.results[0].intercept.total,-2);assert.equal(blocked.results[0].targetNumber,args.terrainVerified?resolveVorchanShipFire(args).results[0].targetNumber-2:null);
});
test('W4 plasma charge requires full interval and same-turn double firing is impossible',()=>{
 const plasma={...fire[0].fire.shots[0],mountId:'plasma_forward',chargeTurns:3};
 const blocked=resolveVorchanShipFire({...args,declarations:[{playerId:'p1',fire:{shots:[plasma]}}]});
 assert.equal(blocked.complete,false);assert.match(blocked.results[0].blockers.join(' '),/charged/);
 const fired=structuredClone(ships);fired[0].private_state.trial.weaponReadiness.twin_nose_port[1].lastFiredTurn=1;
 const repeated=resolveVorchanShipFire({...args,ships:fired});
 assert.equal(repeated.complete,false);assert.match(repeated.results[0].blockers.join(' '),/not ready/);
});
