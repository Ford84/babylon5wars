// Player-directed staged movement. The engine executes only the selected
// segment, then waits for the next player choice. Compendium: Movement and
// Speed; Turning; Turn Cost and Turn Delay.
import {advanceHex} from './movement-rules.mjs';
const integer=Number.isInteger;
export function newStagedMovement({q,r,facing,speed,version=0}){
 if(![q,r,facing,speed,version].every(integer)||facing<0||facing>5||version<0)throw new RangeError('Invalid ship movement state');
 return {q,r,facing,speed,version,remaining:Math.abs(speed),moved:0,turnDelayRemaining:0,thrustSpent:0,history:[],started:false};
}
export function stagedMove(state,action,limits){
 if(!state||!action||!limits||!integer(state.remaining)||state.remaining<0)throw new RangeError('Invalid movement state');
 if(!integer(limits.availableThrust)||limits.availableThrust<0)throw new RangeError('Invalid thrust limit');
 if(action.type==='speed'){
  if(state.started||state.moved!==0)throw new RangeError('Speed change must precede movement and manoeuvres');
  if(!integer(action.change)||!integer(limits.accelCost)||limits.accelCost<1)throw new RangeError('Invalid acceleration');
  const spent=Math.abs(action.change)*limits.accelCost;
  if(state.thrustSpent+spent>limits.availableThrust)throw new RangeError('Insufficient thrust');
  const speed=state.speed+action.change;
  return {...state,speed,remaining:Math.abs(speed),thrustSpent:state.thrustSpent+spent,started:true,version:state.version+1,history:[...state.history,{type:'speed',change:action.change,spent}]};
 }
 if(action.type==='advance'){
  if(!integer(action.hexes)||action.hexes<1||action.hexes>state.remaining)throw new RangeError('Invalid movement segment');
  const heading=state.speed<0?(state.facing+3)%6:state.facing;
  let point={q:state.q,r:state.r};const path=[];
  for(let i=0;i<action.hexes;i++){point=advanceHex(point,heading);if(Math.abs(point.q)>10000||Math.abs(point.r)>10000)throw new RangeError('Coordinate limit');path.push(point);}
  return {...state,...point,remaining:state.remaining-action.hexes,moved:state.moved+action.hexes,turnDelayRemaining:Math.max(0,state.turnDelayRemaining-action.hexes),started:true,version:state.version+1,history:[...state.history,{type:'advance',hexes:action.hexes,path}]};
 }
 if(action.type==='turn'){
  if(![ -1,1 ].includes(action.direction))throw new RangeError('Turn must be one 60-degree step');
  if(state.turnDelayRemaining>0)throw new RangeError('Turn delay not satisfied');
  if(!integer(action.cost)||action.cost<1||!integer(action.delay)||action.delay<0)throw new RangeError('Verified turn cost and delay required');
  if(!integer(action.shortenBy||0)||action.shortenBy<0||action.shortenBy>Math.max(0,action.delay-1))throw new RangeError('Invalid turn shortening');
  const spent=action.cost+(action.shortenBy??0);
  if(state.thrustSpent+spent>limits.availableThrust)throw new RangeError('Insufficient thrust');
  return {...state,facing:(state.facing+action.direction+6)%6,turnDelayRemaining:action.delay-(action.shortenBy??0),thrustSpent:state.thrustSpent+spent,started:true,version:state.version+1,history:[...state.history,{type:'turn',direction:action.direction,spent,shortenBy:action.shortenBy??0}]};
 }
 throw new RangeError('Unknown movement action');
}
export function turnCostAtSpeed(speed,chart){
 if(!integer(speed)||!Array.isArray(chart)||chart.length!==12)throw new RangeError('Invalid speed/turn chart');
 if(Math.abs(speed)===0)return 1;
 if(Math.abs(speed)>12)throw new RangeError('Speed exceeds verified printed chart; use fractional rule');
 const value=chart[Math.abs(speed)-1];
 if(!integer(value)||value<0)throw new RangeError('Invalid printed turn chart');
 return Math.max(1,value);
}
