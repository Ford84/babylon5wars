import test from 'node:test';import assert from 'node:assert/strict';
import {turnRequirements,remainingTurnDelay,advanceHex} from '../shared/movement-rules.mjs';
const third={numerator:1,denominator:3},half={numerator:1,denominator:2};
test('normal turn uses ceiling, minimum cost and evenly split thrusters',()=>{const r=turnRequirements({speed:17,costRatio:third,delayRatio:half});assert.equal(r.totalCost,6);assert.equal(r.delay,9);assert.deepEqual(r.thrusterSplit,{minimumEach:3,oddPoint:0});assert.equal(turnRequirements({speed:0,costRatio:third,delayRatio:half}).totalCost,1);});
test('agile 120 and 180 snap turns multiply cost without increasing delay',()=>{assert.deepEqual([120,180].map(angle=>turnRequirements({speed:17,costRatio:third,delayRatio:half,angle,agile:true}).totalCost),[12,18]);assert.throws(()=>turnRequirements({speed:17,costRatio:third,delayRatio:half,angle:120}));});
test('shortening costs one extra thrust per hex and minimum delay is one',()=>{const r=turnRequirements({speed:9,costRatio:third,delayRatio:half,shortenBy:4});assert.equal(r.totalCost,7);assert.equal(r.delay,1);assert.throws(()=>turnRequirements({speed:9,costRatio:third,delayRatio:half,shortenBy:5}));});
test('remaining delay adjusts to new speed and retains distance already travelled',()=>{assert.equal(remainingTurnDelay({speed:15,delayRatio:half,hexesSinceTurn:5}).remaining,3);});
test('axial hex forward motion',()=>{assert.deepEqual(advanceHex({q:0,r:0},0),{q:1,r:-1});assert.deepEqual(advanceHex({q:0,r:0},3),{q:-1,r:1});});
