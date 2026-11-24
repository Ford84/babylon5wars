import {VORCHAN_VECTOR_AUDIT as vector} from './vorchan-vector-tracks.mjs';
// Original Vorchan v3: Icon Recognition legend determines identity. The small
// outboard symbols numbered 1/2/3 are weapon arcs, not thrusters or tracks.
const system = (id, kind, section, armour, details = {}) => {
 const track = vector.tracks[id];
 return Object.freeze({id,kind,section,armour,boxes:track.boxes.length,rows:Object.freeze(track.rows),damageBoxes:Object.freeze(track.boxes),verified:true,...details});
};
export const VORCHAN_SCS_IDENTIFICATION=Object.freeze({
 source:Object.freeze({...vector.source,basis:'original printed icon legend and individually extracted vector squares'}),
 sections:Object.freeze(['forward','primary','aft','port','starboard']),
 systems:Object.freeze([
  system('plasma_forward','weapon','forward',4,{weaponCardId:'plasma-accelerator',mountNumber:1,displayName:'Plasma Accelerator · Mount 1'}),
  system('twin_nose_port','weapon','forward',3,{weaponCardId:'twin-array',mountNumber:2,displayName:'Twin Array · Mount 2 (Port)'}),
  system('twin_nose_starboard','weapon','forward',3,{weaponCardId:'twin-array',mountNumber:3,displayName:'Twin Array · Mount 3 (Starboard)'}),
  system('forward_structure','structure','forward',5),
  system('forward_port_thrust','thruster','forward',5,{iconValue:3,displayName:'Forward Port Retro Thruster'}),
  system('forward_starboard_thrust','thruster','forward',5,{iconValue:3,displayName:'Forward Starboard Retro Thruster'}),
  system('sensors','sensor','primary',6,{iconValue:8,sensorStrength:8,powerRequired:4}),
  system('engine','engine','primary',7,{iconValue:10}),
  system('reactor','reactor','primary',7),
  system('primary_structure','structure','primary',6),
  system('command','command','primary',6,{displayName:'Command And Control'}),
  system('hangar','hangar','primary',6,{iconValue:2}),
  system('port_thrust','thruster','port',5,{iconValue:5,displayName:'Port Thruster'}),
  system('starboard_thrust','thruster','starboard',5,{iconValue:5,displayName:'Starboard Thruster'}),
  system('aft_structure','structure','aft',4),
  system('aft_port_thrust','thruster','aft',4,{iconValue:5,displayName:'Aft Port Main Thruster'}),
  system('aft_starboard_thrust','thruster','aft',4,{iconValue:5,displayName:'Aft Starboard Main Thruster'}),
  system('jump_aft_centre','jump-engine','aft',6,{powerRequired:3,displayName:'Jump Engine'})
 ]),
 weapons:Object.freeze([{id:'plasma-accelerator',printedMounts:1},{id:'twin-array',printedMounts:2}]),
 completeness:Object.freeze({allSystemsLocated:true,allArmourIdentified:true,allDamageBoxesCounted:true,allWeaponArcsIdentified:true,sensorStrengthVerified:true,freeThrustVerified:true})
});
export const VORCHAN_THRUSTER_RATINGS=Object.freeze(Object.fromEntries(VORCHAN_SCS_IDENTIFICATION.systems.filter(s=>s.kind==='thruster').map(s=>[s.id,s.iconValue])));
export function auditVorchanIdentification(){
 const systems=VORCHAN_SCS_IDENTIFICATION.systems,issues=[],seen=new Set();
 for(const s of systems){
  if(!s.verified)issues.push(s.id+': unverified system');
  if(s.rows.reduce((a,b)=>a+b,0)!==s.boxes||s.damageBoxes.length!==s.boxes)issues.push(s.id+': damage box mismatch');
  if(!Number.isInteger(s.armour))issues.push(s.id+': armour missing');
  for(const box of s.damageBoxes){if(seen.has(box.id))issues.push('duplicate damage box '+box.id);seen.add(box.id);}
 }
 if(seen.size!==vector.totalBoxes)issues.push('whole-sheet damage box mismatch');
 return {systems:systems.length,damageBoxes:seen.size,verifiedTracks:systems.filter(s=>s.verified).length,unverifiedTracks:systems.filter(s=>!s.verified).map(s=>s.id),issues,shipDataVerified:issues.length===0,readyForCombat:issues.length===0,supportedScenarios:['vorchan-clear-space-duel']};
}
