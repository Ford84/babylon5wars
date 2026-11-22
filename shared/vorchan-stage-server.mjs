// Strict server-side staged Vorchan movement adapter. Player submits intent,
// never turn cost, turn delay, or thrust limits.
import {newStagedMovement,stagedMove,turnCostAtSpeed} from './staged-movement.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
export function applyVorchanStage({ship,privateState,action,turn,otherShips=[]}){
 if(!Number.isInteger(turn)||turn<1)throw new RangeError('Invalid battle turn');
 const trial=privateState?.trial;
 if(!trial||trial.libraryId!==LIB.id)throw new RangeError('Not a Vorchan trial ship');
 if(!action||typeof action!=='object'||Array.isArray(action)||!['speed','advance','turn'].includes(action.type))throw new RangeError('Invalid staged action');
 if(Object.keys(action).some(k=>!({speed:['type','change','purchasedThrust'],advance:['type','hexes'],turn:['type','direction']}[action.type].includes(k))))throw new RangeError('Client cannot supply movement costs or limits');
 const old=trial.movement?.turn===turn?trial.movement.state:newStagedMovement({q:ship.q,r:ship.r,facing:ship.facing,speed:ship.speed,version:0});
 if(old.q!==ship.q||old.r!==ship.r||old.facing!==ship.facing||old.speed!==ship.speed)throw new RangeError('Movement state out of sync');
 const purchased=trial.movement?.turn===turn?trial.movement.purchasedThrust:0;
 let nextPurchase=purchased,moveAction=action;
 if(action.type==='speed'){
  if(!Number.isInteger(action.purchasedThrust)||action.purchasedThrust<0||action.purchasedThrust>Math.floor(LIB.extraPower/LIB.engineEfficiency.power))throw new RangeError('Unverified thrust budget; only printed extra reactor power can be purchased');
  nextPurchase=action.purchasedThrust;
  moveAction={type:'speed',change:action.change};
 }
 if(action.type==='turn'){
  const speed=Math.abs(old.speed);
  if(speed<1||speed>12)throw new RangeError('Stationary and high-speed turns require separate verified rules');
  moveAction={type:'turn',direction:action.direction,cost:turnCostAtSpeed(old.speed,LIB.turnCost),delay:LIB.turnDelay[speed-1]};
 }
 const limits={availableThrust:10+nextPurchase,accelCost:LIB.accelerationCost};
 const next=stagedMove(old,moveAction,limits);
 const newPath=next.history.at(-1)?.path||[];
 for(const point of newPath){
  if(point.q<0||point.q>=20||point.r<0||point.r>=32)throw new RangeError('Outside trial map bounds');
  // Ordinary ships may share a hex. Ramming is a separate declared action.
 }
 const updatedTrial={...trial,movement:{turn,purchasedThrust:nextPurchase,powerSpent:nextPurchase*LIB.engineEfficiency.power,state:next}};
 return {nextShip:{q:next.q,r:next.r,facing:next.facing,speed:next.speed},nextPrivateState:{...privateState,trial:updatedTrial},movement:next,spent:next.thrustSpent,powerSpent:updatedTrial.movement.powerSpent};
}
