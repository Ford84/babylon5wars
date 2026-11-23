// Player-directed staged movement. The engine executes only the selected
// segment, then waits for the next player choice. Compendium: Movement and
// Speed; Turning; Turn Cost and Turn Delay.
import {advanceHex} from './movement-rules.mjs';
const integer=Number.isInteger;
export function newStagedMovement({q,r,facing,speed,version=0}){
 if(![q,r,facing,speed,version].every(integer)||facing<0||facing>5||version<0)throw new RangeError('Invalid ship movement state');
 return {q,r,facing,speed,version,remaining:Math.abs(speed),moved:0,turnDelayRemaining:0,thrustSpent:0,history:[],started:false,motionFacing:facing,slideDirection:null,normalSinceSlide:true,rolled:false,rollInProgress:false,pivotActive:false,pivotInProgress:false,pivotTurn:null};
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
  const heading=state.speed<0?((state.motionFacing??state.facing)+3)%6:(state.motionFacing??state.facing);
  let point={q:state.q,r:state.r};const path=[];
  for(let i=0;i<action.hexes;i++){point=advanceHex(point,heading);if(Math.abs(point.q)>10000||Math.abs(point.r)>10000)throw new RangeError('Coordinate limit');path.push(point);}
  return {...state,...point,remaining:state.remaining-action.hexes,moved:state.moved+action.hexes,turnDelayRemaining:Math.max(0,state.turnDelayRemaining-action.hexes),normalSinceSlide:true,started:true,version:state.version+1,history:[...state.history,{type:'advance',hexes:action.hexes,path}]};
 }
 if(action.type==='slide'){
  if(state.remaining<1||state.speed===0)throw new RangeError('Slide requires remaining movement');
  if(![-1,1].includes(action.direction)||state.slideDirection!==null&&state.slideDirection!==action.direction||!state.normalSinceSlide)throw new RangeError('Slide direction or forward-movement interval invalid');
  if(!integer(action.cost)||action.cost<1||state.thrustSpent+action.cost>limits.availableThrust)throw new RangeError('Insufficient slide thrust');
  const motion=state.speed<0?((state.motionFacing??state.facing)+3)%6:(state.motionFacing??state.facing);
  const destination=advanceHex({q:state.q,r:state.r},(motion+action.direction+6)%6);
  return {...state,...destination,remaining:state.remaining-1,moved:state.moved+1,thrustSpent:state.thrustSpent+action.cost,turnDelayRemaining:Math.max(0,state.turnDelayRemaining-1),slideDirection:action.direction,normalSinceSlide:false,started:true,version:state.version+1,history:[...state.history,{type:'slide',direction:action.direction,cost:action.cost,path:[destination]}]};
 }
 if(action.type==='turn'){
  if(state.pivotInProgress||state.rollInProgress)throw new RangeError('Turn prohibited during active pivot or roll');
  const facingAfter=(state.facing+action.direction+6)%6;
  const pivotAligns=state.pivotActive&&facingAfter===(state.motionFacing??state.facing);
  if(state.pivotActive&&!pivotAligns)throw new RangeError('Pivoted ship may only turn into its direction of motion');
  if(![ -1,1 ].includes(action.direction))throw new RangeError('Turn must be one 60-degree step');
  if(state.turnDelayRemaining>0)throw new RangeError('Turn delay not satisfied');
  if(!integer(action.cost)||action.cost<1||!integer(action.delay)||action.delay<0)throw new RangeError('Verified turn cost and delay required');
  if(!integer(action.shortenBy||0)||action.shortenBy<0||action.shortenBy>Math.max(0,action.delay-(state.speed===0?0:1)))throw new RangeError('Invalid turn shortening');
  const spent=action.cost+(action.shortenBy??0);
  if(state.thrustSpent+spent>limits.availableThrust)throw new RangeError('Insufficient thrust');
  return {...state,facing:(state.facing+action.direction+6)%6,motionFacing:facingAfter,pivotActive:pivotAligns?false:state.pivotActive,turnDelayRemaining:action.delay-(action.shortenBy??0),thrustSpent:state.thrustSpent+spent,started:true,version:state.version+1,history:[...state.history,{type:'turn',direction:action.direction,spent,shortenBy:action.shortenBy??0}]};
 }
 throw new RangeError('Unknown movement action');
}
export function turnCostAtSpeed(speed,chart){
 if(!integer(speed)||!Array.isArray(chart)||chart.length!==12)throw new RangeError('Invalid speed/turn chart');
 if(Math.abs(speed)===0)return 1;
 if(Math.abs(speed)>12)return Math.ceil(Math.abs(speed)/2);
 const value=chart[Math.abs(speed)-1];
 if(!integer(value)||value<0)throw new RangeError('Invalid printed turn chart');
 return Math.max(1,value);
}

// Vorchan printed delay table corresponds to a 1/3 turn delay; rounding up.
export function vorchanTurnDelayAtSpeed(speed,chart){
 if(!integer(speed)||!Array.isArray(chart)||chart.length!==12)throw new RangeError('Invalid speed/turn delay chart');
 const n=Math.abs(speed);
 if(n===0)return 0;
 if(n>12)return Math.ceil(n/3);
 const value=chart[n-1];
 if(!integer(value)||value<0)throw new RangeError('Invalid printed delay');
 return value;
}
