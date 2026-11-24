import {MOGRATH} from './mograth.mjs';
import {VORCHAN_LIBRARY_RECORD as base} from './vorchan-trial-library.mjs';
import {MOGRATTI_VECTOR_AUDIT as vector} from './mogratti-vector-tracks.mjs';
export const MOGRATTI_ID='centauri-mogratti-v2-2e-sf';
const weapons=[structuredClone(base.weapons[0]),{...structuredClone(MOGRATH.weapons.find(w=>w.id==='matter-cannon')),mounts:2},{...structuredClone(base.weapons[1]),mounts:3}];
const weaponMounts=MOGRATH.weaponMounts.map(original=>{
 const m=structuredClone(original);
 if(m.id==='plasma_stream')Object.assign(m,{id:'plasma_forward',weaponId:'plasma-accelerator'});
 if(m.id==='guardian')Object.assign(m,{id:'twin_primary',weaponId:'twin-array',armour:4});
 return {...m,damageBoxes:vector.tracks[m.id].length,arc:{...m.arc,source:'Official Mogratti v2 numbered firing arc'}};
});
const systems=MOGRATH.scs.systems.map(original=>{
 const s=structuredClone(original),id=s.id==='plasma_stream'?'plasma_forward':s.id==='guardian'?'twin_primary':s.id,rects=vector.tracks[id],rows=new Map();
 for(const r of rects)rows.set(r[1],(rows.get(r[1])||0)+1);
 const mount=weaponMounts.find(m=>m.id===id);
 return {...s,id,boxes:rects.length,rows:[...rows.values()],damageBoxes:rects.map((rect,i)=>({id:id+':'+(i+1),rect})),...(mount?{armour:mount.armour,weaponCardId:mount.weaponId,mountNumber:mount.mountNumber,displayName:weapons.find(w=>w.id===mount.weaponId).name+' · Mount '+mount.mountNumber}:{} )};
});
const source={publication:'Centauri Mogratti Battle Frigate',revision:'Version 2: 2E/SF',page:1,sha256:vector.sourceSha256};
export const MOGRATTI={...MOGRATH,id:MOGRATTI_ID,name:'Mogratti Battle Frigate',variantOf:MOGRATH.id,rarity:'Uncommon',serviceYear:2236,combatPoints:575,extraPower:2,weapons,weaponMounts,source,scs:{...MOGRATH.scs,systems,source},scsImage:'/images/mogratti-v2-schematic.svg',hitCharts:{...MOGRATH.hitCharts,forward:MOGRATH.hitCharts.forward.map(row=>row[2]==='plasma_stream'?[row[0],row[1],'plasma_accelerator']:[...row]),primary:MOGRATH.hitCharts.primary.map(row=>row[2]==='guardian_array'?[row[0],row[1],'twin_array']:[...row])},damageDiagram:{status:'verified',verifiedIndividualBoxes:true,verifiedArmour:true,totalBoxes:vector.totalBoxes}};
export function auditMograttiIdentification(){const seen=new Set(),issues=[];for(const s of systems){if(s.rows.reduce((a,b)=>a+b,0)!==s.boxes)issues.push(s.id+': invalid rows');for(const b of s.damageBoxes){const key=b.rect.join(',');if(seen.has(key))issues.push('Duplicate '+key);seen.add(key);}}for(const m of weaponMounts){const s=systems.find(x=>x.id===m.id);if(!s||s.boxes!==m.damageBoxes||s.armour!==m.armour||!m.arc.verified)issues.push(m.id+': mount mismatch');}if(seen.size!==200)issues.push('200 original squares required');return {systems:systems.length,damageBoxes:seen.size,issues,shipDataVerified:!issues.length,readyForCombat:!issues.length};}
