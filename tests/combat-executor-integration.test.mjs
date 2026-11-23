import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVorchanDamageChoice} from '../shared/vorchan-defender-choice.mjs';
import {adjudicateVorchanShipTier} from '../shared/vorchan-tier-adjudicator.mjs';
const ships=[{id:'a',owner_id:'p1',q:0,r:0,facing:1},{id:'b',owner_id:'p2',q:2,r:0,facing:4}];
const attack={id:'a:twin_nose_port:1',shipId:'a',targetId:'b',mountId:'twin_nose_port',order:1,hit:true,blockers:[]};
const dice=[{attackId:attack.id,roll:1,locationRoll:6,primaryRoll:3,damageDice:[8]}];
test('only defending player may choose system for verified server hit',()=>{
 const args={playerId:'p2',ships,attacks:[attack],rollJournal:dice,attackId:attack.id};
 assert.equal(validateVorchanDamageChoice({...args,choice:{incoming:'forward',systemChoice:'twin_nose_port'}}).accepted,true);
 assert.throws(()=>validateVorchanDamageChoice({...args,playerId:'p1',choice:{incoming:'forward'}}),/defender/);
 assert.throws(()=>validateVorchanDamageChoice({...args,choice:{incoming:'forward',systemChoice:'reactor'}}),/not on hit/);
 assert.throws(()=>validateVorchanDamageChoice({...args,choice:{incoming:'forward',damage:999}}),/Unknown/);
 assert.throws(()=>validateVorchanDamageChoice({...args,attacks:[{...attack,hit:false}],choice:{incoming:'forward'}}),/not a verified hit/);
});
test('two ships may fire in same tier and accumulate deterministic damage from server dice',()=>{
 const opposite={...attack,id:'b:twin_nose_starboard:1',shipId:'b',targetId:'a',mountId:'twin_nose_starboard'};
 const rolls=[{...dice[0],locationRoll:4},{attackId:opposite.id,roll:2,locationRoll:4,primaryRoll:3,damageDice:[7]}];
 const input={ships,attacks:[attack,opposite],rollJournal:rolls};
 const result=adjudicateVorchanShipTier(input);
 assert.equal(result.complete,true);
 assert.equal(result.outcomes.length,2);
 assert.equal(result.states.a.tracks.plasma_forward.marked,7);
 assert.equal(result.states.b.tracks.plasma_forward.marked,8);
 assert.deepEqual(adjudicateVorchanShipTier(input),result);
});
