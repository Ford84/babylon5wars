import {applyVorchanStage} from './vorchan-stage-server.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {effectiveCondition} from './ship-condition.mjs';
import {MAP_PRESETS} from './battle-setup.mjs';
import {turnCostAtSpeed,vorchanTurnDelayAtSpeed} from './staged-movement.mjs';
export function movementOptions(ship,turn,mapPreset='standard'){
 const t=ship.private_state.trial,state=t.movement.state,e=effectiveCondition(t,turn),speed=ship.speed,reverse=speed<0;
 const forward=['forward_port_thrust','forward_starboard_thrust'],aft=['aft_port_thrust','aft_starboard_thrust'];
 const side=d=>(reverse?-d:d)===1?'port_thrust':'starboard_thrust';
 const templates=[];
 const add=(name,action,cost,groups)=>{
  const allocations=[];
  const distribute=(ids,n)=>ids.length===1?[{[ids[0]]:n}]:Array.from({length:n+1},(_,i)=>({[ids[0]]:i,[ids[1]]:n-i}));
  if(action.type==='advance'||action.type==='extended-cancel')allocations.push({});
  else if(groups.length===1)for(const ids of groups[0].length>2?groups[0].map(id=>[id]):[groups[0]])allocations.push(...distribute(ids,cost));
  else for(const n of new Set([Math.ceil(cost/2),Math.floor(cost/2)]))for(const a of distribute(groups[0],n))for(const b of distribute(groups[1],cost-n))allocations.push({...a,...b});
  const choices=[];
  for(const allocation of allocations){
   const c={...action,...(action.type!=='advance'?{thrusters:Object.fromEntries(Object.entries(allocation).filter(([,n])=>n))}:{})};
   try{const r=applyVorchanStage({ship,privateState:ship.private_state,action:c,turn,mapBounds:MAP_PRESETS[mapPreset],allowExit:true});const ledger=r.nextPrivateState.trial.movement.thrusterLedger;choices.push({action:c,cost:r.engineThrustSpent-(t.movement.engineThrustSpent||0),overthrust:Object.entries(ledger).filter(([,l])=>l.used>l.rating).map(([id,l])=>({id,excess:l.used-l.rating})),remaining:r.nextPrivateState.trial.movement.state.remaining,position:r.nextShip});}catch{}
  }
  choices.sort((a,b)=>a.overthrust.reduce((n,x)=>n+x.excess,0)-b.overthrust.reduce((n,x)=>n+x.excess,0)||a.cost-b.cost);
  if(choices.length)templates.push({name,choices});
 };
 for(const hexes of new Set([1,state.remaining]))if(hexes>0)add(hexes===1?'Advance One Hex':'Complete Straight Movement',{type:'advance',hexes},0,[]);
 if(e.commandDisabled||e.powerOff)return templates;
 if(!state.started)for(const change of Array.from({length:10},(_,i)=>[i+1,-i-1]).flat())add((change>0?'Accelerate +':'Decelerate ')+change,{type:'speed',change,purchasedThrust:t.powerAllocation.purchasedThrust},Math.abs(change)*2,[change>0?aft:forward]);
 for(const d of [-1,1]){
  const name=d===-1?'Port':'Starboard';
  add('Slide '+name,{type:'slide',direction:d},Math.ceil(Math.abs(speed)/5),[[side(d)]]);
  const delay=vorchanTurnDelayAtSpeed(speed,LIB.turnDelay),cost=turnCostAtSpeed(speed,LIB.turnCost);
  for(let shorter=0;shorter<=Math.max(0,delay-1);shorter++)add('Turn '+name+(shorter?' · Shorten Delay '+shorter:''),{type:'turn',direction:d,shortenBy:shorter},cost+shorter,[reverse?forward:aft,[side(d)]]);
  if(!state.extendedTurn)for(let initial=Math.ceil(cost/4);initial<cost;initial++)add('Begin Extended Turn '+name+' · Pay '+initial,{type:'extended-start',direction:d,initialThrust:initial},initial,[reverse?forward:aft,[side(d)]]);
 }
 if(state.extendedTurn){const ext=state.extendedTurn;add('Complete Extended Turn',{type:'extended-complete',shortenBy:0},ext.totalCost-ext.initialThrust,[reverse?forward:aft,[side(ext.direction)]]);add('Cancel Impossible Extended Turn',{type:'extended-cancel'},0,[]);}
 for(const pair of ['forward-port','aft-starboard','forward-starboard','aft-port']){
  const [main,sideName]=pair.split('-');const direction=['forward-port','aft-starboard'].includes(pair)?1:-1;
  add('Start Pivot '+(direction===1?'Clockwise':'Anticlockwise')+' · '+pair,{type:'pivot-start',direction,thrusterPair:pair},2,[main==='forward'?forward:aft,[sideName+'_thrust']]);
  add('Halt Pivot · '+pair,{type:'pivot-halt',thrusterPair:pair},2,[main==='forward'?forward:aft,[sideName+'_thrust']]);
 }
 add('Start Roll',{type:'roll-start'},1,[Object.keys(e.thrusterRatings)]);add('Halt Roll',{type:'roll-halt'},1,[Object.keys(e.thrusterRatings)]);
 return templates;
}

export const movementOptionGroup=option=>['advance','speed'].includes(option.choices[0]?.action.type)?'movement':'manoeuvre';
