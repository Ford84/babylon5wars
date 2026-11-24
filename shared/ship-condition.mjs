import {VORCHAN_SCS_IDENTIFICATION as SCS,VORCHAN_THRUSTER_RATINGS} from './vorchan-scs-identification.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {initialVorchanDamage,vorchanPostTurnStructureLoss} from './vorchan-damage.mjs';
import {weaponCritical} from './vorchan-criticals.mjs';
import {effectiveThrusterRating} from './thruster-criticals.mjs';
export const SYSTEMS=new Map(SCS.systems.map(s=>[s.id,s]));
export const SYSTEM_POWER=Object.freeze({...Object.fromEntries(LIB.weaponMounts.map(m=>[m.id,LIB.weapons.find(w=>w.id===m.weaponId).powerRequired])),sensors:4,jump_aft_centre:3});
export const labelSystem=id=>SYSTEMS.get(id)?.displayName||id.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function newCondition(){return {damage:initialVorchanDamage(),effects:{weapons:{},thrusters:{},engineLoss:0,sensorLoss:0,reactorLoss:0,initiativeLoss:0,fireControlLoss:0,offensiveLimited:false,hangarSlow:0,hangarCollapse:0},lastCriticalTurn:0};}
export function effectiveCondition(trial,turn){
 const c=trial.condition||newCondition(),e=c.effects,d=c.damage;
 const destroyed=SCS.systems.filter(s=>(d.tracks[s.id]?.marked||0)>=s.boxes).map(s=>s.id);
 const dead=id=>destroyed.includes(id);
 const shipDestroyed=!!d.shipDestroyed||dead('primary_structure')||dead('reactor');
 const commandDisabled=dead('command')||e.disabledTurn===turn;
 const powerOff=trial.powerAllocation?.turn===turn&&trial.powerAllocation.reactorShutdown===true;
 const engineShort=e.engineShort?.turn===turn?e.engineShort.mode:null;
 return {destroyedSystems:destroyed,shipDestroyed,commandDisabled,powerOff,
 freeThrust:dead('engine')||commandDisabled||powerOff||engineShort==='off'?0:Math.max(0,10-e.engineLoss),
 engineShort,
 sensorStrength:dead('sensors')||commandDisabled||powerOff||trial.powerAllocation?.turn===turn&&trial.powerAllocation.deactivated?.includes('sensors')?0:Math.max(0,8-e.sensorLoss),
 reactorLoss:e.reactorLoss,initiativeModifier:-e.initiativeLoss-(e.majorInitiativeTurn===turn?2:0),
 fireModifier:-e.fireControlLoss-(trial.movement?.state?.rollInProgress?3:0)-(trial.movement?.state?.pivotTurn===turn?3:0),
 offensiveLimited:e.offensiveLimited,ewLock:e.ewLock?.turn===turn?e.ewLock:null,
 thrusterRatings:Object.fromEntries(Object.entries(VORCHAN_THRUSTER_RATINGS).map(([id,r])=>[id,dead(id)?0:effectiveThrusterRating(r,e.thrusters[id])])),
 hangarCapacity:dead('hangar')?0:Math.max(0,2-(d.tracks.hangar?.marked||0)),weapons:e.weapons};
}
// Compatibility projection is derived exclusively from the canonical condition.
// The existing movement reducer consumes this projection, never editable fields.
export function projectTrial(trial,turn){
 const n=structuredClone(trial),c=effectiveCondition(n,turn);
 n.destroyedSystems=c.destroyedSystems;
 n.systemDamage=Object.fromEntries(Object.entries(n.condition.damage.tracks).filter(([,v])=>v.marked).map(([id,v])=>[id,v.marked]));
 n.thrusterDamageBoxes=Object.fromEntries(Object.keys(VORCHAN_THRUSTER_RATINGS).map(id=>[id,n.condition.damage.tracks[id].marked]));
 n.thrusterCriticalEffects=n.condition.effects.thrusters;
 n.verifiedEngineThrustLoss=10-c.freeThrust;n.verifiedReactorPowerLoss=c.reactorLoss;n.criticalDamageAdjudicated=true;
 return n;
}
export function rollDie(sides){const b=new Uint32Array(1),limit=Math.floor(4294967296/sides)*sides;do crypto.getRandomValues(b);while(b[0]>=limit);return b[0]%sides+1;}
export function finishShipTurn(trial,turn,die=rollDie){
 const n=structuredClone(trial),c=n.condition,results=[];
 if(c.lastCriticalTurn===turn)return {trial:n,results};
 if(effectiveCondition(n,turn).shipDestroyed){c.lastCriticalTurn=turn;return {trial:n,results};}
 const damaged=new Set(c.damage.criticalCandidates||[]),e=c.effects;
 const apply=(id,roll,overthrust=null)=>{
  const sys=SYSTEMS.get(id),marked=c.damage.tracks[id].marked,m=roll+marked,entry={systemId:id,roll,modifier:marked,total:m,kind:overthrust?'overthrust':'damage',effects:[]};
  if(sys.kind==='thruster'){
   // Ordinary damage checks and overthrust checks are independent.
   const total=m+(overthrust?.excess||0),outlet=total>=15&&total<=19||total>=25,efficiency=total>=20;
   const previous=e.thrusters[id]||{};
   e.thrusters[id]={outletFailures:(previous.outletFailures||0)+(outlet?1:0),efficiencyLosses:(previous.efficiencyLosses||0)+(efficiency?1:0)};
   if(effectiveThrusterRating(VORCHAN_THRUSTER_RATINGS[id],e.thrusters[id])===0)c.damage.tracks[id].marked=sys.boxes;
   entry.modifier+=overthrust?.excess||0;entry.total=total;entry.effects=[...(outlet?['Outlet Failure']:[]),...(efficiency?['Reduced Efficiency']:[])];
  }else if(sys.kind==='weapon'){
   const crit=weaponCritical({systemId:id,roll,marked});
   const w=e.weapons[id]||{rangeLoss:0,damageLoss:0};
   if(crit.effects.includes('range_penalty_worsened'))w.rangeLoss++;
   if(crit.effects.includes('damage_minus_2_per_die_minimum_1'))w.damageLoss+=2;
   e.weapons[id]=w;entry.effects=crit.effects;
   if(crit.requiresRuleClarification)entry.clarification='Printed weapon chart omits 13. This scenario treats 13 as no additional effect.';
  }else if(sys.kind==='engine'){
   if(m>=15&&m<=20||m>=28){e.engineLoss+=2;entry.effects.push('Free Thrust Reduced By 2');}
   if(m>=21){const extra=die(20);e.engineShort={turn:turn+1,mode:extra<15?'off':'runaway'};entry.secondaryRoll=extra;entry.effects.push(extra<15?'Engine Offline Next Turn':'Forced Acceleration Next Turn');}
  }else if(sys.kind==='sensor'){
   const loss=m<15?0:m<19?1:m<23?2:m<27?3:4;e.sensorLoss+=loss;if(loss)entry.effects.push('Sensor Output Reduced By '+loss);
  }else if(sys.kind==='reactor'){
   const loss=m<11?0:m<15?2:m<19?4:m<27?8:10;e.reactorLoss+=loss;
   if(loss)entry.effects.push('Reactor Power Reduced By '+loss);
   if(m>=27){e.containmentBreach=true;entry.effects.push('Containment Breach');}
  }else if(sys.kind==='command'){
   const sensors=()=>{e.sensorLoss+=2;e.offensiveLimited=true;entry.effects.push('Sensor Controls Damaged');};
   const major=()=>{e.initiativeLoss+=2;e.majorInitiativeTurn=turn+1;entry.effects.push('Major Communications Disruption');};
   if(m<=8){e.ewLock={turn:turn+1,defensive:n.ewAllocation?.defensive||0,offensive:n.ewAllocation?.offensive||{}};entry.effects.push('EW Fixed Next Turn');}
   else if(m<=11){e.initiativeLoss++;entry.effects.push('Initiative Reduced By 1');}
   else if(m<=14){e.fireControlLoss++;entry.effects.push('Fire Control Reduced By 1');}
   else if(m<=17)sensors();else if(m<=20)major();else if(m<=23){sensors();major();}
   else{e.disabledTurn=turn+1;e.fireControlLoss++;sensors();major();entry.effects.push('Systems Disabled Next Turn');}
  }else if(sys.kind==='hangar'){
   if(m>=13&&m<=18||m>=25){e.hangarSlow++;entry.effects.push('Docking Links Damaged');}
   if(m>=19){e.hangarCollapse++;entry.effects.push('Partial Bay Collapse');if(e.hangarCollapse>=3)c.damage.tracks[id].marked=sys.boxes;}
  }
  results.push(entry);
 };
 for(const id of damaged){const sys=SYSTEMS.get(id);if(sys&&sys.kind!=='structure'&&sys.kind!=='jump-engine'&&c.damage.tracks[id].marked<sys.boxes)apply(id,die(20));}
 // Test against the rating used during movement, not a newly reduced rating.
 for(const [id,l] of Object.entries(n.movement?.turn===turn?n.movement.thrusterLedger||{}:{})){
  if(l.used>l.rating&&c.damage.tracks[id].marked<SYSTEMS.get(id).boxes)apply(id,die(20),{excess:l.used-l.rating});
 }
 c.damage=vorchanPostTurnStructureLoss(c.damage);
 c.damage.sectionsLost=[...c.damage.destroyedSections];
 c.damage.criticalCandidates=[];c.lastCriticalTurn=turn;
 return {trial:projectTrial(n,turn+1),results};
}
