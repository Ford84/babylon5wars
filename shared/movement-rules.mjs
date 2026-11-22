// B5W Second Edition Rules Compendium, Movement & Maneuver:
// Turning, Turn Cost, Turn Delay, Shortened Turns and Snap Turns.
// Pure validation/calculation; not yet a ship movement executor.
const nonneg=(x,name)=>{if(!Number.isInteger(x)||x<0)throw new RangeError(name);return x;};
const ratio=(x,name)=>{if(!x||!Number.isInteger(x.numerator)||!Number.isInteger(x.denominator)||x.numerator<0||x.denominator<=0)throw new RangeError(name);return x;};
export function turnRequirements({speed,costRatio,delayRatio,shortenBy=0,angle=60,agile=false}){
 nonneg(speed,'speed');ratio(costRatio,'turn cost');ratio(delayRatio,'turn delay');nonneg(shortenBy,'shortenBy');
 if(![60,120,180].includes(angle))throw new RangeError('angle');
 if(angle!==60&&!agile)throw new RangeError('Snap turns require agile ship');
 const multiplier=angle/60;
 const baseCost=Math.max(1,Math.ceil(speed*costRatio.numerator/costRatio.denominator))*multiplier;
 const originalDelay=Math.ceil(speed*delayRatio.numerator/delayRatio.denominator);
 const minDelay=originalDelay===0?0:1;
 if(shortenBy>originalDelay-minDelay)throw new RangeError('Cannot shorten below minimum delay');
 const totalCost=baseCost+shortenBy;
 return {angle,baseCost,totalCost,originalDelay,delay:originalDelay-shortenBy,
  thrusterSplit:{minimumEach:Math.floor(totalCost/2),oddPoint:totalCost%2},
  snap:angle!==60,extendedTurnAllowed:angle===60};
}
export function remainingTurnDelay({speed,delayRatio,hexesSinceTurn,shortenBy=0}){
 nonneg(speed,'speed');ratio(delayRatio,'turn delay');nonneg(hexesSinceTurn,'hexes since turn');nonneg(shortenBy,'shortenBy');
 const required=Math.max(0,Math.ceil(speed*delayRatio.numerator/delayRatio.denominator)-shortenBy);
 return {required,remaining:Math.max(0,required-hexesSinceTurn)};
}
export function advanceHex({q,r},facing){
 if(!Number.isInteger(q)||!Number.isInteger(r)||!Number.isInteger(facing)||facing<0||facing>5)throw new RangeError('hex or facing');
 // Axial coordinates; 0 points north-east, clockwise.
 const vectors=[[1,-1],[1,0],[0,1],[-1,1],[-1,0],[0,-1]];
 return {q:q+vectors[facing][0],r:r+vectors[facing][1]};
}
