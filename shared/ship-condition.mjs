import {hullProfile,hullSystems,hullThrusters,hullWeapon} from './vorchar.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS,VORCHAN_THRUSTER_RATINGS} from './vorchan-scs-identification.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {initialVorchanDamage,vorchanPostTurnStructureLoss} from './vorchan-damage.mjs';
import {weaponCritical} from './vorchan-criticals.mjs';
import {effectiveThrusterRating} from './thruster-criticals.mjs';
export const SYSTEMS=new Map(SCS.systems.map(s=>[s.id,s]));
export const SYSTEM_POWER=Object.freeze({...Object.fromEntries(LIB.weaponMounts.map(m=>[m.id,LIB.weapons.find(w=>w.id===m.weaponId).powerRequired])),sensors:4,jump_aft_centre:3});
export function systemPowerForHull(id){
 const hull=hullProfile(id);
 if(!hull)return SYSTEM_POWER;
 return Object.fromEntries(hull.scs.systems.flatMap(system=>{
  const power=system.powerRequired??hull.weapons.find(weapon=>weapon.id===system.weaponCardId)?.powerRequired;
  return power?[[system.id,power]]:[];
 }));
}
export const labelSystem=id=>({twin_primary:'Twin Array · Mount 6 (Primary)',plasma_stream:'Plasma Stream · Mount 1',matter_port:'Matter Cannon · Mount 2 (Port)',matter_starboard:'Matter Cannon · Mount 3 (Starboard)',twin_port:'Twin Array · Mount 4 (Port)',twin_starboard:'Twin Array · Mount 5 (Starboard)',guardian:'Guardian Array · Mount 6',twin_nose_centre:'Twin Array · Mount 1 (Nose)'}[id]||SYSTEMS.get(id)?.displayName)||id.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function newCondition(libraryId){return {damage:initialVorchanDamage(libraryId),effects:{weapons:{},thrusters:{},engineLoss:0,sensorLoss:0,reactorLoss:0,initiativeLoss:0,fireControlLoss:0,offensiveLimited:false,hangarSlow:0,hangarCollapse:0},lastCriticalTurn:0};}
export function effectiveCondition(trial,turn){
 const c=trial.condition||newCondition(trial.libraryId),e=c.effects,d=c.damage;
 const systems=hullSystems(trial.libraryId);
 const destroyed=systems.filter(s=>(d.tracks[s.id]?.marked||0)>=s.boxes).map(s=>s.id);
 const dead=id=>destroyed.includes(id);
 const shipDestroyed=!!d.shipDestroyed||dead('primary_structure')||dead('reactor');
 const commandDisabled=dead('command')||e.disabledTurn===turn;
 const powerOff=trial.powerAllocation?.turn===turn&&trial.powerAllocation.reactorShutdown===true;
 const engineShort=e.engineShort?.turn===turn?e.engineShort.mode:null;
 return {destroyedSystems:destroyed,shipDestroyed,commandDisabled,powerOff,
 freeThrust:dead('engine')||commandDisabled||powerOff||engineShort==='off'?0:Math.max(0,10-e.engineLoss),
 engineShort,
 sensorStrength:dead('sensors')||commandDisabled||powerOff||trial.powerAllocation?.turn===turn&&trial.powerAllocation.deactivated?.includes('sensors')?0:Math.max(0,(hullProfile(trial.libraryId)||LIB).sensorStrength-e.sensorLoss),
 reactorLoss:e.reactorLoss,initiativeModifier:-e.initiativeLoss-(e.majorInitiativeTurn===turn?2:0),
 fireModifier:-e.fireControlLoss-(trial.movement?.state?.rollInProgress||trial.movement?.state?.agileRollTurn===turn?3:0)-(trial.movement?.state?.pivotTurn===turn?3:0),
 offensiveLimited:e.offensiveLimited,ewLock:e.ewLock?.turn===turn?e.ewLock:null,
 thrusterRatings:Object.fromEntries(Object.entries(hullThrusters(trial.libraryId)).map(([id,r])=>[id,dead(id)?0:effectiveThrusterRating(r,e.thrusters[id])])),
 hangarCapacity:dead('hangar')?0:Math.max(0,systems.find(system=>system.id==='hangar').boxes-(d.tracks.hangar?.marked||0)),weapons:e.weapons};
}
// Compatibility projection is derived exclusively from the canonical condition.
// The existing movement reducer consumes this projection, never editable fields.
export function projectTrial(trial,turn){
 const n=structuredClone(trial),c=effectiveCondition(n,turn);
 n.destroyedSystems=c.destroyedSystems;
 n.systemDamage=Object.fromEntries(Object.entries(n.condition.damage.tracks).filter(([,v])=>v.marked).map(([id,v])=>[id,v.marked]));
 n.thrusterDamageBoxes=Object.fromEntries(Object.keys(hullThrusters(trial.libraryId)).map(id=>[id,n.condition.damage.tracks[id].marked]));
 n.thrusterCriticalEffects=n.condition.effects.thrusters;
 n.verifiedEngineThrustLoss=10-c.freeThrust;n.verifiedReactorPowerLoss=c.reactorLoss;n.criticalDamageAdjudicated=true;
 return n;
}
export function rollDie(sides){const b=new Uint32Array(1),limit=Math.floor(4294967296/sides)*sides;do crypto.getRandomValues(b);while(b[0]>=limit);return b[0]%sides+1;}
export function criticalChecksForShip(trial,turn){
 const c=trial.condition;if(c.lastCriticalTurn===turn||effectiveCondition(trial,turn).shipDestroyed)return [];
 const checks=[];
 const systems=new Map(hullSystems(trial.libraryId).map(system=>[system.id,system]));
 for(const systemId of new Set(c.damage.criticalCandidates||[])){const sys=systems.get(systemId);if(sys&&sys.kind!=='structure'&&sys.kind!=='jump-engine'&&c.damage.tracks[systemId].marked<sys.boxes)checks.push({id:systemId+':damage',systemId,kind:'damage',excess:0});}
 for(const [systemId,l] of Object.entries(trial.movement?.turn===turn?trial.movement.thrusterLedger||{}:{}))if(l.used>l.rating&&c.damage.tracks[systemId].marked<systems.get(systemId).boxes)checks.push({id:systemId+':overthrust',systemId,kind:'overthrust',excess:l.used-l.rating});
 return checks;
}
export function resolveShipCritical(trial,turn,check,roll,secondaryRoll=null){
 if(!Number.isInteger(roll)||roll<1||roll>20||secondaryRoll!==null&&(!Number.isInteger(secondaryRoll)||secondaryRoll<1||secondaryRoll>20))throw new RangeError('Invalid critical die');
 const n=structuredClone(trial),c=n.condition,e=c.effects,id=check.systemId,sys=hullSystems(trial.libraryId).find(system=>system.id===id),marked=c.damage.tracks[id].marked,m=roll+marked,overthrust=check.kind==='overthrust'?{excess:check.excess}:null;
 const entry={systemId:id,roll,modifier:marked,total:m,kind:check.kind,effects:[]};
  if(sys.kind==='thruster'){
   // Ordinary damage checks and overthrust checks are independent.
   const total=m+(overthrust?.excess||0),outlet=total>=15&&total<=19||total>=25,efficiency=total>=20;
   const previous=e.thrusters[id]||{};
   e.thrusters[id]={outletFailures:(previous.outletFailures||0)+(outlet?1:0),efficiencyLosses:(previous.efficiencyLosses||0)+(efficiency?1:0)};
   if(effectiveThrusterRating(hullThrusters(trial.libraryId)[id],e.thrusters[id])===0)c.damage.tracks[id].marked=sys.boxes;
   entry.modifier+=overthrust?.excess||0;entry.total=total;entry.effects=[...(outlet?['Outlet Failure']:[]),...(efficiency?['Reduced Efficiency']:[])];
  }else if(sys.kind==='weapon'){
   const crit=weaponCritical({systemId:id,roll,marked,libraryId:trial.libraryId});
   const w=e.weapons[id]||{rangeLoss:0,damageLoss:0};
   if(!(hullWeapon(trial.libraryId,id)?.id==='twin-array'&&m>=20)&&crit.effects.includes('range_penalty_worsened'))w.rangeLoss++;
   if(!(hullWeapon(trial.libraryId,id)?.id==='twin-array'&&m>=20)&&crit.effects.includes('damage_minus_2_per_die_minimum_1'))w.damageLoss+=2;
   e.weapons[id]=w;entry.effects=crit.effects;
   if(hullWeapon(trial.libraryId,id)?.id==='twin-array'&&m>=20){const lost=w.destroyedGuns||[];const gun=lost.includes(2)?1:2;w.destroyedGuns=[...lost,gun];entry.effects=['Gun '+gun+' Destroyed'];if(w.destroyedGuns.length>=2){c.damage.tracks[id].marked=sys.boxes;entry.effects.push('Twin Array Destroyed');}}
   if(crit.requiresRuleClarification)entry.clarification='Printed weapon chart omits 13. This scenario treats 13 as no additional effect.';
  }else if(sys.kind==='engine'){
   if(m>=15&&m<=20||m>=28){e.engineLoss+=2;entry.effects.push('Free Thrust Reduced By 2');}
   if(m>=21){if(secondaryRoll===null){entry.effects.push('Engine Short · Secondary Roll Required');return {trial:n,result:entry,requiresSecondary:true};}const extra=secondaryRoll;e.engineShort={turn:turn+1,mode:extra<15?'off':'runaway'};entry.secondaryRoll=extra;entry.effects.push(extra<15?'Engine Offline Next Turn':'Forced Acceleration Next Turn');}
  }else if(sys.kind==='sensor'){
   const loss=m<15?0:m<19?1:m<23?2:m<27?3:4;e.sensorLoss+=loss;if(loss)entry.effects.push('Sensor Output Reduced By '+loss);
  }else if(sys.kind==='reactor'){
   const loss=m<11?0:m<15?2:m<19?4:m<27?8:10;e.reactorLoss+=loss;
   if(loss)entry.effects.push('Reactor Power Reduced By '+loss);
   if(m>=27){e.containmentBreach=true;entry.effects.push('Containment Breach');}
  }else if(sys.kind==='command'){
   const sensors=()=>{e.sensorLoss+=2;e.offensiveLimited=true;entry.effects.push('Sensor Controls Damaged');};
   const major=()=>{e.initiativeLoss+=2;e.majorInitiativeTurn=turn+1;entry.effects.push('Major Communications Disruption');};
   if(m<=8){e.ewLock={turn:turn+1,defensive:n.ewAllocation?.defensive||0,offensive:n.ewAllocation?.offensive||{},elint:n.ewAllocation?.elint||{}};entry.effects.push('EW Fixed Next Turn');}
   else if(m<=11){e.initiativeLoss++;entry.effects.push('Initiative Reduced By 1');}
   else if(m<=14){e.fireControlLoss++;entry.effects.push('Fire Control Reduced By 1');}
   else if(m<=17)sensors();else if(m<=20)major();else if(m<=23){sensors();major();}
   else{e.disabledTurn=turn+1;e.fireControlLoss++;sensors();major();entry.effects.push('Systems Disabled Next Turn');}
  }else if(sys.kind==='hangar'){
   if(m>=13&&m<=18||m>=25){e.hangarSlow++;entry.effects.push('Docking Links Damaged');}
   if(m>=19){e.hangarCollapse++;entry.effects.push('Partial Bay Collapse');if(e.hangarCollapse>=3)c.damage.tracks[id].marked=sys.boxes;}
  }
 return {trial:projectTrial(n,turn),result:entry,requiresSecondary:false};
}
export function finishCriticalUpkeep(trial,turn){
 const n=structuredClone(trial),c=n.condition;
 if(c.lastCriticalTurn===turn)return n;
 c.damage=vorchanPostTurnStructureLoss(c.damage);c.damage.sectionsLost=[...c.damage.destroyedSections];
 c.damage.criticalCandidates=[];c.lastCriticalTurn=turn;
 return projectTrial(n,turn+1);
}
export function finishShipTurn(trial,turn,die=rollDie){
 if(trial.condition.lastCriticalTurn===turn)return {trial:structuredClone(trial),results:[]};
 let n=structuredClone(trial);const results=[];
 for(const check of criticalChecksForShip(n,turn)){
  if(n.condition.damage.tracks[check.systemId].marked>=hullSystems(n.libraryId).find(system=>system.id===check.systemId).boxes)continue;
  const roll=die(20);let resolved=resolveShipCritical(n,turn,check,roll);
  if(resolved.requiresSecondary)resolved=resolveShipCritical(n,turn,check,roll,die(20));
  n=resolved.trial;results.push(resolved.result);
 }
 return {trial:finishCriticalUpkeep(n,turn),results};
}
