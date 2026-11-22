// Strict server-side staged Vorchan movement adapter. Player submits intent,
// never turn cost, turn delay, or thrust limits.
import {pivotStart,pivotHalt,rollStart,rollHalt,orientationAtMovementStart} from './orientation-stage.mjs';
import {adjustTurnDelay} from './speed-integration.mjs';
import {newStagedMovement,stagedMove,turnCostAtSpeed} from './staged-movement.mjs';
import {vorchanPowerBudget} from './vorchan-power-economy.mjs';
import {effectiveThrusterRating,overthrustChecksForTurn,manoeuvreIncrementalEngineCost} from './thruster-criticals.mjs';
import {validateManoeuvreThrusters} from './manoeuvre-thrusters.mjs';
import {createThrusterLedger,allocateThrusterThrust} from './thruster-ledger.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
// Ratings refer to channel capacity, not damage boxes or armour.
// The forward thruster ratings require an SCS verification pass before damaged-thruster automation.
export const VORCHAN_THRUSTER_RATINGS=Object.freeze({retro:1,forward_port_thrust:3,forward_starboard_thrust:3,port_thrust:5,starboard_thrust:5,aft_port_thrust:5,aft_starboard_thrust:5});
export function applyVorchanStage({ship,privateState,action,turn,otherShips=[]}){
 if(!Number.isInteger(turn)||turn<1)throw new RangeError('Invalid battle turn');
 const trial=privateState?.trial;
 if(!trial||trial.libraryId!==LIB.id)throw new RangeError('Not a Vorchan trial ship');
 if(!action||typeof action!=='object'||Array.isArray(action)||!['speed','advance','turn','slide','pivot-start','pivot-halt','roll-start','roll-halt'].includes(action.type))throw new RangeError('Invalid staged action');
 if(Object.keys(action).some(k=>!({speed:['type','change','purchasedThrust','thrusters'],advance:['type','hexes'],turn:['type','direction','thrusters'],slide:['type','direction','thrusters'], 'pivot-start':['type','direction','thrusterPair','oddTo','thrusters'], 'pivot-halt':['type','thrusterPair','oddTo','thrusters'], 'roll-start':['type','thrusters'], 'roll-halt':['type','thrusters']}[action.type].includes(k))))throw new RangeError('Client cannot supply movement costs or limits');
 const previous=trial.movement?.turn===turn-1?trial.movement.state:null;
 const base=newStagedMovement({q:ship.q,r:ship.r,facing:ship.facing,speed:ship.speed,version:0});
 const carried=previous?orientationAtMovementStart({...previous,turn:turn-1},turn):null;
 const old=trial.movement?.turn===turn?trial.movement.state:carried?{...base,...carried,remaining:Math.abs(ship.speed),moved:0,thrustSpent:0,started:false,normalSinceSlide:true,slideDirection:null,history:[],version:0}:base;
 if(old.q!==ship.q||old.r!==ship.r||(trial.movement?.turn===turn&&old.facing!==ship.facing)||old.speed!==ship.speed)throw new RangeError('Movement state out of sync');
 const purchased=trial.movement?.turn===turn?trial.movement.purchasedThrust:(trial.powerAllocation?.turn===turn?trial.powerAllocation.purchasedThrust:0);
 let nextPurchase=purchased,moveAction=action;
 if(action.type==='speed'){
  if(!Number.isInteger(action.purchasedThrust)||action.purchasedThrust<0)throw new RangeError('Invalid purchased thrust');
  if(trial.powerAllocation?.turn===turn&&action.purchasedThrust!==trial.powerAllocation.purchasedThrust)throw new RangeError('Thrust purchase must match committed power allocation');
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
 const committed=trial.powerAllocation?.turn===turn?trial.powerAllocation:null;
 if(committed&&nextPurchase!==committed.purchasedThrust)throw new RangeError('Thrust purchase must match committed power allocation');
 const power=vorchanPowerBudget({trial,turn,deactivated:committed?.deactivated??[],purchasedThrust:nextPurchase,extraEWPower:committed?.ewPower??0});
 const limits={availableThrust:power.availableThrust,accelCost:LIB.accelerationCost};
 if(power.engineDestroyed&&action.type!=='advance')throw new RangeError('Destroyed engine cannot manoeuvre');
 let next;
 if(['pivot-start','pivot-halt','roll-start','roll-halt'].includes(action.type)){
  const cost=action.type.startsWith('pivot')?LIB.pivotCost[action.type==='pivot-start'?0:1]:LIB.rollCost[action.type==='roll-start'?0:1];
  if(!Number.isInteger(cost)||cost<0)throw new RangeError('Manoeuvre cost not verified');
  if(old.thrustSpent+cost>limits.availableThrust)throw new RangeError('Insufficient thrust for orientation manoeuvre');
  const orient={...old,turn};
  if(action.type==='pivot-start'){
   if(!['main','side'].includes(action.oddTo))throw new RangeError('Odd thrust allocation required');
   next=pivotStart(orient,{direction:action.direction,cost,thrusterPair:action.thrusterPair});
  }else if(action.type==='pivot-halt'){
   if(!['main','side'].includes(action.oddTo))throw new RangeError('Odd thrust allocation required');
   next=pivotHalt(orient,{cost,thrusterPair:action.thrusterPair});
  }else if(action.type==='roll-start')next=rollStart(orient,cost);
  else next=rollHalt(orient,cost);
  next={...next,thrustSpent:old.thrustSpent+cost,started:true,version:old.version+1,history:[...old.history,{type:action.type,cost,direction:action.direction??null,thrusterPair:action.thrusterPair??null,oddTo:action.oddTo??null}]};
 }else{
  if(old.rollInProgress&&action.type!=='speed'&&action.type!=='advance')throw new RangeError('Only speed changes and normal movement allowed during roll');
  if(old.pivotInProgress&&action.type!=='advance'&&action.type!=='slide')throw new RangeError('Only normal movement and slides allowed during pivot');
  if(old.pivotActive&&action.type==='speed')throw new RangeError('Cannot change speed while pivoted');
  next=stagedMove(old,moveAction,limits);
 }
 if(action.type==='turn')next={...next,turnDelayOriginal:moveAction.delay,hexesSinceTurn:0};
 if((action.type==='advance'||action.type==='slide')&&old.turnDelayRemaining>0)next={...next,turnDelayOriginal:old.turnDelayOriginal,hexesSinceTurn:(old.hexesSinceTurn??0)+(action.type==='slide'?1:action.hexes)};
 if(action.type==='speed'&&old.turnDelayRemaining>0){const speed=Math.abs(next.speed);if(speed>12)throw new RangeError('Speed beyond verified turn-delay chart');const delay=speed===0?0:LIB.turnDelay[speed-1];next={...next,turnDelayRemaining:adjustTurnDelay({oldRequired:old.turnDelayOriginal??old.turnDelayRemaining,hexesSinceTurn:old.hexesSinceTurn??0,newRequired:delay}).remaining,turnDelayOriginal:delay};}
 const newPath=next.history.at(-1)?.path||[];
 for(const point of newPath){
  if(point.q<0||point.q>=20||point.r<0||point.r>=32)throw new RangeError('Outside trial map bounds');
  // Ordinary ships may share a hex. Ramming is a separate declared action.
 }
 // The player chooses a physical thruster allocation; the server calculates cost and validates it.
 const manoeuvreCost=next.thrustSpent-old.thrustSpent;
 if(manoeuvreCost<0)throw new RangeError('Movement thrust cannot decrease');
 const allocation=action.thrusters??{};
 if(Object.values(allocation).some(v=>!Number.isInteger(v)||v<0)||Object.values(allocation).reduce((a,b)=>a+b,0)!==manoeuvreCost)throw new RangeError('Thruster allocation must exactly equal manoeuvre cost');
 validateManoeuvreThrusters({action,oldState:old,cost:manoeuvreCost,allocation});
 const previousLedger=(trial.movement?.turn===turn?trial.movement.thrusterLedger:null);
 const criticalEffects=trial.thrusterCriticalEffects??{};
 const effectiveRatings=Object.fromEntries(Object.entries(VORCHAN_THRUSTER_RATINGS).map(([id,rating])=>[id,effectiveThrusterRating(rating,criticalEffects[id])]));
 const ledger=previousLedger??createThrusterLedger(effectiveRatings);
 for(const [id,entry] of Object.entries(ledger))if(entry.rating!==effectiveRatings[id])throw new RangeError('Thruster rating changed during turn; requires adjudication');
 // Existing damage and critical effects must be adjudicated before trusting undamaged ratings.
 if(manoeuvreCost&&Object.keys(trial.systemDamage||{}).length)throw new RangeError('Damaged thruster allocation requires adjudication');
 const extraEngineCost=manoeuvreIncrementalEngineCost(allocation,ledger,criticalEffects);
 const previousEngineSpent=trial.movement?.turn===turn?(trial.movement.engineThrustSpent??old.thrustSpent):0;
 const engineThrustSpent=previousEngineSpent+extraEngineCost;
 if(engineThrustSpent>limits.availableThrust)throw new RangeError('Insufficient engine thrust after thruster efficiency/outlet losses');
 const accounted=allocateThrusterThrust(ledger,allocation,{availableThrust:Math.max(limits.availableThrust,old.thrustSpent+manoeuvreCost),alreadySpent:old.thrustSpent});
 const checks=overthrustChecksForTurn(accounted.ledger,trial.thrusterDamageBoxes??{});
 const updatedTrial={...trial,movement:{turn,purchasedThrust:nextPurchase,powerSpent:trial.powerAllocation?.turn===turn?trial.powerAllocation.thrustPower:nextPurchase*LIB.engineEfficiency.power,state:next,engineThrustSpent,thrusterLedger:accounted.ledger,pendingOverthrustChecks:checks}};
 return {nextShip:{q:next.q,r:next.r,facing:next.facing,speed:next.speed},nextPrivateState:{...privateState,trial:updatedTrial},movement:next,spent:next.thrustSpent,engineThrustSpent,powerSpent:updatedTrial.movement.powerSpent};
}
