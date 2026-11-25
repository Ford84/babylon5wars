import {fighterFlightData,fighterEWModifiers} from './centauri-combat-data.mjs';
import {bearingDegrees,facingDirections,lineOfSight} from './weapon-targeting.mjs';
import {hexDistance} from './phases.mjs';
// The printed fighter arc is a hex diagram. Require a verified arc predicate rather than substituting a ship arc.
export function fighterTargeting(attacker,target,{arcAllows,defenderDirection=null,blockingHexes=[],sameHexPrevious=null}={}){
 const data=fighterFlightData(attacker.flightType),range=hexDistance(attacker,target);
 const bearing=bearingDegrees(attacker,target,{sameHexPrevious});
 const incoming=facingDirections(attacker,target,{sameHexPrevious});
 const direction=incoming.requiresChoice?(incoming.choices?.includes(defenderDirection)?defenderDirection:null):incoming.direction;
 const los=lineOfSight({shooter:attacker,target,blockingHexes});
 const allowed=attacker.owner_id!==target.owner_id&&attacker.status==='deployed'&&target.status==='deployed'&&!bearing.requiresChoice&&typeof arcAllows==='function'&&arcAllows(attacker,target,bearing)===true&&los.clear;
 const ew=fighterEWModifiers({attacker,target,range});
 const defence=direction?fighterFlightData(target.flightType).defence[direction]:null;
 return {allowed,range,direction,incoming,bearing,los,ew,rangePenalty:data.weapon.rangePenaltyPerHex*range,chanceToHit:defence===null?null:defence+data.weapon.rangePenaltyPerHex*range+ew.total,ready:allowed&&direction!==null};
}
