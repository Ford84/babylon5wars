import {hullSystems} from './vorchar.mjs';
export function scsDamageMarkers(damage,libraryId=damage?.libraryId){
 return hullSystems(libraryId).flatMap(system=>system.damageBoxes.slice(0,Math.max(0,Math.min(system.boxes,Math.floor(damage?.tracks?.[system.id]?.marked||0)))).map(box=>({...box,systemId:system.id})));
}
