import test from 'node:test';
import assert from 'node:assert/strict';
import {initialVorchanDamage,vorchanHitToken,rollVorchanDamage,applyVorchanStandardVolley,vorchanPostTurnStructureLoss} from '../shared/vorchan-damage.mjs';
test('Vorchan forward and aft charts, primary second d20 and defender choices',()=>{
 assert.equal(vorchanHitToken({incoming:'forward',locationRoll:4}).token,'plasma_accelerator');
 assert.equal(vorchanHitToken({incoming:'aft',locationRoll:19}).requiresChoice,true);
 assert.equal(vorchanHitToken({incoming:'aft',locationRoll:19,primaryRoll:20}).token,'command');
 assert.equal(vorchanHitToken({incoming:'port',locationRoll:8}).choiceType,'hitChart');
 assert.deepEqual(vorchanHitToken({incoming:'forward',locationRoll:6}).candidates,['twin_nose_port','twin_nose_starboard']);
});
test('plasma modes use exact dice and range falloff',()=>{
 assert.equal(rollVorchanDamage({mountId:'plasma_forward',chargeTurns:1,dice:[5],range:2}).damage,7);
 assert.equal(rollVorchanDamage({mountId:'plasma_forward',chargeTurns:2,dice:[5,5],range:2}).damage,16);
 assert.equal(rollVorchanDamage({mountId:'plasma_forward',chargeTurns:3,dice:[5,5,5,5],range:2}).damage,30);
 assert.equal(rollVorchanDamage({mountId:'twin_nose_port',dice:[8],range:4}).damage,12);
 assert.throws(()=>rollVorchanDamage({mountId:'plasma_forward',chargeTurns:3,dice:[5],range:1}),/dice/);
});
test('non-ablative armour is subtracted on every volley; state remains immutable',()=>{
 const initial=initialVorchanDamage();
 const first=applyVorchanStandardVolley({state:initial,damage:5,incoming:'forward',locationRoll:4});
 assert.equal(first.state.tracks.plasma_forward.marked,1);
 assert.equal(initial.tracks.plasma_forward.marked,0);
 const second=applyVorchanStandardVolley({state:first.state,damage:5,incoming:'forward',locationRoll:4});
 assert.equal(second.state.tracks.plasma_forward.marked,2);
 assert.deepEqual(second.state.criticalCandidates,['plasma_forward']);
});
test('plasma halves armour rounded down and overkill rechecks structural armour',()=>{
 const r=applyVorchanStandardVolley({state:initialVorchanDamage(),damage:15,plasma:false,incoming:'forward',locationRoll:6,systemChoice:'twin_nose_port'});
 assert.equal(r.state.tracks.twin_nose_port.marked,6);
 assert.equal(r.state.tracks.forward_structure.marked,1); // 15-3-6=6, structure armour 5
 assert.equal(r.trace[1].armour,5);
 const plasma=applyVorchanStandardVolley({state:initialVorchanDamage(),damage:15,plasma:true,incoming:'forward',locationRoll:6,systemChoice:'twin_nose_port'});
 assert.equal(plasma.trace[0].armour,1);
 assert.equal(plasma.trace[1].armour,2);
 assert.equal(plasma.state.tracks.forward_structure.marked,6);
});
test('defender must select among multiple live arrays; destroyed system redirects to structure',()=>{
 const initial=initialVorchanDamage();
 assert.equal(applyVorchanStandardVolley({state:initial,damage:8,incoming:'forward',locationRoll:7}).choiceType,'system');
 const state=structuredClone(initial);state.tracks.twin_nose_port.marked=6;state.tracks.twin_nose_starboard.marked=6;
 const result=applyVorchanStandardVolley({state,damage:9,incoming:'forward',locationRoll:7});
 assert.equal(result.state.tracks.forward_structure.marked,4);
});
test('primary structure destruction immediately destroys ship; post-turn loss destroys every verified forward-section system',()=>{
 const state=initialVorchanDamage();state.tracks.primary_structure.marked=27;
 const result=applyVorchanStandardVolley({state,damage:8,incoming:'forward',locationRoll:20,primaryRoll:1});
 assert.equal(result.state.shipDestroyed,true);
 const section=initialVorchanDamage();section.destroyedSections=['forward'];
 const lost=vorchanPostTurnStructureLoss(section);
 assert.equal(lost.tracks.forward_port_thrust.marked,10);
 assert.equal(lost.tracks.forward_starboard_thrust.marked,10);
 assert.equal(lost.tracks.plasma_forward.marked,10);
 assert.equal(lost.tracks.twin_nose_port.marked,6);
 assert.equal(lost.tracks.jump_aft_centre.marked,0);
});

test('retro hits choose one physical forward thruster and jump hits only reach the aft jump engine',()=>{
 assert.deepEqual(vorchanHitToken({incoming:'forward',locationRoll:1}).candidates,['forward_port_thrust','forward_starboard_thrust']);
 assert.deepEqual(vorchanHitToken({incoming:'aft',locationRoll:6}).candidates,['jump_aft_centre']);
 const first=applyVorchanStandardVolley({state:initialVorchanDamage(),damage:8,incoming:'forward',locationRoll:1});
 assert.equal(first.choiceType,'system');
 const chosen=applyVorchanStandardVolley({state:initialVorchanDamage(),damage:8,incoming:'forward',locationRoll:1,systemChoice:'forward_starboard_thrust'});
 assert.equal(chosen.state.tracks.forward_starboard_thrust.marked,3);
 assert.equal(chosen.state.tracks.forward_port_thrust.marked,0);
});

test('overkill continues from a system through its destroyed section to primary structure',()=>{
 const state=initialVorchanDamage();state.tracks.forward_structure.marked=47;
 const r=applyVorchanStandardVolley({state,damage:30,incoming:'forward',locationRoll:6,systemChoice:'twin_nose_port'});
 assert.deepEqual(r.trace.map(x=>[x.systemId,x.marked]),[['twin_nose_port',6],['forward_structure',1],['primary_structure',9]]);
 assert.equal(r.unallocated,0);assert.equal(state.tracks.forward_structure.marked,47);
 assert.throws(()=>rollVorchanDamage({mountId:'plasma_forward',dice:[1,1,1,1],range:0,mode:'Raking'}),/Invalid/);
});
