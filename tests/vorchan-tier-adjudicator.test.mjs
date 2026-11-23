import test from 'node:test';
import assert from 'node:assert/strict';
import {adjudicateVorchanShipTier} from '../shared/vorchan-tier-adjudicator.mjs';
const ships=[{id:'a',q:0,r:0,facing:1},{id:'b',q:2,r:0,facing:4}];
const attack={id:'a:twin_nose_port:1',shipId:'a',targetId:'b',mountId:'twin_nose_port',chargeTurns:null,order:1,hit:true,blockers:[]};
const roll={attackId:attack.id,roll:1,locationRoll:4,primaryRoll:1,damageDice:[9]};
test('same-tier reducer applies recorded dice to forward plasma track without mutation',()=>{
 const input={ships,attacks:[attack],rollJournal:[roll]};
 const one=adjudicateVorchanShipTier(input),two=adjudicateVorchanShipTier(input);
 assert.deepEqual(one,two);assert.equal(one.complete,true);assert.equal(one.states.b.tracks.plasma_forward.marked,8);
});
test('defender selects among surviving twin arrays before later damage can proceed',()=>{
 const ambiguous={...roll,locationRoll:6};
 const x=adjudicateVorchanShipTier({ships,attacks:[attack],rollJournal:[ambiguous]});
 assert.equal(x.complete,false);assert.equal(x.pending[0].type,'system');assert.equal(x.states.b.tracks.twin_nose_port.marked,0);
 const y=adjudicateVorchanShipTier({ships,attacks:[attack],rollJournal:[ambiguous],defenderChoices:{[attack.id]:{systemChoice:'twin_nose_starboard'}}});
 assert.equal(y.complete,true);assert.equal(y.states.b.tracks.twin_nose_starboard.marked,6);
});
test('damage application is blocked if a preceding hit has an unresolved defender choice',()=>{
 const later={...attack,id:'a:twin_nose_starboard:1',mountId:'twin_nose_starboard',order:2};
 const x=adjudicateVorchanShipTier({ships,attacks:[attack,later],rollJournal:[{...roll,locationRoll:6},{...roll,attackId:later.id}]});
 assert.equal(x.pending.length,1);assert.equal(x.outcomes.length,0);assert.equal(x.complete,false);
});
