// Server-side bridge from a versioned library SCS to movement execution.
// Client orders contain intentions only, never stats or available thrust.
import {derivePrintedEngineThrust} from './effective-scs.mjs';
import {validateMovementOrder} from './movement-executor.mjs';
export function planLibraryMovement({template,scsState,ship,order,expectedShipVersion}){
 const engine=derivePrintedEngineThrust(template,scsState);
 if(!engine.safeForAutomaticMovement)throw new RangeError('Engine damage/critical modifiers require resolution before movement');
 if(scsState.power?.spent>0||Object.keys(scsState.power?.allocations||{}).length)
  throw new RangeError('Power allocations require authoritative resolution');
 if(ship.templateId&&ship.templateId!==template.id)throw new RangeError('Ship template mismatch');
 if(order?.limits!==undefined||order?.availableThrust!==undefined||order?.accelCost!==undefined)
  throw new RangeError('Movement order cannot supply ship statistics');
 const accelCost=template.stats?.accelerationCost;
 if(!Number.isInteger(accelCost)||accelCost<1)throw new RangeError('Library SCS lacks verified acceleration cost');
 const result=validateMovementOrder({ship,order,expectedShipVersion,limits:{accelCost,availableThrust:engine.unaffected}});
 return {...result,source:{templateRevision:template.source.sheetRevision,engineIds:engine.engineIds},
  commitAllowed:false,reason:'Pending collision, terrain, manoeuvre and initiative checks'};
}
