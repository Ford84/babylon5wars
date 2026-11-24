import {effectiveCondition} from './ship-condition.mjs';
// Vorchan 2E/SF SCS weapon readiness preflight; pure, conservative and non-mutating.
// Do not infer charge/cooldown progress from a missing authoritative weapon history.
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from './vorchan-scs-identification.mjs';
import {VORCHAN_SWITCHABLE_POWER} from './vorchan-power-economy.mjs';
export function vorchanWeaponInventory(){
 return LIB.weaponMounts.map(m=>{
  const weapon=LIB.weapons.find(w=>w.id===m.weaponId);
  const system=SCS.systems.find(s=>s.id===m.id);
  return {mountId:m.id,weaponId:weapon.id,name:weapon.name,section:m.section,armour:system?.armour??null,damageBoxes:system?.boxes??null,individualGuns:weapon.id==='twin-array'?2:1,powerRequired:VORCHAN_SWITCHABLE_POWER[m.id],firingArcVerified:!!m.arc?.verified,weapon};
 });
}
export function auditVorchanWeapons(){
 const problems=[];
 const mounts=vorchanWeaponInventory();
 if(mounts.length!==3||mounts.filter(m=>m.weaponId==='twin-array').length!==2||mounts.filter(m=>m.weaponId==='plasma-accelerator').length!==1)problems.push('Weapon count differs from original SCS');
 for(const mount of mounts){
  const system=SCS.systems.find(s=>s.id===mount.mountId);
  if(!system||system.kind!=='weapon'||!system.verified)problems.push(mount.mountId+': SCS track unverified');
  if(system&&(system.boxes!==mount.damageBoxes||system.armour!==mount.armour))problems.push(mount.mountId+': SCS track mismatch');
  if(!mount.firingArcVerified)problems.push(mount.mountId+': firing arc not verified');
 }
 if(mounts.some(m=>!m.firingArcVerified))problems.push('Weapon firing arcs incomplete');
 if(!SCS.completeness.allDamageBoxesCounted)problems.push('Whole-ship SCS damage-box audit incomplete');
 return {inventory:mounts,problems,readyForAutomaticFire:problems.length===0};
}
export function weaponReadiness({mountId,turn,trial,gun=1,chargeTurns=null}){
 const mount=vorchanWeaponInventory().find(m=>m.mountId===mountId);
 if(!mount)throw new RangeError('Unknown Vorchan weapon mount');
 if(!Number.isInteger(turn)||turn<1||!Number.isInteger(gun)||gun<1||gun>mount.individualGuns)throw new RangeError('Invalid weapon turn or gun');
 const reasons=[];
 if(trial?.condition){const condition=effectiveCondition(trial,turn);if(condition.shipDestroyed)reasons.push('Ship destroyed');if(condition.commandDisabled)reasons.push('Command systems disabled');if(condition.powerOff)reasons.push('Reactor shut down');}

 if(!trial||trial.libraryId!==LIB.id)reasons.push('Authoritative Vorchan SCS state missing');
 if(trial?.condition?.effects.weapons[mountId]?.destroyedGuns?.includes(gun))reasons.push('Gun destroyed by a critical hit');
 if(trial?.destroyedSystems?.includes(mountId))reasons.push('Mount destroyed');
 if(trial?.powerAllocation?.deactivated?.includes(mountId))reasons.push('Mount deactivated');
 if(!mount.firingArcVerified)reasons.push('Physical SCS firing arc unverified');
 const state=trial?.weaponReadiness?.[mountId]?.[gun];
 if(!state||!Number.isInteger(state.lastFiredTurn)||!Number.isInteger(state.lastActivatedTurn))reasons.push('Authoritative per-gun arming history unavailable');
 if(mount.weaponId==='plasma-accelerator'&&(!Number.isInteger(chargeTurns)||chargeTurns<1||chargeTurns>3))reasons.push('Choose one-, two- or three-turn plasma charge');
 if(state&&Number.isInteger(chargeTurns)&&(turn-state.lastFiredTurn<chargeTurns||turn-state.lastActivatedTurn+1<chargeTurns))reasons.push('Plasma weapon has not armed for chosen firing interval');
 if(state&&turn<=state.lastFiredTurn)reasons.push('Gun has already fired this turn');
 return {mountId,gun,turn,ready:reasons.length===0,reasons,individualGuns:mount.individualGuns,chargeTurns:mount.weaponId==='plasma-accelerator'?chargeTurns:null};
}
