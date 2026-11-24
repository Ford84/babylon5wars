import {hullSystems} from './vorchar.mjs';
// Damage bridge for the trial Vorchan. This is intentionally strict: damage-box
// values are accepted only after external SCS adjudication. No fabricated tracks.
import {VORCHAN_SCS_IDENTIFICATION as SCS} from './vorchan-scs-identification.mjs';
const whole=n=>Number.isInteger(n)&&n>=0;
const THRUSTERS=new Set(['forward_port_thrust','forward_starboard_thrust','port_thrust','starboard_thrust','aft_port_thrust','aft_starboard_thrust']);
export function adjudicateVorchanMovementDamage(trial,{systemId,markedBoxes=0,destroyed=false,reactorPowerLoss=0,engineThrustLoss=0}={}){
 if(!trial||typeof systemId!=='string'||!systemId||!whole(markedBoxes)||!whole(reactorPowerLoss)||!whole(engineThrustLoss)||typeof destroyed!=='boolean')throw new RangeError('Invalid damage adjudication');
 if(!THRUSTERS.has(systemId)&&!hullSystems(trial.libraryId).some(s=>s.id===systemId))throw new RangeError('Unknown Vorchan system');
 const track=hullSystems(trial.libraryId).find(s=>s.id===systemId);
 if(!track?.verified||!Number.isInteger(track.boxes))throw new RangeError('Unverified SCS damage track: '+systemId);
 if(markedBoxes>track.boxes||destroyed&&markedBoxes<track.boxes)throw new RangeError('Damage exceeds track or destruction lacks full marked boxes');
 if(systemId!=='reactor'&&reactorPowerLoss!==0||systemId!=='engine'&&engineThrustLoss!==0)throw new RangeError('Critical loss assigned to wrong system');
 const systemDamage={...(trial.systemDamage??{}),[systemId]:markedBoxes};
 const thrusterDamageBoxes={...(trial.thrusterDamageBoxes??{})};
 if(THRUSTERS.has(systemId))thrusterDamageBoxes[systemId]=markedBoxes;
 const destroyedSystems=[...new Set([...(trial.destroyedSystems??[]),...(destroyed?[systemId]:[])])];
 return {...trial,systemDamage,thrusterDamageBoxes,destroyedSystems,
  verifiedReactorPowerLoss:systemId==='reactor'?reactorPowerLoss:(trial.verifiedReactorPowerLoss??0),
  verifiedEngineThrustLoss:systemId==='engine'?engineThrustLoss:(trial.verifiedEngineThrustLoss??0),
  criticalDamageAdjudicated:true};
}
export function assertVorchanMovementDamageConsistent(trial){
 for(const [id,boxes] of Object.entries(trial.thrusterDamageBoxes??{})){
  if(!THRUSTERS.has(id)||!whole(boxes))throw new RangeError('Unverified thruster damage');
 }
 for(const [id,marked] of Object.entries(trial.systemDamage??{})){
  const track=hullSystems(trial.libraryId).find(s=>s.id===id);
  if(!track?.verified||!whole(marked)||marked>track.boxes)throw new RangeError('Unverified SCS system damage: '+id);
 }
 if((trial.destroyedSystems??[]).includes('reactor'))throw new RangeError('Reactor destroyed');
 return true;
}
