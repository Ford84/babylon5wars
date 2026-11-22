// Damage bridge for the trial Vorchan. This is intentionally strict: damage-box
// values are accepted only after external SCS adjudication. No fabricated tracks.
const whole=n=>Number.isInteger(n)&&n>=0;
const THRUSTERS=new Set(['retro','forward_port_thrust','forward_starboard_thrust','port_thrust','starboard_thrust','aft_port_thrust','aft_starboard_thrust']);
export function adjudicateVorchanMovementDamage(trial,{systemId,markedBoxes=0,destroyed=false,reactorPowerLoss=0,engineThrustLoss=0}={}){
 if(!trial||typeof systemId!=='string'||!systemId||!whole(markedBoxes)||!whole(reactorPowerLoss)||!whole(engineThrustLoss)||typeof destroyed!=='boolean')throw new RangeError('Invalid damage adjudication');
 if(!THRUSTERS.has(systemId)&&!['engine','reactor','plasma_forward','twin_forward_port','twin_forward_starboard'].includes(systemId))throw new RangeError('Unknown Vorchan system');
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
 if((trial.destroyedSystems??[]).includes('reactor'))throw new RangeError('Reactor destroyed');
 return true;
}
