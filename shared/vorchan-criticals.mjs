// 2nd Edition Rules Compendium, CRITICAL HITS, Basic Weapon Criticals.
// Pure critical resolution for the Vorchan's verified weapon tracks. Other
// system criticals must be routed through their own published charts.
import {VORCHAN_SCS_IDENTIFICATION as SCS} from './vorchan-scs-identification.mjs';
const systems=new Map(SCS.systems.map(s=>[s.id,s]));
const integer=n=>Number.isInteger(n);
export function weaponCritical({systemId,roll,marked,alreadyDestroyed=false}){
 const sys=systems.get(systemId);
 if(!sys||sys.kind!=='weapon'||!sys.verified||!integer(sys.boxes))throw new RangeError('Unverified or nonweapon critical system');
 if(!integer(roll)||roll<1||roll>20||!integer(marked)||marked<0||marked>sys.boxes)throw new RangeError('Invalid critical roll or damage');
 if(alreadyDestroyed||marked===sys.boxes||marked===0)return {eligible:false,systemId,effects:[]};
 const modified=roll+marked;
 // The printed chart omits result 13 (1–12, then 14–18). Never guess its effect.
 if(modified===13)return {eligible:true,systemId,roll,modifier:marked,modified,requiresRuleClarification:true,effects:[]};
 const range=modified>=14&&modified<=18||modified>=25;
 const damage=modified>=19;
 return {eligible:true,systemId,roll,modifier:marked,modified,effects:[...(range?['range_penalty_worsened']:[]),...(damage?['damage_minus_2_per_die_minimum_1']:[])]};
}
export function criticalCandidatesForTurn({before,after}){
 if(!before?.tracks||!after?.tracks)throw new RangeError('Damage states required');
 return SCS.systems.filter(s=>s.kind!=='structure'&&s.verified&&integer(s.boxes)&&before.tracks[s.id]&&after.tracks[s.id]&&after.tracks[s.id].marked>before.tracks[s.id].marked&&after.tracks[s.id].marked<s.boxes)
 .map(s=>({systemId:s.id,kind:s.kind,marked:after.tracks[s.id].marked,criticalChart:s.kind==='weapon'?'basic_weapon':'requires_verified_chart'}));
}
export function applyWeaponCriticalEffects({rangePenaltyPerHex,damageDice,criticalEffects=[]}){
 if(!integer(rangePenaltyPerHex)||rangePenaltyPerHex>=0||!Array.isArray(damageDice)||damageDice.some(n=>!integer(n)||n<1))throw new RangeError('Invalid weapon stats');
 if(!Array.isArray(criticalEffects)||criticalEffects.some(e=>!['range_penalty_worsened','damage_minus_2_per_die_minimum_1'].includes(e)))throw new RangeError('Unknown weapon critical effect');
 const rangeCount=criticalEffects.filter(e=>e==='range_penalty_worsened').length;
 const damageCount=criticalEffects.filter(e=>e==='damage_minus_2_per_die_minimum_1').length;
 return {rangePenaltyPerHex:rangePenaltyPerHex-rangeCount,damageDice:damageDice.map(n=>Math.max(1,n-2*damageCount))};
}
