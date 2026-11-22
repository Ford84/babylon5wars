import test from 'node:test';import assert from 'node:assert/strict';
import {unitInitiative,initiativePrecedence,resolveInitiativeOrder} from '../shared/initiative-sequence.mjs';
test('speed below five incurs two-point penalty per speed point',()=>{assert.equal(unitInitiative({roll:10,printedBonus:8,speed:3}).total,14);assert.equal(unitInitiative({roll:10,printedBonus:8,speed:0,immobile:true}).total,18);});
test('launch and landing penalties are cumulative',()=>{assert.equal(unitInitiative({roll:10,printedBonus:18,speed:8,newlyLaunched:true}).total,18);assert.equal(unitInitiative({roll:10,printedBonus:18,speed:8,newlyLaunched:true,catapultOrRail:true}).total,28);});
test('higher printed bonus wins equal-total initiative',()=>{assert.equal(initiativePrecedence({total:20,printedBonus:8},{total:20,printedBonus:12}),-1);});
test('opposing unresolved ties block movement until rolloff',()=>{const a={id:'a',ownerId:'x',total:20,printedBonus:5},b={id:'b',ownerId:'y',total:20,printedBonus:5};assert.deepEqual(resolveInitiativeOrder([a,b]).unresolved,[['a','b']]);assert.equal(resolveInitiativeOrder([a,{...b,ownerId:'x'}]).canMove,true);});
test('voluntary reduction cannot exceed twenty',()=>{assert.throws(()=>unitInitiative({roll:10,printedBonus:5,speed:5,voluntaryPenalty:-21}));});
