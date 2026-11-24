import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle} from '../shared/automated-battle.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
const trial=()=>createBattle(['a','b'].map((id,i)=>({id,owner_id:id,label:id,q:3+i*3,r:10-i*3,facing:i*3,private_state:{trial:newVorchanTrialState(id,id,3+i*3,10-i*3,i*3)}})),[{user_id:'a'},{user_id:'b'}]).ships[0].private_state.trial;
const strengths=(t,turn)=>[1,2,3].filter(chargeTurns=>weaponReadiness({trial:t,turn,mountId:'plasma_forward',chargeTurns}).ready);
test('firing a full plasma shot permits strength one next turn, two after a skipped turn and three after two',()=>{
 const t=trial();assert.deepEqual(strengths(t,1),[1,2,3]);
 t.weaponReadiness.plasma_forward[1].lastFiredTurn=4;
 assert.deepEqual(strengths(t,4),[]);assert.deepEqual(strengths(t,5),[1]);assert.deepEqual(strengths(t,6),[1,2]);assert.deepEqual(strengths(t,7),[1,2,3]);assert.deepEqual(strengths(t,12),[1,2,3]);
 t.weaponReadiness.plasma_forward[1].lastFiredTurn=6;
 assert.deepEqual(strengths(t,7),[1]);
});
test('plasma reactivation starts the charge cycle again instead of restoring an old full charge',()=>{
 const t=trial();t.weaponReadiness.plasma_forward[1]={lastFiredTurn:5,lastActivatedTurn:6};
 assert.deepEqual(strengths(t,6),[1]);assert.deepEqual(strengths(t,7),[1,2]);assert.deepEqual(strengths(t,8),[1,2,3]);
});
