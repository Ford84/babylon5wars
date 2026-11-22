// Rules Compendium, Movement & Maneuver: Slides and Extended Turns.
// Pure state transitions, not yet authoritative map movement.
const nat=(n,label)=>{if(!Number.isInteger(n)||n<0)throw new RangeError(label);return n;};
export function slideOrder({speed,direction,previousSlide=null,forwardSincePrevious=true,thrustAvailable}){
 nat(speed,'speed');nat(thrustAvailable,'thrustAvailable');
 if(speed===0)throw new RangeError('Cannot slide at zero speed');
 if(!['port','starboard'].includes(direction))throw new RangeError('slide direction');
 if(previousSlide!==null&&!['port','starboard'].includes(previousSlide))throw new RangeError('previous slide');
 if(previousSlide&&previousSlide!==direction)throw new RangeError('Cannot reverse slide direction in one turn');
 if(previousSlide&&!forwardSincePrevious)throw new RangeError('Must move forward before another slide');
 const thrust=Math.ceil(speed/5);
 if(thrust>thrustAvailable)throw new RangeError('Insufficient opposite-side thrust');
 return {thrust,thruster:direction==='port'?'starboard':'port',countsAsMovementHex:true,nextPreviousSlide:direction,forwardRequiredBeforeNext:true};
}
export function startExtendedTurn({turnCost,paid,direction,alreadyManoeuvring=false}){
 nat(turnCost,'turnCost');nat(paid,'paid');
 if(turnCost===0||paid<Math.ceil(turnCost/4)||paid>=turnCost)throw new RangeError('Must pay at least 25% but less than full turn cost');
 if(!['clockwise','counterclockwise'].includes(direction)||alreadyManoeuvring)throw new RangeError('Invalid extended turn');
 return {direction,totalCost:turnCost,paid,remainder:turnCost-paid,pending:true,lockedManoeuvres:true};
}
export function finishExtendedTurn({pending,thrustAvailable,shorteningCost=0}){
 nat(thrustAvailable,'thrustAvailable');nat(shorteningCost,'shorteningCost');
 if(!pending?.pending||!Number.isInteger(pending.remainder)||pending.remainder<1)throw new RangeError('No pending extended turn');
 const cost=pending.remainder+shorteningCost;
 if(thrustAvailable<cost)return {cancelled:true,reason:'physically_unable_to_pay',lostPreviouslySpent:pending.paid,accelerationForbidden:true};
 return {completed:true,cost,direction:pending.direction,turnDelayStartsNow:true,accelerationForbidden:true};
}
