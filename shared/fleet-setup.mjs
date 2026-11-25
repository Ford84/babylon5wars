import {getBuiltinShip} from './ship-catalog.mjs';
import {MAP_PRESETS} from './battle-setup.mjs';
import {hexDistance} from './phases.mjs';
import {SENTRI_FLIGHT_DATA,RAZIK_FLIGHT_DATA,newFighterFlight} from './centauri-combat-data.mjs';
export const FIGHTER_PURCHASE_OPTIONS=[SENTRI_FLIGHT_DATA,RAZIK_FLIGHT_DATA];
export function fighterPurchase(ship,selection={}){
 if(!selection||typeof selection!=='object'||Array.isArray(selection))throw new RangeError('Invalid fighter selection');
 const capacity=ship?.hangar?.fighters||0;
 let count=0,points=0;const flights=[];
 for(const [id,n] of Object.entries(selection)){
  const data=FIGHTER_PURCHASE_OPTIONS.find(x=>x.id===id);
  if(!data||!Number.isInteger(n)||n<0||n>Math.floor(capacity/6))throw new RangeError('Invalid fighter flight purchase');
  count+=n*6;points+=n*data.fullFlightCombatPoints;
  if(count>capacity)throw new RangeError('Fighter hangar capacity exceeded');
  for(let i=0;i<n;i++)flights.push(newFighterFlight(id));
 }
 return {count,points,flights};
}
export function fleetEntryPoints(entry){const ship=getBuiltinShip(entry.catalogId);return (ship?.combatPoints||0)+fighterPurchase(ship,entry.fighterFlights??{}).points;}
export const DEPLOYMENT_MODES=['free','meeting'];
export function fleetTotals(entries,members){return members.map(m=>({ownerId:m.user_id,ships:entries.filter(x=>x.ownerId===m.user_id).map(x=>({...x,points:fleetEntryPoints(x)})),points:entries.filter(x=>x.ownerId===m.user_id).reduce((n,x)=>n+fleetEntryPoints(x),0)}));}
export function validateFleet(entries,members,mapPreset,mode='free'){
 if(!DEPLOYMENT_MODES.includes(mode)||!Array.isArray(entries)||entries.length<2||entries.length>24||members.length!==2)throw new RangeError('Choose a deployment mode and 1–12 ships per fleet');
 const map=MAP_PRESETS[mapPreset];if(!map)throw new RangeError('Unknown map');
 for(const m of members){const n=entries.filter(x=>x.ownerId===m.user_id).length;if(n<1||n>12)throw new RangeError('Each player needs 1–12 ships');}
 for(const x of entries){const ship=getBuiltinShip(x.catalogId);if(!ship?.selectable||!ship.automaticCombatReady||!members.some(m=>m.user_id===x.ownerId))throw new RangeError('Choose a verified ship and a battle player');
  fighterPurchase(ship,x.fighterFlights??{});
  if(![x.q,x.r,x.facing,x.speed??0].every(Number.isInteger)||x.q<0||x.q>=map.columns||x.r<0||x.r>=map.rows||x.facing<0||x.facing>5||Math.abs(x.speed??0)>10)throw new RangeError('Choose a starting hex, facing and speed from −10 to 10');
  if(mode==='meeting'){const side=members.findIndex(m=>m.user_id===x.ownerId);if(x.r!==(side===0?0:map.rows-1)||(x.speed??0)<0)throw new RangeError('Meeting Engagement deploys on opposing top and bottom edges, at speeds 0–10');}
 }
 if(mode==='meeting')for(const a of entries.filter(x=>x.ownerId===members[0].user_id))for(const b of entries.filter(x=>x.ownerId===members[1].user_id))if(hexDistance(a,b)<30)throw new RangeError('Meeting Engagement fleets must start at least 30 hexes apart');
 return entries.map(x=>({...x,speed:x.speed??0,fighterFlights:{...x.fighterFlights}}));
}
export function defaultFleetPosition(side,index,mapPreset,mode){const m=MAP_PRESETS[mapPreset];return mode==='meeting'?{q:Math.min(m.columns-1,side===0?index:m.columns-1-index),r:side===0?0:m.rows-1,facing:side===0?2:5,speed:0}:{q:Math.min(m.columns-1,side===0?3:15),r:Math.min(m.rows-1,10+index*2),facing:side===0?0:3,speed:0};}
