// Second Edition movement-speed rules, independent of the UI and persistence.
export function speedChangeCost({speed,change,accelCost,freeThrust,purchasedThrust=0,engineDestroyed=false}){
 const vals=[speed,change,accelCost,freeThrust,purchasedThrust];
 if(!vals.every(Number.isInteger)||accelCost<1||freeThrust<0||purchasedThrust<0)throw new RangeError('Invalid speed/thrust inputs');
 if(engineDestroyed&&(change!==0||purchasedThrust!==0))throw new RangeError('Destroyed engine cannot alter speed or purchase thrust');
 const required=Math.abs(change)*accelCost;
 const available=engineDestroyed?0:freeThrust+purchasedThrust;
 if(required>available)throw new RangeError('Insufficient engine thrust');
 return {speed:speed+change,required,available,remaining:available-required};
}
export function adjustTurnDelay({oldRequired,hexesSinceTurn,newRequired}){
 if(![oldRequired,hexesSinceTurn,newRequired].every(Number.isInteger)||Math.min(oldRequired,hexesSinceTurn,newRequired)<0)throw new RangeError('Invalid turn delay');
 return {remaining:hexesSinceTurn>=oldRequired?0:Math.max(0,newRequired-hexesSinceTurn),satisfied:hexesSinceTurn>=oldRequired};
}
export function thrusterOverthrust({rating,used,damage=0}){
 if(![rating,used,damage].every(Number.isInteger)||rating<0||used<0||damage<0)throw new RangeError('Invalid thruster condition');
 if(used>2*rating)throw new RangeError('Thruster cannot exceed twice its rating');
 const excess=Math.max(0,used-rating);
 return {excess,criticalCheckRequired:excess>0,criticalModifier:excess>0?excess+damage:0};
}
export function turnThrustSplit({cost,reverse=false,oddTo='main'}){
 if(!Number.isInteger(cost)||cost<1||!['main','side'].includes(oddTo))throw new RangeError('Invalid turn split');
 const half=Math.floor(cost/2),extra=cost%2;
 return {main:half+(oddTo==='main'?extra:0),side:half+(oddTo==='side'?extra:0),reverse};
}
