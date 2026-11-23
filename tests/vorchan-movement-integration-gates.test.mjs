import test from 'node:test';
import assert from 'node:assert/strict';
import {VORCHAN_THRUSTER_RATINGS,applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
import {adjudicateVorchanMovementDamage} from '../shared/vorchan-movement-damage.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from '../shared/vorchan-scs-identification.mjs';
const trial=()=>newVorchanTrialState('s','o',4,10,0);
test('provisional forward outer icon values are preserved without claiming verified tracks',()=>{
 assert.equal(VORCHAN_THRUSTER_RATINGS.retro,1);
 assert.equal(VORCHAN_THRUSTER_RATINGS.forward_port_thrust,2);
 assert.equal(VORCHAN_THRUSTER_RATINGS.forward_starboard_thrust,3);
 for(const id of ['forward_port_thrust','forward_starboard_thrust']){
  const system=SCS.systems.find(s=>s.id===id);
  assert.equal(system.boxes,null);assert.equal(system.armour,null);assert.equal(system.verified,false);
 }
 assert.equal(SCS.systems.find(s=>s.id==='twin_nose_port').kind,'weapon');
});
test('unverified forward-thruster damage tracks are not guessed',()=>{
 assert.throws(()=>adjudicateVorchanMovementDamage(trial(),{systemId:'forward_port_thrust',markedBoxes:1}),/Unverified SCS/);
 assert.throws(()=>adjudicateVorchanMovementDamage(trial(),{systemId:'forward_starboard_thrust',markedBoxes:1}),/Unverified SCS/);
});
test('damage boxes cannot exceed printed track and destruction requires full track',()=>{
 assert.throws(()=>adjudicateVorchanMovementDamage(trial(),{systemId:'engine',markedBoxes:12}),/Damage exceeds/);
 assert.throws(()=>adjudicateVorchanMovementDamage(trial(),{systemId:'engine',markedBoxes:3,destroyed:true}),/destruction/);
 assert.equal(adjudicateVorchanMovementDamage(trial(),{systemId:'twin_nose_port',markedBoxes:6,destroyed:true}).destroyedSystems.includes('twin_nose_port'),true);
});
test('destroyed engine cannot change speed but inertia movement remains legal',()=>{
 const t={...trial(),destroyedSystems:['engine']};
 assert.throws(()=>applyVorchanStage({ship:{q:4,r:10,facing:0,speed:2},privateState:{trial:t},turn:1,action:{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:2}}}),/Destroyed engine/);
 const r=applyVorchanStage({ship:{q:4,r:10,facing:0,speed:2},privateState:{trial:t},turn:1,action:{type:'advance',hexes:1}});
 assert.equal(r.movement.remaining,1);
});

test('engine destruction can force cancellation of a carried extended turn',()=>{
 const ship={q:4,r:10,facing:0,speed:6};
 const t=trial();
 const a=applyVorchanStage({ship,privateState:{trial:t},turn:1,action:{type:'extended-start',direction:1,initialThrust:1,thrusters:{aft_port_thrust:1}}});
 const b=applyVorchanStage({ship,privateState:a.nextPrivateState,turn:1,action:{type:'advance',hexes:6}});
 const damaged={...b.nextPrivateState,trial:{...b.nextPrivateState.trial,destroyedSystems:['engine']}};
 const result=applyVorchanStage({ship:{...ship,...b.nextShip},privateState:damaged,turn:2,action:{type:'extended-cancel'}});
 assert.equal(result.movement.extendedTurn,null);
 assert.equal(result.movement.history.at(-1).type,'extended-cancel');
});
