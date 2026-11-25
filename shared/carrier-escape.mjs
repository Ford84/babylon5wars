import {fighterFlightData} from './centauri-combat-data.mjs';
export function escapeAllowance(count,roll){
 if(!Number.isInteger(count)||count<0||!Number.isInteger(roll)||roll<1||roll>20)throw new RangeError('Invalid escape roll');
 return roll<=5?0:roll<=10?Math.floor(count/4):roll<=18?Math.floor(count/2):count;
}
export function carrierEscapeOptions(s,ship,roll){
 const craft=[...(s.shuttles||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard').map(x=>({id:x.id,label:x.label})),...(s.fighterFlights||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard').flatMap(f=>f.fighters.filter(x=>!x.destroyed).map(x=>({id:f.id+':'+x.slot,label:f.label+' / '+x.slot})))];
 return {carrierId:ship.id,actorId:ship.owner_id,roll,craft,count:escapeAllowance(craft.length,roll)};
}
export function applyCarrierEscape(s,options,playerId,selected){
 if(playerId!==options.actorId||!Array.isArray(selected)||selected.length!==options.count||new Set(selected).size!==selected.length||selected.some(id=>!options.craft.some(x=>x.id===id)))throw new RangeError('Select the permitted surviving craft');
 const ship=s.ships.find(x=>x.id===options.carrierId);
 const launch={status:'deployed',q:ship.q,r:ship.r,facing:ship.facing,motionFacing:ship.private_state?.trial?.movement?.state?.motionFacing??ship.facing,speed:ship.speed,launchedTurn:s.turn,escapedTurn:s.turn};
 for(const x of (s.shuttles||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard')){if(selected.includes(x.id))Object.assign(x,launch);else Object.assign(x,{status:'destroyed',damage:10});}
 for(const f of (s.fighterFlights||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard')){for(const x of f.fighters){if(!selected.includes(f.id+':'+x.slot)){x.destroyed=true;x.damage=fighterFlightData(f.flightType).structureBoxes;}}if(f.fighters.some(x=>!x.destroyed))Object.assign(f,launch);else f.status='destroyed';}
 return s;
}
