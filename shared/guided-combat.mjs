import {beamPlan,piercingSections,applyBeamPart} from './beam-damage.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {resolveVorchanShipFire,attackId} from './weapon-resolution.mjs';
import {facingDirections} from './weapon-targeting.mjs';
import {CENTAURI_HIT_CHARTS,hitLocation} from './centauri-combat-data.mjs';
import {damageSystemCandidates,rollVorchanDamage,applyVorchanStandardVolley} from './vorchan-damage.mjs';
import {hullProfile,hullSystems,hullWeapon} from './vorchar.mjs';
const fail=m=>{throw new RangeError(m);};
const record=(s,type,details)=>s.journal.push({turn:s.turn,phase:s.phase,type,...details});
const owner=(s,id)=>s.ships.find(x=>x.id===id).owner_id;
const diceFor=s=>s.dice.find(d=>d.attackId===s.resolution.attack.id);
const emit=(s)=>{const r=s.resolution,a=r.attack,d=diceFor(s),source=s.fireSnapshot.find(x=>x.id===a.shipId),target=s.fireSnapshot.find(x=>x.id===a.targetId);record(s,'weapons_fired',{attacks:[{...a,from:{q:source.q,r:source.r},to:{q:target.q,r:target.r},effect:a.mode==='Raking'||a.mode==='Piercing'?'beam':['plasma_forward','plasma_stream'].includes(a.mountId)?'plasma':'pulse',damageDice:d.damageDice,damageResult:r.damage,damage:r.damage?.damage??null,damageDiscarded:!!r.skipDamage}]});};
function nextAttack(s){
 const r=s.resolution;r.index++;
 if(r.index>=r.queue.length){record(s,'combat_dice',{rolls:s.dice});s.resolution=null;s.damageRolled=true;return true;}
 const shot=r.queue[r.index];
 Object.assign(r,{stage:'attack_roll',actorId:owner(s,shot.shipId),attack:{...shot,id:attackId(shot)},incoming:null,sideChoice:null,chart:null,token:null,candidates:[],selected:null,damage:null,trace:[],locationResults:[],raking:false,rakeIndex:0,rakeTrace:[],subVolleys:[],beamPlan:null,armourPaid:[],piercingExtras:[],awaitingPlan:false,skipDamage:!!r.states[shot.targetId].shipDestroyed});
 s.dice.push({attackId:r.attack.id,playerId:r.actorId,damageDice:[]});return false;
}
export function beginGuidedCombat(s,ships){
 const queue=s.declarations.flatMap(d=>d.fire.shots.filter(x=>x.role==='offensive')).sort((a,b)=>a.order-b.order||attackId(a).localeCompare(attackId(b)));
 if(!queue.length)return false;
 s.combatStarted=true;s.fireSnapshot=structuredClone(ships);s.dice=[];s.choices={};s.pending=[];s.attacks=[];
 s.resolution={queue,index:-1,states:Object.fromEntries(ships.map(x=>[x.id,structuredClone(x.kind==='shuttle'?{shuttleDamage:x.damage,shipDestroyed:x.damage>=10}:x.private_state.trial.condition.damage)]))};nextAttack(s);return true;
}
function prepareLocation(s){
 const r=s.resolution,source=s.fireSnapshot.find(x=>x.id===r.attack.shipId),target=s.fireSnapshot.find(x=>x.id===r.attack.targetId),direction=facingDirections(source,target,{sameHexPrevious:source.sameHexPrevious?.[target.id]});
 const directions=Object.assign({},...s.defences.map(d=>d.directions||{}));r.incoming=direction.requiresChoice?directions[source.id+':'+target.id]:direction.direction;
 s.choices[r.attack.id]={incoming:r.incoming};
 if(target.kind!=='shuttle'&&(['Raking','Piercing','Raking (5)'].includes(r.attack.mode))){r.raking=true;r.stage='damage_roll';r.actorId=source.owner_id;return;}
 if(target.kind==='shuttle'){r.chart=null;r.stage='damage_roll';r.actorId=source.owner_id;return;}
 const side=['port','starboard'].includes(r.incoming)&&hullProfile(target.public_state.libraryId)?.class!=='capital',beam=Math.abs(direction.relative-90)<1e-8||Math.abs(direction.relative-270)<1e-8;
 if(side&&beam){r.stage='hull_choice';r.actorId=target.owner_id;r.candidates=['forward','aft'];return;}
 r.sideChoice=side?(direction.relative<90||direction.relative>270?'forward':'aft'):null;prepareChart(s);
}
function prepareRakeLocation(s){
 const r=s.resolution,source=s.fireSnapshot.find(x=>x.id===r.attack.shipId),target=s.fireSnapshot.find(x=>x.id===r.attack.targetId),direction=facingDirections(source,target,{sameHexPrevious:source.sameHexPrevious?.[target.id]});r.trace=[];r.selected=null;
 const part=r.beamPlan[r.rakeIndex];
 if(r.damage.piercing&&(!part.damage||r.states[target.id].sectionsLost?.includes(part.chart))){r.subVolleys[r.rakeIndex]={};applyRake(s);return;}
 if(part.chart){r.chart=part.chart;r.stage='location_roll';r.actorId=source.owner_id;return;}
 const side=['port','starboard'].includes(r.incoming)&&hullProfile(target.public_state.libraryId)?.class!=='capital',beam=Math.abs(direction.relative-90)<1e-8||Math.abs(direction.relative-270)<1e-8;
 if(side&&beam){r.stage='hull_choice';r.actorId=target.owner_id;r.candidates=['forward','aft'];return;}
 r.sideChoice=side?(direction.relative<90||direction.relative>270?'forward':'aft'):null;prepareChart(s);
}
function prepareBeamPlan(s){
 const r=s.resolution,target=s.fireSnapshot.find(x=>x.id===r.attack.targetId),source=s.fireSnapshot.find(x=>x.id===r.attack.shipId),id=target.public_state.libraryId;
 if(r.damage.piercing){
  const direction=facingDirections(source,target,{sameHexPrevious:source.sameHexPrevious?.[target.id]});
  if(hullProfile(id).class==='heavy_combat'&&['port','starboard'].includes(r.incoming)&&!r.sideChoice){
   const beam=Math.abs(direction.relative-90)<1e-8||Math.abs(direction.relative-270)<1e-8;
   if(beam){r.awaitingPlan=true;r.stage='hull_choice';r.actorId=target.owner_id;r.candidates=['forward','aft'];return;}
   r.sideChoice=direction.relative<90||direction.relative>270?'forward':'aft';
  }
  const sections=piercingSections(id,r.incoming,r.sideChoice),remainder=r.damage.damage%sections.length;
  if(r.piercingExtras.length<remainder){r.stage='piercing_choice';r.actorId=target.owner_id;r.candidates=sections.filter(x=>!r.piercingExtras.includes(x));return;}
 }
 r.beamPlan=beamPlan(r.damage,id,r.incoming,r.sideChoice,r.piercingExtras);const d=diceFor(s);d.piercingExtras=[...r.piercingExtras];d.piercingSide=r.sideChoice;prepareRakeLocation(s);
}
function applyRake(s){
 const r=s.resolution,a=r.attack,d=diceFor(s),location=r.subVolleys[r.rakeIndex];
 const part=r.beamPlan[r.rakeIndex],chunk=part.damage;
 const result=applyBeamPart({state:r.states[a.targetId],damage:r.damage,part,location:{...location,sideChoice:r.sideChoice,systemChoice:r.selected},incoming:r.incoming,armourPaid:r.armourPaid});
 if(result.requiresChoice)fail('Raking location is incomplete');
 Object.assign(location,{incoming:r.incoming,sideChoice:r.sideChoice,systemChoice:r.selected,damage:chunk});d.subVolleys=structuredClone(r.subVolleys);
 r.armourPaid.push(...result.trace.map(t=>t.systemId));r.states[a.targetId]=result.state;r.trace=result.trace;r.rakeTrace.push(...result.trace);r.stage='rake_result';r.actorId=owner(s,a.shipId);
 record(s,'raking_damage_assigned',{attackId:a.id,index:r.rakeIndex+1,total:r.beamPlan.length,damage:chunk,trace:r.trace});
}
function prepareChart(s){
 const r=s.resolution;r.chart=r.sideChoice||r.incoming;
 if(!r.damage?.piercing&&r.states[r.attack.targetId].sectionsLost?.includes(r.chart))r.chart='primary';
 s.choices[r.attack.id].sideChoice=r.sideChoice;r.stage='location_roll';r.actorId=owner(s,r.attack.shipId);
}
function prepareSystem(s){
 const r=s.resolution,section=r.chart;
 const systems=new Map(hullSystems(r.states[r.attack.targetId].libraryId).map(system=>[system.id,system]));
 let candidates=damageSystemCandidates(r.token,section,r.states[r.attack.targetId].libraryId).filter(id=>r.states[r.attack.targetId].tracks[id]?.marked<systems.get(id)?.boxes);
 if(section==='primary'&&r.token==='side_thrust'&&['port','starboard'].includes(r.incoming))candidates=candidates.filter(id=>id===(r.incoming==='port'?'port_thrust':'starboard_thrust'));
 r.candidates=candidates;r.selected=candidates[0]||null;
 if(candidates.length>1){r.stage='system_choice';r.actorId=owner(s,r.attack.targetId);}else if(r.raking)applyRake(s);else{r.stage='damage_roll';r.actorId=owner(s,r.attack.shipId);}
}
export function advanceGuidedCombat(s,playerId,command,die){
 const r=s.resolution;
 if(!r||r.actorId!==playerId||command.attackId!==r.attack.id||command.stage!==r.stage)fail('This combat prompt has changed');
 r.armourPaid??=[];r.piercingExtras??=[];if(r.raking&&r.damage?.plasmaStream&&!r.beamPlan)r.beamPlan=beamPlan(r.damage,r.states[r.attack.targetId].libraryId,r.incoming,r.sideChoice,r.piercingExtras);
 const d=diceFor(s),a=r.attack;
 if(command.type==='combat-roll'){
  if(r.stage==='attack_roll'){
   d.roll=die(20);const directions=Object.assign({},...s.defences.map(x=>x.directions||{}));
   const fire=resolveVorchanShipFire({turn:s.turn,ships:s.fireSnapshot,ewSnapshot:s.ewSnapshot,elintDisruptions:s.elintDisruptions,declarations:s.declarations,defences:s.defences,rolls:s.dice,terrainVerified:true,blockingHexes:[],defenderChoices:directions});
   const attack=fire.results.find(x=>x.id===a.id);if(attack.blockers.length)fail(attack.blockers.join('; '));
   r.attack={...attack};d.hit=attack.hit;s.attacks.push(attack);r.stage='attack_result';record(s,'attack_rolled',{attack});
   if(!attack.hit||r.skipDamage)emit(s);
  }else if(r.stage==='location_roll'||r.stage==='primary_roll'){
   const primary=r.stage==='primary_roll'||r.chart==='primary',roll=die(20);
   if(primary){d.primaryRoll=roll;if(d.locationRoll===undefined)d.locationRoll=roll;r.chart='primary';}else d.locationRoll=roll;
   if(r.raking){r.subVolleys[r.rakeIndex]??={};r.subVolleys[r.rakeIndex][primary?'primaryRoll':'locationRoll']=roll;if(primary&&r.subVolleys[r.rakeIndex].locationRoll===undefined)r.subVolleys[r.rakeIndex].locationRoll=roll;}
   r.token=hitLocation((hullProfile(r.states[r.attack.targetId].libraryId)?.hitCharts??CENTAURI_HIT_CHARTS[LIB.id])[r.chart],roll);r.locationResults.push({chart:r.chart,roll,token:r.token});r.stage=primary?'primary_result':'location_result';
   record(s,'location_rolled',{attackId:a.id,chart:r.chart,roll,token:r.token});
  }else if(r.stage==='damage_roll'){
   const hull=hullProfile(s.fireSnapshot.find(x=>x.id===a.shipId).public_state.libraryId),mount=hull.weaponMounts.find(m=>m.id===a.mountId),weapon=hull.weapons.find(w=>w.id===mount.weaponId),option=weapon.id==='plasma-accelerator'?weapon.firingOptions.find(o=>o.turns===(a.chargeTurns||1)):weapon.firingOptions[0];
   d.damageDice=Array.from({length:option.damageDice.count},()=>die(option.damageDice.sides));
   const source=s.fireSnapshot.find(x=>x.id===a.shipId),target=s.fireSnapshot.find(x=>x.id===a.targetId),range=Math.max(Math.abs(source.q-target.q),Math.abs(source.r-target.r),Math.abs(source.q+source.r-target.q-target.r));
   r.damage=rollVorchanDamage({libraryId:source.private_state.trial.libraryId,mountId:a.mountId,chargeTurns:a.chargeTurns||1,dice:d.damageDice,range,mode:a.mode,targetClass:target.kind==='shuttle'?'shuttle':hullProfile(target.public_state.libraryId).class,damageLoss:source.private_state.trial.condition.effects.weapons[a.mountId]?.damageLoss||0});
   if(r.raking){d.subVolleys=[];r.stage='damage_result';r.actorId=source.owner_id;record(s,'damage_rolled',{attackId:a.id,...r.damage});return false;}
   if(target.kind==='shuttle'){const old=r.states[a.targetId].shuttleDamage,marked=Math.min(10,old+Math.max(0,r.damage.damage-(r.damage.matter?0:r.damage.plasma?Math.floor((target.stats?.armour||0)/2):(target.stats?.armour||0))));r.states[a.targetId]={shuttleDamage:marked,shipDestroyed:marked===10};r.trace=[{systemId:'shuttle_hull',armour:target.stats?.armour||0,marked:marked-old,destroyed:marked===10}];r.stage='damage_result';record(s,'damage_rolled',{attackId:a.id,...r.damage,trace:r.trace});emit(s);return false;}
   const result=applyVorchanStandardVolley({state:r.states[a.targetId],damage:r.damage.damage,plasma:r.damage.plasma,matter:r.damage.matter,incoming:r.incoming,locationRoll:d.locationRoll,primaryRoll:d.primaryRoll??null,sideChoice:r.sideChoice,systemChoice:r.selected,eligibleSystemIds:r.token==='side_thrust'&&['port','starboard'].includes(r.incoming)?[r.incoming==='port'?'port_thrust':'starboard_thrust']:null});
   if(result.requiresChoice)fail('Location selection is incomplete');r.armourPaid.push(...result.trace.map(t=>t.systemId));r.states[a.targetId]=result.state;r.trace=result.trace;r.stage='damage_result';
   record(s,'damage_rolled',{attackId:a.id,...r.damage,trace:r.trace});emit(s);
  }else fail('No dice are due at this step');
 }else if(command.type==='combat-ok'){
  record(s,'combat_result_acknowledged',{attackId:a.id,stage:r.stage});
  if(r.stage==='attack_result'){if(!a.hit||r.skipDamage)return nextAttack(s);prepareLocation(s);}
  else if(r.stage==='location_result'){if(r.damage?.piercing&&r.beamPlan?.[r.rakeIndex]?.chart&&r.token==='primary'){r.stage='location_roll';r.actorId=owner(s,a.shipId);}else if(r.token==='primary'){r.stage='primary_roll';r.actorId=owner(s,a.shipId);}else prepareSystem(s);}
  else if(r.stage==='primary_result')prepareSystem(s);
  else if(r.stage==='damage_result'){if(r.raking&&r.damage.damage>0)prepareBeamPlan(s);else{if(r.raking)emit(s);return nextAttack(s);}}
  else if(r.stage==='rake_result'){
   r.rakeIndex++;if(r.rakeIndex>=r.beamPlan.length||r.states[a.targetId].shipDestroyed){r.trace=r.rakeTrace;emit(s);return nextAttack(s);}prepareRakeLocation(s);
  }
  else fail('No result is waiting for acknowledgement');
 }else if(command.type==='combat-choice'){
  if(!['hull_choice','system_choice','piercing_choice'].includes(r.stage)||!r.candidates.includes(command.value))fail('Choose an eligible hit location');
  if(r.stage==='piercing_choice'){r.piercingExtras.push(command.value);prepareBeamPlan(s);}else if(r.stage==='hull_choice'){r.sideChoice=command.value;if(r.awaitingPlan){r.awaitingPlan=false;prepareBeamPlan(s);}else prepareChart(s);}else{r.selected=command.value;s.choices[a.id].systemChoice=command.value;if(r.raking)applyRake(s);else{r.stage='damage_roll';r.actorId=owner(s,a.shipId);}}
  record(s,'defender_choice',{attackId:a.id,value:command.value});
 }else fail('Invalid combat action');
 return false;
}
export function guidedCombatView(s){
 const r=s.resolution;if(!r)return null;
 return {stage:r.stage,actorId:r.actorId,attack:r.attack,dice:diceFor(s),chart:r.chart,token:r.token,candidates:r.candidates,selected:r.selected,damage:r.damage,trace:r.trace,locationResults:r.locationResults,skipDamage:r.skipDamage,raking:r.raking,rakeIndex:r.rakeIndex+1,rakeCount:r.beamPlan?.length||0,piercing:!!r.damage?.piercing,part:r.beamPlan?.[r.rakeIndex],index:r.index+1,total:r.queue.length};
}
