// Server-usable movement order reducer. Source: Second Edition Rules
// Compendium, Movement and Speed, Acceleration/Deceleration, Normal Motion.
// This intentionally accepts straight-line orders only. Turns/slides/pivots
// must be handled by a verified expanded-order reducer, not silently ignored.
import {advanceHex} from './movement-rules.mjs';
const integer=n=>Number.isInteger(n);
export function executeStraightMovement({ship,order,limits}){
 if(!ship||!order||!limits)throw new RangeError('Missing movement inputs');
 const {q,r,facing,speed}=ship;
 if(![q,r,facing,speed].every(integer)||facing<0||facing>5)throw new RangeError('Invalid ship state');
 if(!integer(order.speedChange)||!Number.isInteger(limits.accelCost)||limits.accelCost<1||!Number.isInteger(limits.availableThrust)||limits.availableThrust<0)throw new RangeError('Invalid speed order or limits');
 if(order.manoeuvres?.length)throw new RangeError('Complex manoeuvres not yet supported by authoritative executor');
 const nextSpeed=speed+order.speedChange;
 const cost=Math.abs(order.speedChange)*limits.accelCost;
 if(cost>limits.availableThrust)throw new RangeError('Insufficient verified thrust');
 const heading=nextSpeed<0?(facing+3)%6:facing;
 let point={q,r};const path=[];
 for(let step=0;step<Math.abs(nextSpeed);step++){
  point=advanceHex(point,heading);
  if(Math.abs(point.q)>10000||Math.abs(point.r)>10000)throw new RangeError('Outside map coordinate limits');
  path.push(point);
 }
 return {next:{...ship,...point,speed:nextSpeed},thrustSpent:cost,path,hexesMoved:path.length,requiresTerrainAndCollisionCheck:true};
}
export function validateMovementOrder({ship,order,limits,expectedShipVersion}){
 if(!integer(expectedShipVersion)||expectedShipVersion<0)throw new RangeError('Expected ship version required');
 if(ship.version!==expectedShipVersion)throw new RangeError('Stale ship version');
 return executeStraightMovement({ship,order,limits});
}
