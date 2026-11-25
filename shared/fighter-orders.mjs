import {fighterFlightStatus} from './centauri-combat-data.mjs';
export function commitFighterOrders(flights,commitments,playerId,orders,geometry){
 if(Object.hasOwn(commitments,playerId)||!Array.isArray(orders))throw new RangeError('Invalid or already committed fighter orders');
 const active=flights.filter(f=>f.status==='deployed'&&fighterFlightStatus(f).activeCount>0),own=active.filter(f=>f.owner_id===playerId),seen=new Set();
 const validated=orders.map(o=>{
  const a=own.find(f=>f.id===o.attackerId),b=active.find(f=>f.id===o.targetId&&f.owner_id!==playerId);
  if(!a||!b||seen.has(a.id)||!geometry(a,b).allowed)throw new RangeError('Illegal fighter attack');
  seen.add(a.id);return {attackerId:a.id,targetId:b.id};
 });
 return {...commitments,[playerId]:validated};
}
export function fighterOrdersReady(flights,commitments){
 return flights.filter(f=>f.status==='deployed'&&fighterFlightStatus(f).activeCount>0).every(f=>Object.hasOwn(commitments,f.owner_id));
}
export function fighterOrdersView(flights,commitments,playerId){
 const ready=fighterOrdersReady(flights,commitments);
 return {ready,committed:Object.hasOwn(commitments,playerId),orders:ready?Object.values(commitments).flat():commitments[playerId]||[]};
}
