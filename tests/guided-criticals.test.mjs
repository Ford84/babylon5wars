import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,executeBattle,battleView} from '../shared/automated-battle.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {resolveShipCritical} from '../shared/ship-condition.mjs';
import {criticalTable,locationTable} from '../shared/rule-tables.mjs';
function ready(){
 let s=createBattle(['a','b'].map((id,i)=>({id,owner_id:'p'+(i+1),label:id,q:3+i*3,r:10-i*3,facing:i*3,private_state:{trial:newVorchanTrialState(id,'p'+(i+1),3+i*3,10-i*3,i*3)}})),[{user_id:'p1'},{user_id:'p2'}]);
 for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'power'});s=executeBattle(s,'p1',{type:'initiative'},()=>1);s=executeBattle(s,'p2',{type:'initiative'},()=>20);
 for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'ew'});for(const p of s.moveOrder)s=executeBattle(s,p,{type:'movement-done'});return s;
}
function begin(s){for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'fire',fire:{shots:[]}});return s;}
function cmd(s,type,die=()=>1,who=s.criticalResolution.actorId){const r=s.criticalResolution;return executeBattle(s,who,{type,stage:r.stage,checkId:r.check.id},die);}
test('critical phase waits for defender rolls, separate engine follow-up and acknowledgement; saves without rerolling',()=>{
 let s=ready(),t=s.ships[1].private_state.trial;t.condition.damage.tracks.engine.marked=8;t.condition.damage.criticalCandidates=['engine'];s=begin(s);
 assert.equal(s.phase,'critical_resolution');assert.equal(s.turn,1);assert.equal(s.criticalResolution.actorId,'p2');
 assert.throws(()=>cmd(s,'critical-roll',()=>20,'p1'),/Wait/);
 s=cmd(s,'critical-roll',()=>20);assert.equal(s.criticalResolution.result.total,28);assert.equal(s.criticalResolution.requiresSecondary,true);assert.equal(s.ships[1].private_state.trial.condition.effects.engineLoss,0);
 const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(battleView(saved,'p1').criticalResolution,battleView(s,'p2').criticalResolution);
 assert.throws(()=>cmd(saved,'critical-roll'),/Invalid/);s=cmd(saved,'critical-ok',()=>{throw Error('OK cannot roll');});assert.equal(s.criticalResolution.stage,'secondary_roll');
 s=cmd(s,'critical-roll',()=>15);assert.equal(s.criticalResolution.result.secondaryRoll,15);assert.equal(s.turn,1);
 s=cmd(s,'critical-ok',()=>{throw Error('OK cannot roll');});assert.equal(s.turn,2);assert.equal(s.phase,'power');assert.equal(s.ships[1].private_state.trial.condition.effects.engineLoss,2);assert.deepEqual(s.ships[1].private_state.trial.condition.effects.engineShort,{turn:2,mode:'runaway'});
 assert.ok(s.journal.some(e=>e.type==='critical_checks'&&e.results[0]?.secondaryRoll===15));
});
test('damage and overthrust criticals remain separate and include the correct damage plus excess modifiers',()=>{
 let s=ready(),t=s.ships[0].private_state.trial;t.condition.damage.tracks.aft_port_thrust.marked=1;t.condition.damage.criticalCandidates=['aft_port_thrust'];t.movement.thrusterLedger.aft_port_thrust={rating:5,used:6};s=begin(s);
 const seen=[];while(s.criticalResolution){const r=s.criticalResolution;if(r.stage.endsWith('_roll')){s=cmd(s,'critical-roll',()=>1);seen.push([s.criticalResolution.result.kind,s.criticalResolution.result.modifier]);}else s=cmd(s,'critical-ok');}
 assert.deepEqual(seen,[['damage',1],['overthrust',2]]);assert.equal(s.turn,2);
});
test('passive ship rolls automatically but leaves each critical result for the human to review',()=>{
 let s=ready();s.passivePlayerId='p2';const t=s.ships[1].private_state.trial;t.condition.damage.tracks.sensors.marked=1;t.condition.damage.criticalCandidates=['sensors'];
 s=executeBattle(s,'p1',{type:'fire',fire:{shots:[]}},()=>1);assert.equal(s.phase,'critical_resolution');assert.equal(s.criticalResolution.stage,'critical_result');assert.equal(s.criticalResolution.rollerId,'p2');assert.equal(s.criticalResolution.actorId,'p1');assert.equal(s.turn,1);
 s=cmd(s,'critical-ok');assert.equal(s.turn,2);
});
test('twin-array special critical removes one gun, then the mount, instead of applying the generic 20+ effect',()=>{
 let t=ready().ships[0].private_state.trial;t.condition.damage.tracks.twin_nose_port.marked=1;
 const check={systemId:'twin_nose_port',kind:'damage',excess:0};let r=resolveShipCritical(t,1,check,19);t=r.trial;
 assert.deepEqual(t.condition.effects.weapons.twin_nose_port.destroyedGuns,[2]);assert.equal(t.condition.effects.weapons.twin_nose_port.damageLoss,0);
 assert.equal(weaponReadiness({trial:t,turn:1,mountId:'twin_nose_port',gun:2}).ready,false);assert.equal(weaponReadiness({trial:t,turn:1,mountId:'twin_nose_port',gun:1}).ready,true);
 r=resolveShipCritical(t,2,check,19);assert.equal(r.trial.condition.damage.tracks.twin_nose_port.marked,6);
});
test('rule summaries contain the exact location ranges and distinguish twin-array and engine follow-up tables',()=>{
 assert.deepEqual(locationTable('forward').find(x=>x[2]==='primary'),[19,20,'primary']);assert.equal(criticalTable('twin_nose_port').at(-1)[0],20);assert.equal(criticalTable('plasma_forward').at(-1)[0],25);assert.deepEqual(criticalTable('engine',true).map(x=>x.slice(0,2)),[[1,14],[15,20]]);
});
