import test from 'node:test';import assert from 'node:assert/strict';
import {validateManoeuvreThrusters as check} from '../shared/manoeuvre-thrusters.mjs';
const checkWith=(action,cost,allocation,speed=5)=>check({action,cost,allocation,oldState:{speed}});
test('acceleration uses aft, deceleration uses forward even when crossing zero',()=>{
 assert.equal(checkWith({type:'speed',change:2},4,{aft_port_thrust:2,aft_starboard_thrust:2}),true);
 assert.equal(checkWith({type:'speed',change:-2},4,{forward_port_thrust:4}),true);
 assert.throws(()=>checkWith({type:'speed',change:2},4,{forward_port_thrust:4}),/not eligible/);
});
test('turns split aft and opposite side, with reverse requirements swapped',()=>{
 assert.equal(checkWith({type:'turn',direction:1},5,{aft_port_thrust:3,port_thrust:2}),true);
 assert.equal(checkWith({type:'turn',direction:-1},4,{aft_starboard_thrust:2,starboard_thrust:2}),true);
 assert.equal(checkWith({type:'turn',direction:1},4,{forward_port_thrust:2,starboard_thrust:2},-5),true);
 assert.throws(()=>checkWith({type:'turn',direction:1},4,{aft_port_thrust:3,port_thrust:1}),/evenly/);
 assert.throws(()=>checkWith({type:'turn',direction:1},4,{aft_port_thrust:2,starboard_thrust:2}),/not eligible/);
});
test('slides use opposite side; pivots use exactly selected opposing pair; rolls permit any thruster',()=>{
 assert.equal(checkWith({type:'slide',direction:1},2,{port_thrust:2}),true);
 assert.throws(()=>checkWith({type:'slide',direction:1},2,{starboard_thrust:2}),/not eligible/);
 assert.equal(checkWith({type:'pivot-start',thrusterPair:'forward-port'},3,{forward_port_thrust:2,port_thrust:1}),true);
 assert.throws(()=>checkWith({type:'pivot-start',thrusterPair:'forward-port'},3,{forward_port_thrust:3}),/evenly/);
 assert.equal(checkWith({type:'roll-start'},1,{forward_port_thrust:1}),true);
});
