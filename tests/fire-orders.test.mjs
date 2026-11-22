import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFireDeclaration,validateDefensiveAssignment,publicFireView} from '../shared/fire-orders.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
const ships=[
 {id:'a',owner_id:'p1',q:0,r:0,facing:1,public_state:{libraryId:LIB.id}},
 {id:'b',owner_id:'p2',q:3,r:0,facing:4,public_state:{libraryId:LIB.id}}
];
const offence={shipId:'a',mountId:'twin_nose_port',gun:1,role:'offensive',targetId:'b',order:1};
const reserve={shipId:'a',mountId:'twin_nose_starboard',gun:2,role:'defensive'};
const enemy={shipId:'b',mountId:'twin_nose_port',gun:1,role:'offensive',targetId:'a',order:1};
const declare=(playerId,shots)=>validateFireDeclaration({playerId,ships,fire:{shots},turn:1});
test('validates physical gun identity, ownership, target arc and offensive order',()=>{
 assert.equal(declare('p1',[offence,reserve]).shots.length,2);
 assert.throws(()=>declare('p2',[offence]),/not on your Vorchan/);
 assert.throws(()=>declare('p1',[offence,offence]),/only once/);
 assert.throws(()=>declare('p1',[{...offence,targetId:'a'}]),/enemy/);
 assert.throws(()=>declare('p1',[{...offence,gun:3}]),/outside mount/);
 assert.throws(()=>declare('p1',[{...offence,order:0}]),/firing order/);
 assert.throws(()=>declare('p1',[{...offence,calledShot:'engine'}]),/Called shots/);
});
test('plasma cannot intercept, must specify charging interval',()=>{
 assert.throws(()=>declare('p1',[{shipId:'a',mountId:'plasma_forward',gun:1,role:'defensive'}]),/cannot intercept/);
 assert.throws(()=>declare('p1',[{...offence,mountId:'plasma_forward'}]),/charge interval/);
 assert.equal(declare('p1',[{...offence,mountId:'plasma_forward',chargeTurns:1}]).shots.length,1);
});
test('defence is assigned only to previously reserved guns and incoming declared shots',()=>{
 const declarations=[{playerId:'p1',fire:declare('p1',[offence,reserve])},{playerId:'p2',fire:declare('p2',[enemy])}];
 const good={shipId:'a',mountId:'twin_nose_starboard',gun:2,attackId:'b:twin_nose_port:1'};
 assert.deepEqual(validateDefensiveAssignment({playerId:'p1',ships,declarations,assignments:[good]}).assignments,[good]);
 assert.throws(()=>validateDefensiveAssignment({playerId:'p1',ships,declarations,assignments:[good,good]}),/unique/);
 assert.throws(()=>validateDefensiveAssignment({playerId:'p1',ships,declarations,assignments:[{...good,gun:1}]}),/reserved/);
 assert.throws(()=>validateDefensiveAssignment({playerId:'p2',ships,declarations,assignments:[good]}),/reserved/);
 assert.throws(()=>validateDefensiveAssignment({playerId:'p1',ships,declarations,assignments:[{...good,attackId:'a:twin_nose_port:1'}]}),/incoming/);
});
test('pre-reveal projection never exposes opponent attack payload',()=>{
 const declarations=[{playerId:'p1',fire:declare('p1',[offence,reserve])},{playerId:'p2',fire:declare('p2',[enemy])}];
 const hidden=publicFireView({phase:'fire_commit',playerId:'p1',declarations});
 assert.deepEqual(hidden.declarations,[]);
 assert.deepEqual(hidden.own,declarations[0].fire);
 assert.equal(JSON.stringify(hidden).includes('"targetId":"a"'),false);
 assert.equal(publicFireView({phase:'fire_resolution',playerId:'p1',declarations}).declarations.length,2);
});
