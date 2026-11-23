import test from 'node:test';import assert from 'node:assert/strict';
import {manoeuvreIncrementalEngineCost} from '../shared/thruster-criticals.mjs';
import {resolveVorchanOverthrust} from '../shared/vorchan-overthrust-phase.mjs';
test('outlet failure charges once per thruster per turn; efficiency per delivered point',()=>{
 const fx={port:{outletFailures:1,efficiencyLosses:1}};
 assert.equal(manoeuvreIncrementalEngineCost({port:2},{port:{used:0,rating:4}},fx),5);
 assert.equal(manoeuvreIncrementalEngineCost({port:1},{port:{used:2,rating:4}},fx),2);
 assert.equal(manoeuvreIncrementalEngineCost({port:0},{port:{used:0,rating:4}},fx),0);
});
test('critical barrier resolves each overthrusted thruster exactly once',()=>{
 const trial={libraryId:'centauri-vorchan-v3-2e-sf',movement:{turn:3,thrusterLedger:{port:{rating:5,used:6},aft:{rating:5,used:5}}},thrusterDamageBoxes:{port:2}};
 let calls=0;const roll=()=>{calls++;return 12};
 const first=resolveVorchanOverthrust(trial,3,roll);
 assert.equal(calls,1);assert.equal(first.results.length,1);
 assert.equal(first.results[0].modifiedRoll,15);
 assert.equal(first.trial.thrusterCriticalEffects.port.outletFailures,1);
 const second=resolveVorchanOverthrust(first.trial,3,roll);
 assert.equal(calls,1);assert.equal(second.results.length,0);
 assert.equal(first.trial.overthrustHistory.length,1);
});
