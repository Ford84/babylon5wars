import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,executeBattle,battleView} from '../shared/automated-battle.mjs';import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {movementOptions} from '../shared/movement-options.mjs';import {commitMovement} from '../shared/movement-commit.mjs';
function ship(){let s=createBattle(['a','b'].map((id,i)=>({id,owner_id:id,label:id,q:3+i*3,r:10-i*3,facing:i*3,private_state:{trial:newVorchanTrialState(id,id,3+i*3,10-i*3,i*3)}})),[{user_id:'a'},{user_id:'b'}]);for(const p of ['a','b'])s=executeBattle(s,p,{type:'power'});s=executeBattle(s,'a',{type:'initiative'},()=>1);s=executeBattle(s,'b',{type:'initiative'},()=>20);for(const p of ['a','b'])s=executeBattle(s,p,{type:'ew'});const x=s.ships[0];x.speed=3;x.private_state.trial.movement.state.speed=3;x.private_state.trial.movement.state.remaining=3;return x;}
function act(ship,action){const r=commitMovement({ship,turn:1,action,advanceAfter:0});return {...ship,...r.nextShip,private_state:r.nextPrivateState};}
const pick=(s,name)=>movementOptions(s,1).find(x=>x.name.startsWith(name))?.choices[0].action;
test('speed changes are optional but must precede travel and pivot; pivot may precede normal travel',()=>{
 const start=ship();assert.ok(pick(start,'Accelerate'));assert.ok(pick(start,'Advance'));assert.ok(pick(start,'Start Pivot'));
 const speed=pick(start,'Accelerate +1'),pivot=pick(start,'Start Pivot Clockwise');let s=act(start,pivot);
 assert.equal(s.q,start.q);assert.equal(s.r,start.r);assert.equal(s.speed,3);assert.equal(s.private_state.trial.movement.state.remaining,3);assert.equal(pick(s,'Accelerate'),undefined);assert.throws(()=>act(s,speed),/speed|Speed|pivot/);assert.throws(()=>act(s,{type:'advance',hexes:1,motionFacing:1}),/Client cannot supply/);
 s=act(s,{type:'advance',hexes:1});assert.deepEqual([s.q,s.r],[4,9]);assert.equal(s.facing,1); // Facing changed, original travel direction retained.
 const coast=act(start,{type:'advance',hexes:1});assert.equal(pick(coast,'Accelerate'),undefined);assert.throws(()=>act(coast,speed),/precede/);
 const accel=act(start,speed);assert.equal(accel.speed,4);assert.ok(pick(accel,'Start Pivot'));
});
test('pivot permits starting a roll, while a rolling ship cannot halt its pivot until rolling stops',()=>{
 let s=ship();s=act(s,pick(s,'Start Pivot Clockwise'));assert.ok(pick(s,'Start Roll'));s=act(s,pick(s,'Start Roll'));
 assert.equal(pick(s,'Halt Pivot'),undefined);assert.equal(pick(s,'Slide'),undefined);assert.equal(pick(s,'Turn'),undefined);assert.ok(pick(s,'Advance'));
});

test('public travel direction is derived from authoritative inertial heading, including pivots, reverse and stationary ships',()=>{
 const a=ship();let s={ships:[a],phase:'movement',status:'active',turn:1,locks:{},moveOrder:['a'],approaches:{},declarations:[],defences:[]};
 const heading=()=>battleView(s,'opponent').ships[0].public_state.travelFacing;
 assert.equal(heading(),0);s.ships[0]=act(a,pick(a,'Start Pivot Clockwise'));assert.equal(s.ships[0].facing,1);assert.equal(heading(),0);
 s.ships[0].speed=-3;s.ships[0].private_state.trial.movement.state.speed=-3;assert.equal(heading(),3);
 const moved=act(s.ships[0],{type:'advance',hexes:1});assert.deepEqual([moved.q,moved.r],[2,11]);
 s.ships[0].speed=0;assert.equal(heading(),null);
});
