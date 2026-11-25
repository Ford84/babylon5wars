import {fighterFlightStatus,fighterFlightData} from './centauri-combat-data.mjs';
import {hullProfile,hullSystems} from './vorchar.mjs';
// Compendium: Jump Engines / Opening, Closing and Maintaining a Jump Point;
// Hangars / Launching and Landing; Fighter/Shuttle Movement. Vorchan v3 SCS.
import {hexDistance} from './phases.mjs';
import {advanceHex,movementHeading} from './movement-rules.mjs';
import {effectiveCondition,SYSTEMS} from './ship-condition.mjs';
import {MAP_PRESETS} from './battle-setup.mjs';
export const SHUTTLE=Object.freeze({id:'centauri-unarmed-shuttle',thrust:4,boxes:10,armour:0,defence:{forward:8,aft:8,port:10,starboard:10},initiativeBonus:9,turnFraction:1/3});
const fail=m=>{throw new RangeError(m);};
const log=(s,type,data)=>s.journal.push({turn:s.turn,phase:s.phase,type,...data});
export const activeShuttles=s=>(s.shuttles||[]).filter(x=>x.status==='deployed'&&x.escapedTurn!==s.turn);
export const activeFighterFlights=s=>(s.fighterFlights||[]).filter(x=>x.status==='deployed'&&x.escapedTurn!==s.turn&&fighterFlightStatus(x).activeCount>0);
export const activeSmallCraft=s=>[...activeShuttles(s),...activeFighterFlights(s)];
export const currentMover=s=>s.operations?(s.unitMoveOrder||[]).map(id=>[...s.ships,...activeSmallCraft(s)].find(x=>x.id===id)).find(x=>x&&!x.withdrawn&&!s.unitLocks?.[x.id]):null;
export function enableOperations(s){
 s.operations=true;if(s.scenario)s.scenario={...s.scenario,scope:'Ship weapons, EW, movement, damage, criticals, jump points and unarmed shuttles. Ramming and boarding are not enabled.'};s.jumpPoints??=[];s.lastHexEntry??={};
 s.shuttles??=s.ships.flatMap(ship=>Array.from({length:hullProfile(ship.public_state?.libraryId)?.shuttles??2},(_,i)=>i+1).map(n=>({id:ship.id+'-shuttle-'+n,kind:'shuttle',owner_id:ship.owner_id,carrierId:ship.id,label:ship.label+' · Shuttle '+n,stats:{...SHUTTLE,thrust:hullProfile(ship.public_state?.libraryId)?.hangar?.shuttleThrust??4,armour:hullProfile(ship.public_state?.libraryId)?.hangar?.shuttleArmour??0},status:'aboard',damage:0,q:ship.q,r:ship.r,facing:ship.facing,motionFacing:ship.facing,speed:0})));
 s.fighterFlights??=s.ships.flatMap(ship=>(ship.private_state.trial.fighterComplement||[]).map((flight,i)=>({...structuredClone(flight),id:ship.id+'-flight-'+(i+1),kind:'fighter-flight',owner_id:ship.owner_id,carrierId:ship.id,label:fighterFlightData(flight.flightType).name+' '+(i+1),status:'aboard',q:ship.q,r:ship.r,facing:ship.facing,motionFacing:ship.facing,speed:0})));
 for(const x of s.ships){const t=x.private_state.trial;t.jump??={readyTurn:1,powered:!t.powerAllocation?.reactorShutdown&&!t.powerAllocation?.deactivated?.includes('jump_aft_centre')};if(effectiveCondition(t,s.turn).shipDestroyed||t.condition.damage.tracks.hangar.marked>=hullSystems(t.libraryId).find(x=>x.id==='hangar').boxes)for(const c of s.shuttles.filter(c=>c.carrierId===x.id&&c.status==='aboard')){c.status='destroyed';c.damage=10;}}
 if(s.phase==='movement'&&!s.unitMoveOrder){s.unitMoveOrder=(s.moveOrder||s.ships.map(x=>x.owner_id)).map(id=>s.ships.find(x=>x.owner_id===id)?.id).filter(Boolean);s.unitLocks=Object.fromEntries(s.ships.filter(x=>s.locks[x.owner_id]).map(x=>[x.id,true]));}
 return s;
}
export function shuttleCombatUnit(x){return {...x,public_state:{libraryId:SHUTTLE.id,hullClass:'shuttle'},private_state:{trial:{ewAllocation:{defensive:0,offensive:{}}}}};}
export function shuttleView(x){return {...x,public_state:{libraryId:SHUTTLE.id,hullClass:'shuttle',travelFacing:x.speed===0?null:movementHeading(x),condition:{shipDestroyed:x.status==='destroyed',commandDisabled:false},damage:{shuttleDamage:x.damage}},stats:x.stats||SHUTTLE};}
export function jumpAvailability(s,ship){
 const t=ship.private_state.trial,e=effectiveCondition(t,s.turn),j=t.jump||{readyTurn:1};
 if(!hullProfile(t.libraryId)?.jumpDelay)return {ready:false,reasons:['No Jump Engine'],risk:0};
 const reasons=[];
 if(e.shipDestroyed||ship.withdrawn)reasons.push('Ship Unavailable');
 if(e.powerOff||t.powerAllocation?.deactivated?.includes('jump_aft_centre'))reasons.push('Jump Engine Unpowered');
 if(e.destroyedSystems.includes('jump_aft_centre'))reasons.push('Jump Engine Destroyed');
 if(j.readyTurn>s.turn)reasons.push('Recharging Until Turn '+j.readyTurn);
 if(s.jumpPoints?.some(p=>p.shipId===ship.id&&p.status!=='closed'))reasons.push('Jump Point Already Open');
 return {ready:!reasons.length,reasons,risk:Math.floor((t.condition.damage.tracks.jump_aft_centre.marked||0)*100/hullSystems(ship.private_state.trial.libraryId).find(x=>x.id==='jump_aft_centre').boxes)};
}
export function hangarOptions(s,ship){
 const t=ship.private_state.trial,e=effectiveCondition(t,s.turn),m=t.movement?.state||{};
 const capacity=e.destroyedSystems.includes('hangar')?0:Math.max(0,hullSystems(t.libraryId).find(x=>x.id==='hangar').boxes-t.condition.damage.tracks.hangar.marked);
 const aboard=(s.shuttles||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard');
 const reasons=[];
 if(e.shipDestroyed||ship.withdrawn)reasons.push('Carrier Unavailable');
 if(e.powerOff||t.jump?.maintaining||t.powerAllocation?.deactivated?.includes('hangar'))reasons.push('Hangar Unpowered');
 if(!capacity)reasons.push('Hangar Destroyed');
 if(m.pivotTurn===s.turn||m.rollStartedTurn===s.turn||m.history?.some(x=>x.type?.startsWith('roll'))||m.pivotInProgress||m.rollInProgress||m.pivotActive)reasons.push('Carrier Pivoted Or Rolled This Turn');
 const rate=Math.max(0,(hullProfile(t.libraryId)?.hangarRate??2)-t.condition.effects.hangarCollapse);
 if(!rate)reasons.push('Launch / Recovery Rate Reduced To Zero');
 const heading=x=>Math.abs(x.speed)===0?null:movementHeading(x);
 const recover=activeShuttles(s).filter(x=>x.owner_id===ship.owner_id&&x.q===ship.q&&x.r===ship.r&&heading(x)===heading({...ship,motionFacing:m.motionFacing})&&Math.abs(x.speed)>=Math.abs(ship.speed)&&Math.abs(x.speed)<=Math.abs(ship.speed)+(x.stats?.thrust??SHUTTLE.thrust));
 const fighterAboard=(s.fighterFlights||[]).filter(x=>x.carrierId===ship.id&&x.status==='aboard');
 const fighterSlots=fighterAboard.flatMap(f=>fighterFlightStatus(f).activeSlots.map(slot=>({id:f.id+':'+slot,flightId:f.id,slot,label:f.label+' · Fighter '+slot})));const lossOptions=[...aboard.map(x=>({id:x.id,label:x.label})),...fighterSlots];
 return {fighterSlots,lossOptions,fighterAboard:fighterAboard.map(x=>({id:x.id,label:x.label,count:fighterFlightStatus(x).activeCount})),capacity,rate,aboard:aboard.map(x=>x.id),recover:recover.map(x=>x.id),lossRequired:Math.max(0,lossOptions.length-capacity),reasons,available:!reasons.length};
}
export function applyHangar(s,ship,{launch=[],recover=[],loss=[],launchFighters=[]}){
 const o=hangarOptions(s,ship),unique=a=>Array.isArray(a)&&new Set(a).size===a.length;
 if(![launch,recover,loss,launchFighters].every(unique))fail('Invalid hangar selection');
 if(loss.length!==o.lossRequired||loss.some(id=>!o.lossOptions.some(x=>x.id===id)))fail('Select the craft lost with occupied hangar boxes');
 const selected=launchFighters.map(id=>o.fighterAboard.find(x=>x.id===id));
 if(selected.some(x=>!x||!x.count))fail('Fighter flight is not eligible for launch');
 const fighterCount=selected.reduce((n,x)=>n+x.count-loss.filter(id=>id.startsWith(x.id+':')).length,0);
 if((launch.length||recover.length||fighterCount)&&(!o.available||launch.length+recover.length+fighterCount>o.rate))fail(o.reasons.join('; ')||'Hangar launch / recovery rate exceeded');
 if(launch.some(id=>!o.aboard.includes(id)||loss.includes(id))||recover.some(id=>!o.recover.includes(id)))fail('Shuttle is not eligible for this hangar action');
 if(o.lossOptions.length-loss.length-launch.length-fighterCount+recover.length>o.capacity)fail('Insufficient intact hangar boxes');
 for(const id of loss){const x=s.shuttles.find(x=>x.id===id);if(x){x.status='destroyed';x.damage=10;log(s,'shuttle_lost_in_hangar',{shipId:ship.id,shuttleId:id});}else{const entry=o.fighterSlots.find(x=>x.id===id),f=s.fighterFlights.find(x=>x.id===entry.flightId),craft=f.fighters.find(x=>x.slot===entry.slot);craft.destroyed=true;craft.damage=fighterFlightData(f.flightType).structureBoxes;if(!fighterFlightStatus(f).activeCount)f.status='destroyed';log(s,'fighter_lost_in_hangar',{shipId:ship.id,flightId:f.id,slot:entry.slot});}}
 for(const id of launch){const x=s.shuttles.find(x=>x.id===id);Object.assign(x,{status:'deployed',q:ship.q,r:ship.r,facing:ship.facing,motionFacing:ship.private_state.trial.movement?.state.motionFacing??ship.facing,speed:ship.speed,launchedTurn:s.turn});s.lastHexEntry[x.id]=s.lastHexEntry[ship.id];log(s,'shuttle_launched',{shipId:ship.id,shuttleId:id,q:x.q,r:x.r,facing:x.facing,speed:x.speed});}
 for(const id of recover){Object.assign(s.shuttles.find(x=>x.id===id),{status:'aboard',carrierId:ship.id});log(s,'shuttle_recovered',{shipId:ship.id,shuttleId:id});}
 for(const id of launchFighters){const x=s.fighterFlights.find(x=>x.id===id);if(!fighterFlightStatus(x).activeCount)continue;Object.assign(x,{status:'deployed',q:ship.q,r:ship.r,facing:ship.facing,motionFacing:ship.private_state.trial.movement?.state.motionFacing??ship.facing,speed:ship.speed,launchedTurn:s.turn});s.lastHexEntry[x.id]=s.lastHexEntry[ship.id];log(s,'fighter_flight_launched',{shipId:ship.id,flightId:id,count:fighterFlightStatus(x).activeCount,q:x.q,r:x.r,facing:x.facing,speed:x.speed});}
 if(launch.length||recover.length||fighterCount)ship.private_state.trial.hangarActionTurn=s.turn;
}
export function jumpCheck(s,ship,die){
 const marked=ship.private_state.trial.condition.damage.tracks.jump_aft_centre.marked,risk=Math.floor(marked*100/hullSystems(ship.private_state.trial.libraryId).find(x=>x.id==='jump_aft_centre').boxes);
 if(!risk)return null;
 const roll=die(100),exploded=roll<=risk,result={roll,risk,exploded};
 ship.private_state.trial.jump.lastCheck={turn:s.turn,...result};
 if(exploded){ship.private_state.trial.condition.damage.shipDestroyed=true;for(const p of s.jumpPoints.filter(p=>p.shipId===ship.id&&p.status!=='closed'))p.forcedClose=true;}
 log(s,'jump_engine_check',{shipId:ship.id,...result});return result;
}
export function openJumpPoint(s,ship,{q,r,facing},die){
 const a=jumpAvailability(s,ship),bounds=MAP_PRESETS[s.mapPreset];
 if(!a.ready)fail(a.reasons.join('; '));
 if(![q,r,facing].every(Number.isInteger)||facing<0||facing>5||q<0||q>=bounds.columns||r<0||r>=bounds.rows||hexDistance(ship,{q,r})>4)fail('Choose a jump-point hex within four hexes and an entry side');
 if(s.jumpPoints.some(p=>p.status!=='closed'&&p.q===q&&p.r===r))fail('A jump point already occupies that hex');
 const check=jumpCheck(s,ship,die);if(check?.exploded)return check;
 const p={id:ship.id+'-jump-'+s.turn,kind:'jump-point',shipId:ship.id,owner_id:ship.owner_id,label:ship.label+' · Jump Point',q,r,facing,openedTurn:s.turn,activeTurn:s.turn+1,status:'forming'};s.jumpPoints.push(p);log(s,'jump_point_opened',{shipId:ship.id,point:{...p}});return check;
}
export function checkPointRange(s,ship){for(const p of s.jumpPoints||[])if(p.shipId===ship.id&&p.status!=='closed'&&hexDistance(ship,p)>4)p.forcedClose=true;}
export function noteEntry(s,unit,from){if(unit.q!==from.q||unit.r!==from.r)s.lastHexEntry[unit.id]={q:from.q,r:from.r};}
export function entryOptions(s,unit){return (s.jumpPoints||[]).filter(p=>p.status==='open'&&p.activeTurn<=s.turn&&p.q===unit.q&&p.r===unit.r&&(()=>{const from=s.lastHexEntry?.[unit.id],edge=advanceHex(p,p.facing);return from&&from.q===edge.q&&from.r===edge.r;})());}
export function enterJump(s,unit,id){
 const p=entryOptions(s,unit).find(p=>p.id===id);if(!p)fail('Enter an active jump point through its marked entry side');
 if(unit.kind==='shuttle'||unit.kind==='fighter-flight')unit.status='escaped';else{unit.withdrawn=true;unit.escaped=true;}
 if(unit.movement)unit.movement.remaining=0;
 if(unit.private_state?.trial.movement)unit.private_state.trial.movement.state.remaining=0;
 const own=s.jumpPoints.find(p=>p.shipId===unit.id&&p.status!=='closed');if(own)own.forcedClose=true;
 log(s,'unit_entered_jump_point',{shipId:unit.id,pointId:p.id});
}
export function closePoint(s,p){p.status='closed';const ship=s.ships.find(x=>x.id===p.shipId);ship.private_state.trial.jump.readyTurn=s.turn+16;ship.private_state.trial.jump.maintaining=false;log(s,'jump_point_closed',{shipId:p.shipId,pointId:p.id,readyTurn:s.turn+16});}
export function vortexClosure(s,ship,maintain){
 if(typeof maintain!=='boolean')fail('Choose whether to maintain the jump point');
 const p=s.jumpPoints.find(p=>p.shipId===ship.id&&p.status==='open');if(!p)fail('No active jump point');
 const t=ship.private_state.trial,e=effectiveCondition(t,s.turn);
 if(maintain&&(p.forcedClose||ship.withdrawn||e.shipDestroyed||e.powerOff||e.destroyedSystems.includes('jump_aft_centre')||hexDistance(ship,p)>4||s.turn>=p.activeTurn+3))fail('This jump point must close');
 if(maintain){t.jump.maintaining=true;log(s,'jump_point_maintained',{shipId:ship.id,pointId:p.id});}else closePoint(s,p);
}
export function newShuttleMovement(x){x.movement={remaining:Math.abs(x.speed),spent:0,started:false,turnDelay:x.movement?.turnDelay||0,slideDirection:null,normalSinceSlide:true,turn:(x.movement?.turn||0)+1,extendedTurn:x.movement?.extendedTurn||null};}
export function moveShuttle(x,action){
 const n=structuredClone(x),m=n.movement,costs={advance:0,speed:Math.abs(action.change),turn:Math.max(1,Math.ceil(Math.abs(n.speed)/3))+(action.shortenBy||0),slide:1,pivot:Math.abs(action.steps),roll:1,'extended-start':action.initialThrust,'extended-complete':m.extendedTurn?m.extendedTurn.totalCost-m.extendedTurn.initialThrust:NaN,'extended-cancel':0};
 if(!m||!Object.hasOwn(costs,action.type))fail('Invalid shuttle manoeuvre');
 if(m.extendedTurn&&!['advance','extended-complete','extended-cancel'].includes(action.type))fail('Complete The Extended Shuttle Turn First');
 const cost=costs[action.type];if(!Number.isInteger(cost)||cost<0||m.spent+cost>(n.stats?.thrust??SHUTTLE.thrust))fail('Insufficient shuttle thrust');
 const heading=movementHeading(n),offset=(n.facing-n.motionFacing+6)%6;
 if(action.type==='speed'){
  if(m.started||!Number.isInteger(action.change)||action.change===0||![0,3].includes(offset))fail('Change shuttle speed before movement, while aligned with travel');
  const oldDelay=Math.ceil(Math.abs(n.speed)/3),since=Math.max(0,oldDelay-m.turnDelay);n.speed+=action.change;if(m.turnDelay)m.turnDelay=Math.max(0,Math.ceil(Math.abs(n.speed)/3)-since);m.remaining=Math.abs(n.speed);
 }else if(action.type==='advance'){
  if(m.extendedTurn&&m.extendedTurn.startedTurn!==m.turn)fail('Complete The Extended Shuttle Turn Before Moving');
  if(m.remaining<1)fail('No shuttle movement remains');Object.assign(n,advanceHex(n,heading));m.remaining--;m.turnDelay=Math.max(0,m.turnDelay-1);m.normalSinceSlide=true;
 }else if(action.type==='turn'){
  if(![-1,1].includes(action.direction)||m.turnDelay)fail('Shuttle turn delay is not satisfied');
  if(!Number.isInteger(action.shortenBy||0)||(action.shortenBy||0)<0||(action.shortenBy||0)>Math.max(0,Math.ceil(Math.abs(n.speed)/3)-1))fail('Invalid Shuttle Turn Shortening');
  const travel=(heading+action.direction+6)%6;n.facing=travel;n.motionFacing=travel;n.speed=Math.abs(n.speed);m.turnDelay=Math.ceil(Math.abs(n.speed)/3)-(action.shortenBy||0);
 }else if(action.type==='slide'){
  if(![-1,1].includes(action.direction)||!m.remaining||m.normalSinceSlide===false||m.slideDirection!==null&&m.slideDirection!==action.direction)fail('Invalid consecutive shuttle slide');
  Object.assign(n,advanceHex(n,(heading+action.direction+6)%6));m.remaining--;m.turnDelay=Math.max(0,m.turnDelay-1);m.slideDirection=action.direction;m.normalSinceSlide=false;
 }else if(action.type==='pivot'){
  if(!Number.isInteger(action.steps)||!action.steps||Math.abs(action.steps)>3)fail('Invalid shuttle pivot');n.facing=(n.facing+action.steps+6)%6;if((n.facing-n.motionFacing+6)%6===3){n.motionFacing=n.facing;n.speed=-n.speed;}
 }else if(action.type==='extended-start'){
  const totalCost=Math.max(1,Math.ceil(Math.abs(n.speed)/3));
  if(m.started||m.turnDelay||![-1,1].includes(action.direction)||totalCost<2||action.initialThrust<Math.ceil(totalCost/4)||action.initialThrust>=totalCost)fail('Invalid Extended Shuttle Turn');
  m.extendedTurn={totalCost,initialThrust:action.initialThrust,direction:action.direction,startedTurn:m.turn};
 }else if(action.type==='extended-complete'){
  const ext=m.extendedTurn;if(!ext||ext.startedTurn!==m.turn-1||m.started)fail('Complete The Extended Turn At The Start Of Next Movement');
  const travel=(heading+ext.direction+6)%6;n.facing=travel;n.motionFacing=travel;n.speed=Math.abs(n.speed);m.turnDelay=Math.ceil(Math.abs(n.speed)/3);m.extendedTurn=null;
 }else if(action.type==='extended-cancel'){
  const ext=m.extendedTurn;if(!ext||ext.startedTurn!==m.turn-1||m.started||ext.totalCost-ext.initialThrust<=(n.stats?.thrust??4))fail('Only An Impossible Extended Turn Can Be Cancelled');m.extendedTurn=null;
 }else n.rolled=!n.rolled;
 m.spent+=cost;m.started=true;return n;
}
export function shuttleMovementOptions(x){
 const actions=[{type:'advance'},{type:'turn',direction:-1},{type:'turn',direction:1},{type:'slide',direction:-1},{type:'slide',direction:1},{type:'roll'},{type:'extended-complete'},{type:'extended-cancel'},...[-3,-2,-1,1,2,3].map(steps=>({type:'pivot',steps})),...[-4,-3,-2,-1,1,2,3,4].map(change=>({type:'speed',change}))];
 for(const direction of [-1,1])for(let initialThrust=Math.ceil(Math.max(1,Math.ceil(Math.abs(x.speed)/3))/4);initialThrust<Math.ceil(Math.abs(x.speed)/3)&&initialThrust<=4;initialThrust++)actions.push({type:'extended-start',direction,initialThrust});
 for(const direction of [-1,1])for(let shortenBy=1;shortenBy<Math.ceil(Math.abs(x.speed)/3)&&shortenBy<4;shortenBy++)actions.push({type:'turn',direction,shortenBy});
 return actions.flatMap(action=>{try{const next=moveShuttle(x,action);return [{action,next,cost:next.movement.spent-x.movement.spent}];}catch{return [];}});
}

export function newFighterMovement(x){newShuttleMovement(x);x.movement.turnDelay=0;x.thrustUsed=0;x.jinking=0;x.combatPivoted=false;}
export function moveFighter(x,action){
 const n=structuredClone(x),m=n.movement,d=fighterFlightData(n.flightType),heading=movementHeading(n);
 if(!m||!action)fail('Invalid fighter manoeuvre');
 let cost=0;
 switch(action.type){
 case 'speed':if(m.started||!Number.isInteger(action.change)||!action.change||![0,3].includes((n.facing-n.motionFacing+6)%6))fail('Change speed before movement while aligned');cost=Math.abs(action.change);n.speed+=action.change;m.remaining=Math.abs(n.speed);break;
 case 'advance':if(m.remaining<1)fail('No movement remains');Object.assign(n,advanceHex(n,heading));m.remaining--;m.normalSinceSlide=true;break;
 case 'turn':{const steps=action.steps??action.direction;if(!Number.isInteger(steps)||!steps||Math.abs(steps)>3)fail('Invalid fighter turn');cost=Math.max(1,Math.ceil(Math.abs(n.speed)/3))*Math.abs(steps);n.facing=(heading+steps+6)%6;n.motionFacing=n.facing;n.speed=Math.abs(n.speed);break;}
 case 'slide':if(![-1,1].includes(action.direction)||!m.remaining||!m.normalSinceSlide||m.slideDirection!==null&&m.slideDirection!==action.direction)fail('Invalid slide');cost=1;Object.assign(n,advanceHex(n,(heading+action.direction+6)%6));m.remaining--;m.slideDirection=action.direction;m.normalSinceSlide=false;break;
 case 'pivot':if(!Number.isInteger(action.steps)||!action.steps||Math.abs(action.steps)>3)fail('Invalid pivot');cost=Math.abs(action.steps);n.facing=(n.facing+action.steps+6)%6;break;
 case 'jink':if(!Number.isInteger(action.levels)||action.levels<1||(n.jinking??0)+action.levels>d.jinkingLimit)fail('Invalid jinking level');cost=action.levels;n.jinking=(n.jinking??0)+cost;break;
 case 'roll':cost=1;n.rolled=!n.rolled;break;
 default:fail('Invalid fighter manoeuvre');
 }
 if(m.spent+cost>d.freeThrust)fail('Insufficient fighter thrust');m.spent+=cost;n.thrustUsed=m.spent;if(action.type!=='jink')m.started=true;return n;
}
export function fighterMovementOptions(x){
 const d=fighterFlightData(x.flightType),actions=[{type:'advance'},{type:'roll'},...Array.from({length:d.jinkingLimit},(_,i)=>({type:'jink',levels:i+1})),...[-3,-2,-1,1,2,3].flatMap(steps=>[{type:'turn',steps},{type:'pivot',steps}]),...[-1,1].map(direction=>({type:'slide',direction})),...Array.from({length:d.freeThrust*2+1},(_,i)=>i-d.freeThrust).filter(Boolean).map(change=>({type:'speed',change}))];
 return actions.flatMap(action=>{try{const next=moveFighter(x,action);return [{action,next,cost:next.movement.spent-x.movement.spent}];}catch{return [];}});
}

export function fighterCombatPivot(x,steps){if(!Number.isInteger(steps)||!steps||Math.abs(steps)>3||!x.movement||x.movement.remaining!==0||x.combatPivoted)fail('Invalid combat pivot');const cost=2*Math.abs(steps);if(x.movement.spent+cost>fighterFlightData(x.flightType).freeThrust)fail('Insufficient fighter thrust');const n=structuredClone(x);n.facing=(n.facing+steps+6)%6;n.movement.spent+=cost;n.thrustUsed=n.movement.spent;n.combatPivoted=true;return n;}
