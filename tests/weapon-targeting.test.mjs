import test from 'node:test';
import assert from 'node:assert/strict';
import {bearingDegrees,facingDirections,checkMountArc,lineOfSight,weaponRangePenalty,vorchanTargetingPreview,resolveToHit,targetFireControlIndex} from '../shared/weapon-targeting.mjs';
import {auditVorchanWeapons,vorchanWeaponInventory,weaponReadiness} from '../shared/weapon-readiness.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
const shooter={id:'a',q:0,r:0,facing:1,libraryId:LIB.id,hullClass:'heavy_combat'};
const target={id:'b',q:3,r:0,facing:4,libraryId:LIB.id,hullClass:'heavy_combat'};
const arc={verified:true,start:330,end:30};
test('SCS W1 confirms one plasma and two twin-array mounts with 5 potential individual guns',()=>{
 const audit=auditVorchanWeapons();
 assert.equal(audit.inventory.length,3);
 assert.equal(audit.inventory.reduce((n,m)=>n+m.individualGuns,0),5);
 assert.equal(audit.readyForAutomaticFire,false);
 assert.ok(audit.problems.some(x=>x.includes('arc')));
});
test('weapon readiness is blocked when historical arming data or SCS arc is unknown',()=>{
 const r=weaponReadiness({mountId:'plasma_forward',turn:2,trial:{libraryId:LIB.id},chargeTurns:2});
 assert.equal(r.ready,false);assert.ok(r.reasons.some(x=>x.includes('arming')));
 assert.throws(()=>weaponReadiness({mountId:'twin_nose_port',turn:1,trial:{libraryId:LIB.id},gun:3}),/gun/);
});
test('axial geometry uses same facing convention as movement and distinguishes front, sides and aft',()=>{
 assert.equal(bearingDegrees(shooter,target).angle,0);
 assert.equal(facingDirections(target,shooter).direction,'forward');
 assert.equal(facingDirections({...shooter,q:0,r:0},{...target,q:2,r:0,facing:1}).direction,'aft');
 assert.equal(facingDirections({...shooter,q:0,r:0},{...target,q:0,r:2,facing:1}).direction,'port');
});
test('verified firing arc includes edges; unverified arcs fail closed',()=>{
 assert.equal(checkMountArc({shooter,target,arc}).allowed,true);
 assert.equal(checkMountArc({shooter,target,arc:null}).allowed,false);
 assert.equal(checkMountArc({shooter,target:{...target,q:-3},arc}).allowed,false);
});
test('LOS blocks touching obstacle hex, not unrelated ships',()=>{
 assert.equal(lineOfSight({shooter,target,blockingHexes:[{q:1,r:0}]}).clear,false);
 assert.equal(lineOfSight({shooter,target,blockingHexes:[{q:1,r:2}]}).clear,true);
});
test('range fractions round up and fire-control selects target size',()=>{
 assert.equal(weaponRangePenalty({range:7,penaltyPerStep:-1,hexesPerStep:3}),-3);
 assert.deepEqual(['heavy_combat','medium','fighter'].map(targetFireControlIndex),[0,1,2]);
});
test('Vorchan preview blocks missing official arcs; verified geometry gives transparent EW and d20 results',()=>{
 const pending=vorchanTargetingPreview({shooter,target,mountId:'plasma_forward',attackerOffensiveEW:2,targetDefensiveEW:1});
 assert.equal(pending.readyForHitRoll,false);
 assert.ok(pending.blockers.some(x=>x.includes('arc')));
 const ready=vorchanTargetingPreview({shooter,target,mountId:'plasma_forward',arc,attackerOffensiveEW:2,targetDefensiveEW:1});
 assert.equal(ready.readyForHitRoll,true);
 assert.equal(ready.breakdown.total,12+3+2-1-3);
 assert.equal(resolveToHit(ready,13).hit,false);
 assert.equal(resolveToHit(ready,12).hit,true);
 const noLock=vorchanTargetingPreview({shooter,target,mountId:'plasma_forward',arc});
 assert.equal(noLock.breakdown.rangePenalty,-6);
});
test('same-hex and defender direction choices must be resolved explicitly',()=>{
 const same=vorchanTargetingPreview({shooter,target:{...target,q:0,r:0},mountId:'plasma_forward',arc});
 assert.equal(same.readyForHitRoll,false);
 assert.ok(same.blockers.length>0);
 assert.throws(()=>resolveToHit(same,1),/not validated/);
});
