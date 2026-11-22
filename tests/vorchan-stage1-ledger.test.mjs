import test from 'node:test';
import assert from 'node:assert/strict';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
import {vorchanPowerBudget} from '../shared/vorchan-power-economy.mjs';

function fixture(speed=0){return {ship:{id:'vorchan-a',q:5,r:10,facing:0,speed},privateState:{trial:newVorchanTrialState('vorchan-a','player-a',5,10,0)}};}
function replay(initial,actions,turn=1){
 let ship={...initial.ship},privateState=initial.privateState;const projections=[];
 for(const action of actions){const result=applyVorchanStage({ship,privateState,action,turn});ship={...ship,...result.nextShip};privateState=result.nextPrivateState;projections.push({ship,privateState,engine:result.engineThrustSpent});}
 return {ship,privateState,projections};
}
test('multi-step SCS plan uses updated speed, facing, delay, movement and engine ledger',()=>{
 const actions=[
  {type:'speed',change:2,purchasedThrust:0,thrusters:{aft_port_thrust:2,aft_starboard_thrust:2}},
  {type:'turn',direction:1,thrusters:{aft_port_thrust:1}},
  {type:'advance',hexes:2}
 ];
 const r=replay(fixture(),actions);
 assert.equal(r.ship.speed,2);
 assert.equal(r.ship.facing,1);
 assert.equal(r.privateState.trial.movement.state.remaining,0);
 assert.equal(r.privateState.trial.movement.state.history.length,3);
 assert.equal(r.privateState.trial.movement.thrusterLedger.aft_port_thrust.used,3);
 assert.equal(r.privateState.trial.movement.engineThrustSpent,5);
 assert.equal(r.projections[0].ship.speed,2);
 assert.equal(r.projections[1].ship.facing,1);
});
test('planner rejects a turn until required movement delay is satisfied',()=>{
 const actions=[
  {type:'speed',change:6,purchasedThrust:0,thrusters:{aft_port_thrust:6,aft_starboard_thrust:6}},
  {type:'turn',direction:1,thrusters:{aft_port_thrust:2,port_thrust:1}},
  {type:'turn',direction:1,thrusters:{aft_port_thrust:2,port_thrust:1}}
 ];
 assert.throws(()=>replay(fixture(),actions),/Turn delay/);
});
test('planner refuses ineligible SCS thrusters and more than double rated output',()=>{
 assert.throws(()=>replay(fixture(),[{type:'speed',change:1,purchasedThrust:0,thrusters:{port_thrust:2}}]),/not eligible/);
 assert.throws(()=>replay(fixture(),[{type:'speed',change:6,purchasedThrust:0,thrusters:{aft_port_thrust:11,aft_starboard_thrust:1}}]),/twice|capacity|rating|thrust/i);
});
test('SCS engine budget reflects verified damage, not a hard-coded ten',()=>{
 const f=fixture();
 f.privateState.trial.verifiedEngineThrustLoss=3;
 const power=vorchanPowerBudget({trial:f.privateState.trial,turn:1});
 assert.equal(power.availableThrust,7);
 assert.throws(()=>replay(f,[{type:'speed',change:4,purchasedThrust:0,thrusters:{aft_port_thrust:4,aft_starboard_thrust:4}}]),/Insufficient thrust/);
});
