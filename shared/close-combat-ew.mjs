import {hexDistance} from './phases.mjs';
export function closeCombatTargets(ship,flights){
 return flights.filter(f=>f.owner_id!==ship.owner_id&&f.status==='deployed'&&hexDistance(ship,f)<=10);
}
export function allocateCloseCombatEW(ship,flights,reserved,allocation={}){
 if(!Number.isInteger(reserved)||reserved<0||!allocation||typeof allocation!=='object'||Array.isArray(allocation))throw new RangeError('Invalid CCEW allocation');
 const eligible=new Set(closeCombatTargets(ship,flights).map(f=>f.id));
 let spent=0;
 for(const [id,n] of Object.entries(allocation)){
  if(!eligible.has(id)||!Number.isInteger(n)||n<0)throw new RangeError('Invalid CCEW target or points');
  spent+=n;
 }
 if(spent>reserved)throw new RangeError('CCEW exceeds reserved sensor points');
 return {reserved,spent,unallocated:reserved-spent,targets:{...allocation}};
}
