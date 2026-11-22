// Strict server-side staged Vorchan movement adapter. Player submits intent,
// never turn cost, turn delay, or thrust limits.
import {adjustTurnDelay} from './speed-integration.mjs';
import {newStagedMovement,stagedMove,turnCostAtSpeed} from './staged-movement.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
export function applyVorchanStage({ship,privateState,action,turn,otherShips=[]}){
 if(!Number.isInteger(turn)||turn<1)throw new RangeError('Invalid battle turn');
 const trial=privateState?.trial;
 if(!trial||trial.libraryId!==LIB.id)throw new RangeError('Not a Vorchan trial ship');
 if(!action||typeof action!=='object'||Array.isArray(action)||!['speed','advance','turn','slide'].includes(action.type))throw new RangeError('Invalid staged action');
 if(Object.keys(action).some(k=>!({speed:['type','change','purchasedThrust'],advance:['type','hexes'],turn:['type','direction'],slide:['type','direction']}[action.type].includes(k))))throw new RangeError('Client cannot supply movement costs or limits');
 const previous=trial.movement?.turn===turn-1?trial.movement.state:null;
 const base=newStagedMovement({q:ship.q,r:ship.r,facing:ship.facing,speed:ship.speed,version:0});
 const old=trial.movement?.turn===turn?trial.movement.state:previous?{...base,turnDelayRemaining:previous.turnDelayRemaining,turnDelayOriginal:previous.turnDelayOriginal??previous.turnDelayRemaining,hexesSinceTurn:previous.hexesSinceTurn??0}:base;
 if(old.q!==ship.q||old.r!==ship.r||old.facing!==ship.facing||old.speed!==ship.speed)throw new RangeError('Movement state out of sync');
 const purchased=trial.movement?.turn===turn?trial.movement.purchasedThrust:0;
 let nextPurchase=purchased,moveAction=action;
 if(action.type==='speed'){
  if(!Number.isInteger(action.purchasedThrust)||action.purchasedThrust<0||action.purchasedThrust>Math.floor(LIB.extraPower/LIB.engineEfficiency.power))throw new RangeError('Unverified thrust budget; only printed extra reactor power can be purchased');
  nextPurchase=action.purchasedThrust;
  moveAction={type:'speed',change:action.change};
 }
 if(action.type==='slide'){
  if(Math.abs(old.speed)<1)throw new RangeError('Stationary ship cannot slide');
  moveAction={type:'slide',direction:action.direction,cost:Math.ceil(Math.abs(old.speed)/5)};
 }
 if(action.type==='turn'){
  const speed=Math.abs(old.speed);
  if(speed<1||speed>12)throw new RangeError('Stationary and high-speed turns require separate verified rules');
  moveAction={type:'turn',direction:action.direction,cost:turnCostAtSpeed(old.speed,LIB.turnCost),delay:LIB.turnDelay[speed-1]};
 }
 const limits={availableThrust:10+nextPurchase,accelCost:LIB.accelerationCost};
 let next=stagedMove(old,moveAction,limits);
 if(action.type==='turn')next={...next,turnDelayOriginal:moveAction.delay,hexesSinceTurn:0};
 if((action.type==='advance'||action.type==='slide')&&old.turnDelayRemaining>0)next={...next,turnDelayOriginal:old.turnDelayOriginal,hexesSinceTurn:(old.hexesSinceTurn??0)+action.hexes};
 if(action.type==='speed'&&old.turnDelayRemaining>0){const speed=Math.abs(next.speed);if(speed>12)throw new RangeError('Speed beyond verified turn-delay chart');const delay=speed===0?0:LIB.turnDelay[speed-1];next={...next,turnDelayRemaining:adjustTurnDelay({oldRequired:old.turnDelayOriginal??old.turnDelayRemaining,hexesSinceTurn:old.hexesSinceTurn??0,newRequired:delay}).remaining,turnDelayOriginal:delay};}
 const newPath=next.history.at(-1)?.path||[];
 for(const point of newPath){
  if(point.q<0||point.q>=20||point.r<0||point.r>=32)throw new RangeError('Outside trial map bounds');
  // Ordinary ships may share a hex. Ramming is a separate declared action.
 }
 const updatedTrial={...trial,movement:{turn,purchasedThrust:nextPurchase,powerSpent:nextPurchase*LIB.engineEfficiency.power,state:next}};
 return {nextShip:{q:next.q,r:next.r,facing:next.facing,speed:next.speed},nextPrivateState:{...privateState,trial:updatedTrial},movement:next,spent:next.thrustSpent,powerSpent:updatedTrial.movement.powerSpent};
}
