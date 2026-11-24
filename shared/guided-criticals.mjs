import {hullSystems} from './vorchar.mjs';
import {criticalChecksForShip,resolveShipCritical} from './ship-condition.mjs';
const record=(s,type,details)=>s.journal.push({turn:s.turn,phase:s.phase,type,...details});
const shipFor=(s,r)=>s.ships.find(x=>x.id===r.check.shipId);
const reviewer=(s,r)=>r.rollerId===s.passivePlayerId?s.ships.find(x=>x.owner_id!==s.passivePlayerId).owner_id:r.rollerId;
function next(s){
 const r=s.criticalResolution;
 while(++r.index<r.queue.length){
  const check=r.queue[r.index],ship=s.ships.find(x=>x.id===check.shipId),marked=ship.private_state.trial.condition.damage.tracks[check.systemId].marked;
  if(marked>=hullSystems(ship.private_state.trial.libraryId).find(system=>system.id===check.systemId).boxes)continue;
  Object.assign(r,{check:{...check,marked,modifier:marked+check.excess},stage:'critical_roll',rollerId:ship.owner_id,actorId:ship.owner_id,roll:null,secondaryRoll:null,result:null,requiresSecondary:false});return false;
 }
 s.criticalResolution=null;return true;
}
export function beginCriticals(s){
 const queue=s.ships.flatMap(ship=>criticalChecksForShip(ship.private_state.trial,s.turn).map(check=>({...check,id:ship.id+':'+check.id,shipId:ship.id})));
 if(!queue.length)return false;
 s.phase='critical_resolution';s.locks={};s.criticalResults=[];s.criticalResolution={queue,index:-1};next(s);record(s,'phase_advanced',{to:s.phase});return true;
}
export function advanceCriticals(s,playerId,command,die){
 const r=s.criticalResolution;
 if(!r||r.actorId!==playerId||r.check.id!==command.checkId||r.stage!==command.stage)throw new RangeError('This critical prompt has changed');
 const ship=shipFor(s,r),t=ship.private_state.trial;
 if(command.type==='critical-roll'&&['critical_roll','secondary_roll'].includes(r.stage)){
  if(r.stage==='critical_roll')r.roll=die(20);else r.secondaryRoll=die(20);
  const resolved=resolveShipCritical(t,s.turn,r.check,r.roll,r.secondaryRoll);r.result=resolved.result;r.requiresSecondary=resolved.requiresSecondary;
  r.stage=r.secondaryRoll===null?'critical_result':'secondary_result';r.actorId=reviewer(s,r);
  record(s,'critical_rolled',{shipId:ship.id,checkId:r.check.id,result:r.result,requiresSecondary:r.requiresSecondary});
 }else if(command.type==='critical-ok'&&['critical_result','secondary_result'].includes(r.stage)){
  record(s,'critical_acknowledged',{shipId:ship.id,checkId:r.check.id,stage:r.stage});
  if(r.requiresSecondary){r.stage='secondary_roll';r.actorId=r.rollerId;return false;}
  const resolved=resolveShipCritical(t,s.turn,r.check,r.roll,r.secondaryRoll);ship.private_state.trial=resolved.trial;s.criticalResults.push({shipId:ship.id,...resolved.result});return next(s);
 }else throw new RangeError('Invalid critical action');
 return false;
}
export function criticalView(s){const r=s.criticalResolution;if(!r)return null;return {stage:r.stage,actorId:r.actorId,rollerId:r.rollerId,check:r.check,result:r.result,requiresSecondary:r.requiresSecondary,roll:r.roll,secondaryRoll:r.secondaryRoll,index:r.index+1,total:r.queue.length};}
