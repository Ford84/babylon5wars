import test from 'node:test';import assert from 'node:assert/strict';
import {VORCHAN_LIBRARY_RECORD as LIB,validateVorchanLibraryRecord} from '../shared/vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS,auditVorchanIdentification} from '../shared/vorchan-scs-identification.mjs';
import {VORCHAN_SWITCHABLE_POWER,vorchanPowerBudget} from '../shared/vorchan-power-economy.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
test('source identity: Vorchan Warship +4 not Warscout +6',()=>{
 assert.equal(LIB.name,'Vorchan Warship');assert.equal(LIB.extraPower,4);
 assert.equal(LIB.engineEfficiency.power,2);assert.equal(LIB.engineEfficiency.thrust,1);
 assert.equal(LIB.initiativeBonus,8);assert.equal(LIB.combatPoints,360);
 assert.equal(validateVorchanLibraryRecord(LIB).valid,true);
});
test('visual weapon symbol count: one plasma and two twin arrays',()=>{
 assert.equal(LIB.weapons.find(w=>w.id==='plasma-accelerator').mounts,1);
 assert.equal(LIB.weapons.find(w=>w.id==='twin-array').mounts,2);
 assert.equal(LIB.weaponMounts.length,3);
 assert.equal(Object.values(VORCHAN_SWITCHABLE_POWER).reduce((a,b)=>a+b,0),9);
 assert.equal(LIB.weaponMounts.every(w=>w.arc===null),true);
});
test('visually transcribed SCS system tracks and icon values',()=>{
 const map=Object.fromEntries(SCS.systems.map(s=>[s.id,s]));
 for(const [id,boxes] of Object.entries({retro:5,twin_nose_port:6,twin_nose_starboard:6,plasma_forward:8,jump_forward_port:10,jump_forward_starboard:10,engine:11,reactor:20,sensors:12,command:12,hangar:2,primary_structure:28,port_thrust:12,starboard_thrust:12,jump_aft_port:8,jump_aft_starboard:8,jump_aft_centre:16}))assert.equal(map[id].boxes,boxes,id);
 assert.equal(map.engine.iconValue,10);
 assert.equal(map.reactor.iconValue,4);
 assert.equal(map.hangar.iconValue,2);
});
test('automatic combat remains explicitly blocked by unresolved SCS arcs and forward thrusters',()=>{
 const audit=auditVorchanIdentification();assert.equal(audit.readyForCombat,false);
 assert.equal(SCS.completeness.allWeaponArcsIdentified,false);
 assert.equal(SCS.completeness.allDamageBoxesCounted,false);
});
test('Vorchan baseline reactor budget and all-three-mount deactivation',()=>{
 const trial=newVorchanTrialState('a','b',2,3,0);
 assert.equal(vorchanPowerBudget({trial,turn:1,purchasedThrust:2}).availableThrust,12);
 const all=LIB.weaponMounts.map(m=>m.id);
 const budget=vorchanPowerBudget({trial,turn:1,deactivated:all,purchasedThrust:6});
 assert.equal(budget.availablePower,13);
 assert.equal(budget.unusedPower,1);
});
