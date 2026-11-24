import {VORCHAN_SCS_IDENTIFICATION as SCS} from './vorchan-scs-identification.mjs';
export function scsDamageMarkers(damage){
 return SCS.systems.flatMap(system=>system.damageBoxes.slice(0,Math.max(0,Math.min(system.boxes,Math.floor(damage?.tracks?.[system.id]?.marked||0)))).map(box=>({...box,systemId:system.id})));
}
