import {fighterFlightData} from './centauri-combat-data.mjs';
import {fighterPurchase} from './fleet-setup.mjs';
import {guardianPowerMode} from './guardian-array.mjs';
import {elintBudget,validateElint,fixedEWForUnits,ewPositionSnapshot,disruptionQueue,selectDisruption} from './elint.mjs';
import {hullProfile,hullSystems} from './vorchar.mjs';
import {enableOperations,activeShuttles,activeSmallCraft,activeFighterFlights,newFighterMovement,moveFighter,fighterCombatPivot,currentMover,shuttleCombatUnit,shuttleView,jumpAvailability,hangarOptions,applyHangar,jumpCheck,openJumpPoint,checkPointRange,noteEntry,entryOptions,enterJump,closePoint,vortexClosure,newShuttleMovement,moveShuttle} from './vorchan-operations.mjs';
import {movementHeading} from './movement-rules.mjs';
import {beginCriticals,advanceCriticals,criticalView} from './guided-criticals.mjs';
import {commitMovement} from './movement-commit.mjs';
import {beginGuidedCombat,advanceGuidedCombat,guidedCombatView} from './guided-combat.mjs';
import {movementOptions} from './movement-options.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {MAP_PRESETS} from './battle-setup.mjs';
import {rollVorchanDamage} from './vorchan-damage.mjs';
import {initialWeaponHistory,resolveVorchanShipFire,attackId} from './weapon-resolution.mjs';
import {validateFireDeclaration,validateDefensiveAssignment} from './fire-orders.mjs';
import {adjudicateVorchanShipTier} from './vorchan-tier-adjudicator.mjs';
import {weaponReadiness} from './weapon-readiness.mjs';
import {facingDirections,checkMountArc as __arc} from './weapon-targeting.mjs';
import {unitInitiative} from './initiative-sequence.mjs';
import {newStagedMovement} from './staged-movement.mjs';
import {orientationAtMovementStart,normaliseHaltedPivot} from './orientation-stage.mjs';
import {extraEWCost} from './preturn.mjs';
import {newCondition,effectiveCondition,projectTrial,systemPowerForHull,rollDie,finishShipTurn,finishCriticalUpkeep} from './ship-condition.mjs';
export const PLAY_PHASES=Object.freeze([
 {id:'power',label:'Ship Power',group:'initial'}, {id:'initiative',label:'Initiative',group:'initial'},
 {id:'ew_commit',label:'Electronic Warfare',group:'initial'}, {id:'ew_disruption',label:'ELINT Disruption',group:'initial'}, {id:'jump_formation',label:'Jump Point Formation',group:'initial'}, {id:'movement',label:'Unit Movement',group:'movement'},
 {id:'fire_commit',label:'Weapon Orders',group:'combat'}, {id:'fire_resolution',label:'Defence And Damage',group:'combat'}, {id:'critical_resolution',label:'Critical Checks',group:'end'}, {id:'vortex_closure',label:'Jump Point Closure',group:'end'}, {id:'hangar',label:'Hangar Operations',group:'end'}
]);
export const RULES_REVISION=1;
export const SCENARIO_RULES={id:'vorchan-clear-space-duel',label:'Centauri Fleet Battle',terrain:'Clear Space',weaponCritical13:'No additional effect (the supplied printed chart omits 13).',scope:'Ship weapons, EW, movement, damage and criticals. Jump points and unarmed shuttles are tracked. Ramming and boarding are not enabled in this scenario.'};
const fail=m=>{throw new RangeError(m)};
const int=(n,min=0)=>Number.isInteger(n)&&n>=min;
const trial=x=>x.private_state.trial;
const live=(x,t)=>!x.withdrawn&&!effectiveCondition(trial(x),t).shipDestroyed;
const members=s=>[...new Set(s.ships.filter(x=>live(x,s.turn)).map(x=>x.owner_id))];
const record=(s,type,details)=>{s.journal.push({turn:s.turn,phase:s.phase,type,...details});};
export function createBattle(rows,players,mapPreset='standard',{passivePlayerId=null,combatFlow='guided',operations=false}={}){
 if(passivePlayerId&&!players.some(p=>p.user_id===passivePlayerId&&p.role==='passive'))fail('Invalid passive opponent');
 if(rows.length<2||rows.length>24||players.length!==2||players.some(p=>!rows.some(x=>x.owner_id===p.user_id))||rows.some(x=>!players.some(p=>p.user_id===x.owner_id)))fail('Assign a supported fleet to each of two players');
 const ships=rows.map(row=>{
  const t=typeof row.private_state_json==='string'?JSON.parse(row.private_state_json).trial:row.private_state?.trial;
  const hull=hullProfile(t?.libraryId);
  if(!hull||t.shipDataRevision!==hull.dataRevision)fail('Create new ships using the corrected Vorchan data');
  if(t.condition||t.damage||t.movement)fail('Start an unplayed battle to use automated rules');
  const n={...structuredClone(t),rulesRevision:RULES_REVISION,condition:newCondition(hull.id),weaponReadiness:initialWeaponHistory(1,hull.id)};
  // Scenario starts with all weapons fully armed. Reactivation subsequently starts from scratch.
  for(const guns of Object.values(n.weaponReadiness))for(const h of Object.values(guns)){h.lastFiredTurn=-2;h.lastActivatedTurn=-1;}
  return {id:row.id,owner_id:row.owner_id,label:row.label,q:row.q,r:row.r,facing:row.facing,speed:row.speed||0,public_state:{libraryId:hull.id,trial:true,combatPoints:hull.combatPoints+fighterPurchase(hull,t.fighterFlights??{}).points,fighterFlights:t.fighterFlights??{}},private_state:{trial:projectTrial(n,1)}};
 });
 const battle={passivePlayerId,combatFlow,schema:RULES_REVISION,phase:'power',turn:1,status:'active',mapPreset,ships,locks:{},declarations:[],defences:[],dice:[],choices:{},approaches:{},journal:[],scenario:SCENARIO_RULES};if(operations)enableOperations(battle);return completePassiveActions(battle);
}
export function requiredActors(s){
 if(s.status!=='active')return [];
 if(s.phase==='critical_resolution'&&s.criticalResolution)return [s.criticalResolution.actorId];
 if(s.phase==='ew_disruption')return [s.elintDisruptions.find(x=>x.removed===null)?.actorId].filter(Boolean);
 const players=members(s);
 if(s.operations&&s.phase==='movement'){const unit=currentMover(s);return unit?[unit.owner_id]:[];}
 if(s.phase==='movement')return (s.moveOrder||[]).filter(id=>!s.locks[id]&&live(s.ships.find(x=>x.owner_id===id),s.turn)).slice(0,1);
 if(s.phase==='fire_resolution'&&s.resolution)return [s.resolution.actorId];
 if(s.phase==='fire_resolution'&&s.combatStarted)return [...new Set((s.pending||[]).map(x=>s.ships.find(y=>y.id===x.targetId)?.owner_id).filter(Boolean))];
 return players.filter(id=>!s.locks[id]);
}
function markShip(s,ship){s.unitPhaseLocks??={};s.unitPhaseLocks[ship.id]=true;if(s.ships.filter(x=>x.owner_id===ship.owner_id&&live(x,s.turn)).every(x=>s.unitPhaseLocks[x.id]))s.locks[ship.owner_id]=true;}
function next(s,phase){s.phase=phase;s.locks={};s.unitPhaseLocks={};s.unitPhaseStamp=s.turn+':'+phase;record(s,'phase_advanced',{to:phase});}
function checkVictory(s){
 if(s.operations)for(const ship of s.ships)if(effectiveCondition(trial(ship),s.turn).shipDestroyed)for(const x of s.shuttles.filter(x=>x.carrierId===ship.id&&x.status==='aboard')){x.status='destroyed';x.damage=10;}
 if(s.operations)for(const ship of s.ships)if(effectiveCondition(trial(ship),s.turn).shipDestroyed)for(const f of (s.fighterFlights||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard')){f.status='destroyed';for(const x of f.fighters){x.destroyed=true;x.damage=fighterFlightData(f.flightType).structureBoxes;}}
 const alive=s.ships.filter(x=>live(x,s.turn));
 if(new Set(alive.map(x=>x.owner_id)).size<2){s.status='finished';s.winner=alive[0]?.owner_id||null;record(s,'battle_finished',{winner:s.winner});return true;}return false;
}
function startMovement(s){
 next(s,'movement');
 for(const ship of s.ships.filter(x=>live(x,s.turn))){
  const t=trial(ship),old=t.movement?.state;
  const state=old?{...orientationAtMovementStart({...old,turn:s.turn-1},s.turn),q:ship.q,r:ship.r,speed:ship.speed,remaining:Math.abs(ship.speed),moved:0,thrustSpent:0,started:false,history:[],slideDirection:null,normalSinceSlide:true,version:0}:newStagedMovement(ship);
  Object.assign(state,normaliseHaltedPivot(state));state.turn=s.turn;ship.facing=state.facing;ship.speed=state.speed;
  t.movement={turn:s.turn,purchasedThrust:t.powerAllocation.purchasedThrust,engineThrustSpent:0,thrusterLedger:{},state};
  const e=effectiveCondition(t,s.turn);
  if(e.engineShort==='runaway'&&!e.powerOff){
   const thrust=Math.max(0,10-t.condition.effects.engineLoss),main=['aft_port_thrust','aft_starboard_thrust'].filter(id=>e.thrusterRatings[id]>0);
   if(main.length){
    if(state.pivotActive||state.pivotInProgress){const d=t.condition.damage.tracks.primary_structure;d.marked=Math.min(hullSystems(t.libraryId).find(system=>system.id==='primary_structure').boxes,d.marked+thrust);}
    else{ship.speed+=Math.floor(thrust/LIB.accelerationCost);state.speed=ship.speed;state.remaining=Math.abs(ship.speed);}
    const ledger=Object.fromEntries(Object.entries(e.thrusterRatings).map(([id,rating])=>[id,{rating,used:0}]));
    for(let i=0;i<thrust;i++)ledger[main[i%main.length]].used++;
    t.movement.thrusterLedger=ledger;t.movement.engineThrustSpent=thrust;state.thrustSpent=thrust;state.started=true;
    record(s,'forced_acceleration',{shipId:ship.id,thrust,speed:ship.speed});
   }
  }
  if(!Object.keys(t.movement.thrusterLedger).length)t.movement.thrusterLedger=Object.fromEntries(Object.entries(e.thrusterRatings).map(([id,rating])=>[id,{rating,used:0}]));
  ship.private_state.trial=projectTrial(t,s.turn);
 }
 if(s.operations){for(const x of activeShuttles(s))newShuttleMovement(x);for(const x of activeFighterFlights(s))newFighterMovement(x);}
 checkVictory(s);
}
function initiativeOrder(s,die){
 const units=s.operations?[...s.ships.filter(x=>live(x,s.turn)),...activeSmallCraft(s).map(x=>({...x,private_state:{trial:{initiative:x.initiative}}}))]:s.ships.filter(x=>live(x,s.turn));
 const ordered=units.sort((a,b)=>trial(a).initiative.total-trial(b).initiative.total);
 if(!s.operations&&ordered.length===2&&trial(ordered[0]).initiative.total===trial(ordered[1]).initiative.total){
  const rolls=[];let a,b;do{a=die(20);b=die(20);rolls.push([a,b]);if(rolls.length>200)fail('Initiative roll-off could not resolve');}while(a===b);
  record(s,'initiative_rolloff',{ships:ordered.map(x=>x.id),rolls});if(a>b)ordered.reverse();
 }
 if(s.operations){
  // Resolve every opposing tie using the printed bonus, then server roll-offs.
  ordered.sort((a,b)=>trial(a).initiative.total-trial(b).initiative.total||trial(a).initiative.printedBonus-trial(b).initiative.printedBonus);
  for(let i=0;i<ordered.length;i++)for(let j=i+1;j<ordered.length;j++)if(ordered[i].owner_id!==ordered[j].owner_id&&trial(ordered[i]).initiative.total===trial(ordered[j]).initiative.total&&trial(ordered[i]).initiative.printedBonus===trial(ordered[j]).initiative.printedBonus){let a,b,n=0;do{a=die(20);b=die(20);if(++n>200)fail('Initiative roll-off could not resolve');}while(a===b);record(s,'initiative_rolloff',{ships:[ordered[i].id,ordered[j].id],rolls:[[a,b]]});if(a>b)[ordered[i],ordered[j]]=[ordered[j],ordered[i]];}
  s.unitMoveOrder=ordered.map(x=>x.id);s.unitLocks={};
 }
 s.moveOrder=ordered.map(x=>x.owner_id);record(s,'initiative_order',{shipIds:ordered.map(x=>x.id)});
}
function attackShips(s){return s.ships.map(x=>({...x,private_state:{trial:projectTrial(trial(x),s.turn)},sameHexPrevious:s.approaches[x.id]||{}})).concat(s.operations?activeShuttles(s).map(x=>shuttleCombatUnit(x)):[]);}
function endTurn(s,die){
 if(s.combatFlow!=='automatic'&&beginCriticals(s))return;
 for(const ship of s.ships){const resolved=finishShipTurn(trial(ship),s.turn,die);ship.private_state.trial=resolved.trial;record(s,'critical_checks',{shipId:ship.id,results:resolved.results});}
 postTurn(s);
}
function finishEW(s,die){
 record(s,'ew_allocations_revealed',{allocations:s.ships.map(x=>({shipId:x.id,ownerId:x.owner_id,shipLabel:x.label,...trial(x).ewAllocation}))});
 const units=attackShips(s);s.ewSnapshot=ewPositionSnapshot(units);
 const {queue,journal}=disruptionQueue(units,die);s.elintDisruptions=queue;
 for(const result of journal)record(s,'elint_disruption_tiebreak',result);
 if(queue.length)next(s,'ew_disruption');else beginJump(s);
}
function beginJump(s){if(!s.operations){startMovement(s);return;}next(s,'jump_formation');}
function postTurn(s){
 if(s.operations){s.combatStarted=false;for(const ship of s.ships){const o=hangarOptions(s,ship);if(o.capacity===0)for(const x of s.shuttles.filter(x=>x.carrierId===ship.id&&x.status==='aboard')){x.status='destroyed';x.damage=10;record(s,'shuttle_lost_in_hangar',{shipId:ship.id,shuttleId:x.id});}}}
 if(!s.operations){completeTurn(s);return;}
 for(const p of s.jumpPoints){
  if(p.status==='forming'){p.status='open';record(s,'jump_point_activated',{pointId:p.id,shipId:p.shipId,activeTurn:p.activeTurn});}
  else if(p.status==='open'){const ship=s.ships.find(x=>x.id===p.shipId),e=effectiveCondition(trial(ship),s.turn);if(p.forcedClose||ship.withdrawn||e.shipDestroyed||e.powerOff||e.destroyedSystems.includes('jump_aft_centre')||s.turn>=p.activeTurn+3)closePoint(s,p);}
 }
 next(s,'vortex_closure');
}
function completeTurn(s){
 if(checkVictory(s))return;
 s.turn++;s.attacks=[];s.declarations=[];s.defences=[];s.dice=[];s.choices={};s.pending=[];s.combatStarted=false;s.resolution=null;s.damageRolled=false;s.fireSnapshot=null;
 next(s,'power');
}
function combat(s,die){
 if((s.combatFlow==='guided'||s.declarations.some(d=>d.fire.shots.some(x=>x.mountId==='plasma_stream'||['Raking','Piercing'].includes(x.mode))))&&!s.combatStarted&&beginGuidedCombat(s,attackShips(s)))return;
 resolveTier(s,die);
}
function resolveTier(s,die){
 if(!members(s).every(p=>s.locks[p]))return;
 const ships=attackShips(s);
 if(!s.combatStarted){
  s.combatStarted=true;s.fireSnapshot=ships;
  s.dice=s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive').map(shot=>({attackId:attackId(shot),playerId:d.playerId,roll:die(20),damageDice:[]})));
 }else if(s.damageRolled===undefined){s.damageRolled=true;} // Preserve dice in older pending battles.
 const directions=Object.assign({},...s.defences.map(d=>d.directions||{}));
 const fire=resolveVorchanShipFire({turn:s.turn,ships:s.fireSnapshot,ewSnapshot:s.ewSnapshot,elintDisruptions:s.elintDisruptions,declarations:s.declarations,defences:s.defences,rolls:s.dice,blockingHexes:[],terrainVerified:true,defenderChoices:directions});
 if(!fire.complete)fail('Attack validation failed: '+fire.results.flatMap(x=>x.blockers).join('; '));
 if(!s.damageRolled){
  for(const attack of fire.results){
   const dice=s.dice.find(r=>r.attackId===attack.id);dice.hit=attack.hit;
   if(!attack.hit)continue;
   dice.locationRoll=die(20);dice.primaryRoll=die(20);
   const hull=hullProfile(ships.find(x=>x.id===attack.shipId).public_state.libraryId),mount=hull.weaponMounts.find(m=>m.id===attack.mountId),weapon=hull.weapons.find(w=>w.id===mount.weaponId);
   const option=weapon.id==='plasma-accelerator'?weapon.firingOptions.find(o=>o.turns===(attack.chargeTurns||1)):weapon.firingOptions[0];
   dice.damageDice=Array.from({length:option.damageDice.count},()=>die(option.damageDice.sides));
  }
  s.damageRolled=true;record(s,'combat_dice',{rolls:s.dice});
  record(s,'weapons_fired',{attacks:fire.results.map(attack=>{
   const source=ships.find(x=>x.id===attack.shipId),target=ships.find(x=>x.id===attack.targetId),dice=s.dice.find(r=>r.attackId===attack.id);
   const range=Math.max(Math.abs(source.q-target.q),Math.abs(source.r-target.r),Math.abs(source.q+source.r-target.q-target.r));
   const damage=attack.hit?rollVorchanDamage({libraryId:source.private_state.trial.libraryId,mountId:attack.mountId,chargeTurns:attack.chargeTurns||1,dice:dice.damageDice,range,mode:attack.mode,damageLoss:trial(source).condition.effects.weapons[attack.mountId]?.damageLoss||0}):null;
   return {...attack,from:{q:source.q,r:source.r},to:{q:target.q,r:target.r},effect:['plasma_forward','plasma_stream'].includes(attack.mountId)?'plasma':'pulse',damageDice:dice.damageDice,damageResult:damage,damage:damage?.damage??null};
  })});
 }
 const choices=structuredClone(s.choices);
 for(const attack of fire.results){
  const shooter=ships.find(x=>x.id===attack.shipId),target=ships.find(x=>x.id===attack.targetId);
  const direction=facingDirections(shooter,target,{sameHexPrevious:shooter.sameHexPrevious[target.id]});
  choices[attack.id]={...choices[attack.id],incoming:direction.requiresChoice?directions[shooter.id+':'+target.id]:direction.direction};
 }
 const adjudication=adjudicateVorchanShipTier({ships:s.fireSnapshot,attacks:fire.results,rollJournal:s.dice,defenderChoices:choices,initialDamage:Object.fromEntries(ships.map(x=>[x.id,x.kind==='shuttle'?{shuttleDamage:x.damage,shipDestroyed:x.damage>=10}:trial(x).condition.damage]))});
 if(s.operations)for(const x of activeShuttles(s)){const d=adjudication.states[x.id];if(d){x.damage=d.shuttleDamage||0;if(d.shipDestroyed)x.status='destroyed';}}
 s.attacks=fire.results;s.pending=adjudication.pending.map(x=>({...x,targetId:fire.results.find(a=>a.id===x.attackId).targetId}));
 if(!adjudication.complete)return;
 for(const ship of s.ships){
  const t=trial(ship);t.condition.damage=adjudication.states[ship.id];
  const used=[...s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive')),...s.defences.flatMap(d=>d.defence.assignments)];
  for(const a of used.filter(x=>x.shipId===ship.id))t.weaponReadiness[a.mountId][a.gun].lastFiredTurn=s.turn;
  ship.private_state.trial=projectTrial(t,s.turn);
 }
 record(s,'damage_resolved',{outcomes:adjudication.outcomes,attacks:fire.results});endTurn(s,die);
}
function settleAutomaticActions(s,die){
 // Iterate only through phases whose remaining work has no player decision.
 for(let step=0;step<12&&s.status==='active';step++){
  const phase=s.phase;let changed=false;
  if(s.operations&&phase==='jump_formation'){
   for(const ship of s.ships.filter(x=>x.kind!=='shuttle'&&live(x,s.turn)&&!s.locks[x.owner_id]&&!s.unitPhaseLocks?.[x.id]))if(!jumpAvailability(s,ship).ready){const p=s.jumpPoints.find(p=>p.shipId===ship.id&&p.status==='open');if(p&&hullProfile(trial(ship).libraryId).jumpDelay&&!effectiveCondition(trial(ship),s.turn).powerOff&&!effectiveCondition(trial(ship),s.turn).destroyedSystems.includes('jump_aft_centre'))jumpCheck(s,ship,die);markShip(s,ship);changed=true;}
   if(checkVictory(s)){changed=true;}else if(members(s).every(p=>s.locks[p])){startMovement(s);changed=true;}
  }else if(s.operations&&phase==='vortex_closure'){
   for(const ship of s.ships.filter(x=>x.kind!=='shuttle'&&live(x,s.turn)&&!s.locks[x.owner_id]&&!s.unitPhaseLocks?.[x.id]))if(!s.jumpPoints.some(p=>p.shipId===ship.id&&p.status==='open'&&p.activeTurn<=s.turn)){markShip(s,ship);changed=true;}
   if(members(s).every(p=>s.locks[p])){next(s,'hangar');changed=true;}
  }else if(s.operations&&phase==='hangar'){
   for(const ship of s.ships.filter(x=>x.kind!=='shuttle'&&live(x,s.turn)&&!s.locks[x.owner_id]&&!s.unitPhaseLocks?.[x.id])){const o=hangarOptions(s,ship);if(!o.lossRequired&&(!o.available||!o.aboard.length&&!o.recover.length&&!o.fighterAboard.length)){markShip(s,ship);changed=true;}}
   if(members(s).every(p=>s.locks[p])){completeTurn(s);changed=true;}
  }else if(phase==='ew_commit'){
   for(const ship of s.ships.filter(x=>x.kind!=='shuttle'&&live(x,s.turn)&&!s.locks[x.owner_id]&&!s.unitPhaseLocks?.[x.id])){
    const t=trial(ship),e=effectiveCondition(t,s.turn),available=e.sensorStrength+(e.sensorStrength?t.powerAllocation.extraEW:0);
    const fixed=fixedEWForUnits(e.ewLock,attackShips(s)),previous=fixed?fixed.defensive+Object.values(fixed.offensive).reduce((a,b)=>a+b,0)+elintBudget(fixed.elint):0;
    if(available===0||fixed&&available>=previous){t.ewAllocation={turn:s.turn,defensive:available&&fixed?fixed.defensive:0,offensive:available&&fixed?fixed.offensive:{},elint:available&&fixed?structuredClone(fixed.elint||{}):{},available,unallocated:Math.max(0,available-(available?previous:0))};markShip(s,ship);changed=true;record(s,'ew_automatic',{shipId:ship.id,reason:available?'Command-Fixed Allocation':'No Active Sensors'});}
   }
   if(members(s).every(p=>s.locks[p])){finishEW(s,die);changed=true;}
  }else if(phase==='movement'){
   const actor=requiredActors(s)[0],ship=s.operations?currentMover(s):s.ships.find(x=>x.owner_id===actor);
   if(ship&&(!s.operations||!['shuttle','fighter-flight'].includes(currentMover(s)?.kind))&&trial(ship).movement.state.remaining===0&&movementOptions(ship,s.turn,s.mapPreset).length===0){if(s.operations)s.unitLocks[ship.id]=true;else s.locks[actor]=true;record(s,'movement_automatic',{shipId:ship.id,reason:'No Remaining Movement Or Working Manoeuvre'});changed=true;}
   if(s.operations?!currentMover(s):members(s).every(p=>s.locks[p])){next(s,'fire_commit');changed=true;}
  }else if(phase==='fire_commit'){
   const ships=attackShips(s);
   for(const ship of ships.filter(x=>x.kind!=='shuttle'&&live(x,s.turn)&&!s.locks[x.owner_id]&&!s.unitPhaseLocks?.[x.id])){
    const enemies=ships.filter(x=>x.owner_id!==ship.owner_id&&(x.kind==='shuttle'||live(x,s.turn)));
    const any=hullProfile(trial(ship).libraryId).weaponMounts.some(m=>[1,...(m.weaponId==='twin-array'?[2]:[])].some(gun=>weaponReadiness({trial:trial(ship),mountId:m.id,turn:s.turn,gun,chargeTurns:m.weaponId==='plasma-accelerator'?1:null}).ready)&&enemies.some(enemy=>__arc({shooter:ship,target:enemy,arc:m.arc}).allowed));
    if(!any){s.declarations.push({playerId:ship.owner_id,fire:{shots:[]}});markShip(s,ship);record(s,'fire_automatic',{shipId:ship.id,reason:'No Legal Weapon Fire'});changed=true;}
   }
   if(members(s).every(p=>s.locks[p])){next(s,'fire_resolution');record(s,'fire_revealed',{declarations:s.declarations});changed=true;}
  }else if(phase==='fire_resolution'&&!s.combatStarted){
   const ships=attackShips(s);
   for(const ship of ships.filter(x=>x.kind!=='shuttle'&&live(x,s.turn)&&!s.locks[x.owner_id]).filter((x,i,a)=>a.findIndex(y=>y.owner_id===x.owner_id)===i)){
    const incoming=s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive'&&ships.some(y=>y.id===x.targetId&&y.owner_id===ship.owner_id)));
    const reserves=s.declarations.filter(d=>d.playerId===ship.owner_id).flatMap(d=>d.fire.shots.filter(x=>x.role==='defensive'));
    const boundary=incoming.some(shot=>{const a=ships.find(x=>x.id===shot.shipId);const target=ships.find(x=>x.id===shot.targetId);return facingDirections(a,target,{sameHexPrevious:a.sameHexPrevious[target.id]}).requiresChoice;});
    const canIntercept=reserves.some(reserve=>incoming.some(shot=>{try{return validateDefensiveAssignment({playerId:ship.owner_id,ships,declarations:s.declarations,assignments:[{shipId:reserve.shipId,mountId:reserve.mountId,gun:reserve.gun,attackId:attackId(shot)}]}).assignments.length>0;}catch{return false;}}));
    if(!boundary&&!canIntercept){s.defences.push({playerId:ship.owner_id,defence:{assignments:[]},directions:{}});s.locks[ship.owner_id]=true;record(s,'defence_automatic',{shipId:ship.id,reason:'No Defensive Decision Required'});changed=true;}
   }
   if(members(s).every(p=>s.locks[p])){combat(s,die);changed=true;}
  }
  if(!changed||s.combatStarted)break;
 }
}
function executeCommand(state,playerId,command,die=rollDie){
 const s=structuredClone(state);s.journal=[];if(s.unitPhaseStamp!==s.turn+':'+s.phase){s.unitPhaseLocks={};s.unitPhaseStamp=s.turn+':'+s.phase;}
 if(s.combatFlow===undefined&&!s.combatStarted)s.combatFlow='guided';
 if(s.status!=='active')fail('This battle has finished');
 if(!command||typeof command.type!=='string')fail('Choose an available action');
 if(!requiredActors(s).includes(playerId))fail('Wait for your required action');
 const available=s.ships.filter(x=>x.owner_id===playerId&&(s.phase==='critical_resolution'||live(x,s.turn)));
 const ship=s.operations&&s.phase==='movement'&&!['shuttle','fighter-flight'].includes(currentMover(s)?.kind)?currentMover(s):command.shipId?available.find(x=>x.id===command.shipId):available.find(x=>!s.unitPhaseLocks?.[x.id])||available[0];
 if(command.shipId&&(!ship||ship.owner_id!==playerId))fail('Choose your own active ship');
 if(!ship)fail('No surviving ship');
 let t=trial(ship),e=effectiveCondition(t,s.turn);
 const lock=()=>{markShip(s,ship);};
 if(['power','ew','jump','hangar','vortex','fire'].includes(command.type)&&s.unitPhaseLocks?.[ship.id])fail('This ship has already completed this phase');
 if(command.type==='power'&&s.phase==='power'){
  const hull=hullProfile(t.libraryId),systemPower=systemPowerForHull(hull.id);
  let {purchasedThrust=0,extraEW=0,deactivated=[],shutdown=false}=command;
  if(hull.weaponMounts.some(m=>m.weaponId==='guardian-array')&&!e.destroyedSystems.includes('guardian')){t.guardianMode=guardianPowerMode(t,s.turn,command.guardianMode);if(t.guardianMode.mode==='switching')deactivated=[...new Set([...deactivated,'guardian'])];}
  if(s.operations&&t.jump?.maintaining){deactivated=[...new Set([...deactivated,...hull.weaponMounts.map(x=>x.id).filter(id=>!e.destroyedSystems.includes(id)),...[]])];if(purchasedThrust||extraEW)fail('Maintaining a jump point uses all spare power');}
  if(s.operations&&deactivated.includes('jump_aft_centre')&&t.condition.damage.tracks.jump_aft_centre.marked<=hull.scs.systems.find(system=>system.id==='jump_aft_centre').boxes/2)fail('The jump engine may only be deactivated when more than 50% damaged');
  if(!int(purchasedThrust)||!int(extraEW)||!Array.isArray(deactivated)||new Set(deactivated).size!==deactivated.length||deactivated.some(id=>!Object.hasOwn(systemPower,id)||e.destroyedSystems.includes(id))||typeof shutdown!=='boolean')fail('Invalid power allocation');
  if(purchasedThrust&&(e.commandDisabled||e.engineShort||e.destroyedSystems.includes('engine')))fail('This engine cannot purchase thrust');
  if(extraEW&&(deactivated.includes('sensors')||e.sensorStrength===0))fail('Inactive sensors cannot purchase EW');
  let reactorShutdown=shutdown||hull.extraPower+deactivated.reduce((n,id)=>n+systemPower[id],0)-e.reactorLoss<0;
  const available=reactorShutdown||s.operations&&t.jump?.maintaining?0:hull.extraPower+deactivated.reduce((n,id)=>n+systemPower[id],0)-e.reactorLoss;
  const spent=purchasedThrust*2+extraEWCost(hull.sensorStrength,extraEW);
  if(reactorShutdown&&(purchasedThrust||extraEW)||spent>available)fail('Power purchases exceed available reactor power');
  if(!reactorShutdown&&t.condition.effects.containmentBreach){const roll=die(100),chance=t.condition.damage.tracks.reactor.marked;record(s,'containment_check',{shipId:ship.id,roll,chance});if(roll<=chance){t.condition.damage.tracks.reactor.marked=12;record(s,'reactor_explosion',{shipId:ship.id});}}
  const inactive=reactorShutdown?Object.keys(systemPower).filter(id=>!e.destroyedSystems.includes(id)):deactivated;
  if(s.operations){const powered=!reactorShutdown&&!inactive.includes('jump_aft_centre');if(powered&&t.jump.powered===false)t.jump.readyTurn=s.turn+160;t.jump.powered=powered;if(!powered)t.jump.maintaining=false;}
  const previous=t.powerAllocation?.deactivated||[];
  for(const m of hull.weaponMounts)if(inactive.includes(m.id)||previous.includes(m.id))for(const h of Object.values(t.weaponReadiness[m.id])){h.lastActivatedTurn=s.turn;h.lastFiredTurn=s.turn-1;}
  t.powerAllocation={turn:s.turn,purchasedThrust,extraEW,deactivated:inactive,reactorShutdown,unusedPower:available-spent,availablePower:available,thrustPower:purchasedThrust*2,ewPower:extraEWCost(hull.sensorStrength,extraEW)};
  t=projectTrial(t,s.turn);ship.private_state.trial=t;record(s,'power_committed',{shipId:ship.id,allocation:t.powerAllocation});lock();
  if(!checkVictory(s)&&members(s).every(p=>s.locks[p]))next(s,'initiative');
 }else if(command.type==='initiative'&&s.phase==='initiative'){
  const unit=s.operations&&command.unitId? [...s.ships,...activeSmallCraft(s)].find(x=>x.id===command.unitId&&x.owner_id===playerId):available.find(x=>trial(x).initiative?.turn!==s.turn)||ship;
  if(!unit)fail('Choose your unit');const shuttle=unit.kind==='shuttle'||unit.kind==='fighter-flight',old=shuttle?unit.initiative:trial(unit).initiative;if(old?.turn===s.turn)fail('This unit has already rolled initiative');
  const result=unitInitiative({roll:die(20),printedBonus:unit.kind==='fighter-flight'?fighterFlightData(unit.flightType).initiativeBonus:shuttle?9:hullProfile(trial(unit).libraryId).initiativeBonus,speed:unit.speed,launchedOrLanded:!shuttle&&trial(unit).hangarActionTurn===s.turn-1,newlyLaunched:shuttle&&unit.launchedTurn===s.turn-1,otherModifiers:shuttle?0:effectiveCondition(trial(unit),s.turn).initiativeModifier});
  if(shuttle)unit.initiative={...result,turn:s.turn};else trial(unit).initiative={...result,turn:s.turn};record(s,'initiative_rolled',{shipId:unit.id,...result});
  if(!s.operations||[...available,...activeSmallCraft(s).filter(x=>x.owner_id===playerId)].every(x=>(['shuttle','fighter-flight'].includes(x.kind)?x.initiative:trial(x).initiative)?.turn===s.turn))s.locks[playerId]=true;
  if(members(s).every(p=>s.locks[p])){initiativeOrder(s,die);next(s,'ew_commit');}
 }else if(command.type==='ew'&&s.phase==='ew_commit'){
  const defensive=command.defensive??0,offensive=command.offensive??{},available=e.sensorStrength+(e.sensorStrength>0?t.powerAllocation.extraEW:0);
  if(!int(defensive)||!offensive||Array.isArray(offensive)||typeof offensive!=='object'||Object.entries(offensive).some(([id,v])=>!int(v)||![...s.ships.filter(x=>live(x,s.turn)),...activeShuttles(s).map(x=>({...x,id:x.carrierId+'-shuttle-flight'}))].some(x=>x.id===id&&x.id!==ship.id&&(x.owner_id!==playerId||hullProfile(t.libraryId).elint))))fail('Invalid EW allocation');
  const elint=validateElint({ship,units:attackShips(s),offensive,elint:command.elint||{},fixed:!!e.ewLock});
  const attack=Object.values(offensive).reduce((a,b)=>a+b,0),spent=defensive+attack+elintBudget(elint);
  if(spent>available||e.offensiveLimited&&attack>Math.floor(available/2))fail('EW exceeds the current sensor or command limit');
  if(e.ewLock){
   const previous=fixedEWForUnits(e.ewLock,attackShips(s)),targets=new Set([...s.ships.filter(x=>live(x,s.turn)),...activeShuttles(s).map(x=>({...x,id:x.carrierId+'-shuttle-flight'}))].map(x=>x.id));
   const lost=Object.entries(previous.offensive).filter(([id])=>!targets.has(id)).reduce((n,[,v])=>n+v,0);
   const original=previous.defensive+Object.values(previous.offensive).reduce((a,b)=>a+b,0)+elintBudget(previous.elint);
   const pe=previous.elint||{};if(elint.blanket>(pe.blanket||0)||['defensive','disruption'].some(k=>Object.entries(elint[k]).some(([id,n])=>n>(pe[k]?.[id]||0))))fail('Command damage fixes ELINT allocations too');
   if(defensive>previous.defensive+lost||Object.entries(offensive).some(([id,v])=>v>(previous.offensive[id]||0))||spent!==Math.min(available,original))fail('Command damage fixes last turn’s EW; reduce allocations only if current output requires it');
  }
  t.ewAllocation={turn:s.turn,defensive,offensive,elint,available,unallocated:available-spent};record(s,'ew_committed',{shipId:ship.id});lock();
  if(members(s).every(p=>s.locks[p])){finishEW(s,die);}
 }else if(command.type==='elint-disrupt'&&s.phase==='ew_disruption'){
  const pending=s.elintDisruptions.find(x=>x.removed===null);
  if(!pending||pending.actorId!==playerId||pending.scoutId!==command.scoutId||pending.targetId!==command.targetId)fail('This ELINT prompt has changed');
  pending.removed=selectDisruption(pending,command.removed);record(s,'elint_disruption_selected',{...pending});
  if(s.elintDisruptions.every(x=>x.removed!==null))beginJump(s);
 }else if(command.type==='jump'&&s.phase==='jump_formation'&&s.operations){
  if(typeof command.open!=='boolean')fail('Choose whether to open a jump point');
  if(command.open)openJumpPoint(s,ship,command,die);
  lock();if(!checkVictory(s)&&members(s).every(p=>s.locks[p]))startMovement(s);
 }else if(command.type==='vortex'&&s.phase==='vortex_closure'&&s.operations){
  vortexClosure(s,ship,command.maintain);lock();if(members(s).every(p=>s.locks[p]))next(s,'hangar');
 }else if(command.type==='hangar'&&s.phase==='hangar'&&s.operations){
  applyHangar(s,ship,command);lock();if(members(s).every(p=>s.locks[p]))completeTurn(s);
 }else if(command.type==='enter-jump'&&s.phase==='movement'&&s.operations){
  const unit=currentMover(s);enterJump(s,unit,command.pointId);s.unitLocks[unit.id]=true;checkVictory(s);
 }else if(command.type==='move'&&s.phase==='movement'&&s.operations&&['shuttle','fighter-flight'].includes(currentMover(s)?.kind)){
  const unit=currentMover(s),before={q:unit.q,r:unit.r};Object.assign(unit,unit.kind==='fighter-flight'?moveFighter(unit,command.action):moveShuttle(unit,command.action));noteEntry(s,unit,before);
  if(command.enterPointId)enterJump(s,unit,command.enterPointId);
  const bounds=MAP_PRESETS[s.mapPreset];if(unit.q<0||unit.r<0||unit.q>=bounds.columns||unit.r>=bounds.rows)unit.status='escaped';
  record(s,unit.kind==='fighter-flight'?'fighter_moved':'shuttle_moved',{shipId:unit.id,q:unit.q,r:unit.r,facing:unit.facing,speed:unit.speed,thrustSpent:unit.movement.spent});
 }else if(command.type==='move'&&s.phase==='movement'){
  const action=command.action,advanceAfter=command.advanceAfter??0;
  if(!int(advanceAfter)||advanceAfter>10000||advanceAfter&&['advance','slide','extended-cancel'].includes(action?.type))fail('Invalid automatic movement segment');
  if(!action||e.commandDisabled&&action.type!=='advance')fail('Command damage permits only inertial movement');
  if(e.powerOff&&action.type!=='advance')fail('Reactor shutdown permits only inertial movement');
  const before=s.ships.map(x=>({id:x.id,q:x.q,r:x.r}));
  let result;
  const apply=(a)=>{const from={q:ship.q,r:ship.r};result=commitMovement({ship,privateState:{trial:projectTrial(trial(ship),s.turn)},turn:s.turn,action:a,mapPreset:s.mapPreset});Object.assign(ship,result.nextShip);ship.private_state=result.nextPrivateState;if(s.operations){noteEntry(s,ship,from);checkPointRange(s,ship);if(command.enterPointId&&entryOptions(s,ship).some(p=>p.id===command.enterPointId))enterJump(s,ship,command.enterPointId);}};
  if(!s.operations){result=commitMovement({ship,privateState:{trial:projectTrial(t,s.turn)},turn:s.turn,action,advanceAfter,mapPreset:s.mapPreset});Object.assign(ship,result.nextShip);ship.private_state=result.nextPrivateState;}
  else{const count=action.type==='advance'?action.hexes:0;if(count){for(let i=0;i<count&&!ship.withdrawn;i++)apply({type:'advance',hexes:1});}else apply(action);for(let i=0;i<advanceAfter&&!ship.withdrawn;i++)apply({type:'advance',hexes:1});if(command.enterPointId&&!ship.escaped)fail('Selected jump point was not crossed through its entry side');}

  if(before.find(x=>x.id===ship.id).q!==ship.q||before.find(x=>x.id===ship.id).r!==ship.r)for(const other of s.ships.filter(x=>x.id!==ship.id&&x.q===ship.q&&x.r===ship.r)){
   const a=before.find(x=>x.id===ship.id),b=before.find(x=>x.id===other.id);
   if(a.q!==b.q||a.r!==b.r){s.approaches[ship.id]={...s.approaches[ship.id],[other.id]:{shooter:a,target:b}};s.approaches[other.id]={...s.approaches[other.id],[ship.id]:{shooter:b,target:a}};}
  }
  const bounds=MAP_PRESETS[s.mapPreset];
  if(ship.q<0||ship.q>=bounds.columns||ship.r<0||ship.r>=bounds.rows){ship.withdrawn=true;record(s,'ship_withdrew',{shipId:ship.id});checkVictory(s);}
  if(s.operations&&ship.escaped)checkVictory(s);
  record(s,'ship_moved',{shipId:ship.id,action:action.type,advanceAfter,q:ship.q,r:ship.r,facing:ship.facing,speed:ship.speed,thrustSpent:result.engineThrustSpent});
 }else if(command.type==='movement-done'&&s.phase==='movement'){
  const mover=s.operations?currentMover(s):ship;
  if((['shuttle','fighter-flight'].includes(mover.kind)?mover.movement.remaining:trial(mover).movement.state.remaining)!==0)fail('Complete the unit’s remaining movement');
  if(s.operations){s.unitLocks[mover.id]=true;if(!currentMover(s))next(s,'fire_commit');}else{lock();if(members(s).every(p=>s.locks[p]))next(s,'fire_commit');}
 }else if(command.type==='fighter-combat-pivot'&&s.phase==='fire_commit'&&s.operations){
  const x=activeFighterFlights(s).find(x=>x.id===command.unitId&&x.owner_id===playerId);if(!x||s.locks[playerId])fail('Fighter combat pivot unavailable');Object.assign(x,fighterCombatPivot(x,command.steps));record(s,'fighter_combat_pivot',{flightId:x.id,facing:x.facing,thrustSpent:x.thrustUsed});
 }else if(command.type==='shuttle-combat-pivot'&&s.phase==='fire_commit'&&s.operations){
  const x=activeShuttles(s).find(x=>x.id===command.unitId&&x.owner_id===playerId);if(!x||![-1,1].includes(command.direction)||x.movement.spent+3>(x.stats?.thrust??4))fail('Insufficient Shuttle Thrust For Combat Pivot');x.facing=(x.facing+command.direction+6)%6;x.movement.spent+=3;record(s,'shuttle_combat_pivot',{shipId:x.id,facing:x.facing,thrustSpent:x.movement.spent});
 }else if(command.type==='fire'&&s.phase==='fire_commit'){
  const ships=attackShips(s),fire=validateFireDeclaration({ewSnapshot:s.ewSnapshot,elintDisruptions:s.elintDisruptions,playerId,ships,fire:command.fire,turn:s.turn});
  if(fire.shots.some(x=>x.shipId!==ship.id))fail('Commit this ship’s weapons separately');
  for(const shot of fire.shots){const r=weaponReadiness({mountId:shot.mountId,gun:shot.gun,turn:s.turn,trial:projectTrial(t,s.turn),chargeTurns:shot.mountId==='plasma_forward'?shot.chargeTurns:null});if(!r.ready)fail(r.reasons.join('; '));}
  s.declarations.push({playerId,fire});lock();record(s,'fire_committed',{playerId});
  if(members(s).every(p=>s.locks[p])){next(s,'fire_resolution');record(s,'fire_revealed',{declarations:s.declarations});}
 }else if(command.type==='defence'&&s.phase==='fire_resolution'&&!s.combatStarted){
  const ships=attackShips(s),defence=validateDefensiveAssignment({playerId,ships,declarations:s.declarations,assignments:command.assignments||[],directions:command.directions||{}}),directions=command.directions||{};
  const expected=new Map();
  for(const shot of s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive'&&ships.some(y=>y.id===x.targetId&&y.owner_id===playerId)))){const shooter=ships.find(x=>x.id===shot.shipId),target=ships.find(x=>x.id===shot.targetId),f=facingDirections(shooter,target,{sameHexPrevious:shooter.sameHexPrevious[target.id]});if(f.requiresChoice)expected.set(shooter.id+':'+target.id,f.choices);}
  if(Object.keys(directions).some(id=>!expected.has(id))||[...expected].some(([id,choices])=>!choices?.includes(directions[id])))fail('Select each legal incoming boundary aspect before rolling');
  s.defences.push({playerId,defence,directions});s.locks[playerId]=true;record(s,'defence_committed',{playerId});combat(s,die);
 }else if(['critical-roll','critical-ok'].includes(command.type)&&s.phase==='critical_resolution'&&s.criticalResolution){
  if(advanceCriticals(s,playerId,command,die)){for(const x of s.ships){x.private_state.trial=finishCriticalUpkeep(trial(x),s.turn);record(s,'critical_checks',{shipId:x.id,results:(s.criticalResults||[]).filter(r=>r.shipId===x.id)});}s.criticalResults=[];postTurn(s);}
 }else if(['combat-roll','combat-ok','combat-choice'].includes(command.type)&&s.phase==='fire_resolution'&&s.resolution){
  if(advanceGuidedCombat(s,playerId,command,die))resolveTier(s,die);
 }else if(command.type==='damage-choice'&&s.phase==='fire_resolution'&&s.combatStarted){
  const pending=s.pending[0];if(!pending||s.ships.find(x=>x.id===pending.targetId).owner_id!==playerId||command.attackId!==pending.attackId||!pending.choices.includes(command.value))fail('Select a currently eligible defender choice');
  const key={system:'systemChoice',hitChart:'sideChoice',incoming:'incoming'}[pending.type];if(!key)fail('Unsupported damage decision');
  s.choices[pending.attackId]={...s.choices[pending.attackId],[key]:command.value};record(s,'defender_choice',{attackId:pending.attackId,choice:key,value:command.value});combat(s,die);
 }else fail('This action is not available in the current phase');
 settleAutomaticActions(s,die);
 return s;
}
// The passive opponent uses the same validated commands and rules as a player.
// Only the server sets passivePlayerId, when creating an explicit solo test.
export function completePassiveActions(state,die=rollDie){
 let s=state;const journal=[...(s.journal||[])];
 for(let i=0;i<500;i++){
  const id=s.passivePlayerId;
  if(!id||!requiredActors(s).includes(id)){s.journal=journal;return s;}
  const candidates=s.ships.filter(x=>x.owner_id===id&&live(x,s.turn));const ship=s.operations&&s.phase==='movement'&&!['shuttle','fighter-flight'].includes(currentMover(s)?.kind)?currentMover(s):candidates.find(x=>!s.unitPhaseLocks?.[x.id])||candidates[0];let command;
  if(s.phase==='power')command={type:'power'};
  else if(s.phase==='initiative'){const units=[...candidates,...activeSmallCraft(s).filter(x=>x.owner_id===id)];const unit=units.find(x=>(['shuttle','fighter-flight'].includes(x.kind)?x.initiative:trial(x).initiative)?.turn!==s.turn);command={type:'initiative',unitId:unit?.id};}
  else if(s.phase==='ew_commit')command={type:'ew',defensive:0,offensive:{}};
  else if(s.phase==='ew_disruption'){const r=s.elintDisruptions.find(x=>x.removed===null);let left=r.capacity;const removed={};for(const [key,n] of Object.entries(r.choices)){removed[key]=Math.min(n,left);left-=removed[key];}command={type:'elint-disrupt',scoutId:r.scoutId,targetId:r.targetId,removed};}
  else if(s.phase==='jump_formation')command={type:'jump',open:false};
  else if(s.phase==='vortex_closure')command={type:'vortex',maintain:false};
  else if(s.phase==='hangar'){const o=hangarOptions(s,ship);command={type:'hangar',loss:o.lossOptions.slice(0,o.lossRequired).map(x=>x.id)};}
  else if(s.phase==='movement'&&s.operations&&['shuttle','fighter-flight'].includes(currentMover(s)?.kind))command=currentMover(s).movement.remaining?{type:'move',action:{type:'advance'}}:{type:'movement-done'};
  else if(s.phase==='movement')command=trial(ship).movement.state.remaining?{type:'move',action:{type:'advance',hexes:trial(ship).movement.state.remaining}}:{type:'movement-done'};
  else if(s.phase==='critical_resolution'){const r=s.criticalResolution;command={type:r.stage.endsWith('_roll')?'critical-roll':'critical-ok',stage:r.stage,checkId:r.check.id};}
  else if(s.phase==='fire_commit')command={type:'fire',fire:{shots:[]}};
  else if(s.phase==='fire_resolution'&&s.resolution){
   const r=s.resolution;command={type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates?.length?{value:r.candidates[0]}:{})};
  }else if(s.phase==='fire_resolution'&&s.combatStarted){
   const pending=s.pending[0];command={type:'damage-choice',attackId:pending.attackId,value:pending.choices[0]};
  }else if(s.phase==='fire_resolution'){
   const ships=attackShips(s),directions={};
   for(const shot of s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive'&&x.targetId===ship.id))){
    const source=ships.find(x=>x.id===shot.shipId),target=ships.find(x=>x.id===ship.id),aspect=facingDirections(source,target,{sameHexPrevious:source.sameHexPrevious[target.id]});
    if(aspect.requiresChoice)directions[source.id+':'+target.id]=aspect.choices[0];
   }
   command={type:'defence',assignments:[],directions};
  }else fail('Passive opponent reached an unsupported phase');
  if(ship&&['power','ew','jump','vortex','hangar','fire'].includes(command.type))command.shipId=ship.id;
  s=executeCommand(s,id,command,die);journal.push(...s.journal);
  journal.push({turn:s.turn,phase:s.phase,type:'passive_action_completed',playerId:id,action:command.type});
 }
 fail('Passive opponent action limit reached');
}
export function executeBattle(state,playerId,command,die=rollDie){
 if(playerId===state.passivePlayerId)fail('The passive opponent is controlled by the server');
 return completePassiveActions(executeCommand(state,playerId,command,die),die);
}
export function battleView(s,playerId){
 const required=requiredActors(s),enemyEWRevealed=['ew_disruption','jump_formation','movement','fire_commit','fire_resolution','critical_resolution','vortex_closure','hangar'].includes(s.phase)||s.status==='finished';
 const ships=s.ships.map(ship=>{
  const t=trial(ship),c=effectiveCondition(t,s.turn),own=ship.owner_id===playerId;
  return {...ship,private_state:own?ship.private_state:undefined,public_state:{...ship.public_state,travelFacing:ship.speed===0?null:movementHeading({facing:ship.facing,motionFacing:t.movement?.state?.motionFacing,speed:ship.speed}),rolled:!!t.movement?.state?.rolled,condition:{...c,weapons:undefined},damage:s.resolution?.states?.[ship.id]||t.condition.damage,ew:enemyEWRevealed?t.ewAllocation:undefined,deactivated:t.powerAllocation?.turn===s.turn?t.powerAllocation.deactivated:[],shipDataRevision:t.shipDataRevision,jumpCheck:t.jump?.lastCheck},sameHexPrevious:s.approaches[ship.id]||{}};
 });
 const shuttles=(s.shuttles||[]).map(x=>{const d=s.resolution?.states?.[x.id];return shuttleView(d?{...x,damage:d.shuttleDamage||0,status:d.shipDestroyed?'destroyed':x.status}:x);});
 const mover=currentMover(s);
 return {ships,elintContext:enemyEWRevealed?{initial:s.ewSnapshot||[],disruptions:s.elintDisruptions||[]}:null,elintDisruption:s.phase==='ew_disruption'?s.elintDisruptions.find(x=>x.removed===null):null,unitPhaseLocks:s.unitPhaseLocks||{},operations:!!s.operations,shuttles,fighterFlights:(s.fighterFlights||[]).filter(x=>x.status==='deployed'||x.owner_id===playerId),jumpPoints:(s.jumpPoints||[]).filter(p=>p.status!=='closed'),movingUnitId:mover?.id,entryPoints:mover?entryOptions(s,mover):[],jumpStatus:Object.fromEntries(s.ships.map(x=>[x.id,jumpAvailability(s,x)])),hangars:s.operations?Object.fromEntries(s.ships.filter(x=>x.owner_id===playerId).map(x=>[x.id,hangarOptions(s,x)])):{},criticalResolution:criticalView(s),resolution:guidedCombatView(s),phase:PLAY_PHASES.find(p=>p.id===s.phase),phases:PLAY_PHASES,scenario:s.scenario,needsAction:required.includes(playerId),required,locked:!!s.locks[playerId],declarations:s.phase==='fire_commit'?s.declarations.filter(d=>d.playerId===playerId):['fire_resolution'].includes(s.phase)?s.declarations:[],defences:s.phase==='fire_resolution'?s.defences.filter(d=>s.combatStarted||d.playerId===playerId):[],pending:s.pending||[],dice:s.combatStarted?s.dice:[],attacks:s.attacks||[],winner:s.winner};
}
