import {MOGRATH,auditMograthIdentification} from './mograth.mjs';
import {VORCHAR,auditVorcharIdentification} from './vorchar.mjs';
import {VORCHAN_LIBRARY_RECORD,validateVorchanLibraryRecord} from './vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION,auditVorchanIdentification} from './vorchan-scs-identification.mjs';

// Built-in, versioned, source-backed ship catalogue. Do not treat incomplete
// structural tracks as verified or substitute fabricated hit points.
export const BUILTIN_SHIP_CATALOG=Object.freeze([Object.freeze({
 ...VORCHAN_LIBRARY_RECORD,
 scs:VORCHAN_SCS_IDENTIFICATION,
 verification:{...auditVorchanIdentification(),library:validateVorchanLibraryRecord(VORCHAN_LIBRARY_RECORD)},
 selectable:true,
 automaticCombatReady:true,
 supportedScenarios:Object.freeze(['vorchan-clear-space-duel']),
}),Object.freeze({...VORCHAR,verification:auditVorcharIdentification()}),Object.freeze({...MOGRATH,verification:auditMograthIdentification()})]);
export function getBuiltinShip(id){return BUILTIN_SHIP_CATALOG.find(s=>s.id===id)||null;}
export function listBuiltinShips(){return BUILTIN_SHIP_CATALOG.map(({id,name,faction,source,dataRevision,sensorStrength,elint,combatPoints,defence,initiativeBonus,weapons,weaponMounts,scs,verification,selectable,automaticCombatReady,supportedScenarios})=>({id,name,faction,source,dataRevision,sensorStrength,elint,combatPoints,defence,initiativeBonus,weapons,weaponMounts,systems:scs.systems.map(({id,kind,section,armour,boxes,rows,verified})=>({id,kind,section,armour,boxes,rows,verified})),verification,selectable,automaticCombatReady,supportedScenarios}));}
