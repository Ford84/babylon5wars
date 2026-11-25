import {fighterFlightData,fighterFlightStatus,fighterEWModifiers,resolveFlightAttack,resolveFighterVolleys} from './centauri-combat-data.mjs';
const fail=m=>{throw new RangeError(m);};
export function prepareFighterExchange(flights,orders,geometry,die){
 const snapshot=structuredClone(flights),seen=new Set(),attacks=[];
 for(const order of orders){
  const a=snapshot.find(f=>f.id===order.attackerId),b=snapshot.find(f=>f.id===order.targetId);
  if(!a||!b||a.owner_id===b.owner_id||a.status!=='deployed'||b.status!=='deployed'||!fighterFlightStatus(a).activeCount||!fighterFlightStatus(b).activeCount||seen.has(a.id))fail('Invalid fighter fire order');
  seen.add(a.id);
  const g=geometry(a,b),d=fighterFlightData(a.flightType),target=fighterFlightData(b.flightType);
  if(!g.allowed||!Number.isInteger(g.range)||g.range<0||!Object.hasOwn(target.defence,g.direction))fail('Invalid firing geometry');
  const ew=fighterEWModifiers({attacker:a,target:b,range:g.range});
  const chance=target.defence[g.direction]+d.weapon.rangePenaltyPerHex*g.range+ew.total;
  const result=resolveFlightAttack(a,chance,die(20));
  const bonus=d.weapon.damage==='1d6+2'?2:1;
  const volleys=Array.from({length:result.hits},()=>Array.from({length:d.weapon.guns},()=>die(6)+bonus));
  attacks.push({attackerId:a.id,targetId:b.id,defenderId:b.owner_id,direction:g.direction,range:g.range,ew,result,volleys});
 }
 return normaliseFighterExchange({flights:snapshot,attacks,attackIndex:0,volleyIndex:0,damageLog:[]});
}
export function advanceFighterExchange(exchange,playerId,slot){
 const s=structuredClone(exchange);
 while(s.attackIndex<s.attacks.length){
  const a=s.attacks[s.attackIndex],i=s.flights.findIndex(f=>f.id===a.targetId);
  if(s.volleyIndex>=a.volleys.length||!fighterFlightStatus(s.flights[i]).activeCount){s.attackIndex++;s.volleyIndex=0;continue;}
  if(playerId!==a.defenderId)fail('Defender must select fighter');
  const r=resolveFighterVolleys(s.flights[i],{slot,direction:a.direction,volleys:a.volleys[s.volleyIndex],linked:true});
  s.flights[i]=r.flight;s.damageLog.push({attackerId:a.attackerId,targetId:a.targetId,results:r.results});s.volleyIndex++;
  break;
 }
 return normaliseFighterExchange(s);
}
export function normaliseFighterExchange(s){
 while(s.attackIndex<s.attacks.length){const a=s.attacks[s.attackIndex],f=s.flights.find(f=>f.id===a.targetId);if(s.volleyIndex<a.volleys.length&&fighterFlightStatus(f).activeCount)break;s.attackIndex++;s.volleyIndex=0;}
 return s;
}
export function fighterExchangePrompt(s){
 const a=s.attacks[s.attackIndex];if(!a)return null;
 return {actorId:a.defenderId,targetId:a.targetId,attackerId:a.attackerId,volleys:a.volleys[s.volleyIndex],slots:fighterFlightStatus(s.flights.find(f=>f.id===a.targetId)).activeSlots};
}

// Compendium: damaged fighters check dropout after the entire exchange, not between volleys.
export function finishFighterExchange(exchange,die){if(fighterExchangePrompt(exchange))fail('Resolve all damage first');const flights=structuredClone(exchange.flights),checks=[];for(const f of flights){if(f.status!=='deployed')continue;const boxes=fighterFlightData(f.flightType).structureBoxes;for(const x of f.fighters){if(x.destroyed||x.droppedOut||!x.damage||boxes-x.damage>=10)continue;const roll=die(10);if(!Number.isInteger(roll)||roll<1||roll>10)fail('Invalid dropout roll');x.droppedOut=roll>boxes-x.damage;checks.push({flightId:f.id,slot:x.slot,roll,remaining:boxes-x.damage,droppedOut:x.droppedOut});}if(fighterFlightStatus(f).eliminated)f.status='destroyed';}return {flights,checks,damageLog:exchange.damageLog};}
