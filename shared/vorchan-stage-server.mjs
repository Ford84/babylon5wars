import {thrusterGroups} from './manoeuvre-thrusters.mjs';
import {hullProfile,hullThrusters} from './vorchar.mjs';
// Strict server-side staged Vorchan movement adapter. Player submits intent,
// never turn cost, turn delay, or thrust limits.
import {pivotStart,pivotHalt,rollStart,rollHalt,orientationAtMovementStart} from './orientation-stage.mjs';
import {adjustTurnDelay} from './speed-integration.mjs';
import {newStagedMovement,stagedMove,turnCostAtSpeed,vorchanTurnDelayAtSpeed} from './staged-movement.mjs';
import {assertVorchanMovementDamageConsistent} from './vorchan-movement-damage.mjs';
import {vorchanPowerBudget} from './vorchan-power-economy.mjs';
import {effectiveThrusterRating,overthrustChecksForTurn,manoeuvreIncrementalEngineCost} from './thruster-criticals.mjs';
import {validateManoeuvreThrusters} from './manoeuvre-thrusters.mjs';
import {createThrusterLedger,allocateThrusterThrust} from './thruster-ledger.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {VORCHAN_THRUSTER_RATINGS} from './vorchan-scs-identification.mjs';
export {VORCHAN_THRUSTER_RATINGS};
export function applyVorchanStage({ship,privateState,action,turn,otherShips=[],mapBounds={columns:20,rows:32},allowExit=false}){
 if(!Number.isInteger(turn)||turn<1)throw new RangeError('Invalid battle turn');
 const trial=privateState?.trial;
 if(!trial||!hullProfile(trial.libraryId))throw new RangeError('Not a Vorchan trial ship');
 const hull=hullProfile(trial.libraryId),ratings=hullThrusters(trial.libraryId);
 if(!action||typeof action!=='object'||Array.isArray(action)||!['speed','advance','turn','slide','pivot-start','pivot-halt','roll-start','roll-halt','extended-start','extended-complete','extended-cancel','agile-pivot','agile-roll'].includes(action.type))throw new RangeError('Invalid staged action');
 if(Object.keys(action).some(k=>!({'agile-pivot':['type','direction','steps','thrusterPair','thrusters'],'agile-roll':['type','thrusters'],speed:['type','change','purchasedThrust','thrusters'],advance:['type','hexes'],turn:['type','direction','thrusters','shortenBy','steps'],slide:['type','direction','thrusters'], 'pivot-start':['type','direction','thrusterPair','oddTo','thrusters'], 'pivot-halt':['type','thrusterPair','oddTo','thrusters'], 'roll-start':['type','thrusters'], 'roll-halt':['type','thrusters'], 'extended-start':['type','direction','initialThrust','thrusters'], 'extended-complete':['type','shortenBy','thrusters'], 'extended-cancel':['type','thrusters']}[action.type].includes(k))))throw new RangeError('Client cannot supply movement costs or limits');
 const previous=trial.movement?.turn===turn-1?trial.movement.state:null;
 const base=newStagedMovement({q:ship.q,r:ship.r,facing:ship.facing,speed:ship.speed,version:0});
 const carried=previous?orientationAtMovementStart({...previous,turn:turn-1},turn):null;
 const old=trial.movement?.turn===turn?trial.movement.state:carried?{...base,...carried,remaining:Math.abs(ship.speed),moved:0,thrustSpent:0,started:false,normalSinceSlide:true,slideDirection:null,history:[],version:0}:base;
 if(old.q!==ship.q||old.r!==ship.r||(trial.movement?.turn===turn&&old.facing!==ship.facing)||old.speed!==ship.speed)throw new RangeError('Movement state out of sync');
 if(old.extendedTurn&&action.type!=='extended-complete'&&action.type!=='extended-cancel'&&action.type!=='advance')throw new RangeError('Extended turn must be completed before manoeuvring');
 if(old.extendedTurn&&action.type==='advance'&&old.extendedTurn.startedTurn!==turn)throw new RangeError('Complete extended turn before moving next turn');
 const purchased=trial.movement?.turn===turn?trial.movement.purchasedThrust:(trial.powerAllocation?.turn===turn?trial.powerAllocation.purchasedThrust:0);
 let nextPurchase=purchased,moveAction=action;
 if(action.type==='speed'){
  if(!Number.isInteger(action.purchasedThrust)||action.purchasedThrust<0)throw new RangeError('Invalid purchased thrust');
  if(action.purchasedThrust>0&&trial.powerAllocation?.turn!==turn)throw new RangeError('Additional thrust must be purchased in the pre-turn power phase');
  if(trial.powerAllocation?.turn===turn&&action.purchasedThrust!==trial.powerAllocation.purchasedThrust)throw new RangeError('Thrust purchase must match committed power allocation');
  nextPurchase=action.purchasedThrust;
  moveAction={type:'speed',change:action.change};
 }
 if(action.type==='slide'){
  if(Math.abs(old.speed)<1)throw new RangeError('Stationary ship cannot slide');
  moveAction={type:'slide',direction:action.direction,cost:Math.ceil(Math.abs(old.speed)/5)};
 }
 if(action.type==='turn'||action.type==='extended-start'){
  const speed=Math.abs(old.speed);
  const delay=vorchanTurnDelayAtSpeed(old.speed,hull.turnDelay,hull.turnDelayDivisor||3);
  if(action.shortenBy!==undefined&&(!Number.isInteger(action.shortenBy)||action.shortenBy<0||action.shortenBy>Math.max(0,delay-1)))throw new RangeError('Invalid turn shortening');
  if(action.type==='turn')moveAction={type:'turn',direction:action.direction,cost:turnCostAtSpeed(old.speed,hull.turnCost,hull.turnCostDivisor||2)*(hull.agile&&old.pivotActive?1:action.steps||1),delay,shortenBy:action.shortenBy??0};
 }
 if(hull.agile&&['pivot-start','pivot-halt','roll-start','roll-halt'].includes(action.type))throw new RangeError('Agile ships use immediate pivot and roll manoeuvres');
 if(!hull.agile&&(action.steps!==undefined||action.type.startsWith('agile-')))throw new RangeError('Agile manoeuvre unavailable');
 const committed=trial.powerAllocation?.turn===turn?trial.powerAllocation:null;
 if(!committed&&nextPurchase>0)throw new RangeError('Uncommitted thrust purchase prohibited');
 if(committed&&nextPurchase!==committed.purchasedThrust)throw new RangeError('Thrust purchase must match committed power allocation');
 const power=vorchanPowerBudget({trial,turn,deactivated:committed?.deactivated??[],purchasedThrust:nextPurchase,extraEWPower:committed?.ewPower??0});
 const limits={availableThrust:power.availableThrust,accelCost:hull.accelerationCost};
 if(power.engineDestroyed&&action.type!=='advance'&&action.type!=='extended-cancel')throw new RangeError('Destroyed engine cannot manoeuvre');
 let next;
 if(action.type==='extended-cancel'){
  const ext=old.extendedTurn;
  if(!ext||ext.startedTurn!==turn-1||old.moved!==0||old.thrustSpent!==0)throw new RangeError('No extended turn requiring cancellation');
  const needed=ext.totalCost-ext.initialThrust;
  const damage=trial.thrusterCriticalEffects??{};
  const dead=new Set(trial.destroyedSystems??[]);
  const groups=thrusterGroups(trial.libraryId),mainIds=old.speed<0?groups.forward:groups.aft,sideId=(old.speed<0?-ext.direction:ext.direction)===1?'port_thrust':'starboard_thrust';
  const rating=id=>dead.has(id)?0:effectiveThrusterRating(ratings[id],damage[id]);
  const side=rating(sideId)*2;
  const main=mainIds.reduce((n,id)=>n+rating(id)*2,0);
  const physicalMaximum=Math.min(side,Math.ceil(needed/2)) + Math.min(main,Math.ceil(needed/2));
  if(!power.engineDestroyed&&needed<=limits.availableThrust&&physicalMaximum>=needed)throw new RangeError('Voluntary extended-turn cancellation prohibited');
  next={...old,extendedTurn:null,started:true,version:old.version+1,history:[...old.history,{type:'extended-cancel',reason:'verified physical thrust shortfall',forfeitedThrust:ext.initialThrust}]};
 }else if(action.type==='extended-start'){
  if(old.started||old.extendedTurn||old.turnDelayRemaining>0||old.rollInProgress||old.pivotInProgress||old.pivotActive||![-1,1].includes(action.direction))throw new RangeError('Extended turn prohibited');
  const cost=turnCostAtSpeed(old.speed,hull.turnCost,hull.turnCostDivisor||2);
  if(cost<2)throw new RangeError('Extended turn requires at least two thrust');
  if(!Number.isInteger(action.initialThrust)||action.initialThrust<Math.ceil(cost/4)||action.initialThrust>=cost)throw new RangeError('Extended turn requires at least 25% and less than full turn cost');
  if(old.thrustSpent+action.initialThrust>limits.availableThrust)throw new RangeError('Insufficient thrust');
  next={...old,extendedTurn:{direction:action.direction,totalCost:cost,initialThrust:action.initialThrust,startedTurn:turn},thrustSpent:old.thrustSpent+action.initialThrust,started:true,version:old.version+1,history:[...old.history,{type:'extended-start',direction:action.direction,spent:action.initialThrust}]};
 }else if(action.type==='extended-complete'){
  const ext=old.extendedTurn;
  if(!ext||ext.startedTurn!==turn-1||old.moved!==0||old.thrustSpent!==0)throw new RangeError('Extended turn must complete at start of following movement turn');
  const delay=vorchanTurnDelayAtSpeed(old.speed,hull.turnDelay,hull.turnDelayDivisor||3);
  const shortenBy=action.shortenBy??0;
  if(!Number.isInteger(shortenBy)||shortenBy<0||shortenBy>Math.max(0,delay-1))throw new RangeError('Invalid extended turn shortening');
  const cost=ext.totalCost-ext.initialThrust+shortenBy;
  if(cost>limits.availableThrust)throw new RangeError('Insufficient thrust to complete extended turn; use forced cancellation if physically impossible');
  next={...old,facing:(old.facing+ext.direction+6)%6,motionFacing:(old.facing+ext.direction+6)%6,turnDelayRemaining:delay-shortenBy,turnDelayOriginal:delay-shortenBy,hexesSinceTurn:0,extendedTurn:null,thrustSpent:cost,started:true,version:old.version+1,history:[...old.history,{type:'extended-complete',direction:ext.direction,spent:cost,shortenBy}]};
 }else if(hull.agile&&action.type==='turn'){
  const steps=action.steps??1;if(!Number.isInteger(steps)||steps<1||steps>3||![-1,1].includes(action.direction)||old.turnDelayRemaining>0||old.pivotInProgress||old.rollInProgress)throw new RangeError('Illegal agile turn');
  const travel=old.motionFacing??old.facing,offset=(old.facing-travel+6)%6;
  if(old.pivotActive&&(travel+action.direction*steps+6)%6!==old.facing)throw new RangeError('Turn must align with the pivoted facing');
  const cost=moveAction.cost+(moveAction.shortenBy||0);if(old.thrustSpent+cost>limits.availableThrust)throw new RangeError('Insufficient snap-turn thrust');
  const facing=old.pivotActive?old.facing:(old.facing+action.direction*steps+6)%6;
  next={...old,facing,motionFacing:facing,pivotActive:false,turnDelayRemaining:moveAction.delay-(moveAction.shortenBy||0),thrustSpent:old.thrustSpent+cost,started:true,version:old.version+1,history:[...old.history,{type:'turn',direction:action.direction,steps,spent:cost}]};
 }else if(['agile-pivot','agile-roll'].includes(action.type)){
  if(!hull.agile||old.rollInProgress||old.pivotInProgress)throw new RangeError('Immediate manoeuvre requires an agile ship');
  const pivot=action.type==='agile-pivot',steps=pivot?action.steps:1;
  if(!Number.isInteger(steps)||steps<1||steps>3||pivot&&(![-1,1].includes(action.direction)||(old.agilePivotTurn===turn?old.agilePivotSteps||0:0)+steps>3))throw new RangeError('Agile pivot limited to 180 degrees per turn');
  const cost=(pivot?hull.pivotCost[0]:hull.rollCost[0])*steps;
  if(old.thrustSpent+cost>limits.availableThrust)throw new RangeError('Insufficient agile manoeuvre thrust');
  if(pivot){const clockwise=action.direction===1;if(!(clockwise?['forward-port','aft-starboard']:['forward-starboard','aft-port']).includes(action.thrusterPair))throw new RangeError('Wrong agile pivot thrusters');}
  next={...old,thrustSpent:old.thrustSpent+cost,started:true,version:old.version+1,history:[...old.history,{type:action.type,steps,cost}],...(pivot?{facing:(old.facing+action.direction*steps+6)%6,pivotActive:true,pivotTurn:turn,agilePivotTurn:turn,agilePivotSteps:(old.agilePivotTurn===turn?old.agilePivotSteps||0:0)+steps}:{rolled:!old.rolled,agileRollTurn:turn})};
 }else if(['pivot-start','pivot-halt','roll-start','roll-halt'].includes(action.type)){
  if(old.rollInProgress&&action.type!=='roll-halt')throw new RangeError('Halt the roll before another orientation manoeuvre');
  const cost=action.type.startsWith('pivot')?hull.pivotCost[action.type==='pivot-start'?0:1]:hull.rollCost[action.type==='roll-start'?0:1];
  if(!Number.isInteger(cost)||cost<0)throw new RangeError('Manoeuvre cost not verified');
  if(old.thrustSpent+cost>limits.availableThrust)throw new RangeError('Insufficient thrust for orientation manoeuvre');
  const orient={...old,turn};
  if(action.type==='pivot-start'){
   if(cost%2===1&&!['main','side'].includes(action.oddTo))throw new RangeError('Odd thrust allocation required');
   next=pivotStart(orient,{direction:action.direction,cost,thrusterPair:action.thrusterPair});
  }else if(action.type==='pivot-halt'){
   if(cost%2===1&&!['main','side'].includes(action.oddTo))throw new RangeError('Odd thrust allocation required');
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
 if(action.type==='turn')next={...next,turnDelayOriginal:moveAction.delay-moveAction.shortenBy,hexesSinceTurn:0};
 if((action.type==='advance'||action.type==='slide')&&old.turnDelayRemaining>0)next={...next,turnDelayOriginal:old.turnDelayOriginal,hexesSinceTurn:(old.hexesSinceTurn??0)+(action.type==='slide'?1:action.hexes)};
 if(action.type==='speed'&&old.turnDelayRemaining>0){const speed=Math.abs(next.speed);const delay=vorchanTurnDelayAtSpeed(next.speed,hull.turnDelay,hull.turnDelayDivisor||3);next={...next,turnDelayRemaining:adjustTurnDelay({oldRequired:old.turnDelayOriginal??old.turnDelayRemaining,hexesSinceTurn:old.hexesSinceTurn??0,newRequired:delay}).remaining,turnDelayOriginal:delay};}
 const newPath=next.history.at(-1)?.path||[];
 for(const point of newPath){
  if(!allowExit&&(point.q<0||point.q>=mapBounds.columns||point.r<0||point.r>=mapBounds.rows))throw new RangeError('Outside trial map bounds');
  // Ordinary ships may share a hex. Ramming is a separate declared action.
 }
 // The player chooses a physical thruster allocation; the server calculates cost and validates it.
 const manoeuvreCost=next.thrustSpent-old.thrustSpent;
 if(manoeuvreCost<0)throw new RangeError('Movement thrust cannot decrease');
 const allocation=action.thrusters??{};
 if(Object.values(allocation).some(v=>!Number.isInteger(v)||v<0)||Object.values(allocation).reduce((a,b)=>a+b,0)!==manoeuvreCost)throw new RangeError('Thruster allocation must exactly equal manoeuvre cost');
 validateManoeuvreThrusters({action,oldState:old,cost:manoeuvreCost,allocation,libraryId:trial.libraryId});
 const previousLedger=(trial.movement?.turn===turn?trial.movement.thrusterLedger:null);
 const criticalEffects=trial.thrusterCriticalEffects??{};
 assertVorchanMovementDamageConsistent(trial);
 const destroyed=new Set(trial.destroyedSystems??[]);
 const effectiveRatings=Object.fromEntries(Object.entries(ratings).map(([id,rating])=>[id,destroyed.has(id)?0:effectiveThrusterRating(rating,criticalEffects[id])]));
 const ledger=previousLedger??createThrusterLedger(effectiveRatings);
 for(const [id,entry] of Object.entries(ledger))if(entry.rating!==effectiveRatings[id])throw new RangeError('Thruster rating changed during turn; requires adjudication');
 // Existing damage and critical effects must be adjudicated before trusting undamaged ratings.
 if(manoeuvreCost&&Object.keys(trial.systemDamage||{}).length&&!trial.criticalDamageAdjudicated)throw new RangeError('System damage requires critical adjudication');
 const extraEngineCost=manoeuvreIncrementalEngineCost(allocation,ledger,criticalEffects);
 const previousEngineSpent=trial.movement?.turn===turn?(trial.movement.engineThrustSpent??old.thrustSpent):0;
 const engineThrustSpent=previousEngineSpent+extraEngineCost;
 if(engineThrustSpent>limits.availableThrust)throw new RangeError('Insufficient engine thrust after thruster efficiency/outlet losses');
 const accounted=allocateThrusterThrust(ledger,allocation,{availableThrust:Math.max(limits.availableThrust,old.thrustSpent+manoeuvreCost),alreadySpent:old.thrustSpent});
 const checks=overthrustChecksForTurn(accounted.ledger,trial.thrusterDamageBoxes??{});
 const updatedTrial={...trial,movement:{turn,purchasedThrust:nextPurchase,powerSpent:trial.powerAllocation?.turn===turn?trial.powerAllocation.thrustPower:nextPurchase*hull.engineEfficiency.power,state:next,engineThrustSpent,thrusterLedger:accounted.ledger,pendingOverthrustChecks:checks}};
 return {nextShip:{q:next.q,r:next.r,facing:next.facing,speed:next.speed},nextPrivateState:{...privateState,trial:updatedTrial},movement:next,spent:next.thrustSpent,engineThrustSpent,powerSpent:updatedTrial.movement.powerSpent};
}
