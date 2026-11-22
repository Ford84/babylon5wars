// Official Centauri Vorchan Warship, Version 3: 2E/SF, single-page SCS.
// Printed values only. Damage-box tracks are not represented until every
// individual box and circled armour value has been verified against the art.
import {CENTAURI_HIT_CHARTS} from './centauri-combat-data.mjs';
export const VORCHAN_LIBRARY_RECORD=Object.freeze({
 id:'centauri-vorchan-v3-2e-sf',faction:'Centauri Republic',
 name:'Vorchan Warship',class:'heavy_combat',source:{publication:'Centauri Vorchan Warship SCS',revision:'Version 3: 2E/SF',page:'1'},
 serviceYear:2160,combatPoints:360,rammingFactor:135,jumpDelay:16,
 defence:{forward:12,aft:12,port:14,starboard:14},
 initiativeBonus:8,extraPower:4,engineEfficiency:{power:2,thrust:1},
 accelerationCost:2,pivotCost:[2,2],rollCost:[1,1],
 turnCost:[1,1,2,2,3,3,4,4,5,5,6,6],
 turnDelay:[1,1,1,2,2,2,3,3,3,4,4,4],
 hangar:{fighters:0,shuttles:2,shuttleThrust:4,shuttleArmour:0,shuttleDefence:[8,10]},
 weapons:[
  {id:'plasma-accelerator',name:'Plasma Accelerator',mounts:1,class:'Plasma',modes:['Standard'],
   powerRequired:5,maximumRange:null,rangePenaltyPerHex:-1,damageRangePenaltyPerHex:-1,
   damage:'4d10+12 minus 1 per hex',damageDice:{count:4,sides:10,bonus:12,perHex:-1},
   rangePenalty:'-1 per hex',fireControl:[3,1,-4],intercept:null,rateOfFire:'1 per 3 turns',
   firingOptions:[
    {shots:1,turns:3,damageDice:{count:4,sides:10,bonus:12,perHex:-1}},
    {shots:1,turns:1,damageDice:{count:1,sides:10,bonus:4,perHex:-1}},
    {shots:1,turns:2,damageDice:{count:2,sides:10,bonus:8,perHex:-1}}
   ],
   alternates:[{rateOfFire:'1 per turn',damage:'1d10+4 minus 1 per hex'},{rateOfFire:'1 per 2 turns',damage:'2d10+8 minus 1 per hex'}]},
  {id:'twin-array',name:'Twin Array',mounts:4,class:'Particle',modes:['Standard'],
   powerRequired:2,maximumRange:null,rangePenaltyPerHex:-2,damageRangePenaltyPerHex:0,
   damage:'1d10+4',damageDice:{count:1,sides:10,bonus:4,perHex:0},
   rangePenalty:'-2 per hex',fireControl:[4,5,6],intercept:-2,rateOfFire:'2 per turn',
   firingOptions:[{shots:2,turns:1,damageDice:{count:1,sides:10,bonus:4,perHex:0}}]}
 ],
 weaponMounts:[
  {id:'plasma_forward',weaponId:'plasma-accelerator',section:'forward',armour:4,damageBoxes:8,arc:{centre:'forward',degrees:90,blindDegrees:270}},
  {id:'twin_nose_port',weaponId:'twin-array',section:'forward',armour:3,damageBoxes:6,arc:null},
  {id:'twin_nose_starboard',weaponId:'twin-array',section:'forward',armour:3,damageBoxes:6,arc:null},
  {id:'twin_forward_port',weaponId:'twin-array',section:'forward',armour:5,damageBoxes:10,arc:{centre:'forward',degrees:270,blindCentre:'aft',blindDegrees:90}},
  {id:'twin_forward_starboard',weaponId:'twin-array',section:'forward',armour:5,damageBoxes:10,arc:{centre:'forward',degrees:270,blindCentre:'aft',blindDegrees:90}}
 ],
 hitCharts:CENTAURI_HIT_CHARTS['centauri-vorchan-v3-2e-sf'],
 // The full system diagram remains to be transcribed: do not fabricate boxes.
 damageDiagram:{status:'incomplete',verifiedIndividualBoxes:false,verifiedArmour:false},
 completeForAutomaticCombat:false
});
export function validateVorchanLibraryRecord(record){
 const problems=[];
 if(record.id!=='centauri-vorchan-v3-2e-sf')problems.push('wrong ship');
 if(record.extraPower!==4)problems.push('extra reactor power mismatch');
 if(record.engineEfficiency?.power!==2||record.engineEfficiency?.thrust!==1)problems.push('engine efficiency mismatch');
 if(record.accelerationCost!==2||record.initiativeBonus!==8)problems.push('movement/initiative mismatch');
 if(record.turnCost?.length!==12||record.turnDelay?.length!==12)problems.push('missing speed tables');
 if(record.weapons?.length!==2||record.weapons[0].mounts!==1||record.weapons[1].mounts!==4)problems.push('weapon inventory mismatch');
 if(!record.hitCharts?.forward||!record.hitCharts?.aft||!record.hitCharts?.primary)problems.push('hit charts missing');
 return {valid:problems.length===0,problems,automaticCombatReady:record.damageDiagram?.verifiedIndividualBoxes===true&&record.damageDiagram?.verifiedArmour===true};
}
export function newVorchanTrialState(id,ownerId,q,r,facing){
 if(typeof id!=='string'||!id||typeof ownerId!=='string'||!ownerId||![q,r,facing].every(Number.isInteger)||facing<0||facing>5)throw new RangeError('Invalid trial ship');
 return {id,ownerId,libraryId:VORCHAN_LIBRARY_RECORD.id,q,r,facing,speed:0,
  initiative:null,ew:{defensive:0,offensive:{}},power:{extraThrust:0,powerSpent:0},
  systemDamage:{},weaponsFired:{},version:0};
}
export function vorchanThrustPreview(purchased){
 if(!Number.isInteger(purchased)||purchased<0)throw new RangeError('Invalid thrust');
 return {purchased,powerRequired:purchased*VORCHAN_LIBRARY_RECORD.engineEfficiency.power,accelerationThrustPerSpeed:VORCHAN_LIBRARY_RECORD.accelerationCost};
}
