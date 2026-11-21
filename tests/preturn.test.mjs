import test from 'node:test';
import assert from 'node:assert/strict';
import {powerBudget,extraEWCost,ewAllocation,initiative,initiativeOrder} from '../shared/preturn.mjs';
test('reactor shortages require intact, deactivatable systems',()=>{
 assert.deepEqual(powerBudget({extraPower:-2,reactorLoss:3,systems:[{power:5,deactivated:true}]}),{available:0,recovered:5,shortage:0,reactorShutdown:false});
 assert.equal(powerBudget({reactorLoss:2}).reactorShutdown,true);
 assert.throws(()=>powerBudget({systems:[{power:2,destroyed:true,deactivated:true}]}));
 assert.throws(()=>powerBudget({systems:[{power:2,deactivatable:false,deactivated:true}]}));
});
test('EW purchase uses original sensor output even when damaged',()=>{
 assert.equal(extraEWCost(8,2),19);
 assert.deepEqual(ewAllocation({sensors:[{original:8,current:6}],extra:[2],defensive:3,offensive:{enemy:4},closeCombat:1}),{total:8,spent:8,unallocated:0,powerCost:19,defensive:3,offensive:{enemy:4},closeCombat:1});
 assert.throws(()=>ewAllocation({sensors:[{original:8,current:6}],extra:[0],defensive:7}));
});
test('initiative rolls by unit, slowness and voluntary penalty',()=>{
 assert.equal(initiative({roll:10,bonus:12,speed:4}).total,20);
 assert.equal(initiative({roll:10,bonus:12,speed:0}).slowness,-10);
 assert.equal(initiative({roll:10,bonus:0,speed:0,immobile:true}).slowness,0);
 assert.throws(()=>initiative({roll:2,voluntaryReduction:21}));
 const ordered=initiativeOrder([{id:'a',total:14,bonus:4},{id:'b',total:14,bonus:6},{id:'c',total:14,bonus:6}]);
 assert.deepEqual(ordered.units.map(x=>x.id),['a','b','c']);
 assert.deepEqual(ordered.unresolved,[['b','c']]);
});
