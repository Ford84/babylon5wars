// Authoritative per-ship rules state bridge. All SCS values originate in the
// server's versioned library, never in an order submitted by a player.
import {validateSCS} from './scs.mjs';
import {validateEWAllocation} from './ew-combat.mjs';
import {unitInitiative} from './initiative-sequence.mjs';
import {derivePrintedEngineThrust} from './effective-scs.mjs';

export function loadShipRules(template,privateState){
 const check=validateSCS(template);
 if(!check.valid)throw new RangeError('Invalid library template: '+check.errors.join('; '));
 if(!privateState?.scs?.systems)throw new RangeError('Ship has no SCS condition record');
 return {template,scs:privateState.scs};
}
export function allocateShipEW({template,privateState,order}){
 const {scs}=loadShipRules(template,privateState);
 const sensors=template.systems.filter(s=>s.kind==='sensor');
 if(!sensors.length)throw new RangeError('No sensor system in SCS');
 const strengths=sensors.map(s=>{
  const condition=scs.systems[s.id];
  if(!condition||!Number.isInteger(condition.damage)||condition.damage<0||condition.damage>s.boxes)throw new RangeError('Invalid sensor condition');
  if(condition.damage!==0||condition.deactivated||condition.criticalEffects?.length)throw new RangeError('Sensor damage or critical effect needs adjudication');
  return s.sensorStrength;
 });
 // A ship's strongest sensor supplies EW; additional sensors are not summed.
 const available=Math.max(...strengths);
 const allocation=validateEWAllocation({available,defensive:order.defensive,offensive:order.offensive});
 return {...privateState,scs:{...scs,ew:{...scs.ew,defensive:allocation.defensive,offensive:allocation.offensive,unspent:allocation.unspent}}};
}
export function rollShipInitiative({template,privateState,ship,roll}){
 const {scs}=loadShipRules(template,privateState);
 if(!Number.isInteger(roll)||roll<1||roll>20)throw new RangeError('Server d20 required');
 if(scs.initiative?.roll!==null&&scs.initiative?.roll!==undefined)throw new RangeError('Initiative already rolled');
 if(scs.systems&&Object.values(scs.systems).some(s=>s.criticalEffects?.length))throw new RangeError('Critical initiative modifiers require adjudication');
 const result=unitInitiative({roll,printedBonus:template.stats.initiativeBonus,speed:ship.speed});
 return {result,privateState:{...privateState,scs:{...scs,initiative:result}}};
}
export function verifiedUndamagedThrust({template,privateState}){
 const {scs}=loadShipRules(template,privateState);
 const result=derivePrintedEngineThrust(template,scs);
 if(!result.safeForAutomaticMovement)throw new RangeError('Damaged engine requires adjudication');
 return result.unaffected;
}
