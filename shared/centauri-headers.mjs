// Source-backed Centauri SCS header catalogue. These are NOT combat-ready sheets:
// individual armour, damage boxes, arcs and weapon mounts still require verification.
export const CENTAURI_HEADERS = Object.freeze([
 {id:'centauri-primus-v3-2e-sf',faction:'Centauri Republic',name:'Primus Battlecruiser',kind:'capital',source:{archive:'centauri_official.zip',path:'Ships of the Fleet/centauri primus battlecruiser.pdf',revision:'Version 3: 2E/SF'},serviceYear:2202,pointValue:830,rammingFactor:260,jumpDelay:16,defence:{forward:16,aft:16,port:17,starboard:17},initiativeBonus:0,extraPower:0,engineEfficiency:'2/1',accelerationCost:3,pivotCost:'3+3',rollCost:'2+2',turnCost:[1,2,2,3,4,4,5,6,6,7,8,8],turnDelay:[1,2,2,3,4,4,5,6,6,7,8,8],hangar:{fighters:12,shuttles:2,shuttleThrust:3}},
 {id:'centauri-vorchan-v3-2e-sf',faction:'Centauri Republic',name:'Vorchan Warship',kind:'heavy_combat',source:{archive:'centauri_official.zip',path:'Ships of the Fleet/centauri vorchan warship.pdf',revision:'Version 3: 2E/SF'},serviceYear:2160,pointValue:360,rammingFactor:135,jumpDelay:16,defence:{forward:12,aft:12,port:14,starboard:14},initiativeBonus:8,extraPower:4,engineEfficiency:'2/1',accelerationCost:2,pivotCost:'2+2',rollCost:'1+1',turnCost:[1,1,2,2,3,3,4,4,5,5,6,6],turnDelay:[1,1,1,2,2,2,3,3,3,4,4,4],hangar:{fighters:0,shuttles:2,shuttleThrust:4}},
 {id:'centauri-sentri-v3-2e-sf',faction:'Centauri Republic',name:'Sentri Medium Fighters',kind:'fighter',source:{archive:'centauri_official.zip',path:'Ships of the Fleet/centauri sentri medium fighters.pdf',revision:'Version 3: 2E/SF'},serviceYear:2202,pointValue:42,rammingFactor:21,defence:{forward:7,aft:7,port:5,starboard:5},initiativeBonus:18,freeThrust:12,accelerationCost:1,turnDelay:0,turnCostExpression:'1/3 speed',pivotCost:'1',rollCost:'1',jinkingLimit:8,offensiveBonus:7,flightSize:6}
]);
export function validateCentauriHeader(h){
 if(!h||h.faction!=='Centauri Republic'||!h.source?.path||!h.source?.revision)return false;
 if(!Number.isInteger(h.pointValue)||!Number.isInteger(h.initiativeBonus))return false;
 if(h.kind!=='fighter'&&(!Array.isArray(h.turnCost)||h.turnCost.length!==12||h.turnDelay.length!==12))return false;
 return true;
}
