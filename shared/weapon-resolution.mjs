// W4: deterministic, replayable Vorchan ship-weapon attack resolution.
// B5W 2E Combat Sequence: ship tier is simultaneous; damage is a separate step.
// This module never changes ship damage or invents defensive interception dice.
import {vorchanTargetingPreview,resolveToHit} from './weapon-targeting.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
const mountById=new Map(LIB.weaponMounts.map(x=>[x.id,x]));
export const attackId=s=>[s.shipId,s.mountId,s.gun].join(':');
export function initialWeaponHistory(turn=1){
 if(!Number.isInteger(turn)||turn<1)throw new RangeError('Invalid turn');
 return Object.fromEntries(LIB.weaponMounts.map(m=>[m.id,Object.fromEntries(Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>[i+1,{lastFiredTurn:0,lastActivatedTurn:turn}]))]));
}
export function resolveVorchanShipFire({turn,ships,declarations,defences,rolls,blockingHexes=[],terrainVerified=false,defenderChoices={}}){
 if(!Number.isInteger(turn)||turn<1||!Array.isArray(ships)||!Array.isArray(declarations)||!Array.isArray(defences)||!Array.isArray(rolls))throw new RangeError('Invalid fire resolution');
 const byId=new Map(ships.map(s=>[s.id,s]));
 const defenceMap=new Map(defences.flatMap(d=>(d.defence?.assignments||[]).map(a=>[a.attackId,a])));
 const rollMap=new Map(rolls.map(r=>[r.attackId,r.roll]));
 const seen=new Set(),results=[];
 const shots=declarations.flatMap(d=>d.fire.shots.filter(s=>s.role==='offensive').map(s=>({...s,playerId:d.playerId})));
 for(const shot of shots){
  const id=attackId(shot),mount=mountById.get(shot.mountId),source=byId.get(shot.shipId),target=byId.get(shot.targetId);
  if(seen.has(id)||!mount||!source||!target)throw new RangeError('Duplicate or invalid attack');
  seen.add(id);
  const blockers=[],weapon=LIB.weapons.find(w=>w.id===mount.weaponId);
  const trial=source.private_state?.trial;
  if(!trial||trial.libraryId!==LIB.id)blockers.push('Missing authoritative Vorchan state');
  if(trial?.destroyedSystems?.includes(shot.mountId))blockers.push('Destroyed weapon');
  if(trial?.powerAllocation?.deactivated?.includes(shot.mountId))blockers.push('Weapon deactivated');
  const history=trial?.weaponReadiness?.[shot.mountId]?.[shot.gun];
  if(!history||!Number.isInteger(history.lastFiredTurn)||!Number.isInteger(history.lastActivatedTurn))blockers.push('Missing per-gun arming history');
  else if(turn<=history.lastFiredTurn||turn<history.lastActivatedTurn)blockers.push('Gun not ready');
  else if(mount.weaponId==='plasma-accelerator'&&turn-history.lastFiredTurn<shot.chargeTurns)blockers.push('Plasma insufficiently charged');
  const attackerEW=trial?.ewAllocation?.turn===turn?trial.ewAllocation.offensive?.[target.id]??0:null;
  const defenderEW=target.private_state?.trial?.ewAllocation?.turn===turn?target.private_state.trial.ewAllocation.defensive:null;
  if(attackerEW===null||defenderEW===null)blockers.push('Missing committed EW');
  const defenderDirection=defenderChoices[source.id+':'+target.id]??null;
  let preview=null;
  try{preview=vorchanTargetingPreview({shooter:source,target:{...target,libraryId:LIB.id,hullClass:LIB.class},mountId:shot.mountId,blockingHexes,verifiedTerrain:terrainVerified,defenderDirection,attackerOffensiveEW:attackerEW??0,targetDefensiveEW:defenderEW??0});blockers.push(...preview.blockers)}catch(e){blockers.push('Targeting unavailable: '+e.message)}
  const defensive=defenceMap.get(id)??null;
  if(defensive)blockers.push('Defensive interception awaits verified intercept procedure');
  const roll=rollMap.get(id);
  if(!Number.isInteger(roll)||roll<1||roll>20)blockers.push('Server d20 roll missing');
  const uniqueBlockers=[...new Set(blockers)];
  const result=uniqueBlockers.length?null:resolveToHit(preview,roll);
  results.push({id,tier:'ship',shipId:source.id,targetId:target.id,mountId:shot.mountId,gun:shot.gun,order:shot.order,chargeTurns:shot.chargeTurns??null,defensive,roll:result?.roll??null,targetNumber:preview?.hitOnD20AtOrBelow??null,hit:result?.hit??null,blockers:uniqueBlockers,breakdown:preview?.breakdown??null,damageApplied:false});
 }
 results.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 return {turn,tier:'ship',simultaneous:true,results,complete:results.every(r=>r.blockers.length===0),damageApplied:false,requiresDamageResolution:true};
}
