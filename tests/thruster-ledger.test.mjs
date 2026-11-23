import test from 'node:test';
import assert from 'node:assert/strict';
import {createThrusterLedger,allocateThrusterThrust,pendingOverthrustChecks,resetThrusterLedger} from '../shared/thruster-ledger.mjs';
test('per-thruster use is cumulative and never mutates original',()=>{
 const base=createThrusterLedger({aft_port:5,aft_starboard:5,port:3});
 const a=allocateThrusterThrust(base,{aft_port:4,aft_starboard:4},{availableThrust:12});
 assert.equal(a.spent,8);assert.equal(a.remaining,4);assert.equal(base.aft_port.used,0);
 const b=allocateThrusterThrust(a.ledger,{aft_port:3},{availableThrust:12,alreadySpent:8});
 assert.equal(b.ledger.aft_port.used,7);assert.equal(b.remaining,1);
 assert.deepEqual(pendingOverthrustChecks(b.ledger,{aft_port:2}),[{id:'aft_port',overthrust:2,criticalModifier:4,step:'post-turn'}]);
 assert.equal(resetThrusterLedger(b.ledger).aft_port.used,0);
});
test('individual twice-rating cap is independent of total engine thrust',()=>{
 const base=createThrusterLedger({port:3,aft:5});
 assert.throws(()=>allocateThrusterThrust(base,{port:7},{availableThrust:20}),/twice/);
 assert.throws(()=>allocateThrusterThrust(base,{port:5,aft:5},{availableThrust:9}),/Insufficient/);
 assert.throws(()=>allocateThrusterThrust(base,{unknown:1},{availableThrust:20}),/Unknown/);
});
test('at-rating use does not trigger overthrust',()=>{
 const base=createThrusterLedger({port:3});
 const result=allocateThrusterThrust(base,{port:3},{availableThrust:10});
 assert.deepEqual(result.overthrustChecks,[]);
});
