import {overthrustChecksForTurn,resolveOverthrustCritical} from './thruster-criticals.mjs';
// Called exactly once on the transition out of the Critical Hits phase.
// The callback supplies d20 results that the owning players rolled and saved.
export function resolveVorchanOverthrust(trial,turn,rollD20){
 if(!trial?.movement||trial.movement.turn!==turn||typeof rollD20!=='function')return {trial,results:[]};
 if(trial.overthrustResolvedTurn===turn)return {trial,results:[]};
 const ledger=trial.movement.thrusterLedger??{};
 const checks=overthrustChecksForTurn(ledger,trial.thrusterDamageBoxes??{});
 const effects={...(trial.thrusterCriticalEffects??{})};
 const results=[];
 for(const check of checks){
  const roll=rollD20();
  const result=resolveOverthrustCritical({...check,roll,effects:effects[check.id]??{}});
  effects[check.id]=result.effects;
  results.push(result);
 }
 return {trial:{...trial,thrusterCriticalEffects:effects,overthrustResolvedTurn:turn,overthrustHistory:[...(trial.overthrustHistory??[]),{turn,results}]},results};
}
