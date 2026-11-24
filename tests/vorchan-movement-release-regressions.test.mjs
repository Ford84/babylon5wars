import test from 'node:test';
import assert from 'node:assert/strict';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from '../shared/vorchan-scs-identification.mjs';
const ship=(speed=0)=>({q:10,r:10,facing:0,speed});
const state=()=>({trial:newVorchanTrialState('v','p',10,10,0)});
const apply=(s,p,turn,action)=>applyVorchanStage({ship:s,privateState:p,turn,action});
test('stationary Vorchan turns for one aft thrust and zero turn delay',()=>{
 const a=apply(ship(),state(),1,{type:'turn',direction:1,thrusters:{aft_port_thrust:1}});
 assert.equal(a.nextShip.facing,1);
 assert.equal(a.movement.turnDelayRemaining,0);
 assert.equal(a.movement.thrustSpent,1);
});
test('turn at speed six requires equal aft and side allocation',()=>{
 const s=ship(6),p=state();
 assert.throws(()=>apply(s,p,1,{type:'turn',direction:1,thrusters:{aft_port_thrust:3}}),/divided evenly/);
 const a=apply(s,p,1,{type:'turn',direction:1,thrusters:{aft_port_thrust:2,port_thrust:1}});
 assert.equal(a.nextShip.facing,1);
 assert.equal(a.movement.thrustSpent,3);
});
test('pivot of even cost does not require odd-thrust selector',()=>{
 const a=apply(ship(2),state(),1,{type:'pivot-start',direction:1,thrusterPair:'forward-port',thrusters:{forward_port_thrust:1,port_thrust:1}});
 assert.equal(a.nextShip.facing,1);
 assert.equal(a.movement.motionFacing,0);
});
test('extended turn deposit is not a facing change and prevents acceleration',()=>{
 const a=apply(ship(6),state(),1,{type:'extended-start',direction:1,initialThrust:1,thrusters:{aft_port_thrust:1}});
 assert.equal(a.nextShip.facing,0);
 assert.throws(()=>apply(a.nextShip,a.nextPrivateState,1,{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:2}}),/Extended turn/);
});
test('aft engine and two flanking aft thrusters have distinct vector-key types',()=>{
 const byId=Object.fromEntries(SCS.systems.map(s=>[s.id,s]));
 assert.equal(byId.jump_aft_centre.kind,'jump-engine');
 assert.equal(byId.aft_port_thrust.kind,'thruster');
 assert.equal(byId.aft_starboard_thrust.kind,'thruster');
 assert.equal(byId.aft_port_thrust.iconValue,5);
 assert.equal(byId.aft_starboard_thrust.iconValue,5);
});

test('movement cannot invent reactor-funded thrust without power phase commitment',()=>{
 assert.throws(()=>apply(ship(),state(),1,{type:'speed',change:1,purchasedThrust:1,thrusters:{aft_port_thrust:2}}),/pre-turn power phase/);
});
