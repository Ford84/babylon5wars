// Second Edition ordinary (non-agile, non-gravitic) orientation manoeuvres.
// The state tracks direction of motion separately from the ship's facing.
const valid=n=>Number.isInteger(n)&&n>=0;
export function pivotStart(state,{direction,cost,thrusterPair}){
 if(![-1,1].includes(direction)||!valid(cost)||cost<1||!['forward-port','aft-starboard','forward-starboard','aft-port'].includes(thrusterPair))throw new RangeError('Invalid pivot');
 if(state.rollInProgress||state.pivotActive||state.pivotInProgress||state.pivotTurn===state.turn)throw new RangeError('Pivot prohibited');
 const clockwise=direction===1;
 if(clockwise&&!['forward-port','aft-starboard'].includes(thrusterPair)||!clockwise&&!['forward-starboard','aft-port'].includes(thrusterPair))throw new RangeError('Wrong pivot thruster pair');
 return {...state,facing:(state.facing+direction+6)%6,pivotInProgress:true,pivotActive:true,pivotDirection:direction,pivotTurn:state.turn,pivotStartPair:thrusterPair,pivotThrustSpent:(state.pivotThrustSpent||0)+cost};
}
export function pivotHalt(state,{cost,thrusterPair}){
 if(!state.pivotInProgress||!valid(cost)||cost<1)throw new RangeError('No pivot to halt');
 const opposite={'forward-port':['forward-starboard','aft-port'],'aft-starboard':['forward-starboard','aft-port'],'forward-starboard':['forward-port','aft-starboard'],'aft-port':['forward-port','aft-starboard']};
 if(!opposite[state.pivotStartPair]?.includes(thrusterPair))throw new RangeError('Opposing pivot thruster pair required');
 return {...state,pivotInProgress:false,pivotActive:true,pivotThrustSpent:(state.pivotThrustSpent||0)+cost};
}
export function rollStart(state,cost){
 if(!valid(cost)||cost<1||state.rollInProgress||state.pivotInProgress)throw new RangeError('Cannot start roll');
 return {...state,rollInProgress:true,rollStartedTurn:state.turn,rollThrustSpent:(state.rollThrustSpent||0)+cost};
}
export function rollHalt(state,cost){
 if(!valid(cost)||cost<1||!state.rollInProgress||state.turn<=state.rollStartedTurn)throw new RangeError('Cannot halt roll before next turn');
 return {...state,rollInProgress:false,rollThrustSpent:(state.rollThrustSpent||0)+cost};
}
export function orientationAtMovementStart(state,turn){
 if(!valid(turn)||turn<=state.turn)throw new RangeError('Invalid next movement turn');
 return {...state,turn,
  rolled:state.rollInProgress?!state.rolled:state.rolled,
  facing:state.pivotInProgress?(state.facing+state.pivotDirection+6)%6:state.facing,
  pivotTurn:state.pivotInProgress?turn:state.pivotTurn};
}
