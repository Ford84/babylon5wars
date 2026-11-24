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
 assert.equal(LIB.weaponMounts.reduce((n,m)=>n+VORCHAN_SWITCHABLE_POWER[m.id],0),9);
 assert.equal(VORCHAN_SWITCHABLE_POWER.sensors,4);assert.equal(VORCHAN_SWITCHABLE_POWER.jump_aft_centre,3);
 assert.deepEqual(LIB.weaponMounts.map(w=>w.arc.coverageDegrees),[90,270,270]);
});
test('visually transcribed SCS system tracks and icon values',()=>{
 const map=Object.fromEntries(SCS.systems.map(s=>[s.id,s]));
 for(const [id,boxes] of Object.entries({twin_nose_port:6,twin_nose_starboard:6,plasma_forward:10,forward_port_thrust:10,forward_starboard_thrust:10,engine:11,reactor:12,sensors:20,command:12,hangar:2,primary_structure:28,port_thrust:15,starboard_thrust:15,aft_port_thrust:8,aft_starboard_thrust:8,jump_aft_centre:16}))assert.equal(map[id].boxes,boxes,id);
 assert.deepEqual([map.forward_port_thrust.iconValue,map.forward_starboard_thrust.iconValue],[3,3]);
 assert.equal(map.retro,undefined);assert.equal(map.jump_forward_port,undefined);assert.equal(map.jump_forward_starboard,undefined);
 assert.equal(map.sensors.armour,6);assert.equal(map.sensors.iconValue,8);assert.equal(map.sensors.powerRequired,4);
 assert.equal(map.reactor.armour,7);
 assert.equal(map.plasma_forward.mountNumber,1);
 assert.deepEqual([map.twin_nose_port.mountNumber,map.twin_nose_starboard.mountNumber],[2,3]);
 assert.equal(map.engine.iconValue,10);
 assert.equal(map.reactor.iconValue,undefined);
 assert.equal(map.hangar.iconValue,2);
});
test('data verification is complete while combat integration remains explicitly incomplete',()=>{
 const audit=auditVorchanIdentification();assert.equal(audit.readyForCombat,true);
 assert.equal(SCS.completeness.allWeaponArcsIdentified,true);
 assert.equal(SCS.completeness.allDamageBoxesCounted,true);
 assert.equal(audit.shipDataVerified,true);
});
test('Vorchan baseline reactor budget and all-three-mount deactivation',()=>{
 const trial=newVorchanTrialState('a','b',2,3,0);
 assert.equal(vorchanPowerBudget({trial,turn:1,purchasedThrust:2}).availableThrust,12);
 const all=LIB.weaponMounts.map(m=>m.id);
 const budget=vorchanPowerBudget({trial,turn:1,deactivated:all,purchasedThrust:6});
 assert.equal(budget.availablePower,13);
 assert.equal(budget.unusedPower,1);
});

test('aft flanking nozzle symbols are thrust, centre striped symbol is jump engine',()=>{
 const byId=Object.fromEntries(SCS.systems.map(s=>[s.id,s]));
 for(const id of ['aft_port_thrust','aft_starboard_thrust']){
  assert.equal(byId[id].kind,'thruster');assert.equal(byId[id].iconValue,5);
  assert.equal(byId[id].boxes,8);
 }
 assert.equal(byId.jump_aft_centre.kind,'jump-engine');
 assert.equal(byId.jump_aft_centre.boxes,16);
});
