import test from 'node:test';import assert from 'node:assert/strict';import {PHASES,nextPhase,hexDistance,validateFacing,publicOrder} from '../shared/phases.mjs';
test('all phase identifiers unique',()=>assert.equal(new Set(PHASES.map(p=>p.id)).size,PHASES.length));
test('secret EW commits before reveal',()=>assert.equal(nextPhase('ew_commit').phase.id,'ew_reveal'));
test('final phase wraps to next turn',()=>{const x=nextPhase('adjust');assert.equal(x.phase.id,'power');assert.equal(x.newTurn,true)});
test('hex distance symmetric',()=>{assert.equal(hexDistance({q:0,r:0},{q:3,r:-2}),3);assert.equal(hexDistance({q:3,r:-2},{q:0,r:0}),3)});
test('only six facings',()=>{assert.equal(validateFacing(5),true);assert.equal(validateFacing(6),false)});
test('secret orders withheld from opponents',()=>{const o={player_id:'a',payload:'secret'};assert.equal(publicOrder(o,'ew_commit','b'),null);assert.equal(publicOrder(o,'ew_commit','a'),o)});