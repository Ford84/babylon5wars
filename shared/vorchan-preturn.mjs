import {powerBudget,ewAllocation} from './preturn.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
// Verified from the printed Vorchan SCS: one sensor array, strength 2.
// This adapter intentionally refuses damage conditions until critical effects are mapped.
export const VORCHAN_SENSOR_STRENGTH=2;
export function commitVorchanPower({trial,turn,purchasedThrust=0,extraEW=0}){
 if(!Number.isInteger(turn)||turn<1||trial?.libraryId!==LIB.id)throw new RangeError('Invalid Vorchan power state');
 if(trial.powerAllocation?.turn===turn)throw new RangeError('Power already committed this turn');
 if(!Number.isInteger(purchasedThrust)||purchasedThrust<0||!Number.isInteger(extraEW)||extraEW<0)throw new RangeError('Invalid power purchase');
 if(Object.keys(trial.systemDamage||{}).length)throw new RangeError('Damaged systems require verified power recalculation');
 const thrustPower=purchasedThrust*LIB.engineEfficiency.power;
 const ew=ewAllocation({sensors:[{original:VORCHAN_SENSOR_STRENGTH,current:VORCHAN_SENSOR_STRENGTH}],extra:[extraEW],defensive:0,offensive:{}});
 const budget=powerBudget({extraPower:LIB.extraPower});
 if(thrustPower+ew.powerCost>budget.available)throw new RangeError('Insufficient reactor power');
 return {...trial,powerAllocation:{turn,purchasedThrust,extraEW,thrustPower,ewPower:ew.powerCost,unusedPower:budget.available-thrustPower-ew.powerCost},power:{extraThrust:purchasedThrust,powerSpent:thrustPower+ew.powerCost}};
}
export function commitVorchanEW({trial,turn,defensive=0,offensive={},enemyIds=[]}){
 if(!Number.isInteger(turn)||turn<1||trial?.powerAllocation?.turn!==turn)throw new RangeError('Commit power before EW');
 if(trial.ewAllocation?.turn===turn)throw new RangeError('EW already committed this turn');
 if(!Array.isArray(enemyIds)||Object.keys(offensive||{}).some(id=>!enemyIds.includes(id)))throw new RangeError('Offensive EW target must be an enemy ship');
 const allocated=ewAllocation({sensors:[{original:VORCHAN_SENSOR_STRENGTH,current:VORCHAN_SENSOR_STRENGTH}],extra:[trial.powerAllocation.extraEW],defensive,offensive});
 return {...trial,ewAllocation:{turn,...allocated},ew:{defensive:allocated.defensive,offensive:allocated.offensive}};
}
