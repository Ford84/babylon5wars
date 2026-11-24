import {elintAttackEffects} from './elint.mjs';
import {hullProfile} from './vorchar.mjs';
import {effectiveCondition} from './ship-condition.mjs';
// W4: deterministic, replayable Vorchan ship-weapon attack resolution.
// B5W 2E Combat Sequence: ship tier is simultaneous; damage is a separate step.
// This module never changes ship damage or invents defensive interception dice.
import {vorchanTargetingPreview,resolveToHit} from './weapon-targeting.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {interceptModifiers} from './weapon-interception.mjs';
const mountById=new Map(LIB.weaponMounts.map(x=>[x.id,x]));
export const attackId=s=>[s.shipId,s.mountId,s.gun].join(':');
export function initialWeaponHistory(turn=1,libraryId=LIB.id){
 if(!Number.isInteger(turn)||turn<1)throw new RangeError('Invalid turn');
 return Object.fromEntries(hullProfile(libraryId).weaponMounts.map(m=>[m.id,Object.fromEntries(Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>[i+1,{lastFiredTurn:0,lastActivatedTurn:turn}]))]));
}
export function resolveVorchanShipFire({turn,ships,declarations,defences,rolls,blockingHexes=[],terrainVerified=false,defenderChoices={},ewSnapshot,elintDisruptions=[]}){
 if(!Number.isInteger(turn)||turn<1||!Array.isArray(ships)||!Array.isArray(declarations)||!Array.isArray(defences)||!Array.isArray(rolls))throw new RangeError('Invalid fire resolution');
 const byId=new Map(ships.map(s=>[s.id,s]));
 const defenceMap=new Map(defences.flatMap(d=>(d.defence?.assignments||[]).map(a=>[a.attackId,a])));
 const rollMap=new Map(rolls.map(r=>[r.attackId,r.roll]));
 const intercepts=interceptModifiers({declarations,defences});
 const seen=new Set(),results=[];
 const shots=declarations.flatMap(d=>d.fire.shots.filter(s=>s.role==='offensive').map(s=>({...s,playerId:d.playerId})));
 for(const shot of shots){
  const id=attackId(shot),source=byId.get(shot.shipId),target=byId.get(shot.targetId),mount=hullProfile(source?.public_state?.libraryId)?.weaponMounts.find(m=>m.id===shot.mountId);
  if(seen.has(id)||!mount||!source||!target)throw new RangeError('Duplicate or invalid attack');
  seen.add(id);
  const blockers=[],weapon=hullProfile(source.public_state.libraryId).weapons.find(w=>w.id===mount.weaponId);
  const trial=source.private_state?.trial;
  if(trial?.condition?.effects.weapons[shot.mountId]?.destroyedGuns?.includes(shot.gun))blockers.push('Gun destroyed by a critical hit');
  if(!trial||!hullProfile(trial.libraryId)?.weaponMounts.some(m=>m.id===shot.mountId))blockers.push('Missing authoritative Vorchan state');
  if(trial?.destroyedSystems?.includes(shot.mountId))blockers.push('Destroyed weapon');
  if(trial?.powerAllocation?.deactivated?.includes(shot.mountId))blockers.push('Weapon deactivated');
  const history=trial?.weaponReadiness?.[shot.mountId]?.[shot.gun];
  if(!history||!Number.isInteger(history.lastFiredTurn)||!Number.isInteger(history.lastActivatedTurn))blockers.push('Missing per-gun arming history');
  else if(turn<=history.lastFiredTurn||turn<history.lastActivatedTurn)blockers.push('Gun not ready');
  else if(weapon.armingTurns>1&&(turn-history.lastFiredTurn<weapon.armingTurns||turn-history.lastActivatedTurn+1<weapon.armingTurns))blockers.push('Weapon rearming');
  else if(mount.weaponId==='plasma-accelerator'&&turn-history.lastFiredTurn<shot.chargeTurns)blockers.push('Plasma insufficiently charged');
  const attackerEW=trial?.ewAllocation?.turn===turn?trial.ewAllocation.offensive?.[target.kind==='shuttle'?target.carrierId+'-shuttle-flight':target.id]??0:null;
  const defenderEW=target.kind==='shuttle'?0:target.private_state?.trial?.ewAllocation?.turn===turn?target.private_state.trial.ewAllocation.defensive:null;
  if(attackerEW===null||defenderEW===null)blockers.push('Missing committed EW');
  const condition=trial?.condition?effectiveCondition(trial,turn):null;
  const effects=condition?.weapons?.[shot.mountId];
  const otherModifiers=condition?.fireModifier?[{value:condition.fireModifier,verified:true,reason:'Ship condition and manoeuvres'}]:[];
  const defenderDirection=defenderChoices[source.id+':'+target.id]??null;
  let preview=null;
  const targetLibraryId=target.public_state?.libraryId;
  const targetHullClass=hullProfile(targetLibraryId)?.class??target.public_state?.hullClass;
  const sourceLibraryId=source.public_state?.libraryId;
  const sourceHullClass=hullProfile(sourceLibraryId)?.class??source.public_state?.hullClass;
  try{
   const args={shooter:{...source,libraryId:sourceLibraryId,hullClass:sourceHullClass},target:{...target,libraryId:targetLibraryId,hullClass:targetHullClass},mountId:shot.mountId,rangePenaltyAdjustment:effects?.rangeLoss||0,otherModifiers,blockingHexes,verifiedTerrain:terrainVerified,defenderDirection,attackerOffensiveEW:attackerEW??0,targetDefensiveEW:defenderEW??0};
   preview=vorchanTargetingPreview(args);
   const elint=elintAttackEffects({shooter:source,target,units:ships,initial:ewSnapshot||ships,disruptions:elintDisruptions,baseDefence:preview.breakdown.baseDefence??0});
   preview=vorchanTargetingPreview({...args,attackerOffensiveEW:elint.ownOffensive,elintOffensive:elint.offensive,elintDefensive:elint.defensive,disruptedEW:elint.disrupted});
   preview.breakdown.elintSources=elint;blockers.push(...preview.blockers);
  }catch(e){blockers.push('Targeting unavailable: '+e.message)}
  const defensive=defenceMap.get(id)??null;
  const intercept=intercepts[id]??{total:0,contributions:[]};
  const roll=rollMap.get(id);
  if(!Number.isInteger(roll)||roll<1||roll>20)blockers.push('Attacker d20 roll missing');
  const uniqueBlockers=[...new Set(blockers)];
  const effectivePreview=preview?.readyForHitRoll?{...preview,hitOnD20AtOrBelow:preview.hitOnD20AtOrBelow+intercept.total}:preview;
  const result=uniqueBlockers.length?null:resolveToHit(effectivePreview,roll);
  results.push({id,tier:'ship',shipId:source.id,targetId:target.id,mountId:shot.mountId,gun:shot.gun,mode:shot.mode||'Standard',order:shot.order,chargeTurns:shot.chargeTurns??null,defensive,intercept,roll:result?.roll??null,targetNumber:effectivePreview?.hitOnD20AtOrBelow??null,hit:result?.hit??null,blockers:uniqueBlockers,breakdown:preview?.breakdown??null,damageApplied:false});
 }
 results.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 return {turn,tier:'ship',simultaneous:true,results,complete:results.every(r=>r.blockers.length===0),damageApplied:false,requiresDamageResolution:true};
}
