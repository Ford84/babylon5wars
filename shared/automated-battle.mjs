import {movementOptions} from './movement-options.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {MAP_PRESETS} from './battle-setup.mjs';
import {initialWeaponHistory,resolveVorchanShipFire,attackId} from './weapon-resolution.mjs';
import {validateFireDeclaration,validateDefensiveAssignment} from './fire-orders.mjs';
import {adjudicateVorchanShipTier} from './vorchan-tier-adjudicator.mjs';
import {weaponReadiness} from './weapon-readiness.mjs';
import {facingDirections,checkMountArc as __arc} from './weapon-targeting.mjs';
import {unitInitiative} from './initiative-sequence.mjs';
import {applyVorchanStage} from './vorchan-stage-server.mjs';
import {newStagedMovement} from './staged-movement.mjs';
import {orientationAtMovementStart} from './orientation-stage.mjs';
import {extraEWCost} from './preturn.mjs';
import {newCondition,effectiveCondition,projectTrial,SYSTEMS,SYSTEM_POWER,rollDie,finishShipTurn} from './ship-condition.mjs';
export const PLAY_PHASES=Object.freeze([
 {id:'power',label:'Ship Power',group:'initial'}, {id:'initiative',label:'Initiative',group:'initial'},
 {id:'ew_commit',label:'Electronic Warfare',group:'initial'}, {id:'movement',label:'Ship Movement',group:'movement'},
 {id:'fire_commit',label:'Weapon Orders',group:'combat'}, {id:'fire_resolution',label:'Defence And Damage',group:'combat'}
]);
export const RULES_REVISION=1;
export const SCENARIO_RULES={id:'vorchan-clear-space-duel',label:'Vorchan Ship Duel',terrain:'Clear Space',weaponCritical13:'No additional effect (the supplied printed chart omits 13).',scope:'Ship weapons, EW, movement, damage and criticals. Jump operations, ramming, boarding and shuttle operations are not enabled in this scenario.'};
const fail=m=>{throw new RangeError(m)};
const int=(n,min=0)=>Number.isInteger(n)&&n>=min;
const trial=x=>x.private_state.trial;
const live=(x,t)=>!x.withdrawn&&!effectiveCondition(trial(x),t).shipDestroyed;
const members=s=>[...new Set(s.ships.filter(x=>live(x,s.turn)).map(x=>x.owner_id))];
const record=(s,type,details)=>{s.journal.push({turn:s.turn,phase:s.phase,type,...details});};
export function createBattle(rows,players,mapPreset='standard'){
 if(rows.length!==2||players.length!==2||players.some(p=>rows.filter(x=>x.owner_id===p.user_id).length!==1))fail('Assign one Vorchan to each of two players');
 const ships=rows.map(row=>{
  const t=typeof row.private_state_json==='string'?JSON.parse(row.private_state_json).trial:row.private_state?.trial;
  if(t?.libraryId!==LIB.id||t.shipDataRevision!==LIB.dataRevision)fail('Create new ships using the corrected Vorchan data');
  if(t.condition||t.damage||t.movement)fail('Start an unplayed battle to use automated rules');
  const n={...structuredClone(t),rulesRevision:RULES_REVISION,condition:newCondition(),weaponReadiness:initialWeaponHistory(1)};
  // Scenario starts with all weapons fully armed. Reactivation subsequently starts from scratch.
  for(const guns of Object.values(n.weaponReadiness))for(const h of Object.values(guns)){h.lastFiredTurn=-2;h.lastActivatedTurn=-1;}
  return {id:row.id,owner_id:row.owner_id,label:row.label,q:row.q,r:row.r,facing:row.facing,speed:0,public_state:{libraryId:LIB.id,trial:true},private_state:{trial:projectTrial(n,1)}};
 });
 return {schema:RULES_REVISION,phase:'power',turn:1,status:'active',mapPreset,ships,locks:{},declarations:[],defences:[],dice:[],choices:{},approaches:{},journal:[],scenario:SCENARIO_RULES};
}
export function requiredActors(s){
 if(s.status!=='active')return [];
 const players=members(s);
 if(s.phase==='movement')return (s.moveOrder||[]).filter(id=>!s.locks[id]&&live(s.ships.find(x=>x.owner_id===id),s.turn)).slice(0,1);
 if(s.phase==='fire_resolution'&&s.combatStarted)return [...new Set((s.pending||[]).map(x=>s.ships.find(y=>y.id===x.targetId)?.owner_id).filter(Boolean))];
 return players.filter(id=>!s.locks[id]);
}
function next(s,phase){s.phase=phase;s.locks={};record(s,'phase_advanced',{to:phase});}
function checkVictory(s){
 const alive=s.ships.filter(x=>live(x,s.turn));
 if(alive.length<2){s.status='finished';s.winner=alive[0]?.owner_id||null;record(s,'battle_finished',{winner:s.winner});return true;}return false;
}
function startMovement(s){
 next(s,'movement');
 for(const ship of s.ships){
  const t=trial(ship),old=t.movement?.state;
  const state=old?{...orientationAtMovementStart({...old,turn:s.turn-1},s.turn),q:ship.q,r:ship.r,speed:ship.speed,remaining:Math.abs(ship.speed),moved:0,thrustSpent:0,started:false,history:[],slideDirection:null,normalSinceSlide:true,version:0}:newStagedMovement(ship);
  state.turn=s.turn;ship.facing=state.facing;
  t.movement={turn:s.turn,purchasedThrust:t.powerAllocation.purchasedThrust,engineThrustSpent:0,thrusterLedger:{},state};
  const e=effectiveCondition(t,s.turn);
  if(e.engineShort==='runaway'&&!e.powerOff){
   const thrust=Math.max(0,10-t.condition.effects.engineLoss),main=['aft_port_thrust','aft_starboard_thrust'].filter(id=>e.thrusterRatings[id]>0);
   if(main.length){
    if(state.pivotActive||state.pivotInProgress){const d=t.condition.damage.tracks.primary_structure;d.marked=Math.min(SYSTEMS.get('primary_structure').boxes,d.marked+thrust);}
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
 checkVictory(s);
}
function initiativeOrder(s,die){
 const ordered=s.ships.filter(x=>live(x,s.turn)).sort((a,b)=>trial(a).initiative.total-trial(b).initiative.total);
 if(ordered.length===2&&trial(ordered[0]).initiative.total===trial(ordered[1]).initiative.total){
  const rolls=[];let a,b;do{a=die(20);b=die(20);rolls.push([a,b]);if(rolls.length>200)fail('Initiative roll-off could not resolve');}while(a===b);
  record(s,'initiative_rolloff',{ships:ordered.map(x=>x.id),rolls});if(a>b)ordered.reverse();
 }
 s.moveOrder=ordered.map(x=>x.owner_id);record(s,'initiative_order',{shipIds:ordered.map(x=>x.id)});
}
function attackShips(s){return s.ships.map(x=>({...x,private_state:{trial:projectTrial(trial(x),s.turn)},sameHexPrevious:s.approaches[x.id]||{}}));}
function endTurn(s,die){
 for(const ship of s.ships){const resolved=finishShipTurn(trial(ship),s.turn,die);ship.private_state.trial=resolved.trial;record(s,'critical_checks',{shipId:ship.id,results:resolved.results});}
 if(checkVictory(s))return;
 s.turn++;s.attacks=[];s.declarations=[];s.defences=[];s.dice=[];s.choices={};s.pending=[];s.combatStarted=false;s.fireSnapshot=null;
 next(s,'power');
}
function combat(s,die){
 if(!members(s).every(p=>s.locks[p]))return;
 const ships=attackShips(s);
 if(!s.combatStarted){
  s.combatStarted=true;s.fireSnapshot=ships;
  s.dice=s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive').map(shot=>({attackId:attackId(shot),playerId:d.playerId,roll:die(20),locationRoll:die(20),primaryRoll:die(20),damageDice:Array.from({length:shot.mountId==='plasma_forward'?(shot.chargeTurns===3?4:shot.chargeTurns):1},()=>die(10))})));
  record(s,'combat_dice',{rolls:s.dice});
 }
 const directions=Object.assign({},...s.defences.map(d=>d.directions||{}));
 const fire=resolveVorchanShipFire({turn:s.turn,ships:s.fireSnapshot,declarations:s.declarations,defences:s.defences,rolls:s.dice,blockingHexes:[],terrainVerified:true,defenderChoices:directions});
 if(!fire.complete)fail('Attack validation failed: '+fire.results.flatMap(x=>x.blockers).join('; '));
 const choices=structuredClone(s.choices);
 for(const attack of fire.results){
  const shooter=ships.find(x=>x.id===attack.shipId),target=ships.find(x=>x.id===attack.targetId);
  const direction=facingDirections(shooter,target,{sameHexPrevious:shooter.sameHexPrevious[target.id]});
  choices[attack.id]={...choices[attack.id],incoming:direction.requiresChoice?directions[shooter.id+':'+target.id]:direction.direction};
 }
 const adjudication=adjudicateVorchanShipTier({ships:s.fireSnapshot,attacks:fire.results,rollJournal:s.dice,defenderChoices:choices,initialDamage:Object.fromEntries(ships.map(x=>[x.id,trial(x).condition.damage]))});
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
  if(phase==='ew_commit'){
   for(const ship of s.ships.filter(x=>live(x,s.turn)&&!s.locks[x.owner_id])){
    const t=trial(ship),e=effectiveCondition(t,s.turn),available=e.sensorStrength+(e.sensorStrength?t.powerAllocation.extraEW:0);
    const fixed=e.ewLock,previous=fixed?fixed.defensive+Object.values(fixed.offensive).reduce((a,b)=>a+b,0):0;
    if(available===0||fixed&&available>=previous){t.ewAllocation={turn:s.turn,defensive:available&&fixed?fixed.defensive:0,offensive:available&&fixed?fixed.offensive:{},available,unallocated:Math.max(0,available-(available?previous:0))};s.locks[ship.owner_id]=true;changed=true;record(s,'ew_automatic',{shipId:ship.id,reason:available?'Command-Fixed Allocation':'No Active Sensors'});}
   }
   if(members(s).every(p=>s.locks[p])){record(s,'ew_allocations_revealed',{allocations:s.ships.map(x=>({shipId:x.id,ownerId:x.owner_id,shipLabel:x.label,...trial(x).ewAllocation}))});startMovement(s);changed=true;}
  }else if(phase==='movement'){
   const actor=requiredActors(s)[0],ship=s.ships.find(x=>x.owner_id===actor);
   if(ship&&trial(ship).movement.state.remaining===0&&movementOptions(ship,s.turn,s.mapPreset).length===0){s.locks[actor]=true;record(s,'movement_automatic',{shipId:ship.id,reason:'No Remaining Movement Or Working Manoeuvre'});changed=true;}
   if(members(s).every(p=>s.locks[p])){next(s,'fire_commit');changed=true;}
  }else if(phase==='fire_commit'){
   const ships=attackShips(s);
   for(const ship of ships.filter(x=>live(x,s.turn)&&!s.locks[x.owner_id])){
    const enemy=ships.find(x=>x.owner_id!==ship.owner_id&&live(x,s.turn));
    const any=LIB.weaponMounts.some(m=>[1,...(m.weaponId==='twin-array'?[2]:[])].some(gun=>weaponReadiness({trial:trial(ship),mountId:m.id,turn:s.turn,gun,chargeTurns:m.weaponId==='plasma-accelerator'?1:null}).ready)&&enemy&&__arc({shooter:ship,target:enemy,arc:m.arc}).allowed);
    if(!any){s.declarations.push({playerId:ship.owner_id,fire:{shots:[]}});s.locks[ship.owner_id]=true;record(s,'fire_automatic',{shipId:ship.id,reason:'No Legal Weapon Fire'});changed=true;}
   }
   if(members(s).every(p=>s.locks[p])){next(s,'fire_resolution');record(s,'fire_revealed',{declarations:s.declarations});changed=true;}
  }else if(phase==='fire_resolution'&&!s.combatStarted){
   const ships=attackShips(s);
   for(const ship of ships.filter(x=>live(x,s.turn)&&!s.locks[x.owner_id])){
    const incoming=s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive'&&x.targetId===ship.id));
    const reserves=s.declarations.find(d=>d.playerId===ship.owner_id)?.fire.shots.filter(x=>x.role==='defensive')||[];
    const boundary=incoming.some(shot=>{const a=ships.find(x=>x.id===shot.shipId);return facingDirections(a,ship,{sameHexPrevious:a.sameHexPrevious[ship.id]}).requiresChoice;});
    const canIntercept=reserves.some(reserve=>incoming.some(shot=>{try{return validateDefensiveAssignment({playerId:ship.owner_id,ships,declarations:s.declarations,assignments:[{shipId:ship.id,mountId:reserve.mountId,gun:reserve.gun,attackId:attackId(shot)}]}).assignments.length>0;}catch{return false;}}));
    if(!boundary&&!canIntercept){s.defences.push({playerId:ship.owner_id,defence:{assignments:[]},directions:{}});s.locks[ship.owner_id]=true;record(s,'defence_automatic',{shipId:ship.id,reason:'No Defensive Decision Required'});changed=true;}
   }
   if(members(s).every(p=>s.locks[p])){combat(s,die);changed=true;}
  }
  if(!changed||s.combatStarted)break;
 }
}
export function executeBattle(state,playerId,command,die=rollDie){
 const s=structuredClone(state);s.journal=[];
 if(s.status!=='active')fail('This battle has finished');
 if(!command||typeof command.type!=='string')fail('Choose an available action');
 if(!requiredActors(s).includes(playerId))fail('Wait for your required action');
 const ship=s.ships.find(x=>x.owner_id===playerId&&live(x,s.turn));
 if(!ship)fail('No surviving ship');
 let t=trial(ship),e=effectiveCondition(t,s.turn);
 const lock=()=>{s.locks[playerId]=true;};
 if(command.type==='power'&&s.phase==='power'){
  const {purchasedThrust=0,extraEW=0,deactivated=[],shutdown=false}=command;
  if(!int(purchasedThrust)||!int(extraEW)||!Array.isArray(deactivated)||new Set(deactivated).size!==deactivated.length||deactivated.some(id=>!Object.hasOwn(SYSTEM_POWER,id)||e.destroyedSystems.includes(id))||typeof shutdown!=='boolean')fail('Invalid power allocation');
  if(purchasedThrust&&(e.commandDisabled||e.engineShort||e.destroyedSystems.includes('engine')))fail('This engine cannot purchase thrust');
  if(extraEW&&(deactivated.includes('sensors')||e.sensorStrength===0))fail('Inactive sensors cannot purchase EW');
  let reactorShutdown=shutdown||4+deactivated.reduce((n,id)=>n+SYSTEM_POWER[id],0)-e.reactorLoss<0;
  const available=reactorShutdown?0:4+deactivated.reduce((n,id)=>n+SYSTEM_POWER[id],0)-e.reactorLoss;
  const spent=purchasedThrust*2+extraEWCost(8,extraEW);
  if(reactorShutdown&&(purchasedThrust||extraEW)||spent>available)fail('Power purchases exceed available reactor power');
  if(!reactorShutdown&&t.condition.effects.containmentBreach){const roll=die(100),chance=t.condition.damage.tracks.reactor.marked;record(s,'containment_check',{shipId:ship.id,roll,chance});if(roll<=chance){t.condition.damage.tracks.reactor.marked=12;record(s,'reactor_explosion',{shipId:ship.id});}}
  const inactive=reactorShutdown?Object.keys(SYSTEM_POWER).filter(id=>!e.destroyedSystems.includes(id)):deactivated;
  const previous=t.powerAllocation?.deactivated||[];
  for(const m of LIB.weaponMounts)if(inactive.includes(m.id)||previous.includes(m.id))for(const h of Object.values(t.weaponReadiness[m.id])){h.lastActivatedTurn=s.turn;h.lastFiredTurn=s.turn-1;}
  t.powerAllocation={turn:s.turn,purchasedThrust,extraEW,deactivated:inactive,reactorShutdown,unusedPower:available-spent,availablePower:available,thrustPower:purchasedThrust*2,ewPower:extraEWCost(8,extraEW)};
  t=projectTrial(t,s.turn);ship.private_state.trial=t;record(s,'power_committed',{shipId:ship.id,allocation:t.powerAllocation});lock();
  if(!checkVictory(s)&&members(s).every(p=>s.locks[p]))next(s,'initiative');
 }else if(command.type==='initiative'&&s.phase==='initiative'){
  const result=unitInitiative({roll:die(20),printedBonus:8,speed:ship.speed,otherModifiers:e.initiativeModifier});t.initiative={...result,turn:s.turn};record(s,'initiative_rolled',{shipId:ship.id,...result});lock();
  if(members(s).every(p=>s.locks[p])){initiativeOrder(s,die);next(s,'ew_commit');}
 }else if(command.type==='ew'&&s.phase==='ew_commit'){
  const defensive=command.defensive??0,offensive=command.offensive??{},available=e.sensorStrength+(e.sensorStrength>0?t.powerAllocation.extraEW:0);
  if(!int(defensive)||!offensive||Array.isArray(offensive)||typeof offensive!=='object'||Object.entries(offensive).some(([id,v])=>!int(v)||!s.ships.some(x=>x.id===id&&x.owner_id!==playerId&&live(x,s.turn))))fail('Invalid EW allocation');
  const attack=Object.values(offensive).reduce((a,b)=>a+b,0),spent=defensive+attack;
  if(spent>available||e.offensiveLimited&&attack>Math.floor(available/2))fail('EW exceeds the current sensor or command limit');
  if(e.ewLock){
   const previous=e.ewLock,targets=new Set(s.ships.filter(x=>live(x,s.turn)).map(x=>x.id));
   const lost=Object.entries(previous.offensive).filter(([id])=>!targets.has(id)).reduce((n,[,v])=>n+v,0);
   const original=previous.defensive+Object.values(previous.offensive).reduce((a,b)=>a+b,0);
   if(defensive>previous.defensive+lost||Object.entries(offensive).some(([id,v])=>v>(previous.offensive[id]||0))||spent!==Math.min(available,original))fail('Command damage fixes last turn’s EW; reduce allocations only if current output requires it');
  }
  t.ewAllocation={turn:s.turn,defensive,offensive,available,unallocated:available-spent};record(s,'ew_committed',{shipId:ship.id});lock();
  if(members(s).every(p=>s.locks[p])){record(s,'ew_allocations_revealed',{allocations:s.ships.map(x=>({shipId:x.id,ownerId:x.owner_id,shipLabel:x.label,...trial(x).ewAllocation}))});startMovement(s);}
 }else if(command.type==='move'&&s.phase==='movement'){
  const action=command.action;
  if(!action||e.commandDisabled&&action.type!=='advance')fail('Command damage permits only inertial movement');
  if(e.powerOff&&action.type!=='advance')fail('Reactor shutdown permits only inertial movement');
  const before=s.ships.map(x=>({id:x.id,q:x.q,r:x.r}));
  const result=applyVorchanStage({ship,privateState:{trial:projectTrial(t,s.turn)},turn:s.turn,action,mapBounds:MAP_PRESETS[s.mapPreset],allowExit:true});
  Object.assign(ship,result.nextShip);ship.private_state=result.nextPrivateState;
  if(before.find(x=>x.id===ship.id).q!==ship.q||before.find(x=>x.id===ship.id).r!==ship.r)for(const other of s.ships.filter(x=>x.id!==ship.id&&x.q===ship.q&&x.r===ship.r)){
   const a=before.find(x=>x.id===ship.id),b=before.find(x=>x.id===other.id);
   if(a.q!==b.q||a.r!==b.r){s.approaches[ship.id]={...s.approaches[ship.id],[other.id]:{shooter:a,target:b}};s.approaches[other.id]={...s.approaches[other.id],[ship.id]:{shooter:b,target:a}};}
  }
  const bounds=MAP_PRESETS[s.mapPreset];
  if(ship.q<0||ship.q>=bounds.columns||ship.r<0||ship.r>=bounds.rows){ship.withdrawn=true;record(s,'ship_withdrew',{shipId:ship.id});checkVictory(s);}
  record(s,'ship_moved',{shipId:ship.id,action:action.type,q:ship.q,r:ship.r,facing:ship.facing,speed:ship.speed,thrustSpent:result.engineThrustSpent});
 }else if(command.type==='movement-done'&&s.phase==='movement'){
  if(t.movement.state.remaining!==0)fail('Complete the ship’s remaining movement');
  lock();if(members(s).every(p=>s.locks[p]))next(s,'fire_commit');
 }else if(command.type==='fire'&&s.phase==='fire_commit'){
  const ships=attackShips(s),fire=validateFireDeclaration({playerId,ships,fire:command.fire,turn:s.turn});
  for(const shot of fire.shots){const r=weaponReadiness({mountId:shot.mountId,gun:shot.gun,turn:s.turn,trial:projectTrial(t,s.turn),chargeTurns:shot.mountId==='plasma_forward'?shot.chargeTurns:null});if(!r.ready)fail(r.reasons.join('; '));}
  s.declarations.push({playerId,fire});lock();record(s,'fire_committed',{playerId});
  if(members(s).every(p=>s.locks[p])){next(s,'fire_resolution');record(s,'fire_revealed',{declarations:s.declarations});}
 }else if(command.type==='defence'&&s.phase==='fire_resolution'&&!s.combatStarted){
  const ships=attackShips(s),defence=validateDefensiveAssignment({playerId,ships,declarations:s.declarations,assignments:command.assignments||[]}),directions=command.directions||{};
  const expected=new Map();
  for(const shot of s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive'&&x.targetId===ship.id))){const shooter=ships.find(x=>x.id===shot.shipId),f=facingDirections(shooter,ship,{sameHexPrevious:shooter.sameHexPrevious[ship.id]});if(f.requiresChoice)expected.set(shooter.id+':'+ship.id,f.choices);}
  if(Object.keys(directions).some(id=>!expected.has(id))||[...expected].some(([id,choices])=>!choices?.includes(directions[id])))fail('Select each legal incoming boundary aspect before rolling');
  s.defences.push({playerId,defence,directions});lock();record(s,'defence_committed',{playerId});combat(s,die);
 }else if(command.type==='damage-choice'&&s.phase==='fire_resolution'&&s.combatStarted){
  const pending=s.pending[0];if(!pending||s.ships.find(x=>x.id===pending.targetId).owner_id!==playerId||command.attackId!==pending.attackId||!pending.choices.includes(command.value))fail('Select a currently eligible defender choice');
  const key={system:'systemChoice',hitChart:'sideChoice',incoming:'incoming'}[pending.type];if(!key)fail('Unsupported damage decision');
  s.choices[pending.attackId]={...s.choices[pending.attackId],[key]:command.value};record(s,'defender_choice',{attackId:pending.attackId,choice:key,value:command.value});combat(s,die);
 }else fail('This action is not available in the current phase');
 settleAutomaticActions(s,die);
 return s;
}
export function battleView(s,playerId){
 const required=requiredActors(s),enemyEWRevealed=['movement','fire_commit','fire_resolution'].includes(s.phase)||s.status==='finished';
 const ships=s.ships.map(ship=>{
  const t=trial(ship),c=effectiveCondition(t,s.turn),own=ship.owner_id===playerId;
  return {...ship,private_state:own?ship.private_state:undefined,public_state:{...ship.public_state,rolled:!!t.movement?.state?.rolled,condition:{...c,weapons:undefined},damage:t.condition.damage,ew:enemyEWRevealed?t.ewAllocation:undefined,deactivated:t.powerAllocation?.turn===s.turn?t.powerAllocation.deactivated:[],shipDataRevision:t.shipDataRevision},sameHexPrevious:s.approaches[ship.id]||{}};
 });
 return {ships,phase:PLAY_PHASES.find(p=>p.id===s.phase),phases:PLAY_PHASES,scenario:s.scenario,needsAction:required.includes(playerId),required,locked:!!s.locks[playerId],declarations:s.phase==='fire_commit'?s.declarations.filter(d=>d.playerId===playerId):['fire_resolution'].includes(s.phase)?s.declarations:[],defences:s.phase==='fire_resolution'?s.defences.filter(d=>s.combatStarted||d.playerId===playerId):[],pending:s.pending||[],dice:s.combatStarted?s.dice:[],attacks:s.attacks||[],winner:s.winner};
}
