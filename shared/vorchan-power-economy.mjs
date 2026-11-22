import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION} from './vorchan-scs-identification.mjs';
// Only verified power diamonds on the three actual Vorchan weapon mounts.
// Destroyed systems never release power; hangars and thrusters cannot be switched off.
export const VORCHAN_SWITCHABLE_POWER=Object.freeze(Object.fromEntries(LIB.weaponMounts.map(m=>{
 const weapon=LIB.weapons.find(w=>w.id===m.weaponId);
 if(!weapon||!Number.isInteger(weapon.powerRequired))throw new Error('Unverified weapon power');
 return [m.id,weapon.powerRequired];
})));
const nonnegative=n=>Number.isInteger(n)&&n>=0;
export function vorchanPowerBudget({trial,turn,deactivated=[],purchasedThrust=0,extraEWPower=0}){
 if(trial?.libraryId!==LIB.id||!nonnegative(turn)||turn<1||!Array.isArray(deactivated)||!nonnegative(purchasedThrust)||!nonnegative(extraEWPower))throw new RangeError('Invalid power state');
 if(new Set(deactivated).size!==deactivated.length||deactivated.some(id=>!Object.hasOwn(VORCHAN_SWITCHABLE_POWER,id)))throw new RangeError('Only verified power-using Vorchan mounts can be deactivated');
 const destroyed=trial.destroyedSystems??[];
 if(!Array.isArray(destroyed))throw new RangeError('Invalid destroyed systems');
 if(deactivated.some(id=>destroyed.includes(id)))throw new RangeError('Destroyed systems cannot release power');
 const engine=VORCHAN_SCS_IDENTIFICATION.systems.find(s=>s.id==='engine');
 const engineDestroyed=destroyed.includes('engine')||trial.engineDestroyed===true;
 const reactorDestroyed=destroyed.includes('reactor')||trial.reactorDestroyed===true;
 if(reactorDestroyed)throw new RangeError('Reactor destroyed: ship is destroyed');
 // Critical effects must be derived from verified rules, not guessed from damage boxes.
 const reactorLoss=trial.verifiedReactorPowerLoss??0;
 const engineLoss=trial.verifiedEngineThrustLoss??0;
 if(!nonnegative(reactorLoss)||!nonnegative(engineLoss))throw new RangeError('Unverified reactor/engine critical');
 if(Object.keys(trial.systemDamage??{}).some(id=>id==='engine'||id==='reactor')&&trial.criticalDamageAdjudicated!==true)throw new RangeError('Engine/reactor damage requires critical adjudication');
 const freedPower=deactivated.reduce((n,id)=>n+VORCHAN_SWITCHABLE_POWER[id],0);
 const availablePower=LIB.extraPower+freedPower-reactorLoss;
 const thrustPower=purchasedThrust*LIB.engineEfficiency.power;
 const requiredPower=thrustPower+extraEWPower;
 const reactorShutdown=availablePower<0;
 if(reactorShutdown)throw new RangeError('Reactor power shortage exceeds verified deactivations');
 if(engineDestroyed&&(purchasedThrust>0||engineLoss>0))throw new RangeError('Destroyed engine cannot purchase thrust');
 if(requiredPower>availablePower)throw new RangeError('Insufficient reactor power');
 const freeThrust=engineDestroyed?0:Math.max(0,(engine?.iconValue??10)-engineLoss);
 return {turn,deactivated:[...deactivated],freedPower,reactorLoss,availablePower,requiredPower,unusedPower:availablePower-requiredPower,purchasedThrust,thrustPower,extraEWPower,freeThrust,availableThrust:engineDestroyed?0:freeThrust+purchasedThrust,engineDestroyed};
}
