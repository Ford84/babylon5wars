import test from 'node:test';
import assert from 'node:assert/strict';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {commitVorchanPower,commitVorchanEW,VORCHAN_SENSOR_STRENGTH} from '../shared/vorchan-preturn.mjs';
const trial=()=>newVorchanTrialState('s','p',3,10,0);
test('eight sensor EW and four spare power: first extra EW costs nine power',()=>{
 assert.equal(VORCHAN_SENSOR_STRENGTH,8);
 let t=commitVorchanPower({trial:trial(),turn:1,purchasedThrust:2});
 assert.equal(t.powerAllocation.unusedPower,0);
 assert.throws(()=>commitVorchanPower({trial:trial(),turn:1,extraEW:1}),/Insufficient/);
 t=commitVorchanPower({trial:trial(),turn:1,extraEW:1,deactivated:['plasma_forward']});
 assert.equal(t.powerAllocation.ewPower,9);
 assert.equal(t.powerAllocation.unusedPower,0);
});
test('EW allocation is private, bounded and enemy-targeted',()=>{
 let t=commitVorchanPower({trial:trial(),turn:1,extraEW:1,deactivated:['plasma_forward']});
 t=commitVorchanEW({trial:t,turn:1,defensive:4,offensive:{enemy:5},enemyIds:['enemy']});
 assert.equal(t.ewAllocation.total,9);assert.equal(t.ewAllocation.unallocated,0);
 assert.throws(()=>commitVorchanEW({trial:t,turn:1,defensive:0,offensive:{enemy:1},enemyIds:['enemy']}),/already/);
});
test('rejects invented targets, overspending and uncommitted EW',()=>{
 assert.throws(()=>commitVorchanEW({trial:trial(),turn:1,defensive:1}),/power/);
 const t=commitVorchanPower({trial:trial(),turn:1});
 assert.throws(()=>commitVorchanEW({trial:t,turn:1,defensive:9}),/exceeds/);
 assert.throws(()=>commitVorchanEW({trial:t,turn:1,offensive:{friend:1},enemyIds:['enemy']}),/enemy/);
 assert.equal(commitVorchanEW({trial:t,turn:1,defensive:8}).ewAllocation.total,8);
});
