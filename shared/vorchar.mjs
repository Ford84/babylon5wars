import {MOGRATTI} from './mogratti.mjs';
import {MOGRATH} from './mograth.mjs';
import {VORCHAN_LIBRARY_RECORD as base} from './vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION} from './vorchan-scs-identification.mjs';
import {VORCHAR_VECTOR_TRACKS} from './vorchar-vector-tracks.mjs';

export const VORCHAR_ID = 'centauri-vorchar-v2-2e-sf';

const scs = {
 ...VORCHAN_SCS_IDENTIFICATION,
 source: {publication:'Centauri Vorchar Warscout', revision:'Version 2: 2E/SF', page:1,sha256:'be22e5eed91450be9d4479997d158b0a45a4434810e2d8247cdd765788a054c0'},
 // Power diamond 2 is power per mount; the numbered diagram has three Twin Arrays.
 systems: VORCHAN_SCS_IDENTIFICATION.systems.map(original=>{
  const system=original.id==='plasma_forward'?{...original,id:'twin_nose_centre',armour:3,weaponCardId:'twin-array',mountNumber:1,displayName:'Twin Array · Mount 1 (Nose)'}:original;
  const boxes=VORCHAR_VECTOR_TRACKS[system.id];
  const rows=new Map();for(const box of boxes)rows.set(box[1],[...(rows.get(box[1])||[]),box]);
  return {...system,boxes:boxes.length,rows:[...rows.values()].map(row=>row.length),
   damageBoxes:boxes.map((rect,index)=>({id:system.id+':'+(index+1),rect})),
   ...(system.id==='sensors'?{iconValue:10,sensorStrength:10,powerRequired:7}:{}),
   ...(system.kind==='weapon'?{mountNumber:system.mountNumber,displayName:system.displayName}:{}),
  };
 }),
 weapons:[{id:'twin-array',printedMounts:3}]
};

export const VORCHAR = {
 ...base,id:VORCHAR_ID,name:'Vorchar Warscout',source:scs.source,dataRevision:1,serviceYear:2177,
 combatPoints:500,extraPower:6,sensorStrength:10,elint:true,scs,
 hitCharts:{...base.hitCharts,forward:[[1,4,'retro_thrust'],[5,9,'twin_array'],[10,18,'forward_structure'],[19,20,'primary']]},
 weapons:base.weapons.filter(weapon=>weapon.id==='twin-array').map(weapon=>({...weapon,mounts:3})),
 weaponMounts:[{...base.weaponMounts[1],id:'twin_nose_centre',mountNumber:1},...base.weaponMounts.filter(mount=>mount.weaponId==='twin-array')].map(mount=>({...mount,arc:{...mount.arc,source:'Vorchar v2 SCS numbered Twin Array arc'}})),
 damageDiagram:{status:'verified',verifiedIndividualBoxes:true,verifiedArmour:true,totalBoxes:scs.systems.reduce((n,system)=>n+system.boxes,0)},
 selectable:true,automaticCombatReady:true
};

const vorchan = {...base,scs:VORCHAN_SCS_IDENTIFICATION};
export function hullProfile(id){
 if(id===MOGRATTI.id)return MOGRATTI;
 if(id===MOGRATH.id)return MOGRATH;
 if(id===VORCHAR_ID)return VORCHAR;
 if(id===base.id)return vorchan;
 return null;
}

export function hullSystems(id){
 return (hullProfile(id)||vorchan).scs.systems;
}

export function auditVorcharIdentification(){
 const issues=[],seen=new Set();
 for(const system of scs.systems){
  if(system.boxes!==system.damageBoxes.length||system.rows.reduce((a,b)=>a+b,0)!==system.boxes)issues.push(system.id+': box count mismatch');
  for(const box of system.damageBoxes){const key=box.rect.join(',');if(seen.has(key))issues.push('Duplicate square '+key);seen.add(key);}
 }
 for(const mount of VORCHAR.weaponMounts){const system=scs.systems.find(s=>s.id===mount.id);if(system?.boxes!==mount.damageBoxes||system?.armour!==mount.armour||!mount.arc.verified)issues.push(mount.id+': unverified mount');}
 if(seen.size!==281)issues.push('Original sheet has 281 damage squares');
 return {systems:scs.systems.length,damageBoxes:seen.size,issues,shipDataVerified:!issues.length,readyForCombat:!issues.length};
}

export const hullThrusters=id=>Object.fromEntries(hullSystems(id).filter(s=>s.kind==='thruster').map(s=>[s.id,s.iconValue]));
export const hullWeapon=(libraryId,mountId)=>{const h=hullProfile(libraryId)||vorchan,m=h.weaponMounts.find(x=>x.id===mountId);return h.weapons.find(w=>w.id===m?.weaponId);};
