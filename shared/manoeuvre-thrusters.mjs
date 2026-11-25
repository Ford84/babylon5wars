import {hullSystems} from './vorchar.mjs';
export const thrusterGroups=id=>Object.fromEntries(['aft','forward','port','starboard'].map(section=>[section,hullSystems(id).filter(s=>s.kind==='thruster'&&s.section===section).map(s=>s.id)]));
// Second Edition Compendium: Movement & Maneuver, acceleration, turns, slides,
// pivots and rolls. Validate *which* physical thrusters channel manoeuvre thrust.
// IDs describe ship positions; no capacity is inferred from damage boxes.
const sum=(a,ids)=>ids.reduce((n,id)=>n+(a[id]||0),0);
const total=a=>Object.values(a).reduce((n,v)=>n+v,0);
export function validateManoeuvreThrusters({action,oldState,cost,allocation,libraryId}){
 if(!action||!oldState||!Number.isInteger(cost)||cost<0||!allocation||typeof allocation!=='object'||Array.isArray(allocation))throw new RangeError('Invalid manoeuvre allocation');
 if(Object.values(allocation).some(v=>!Number.isInteger(v)||v<0)||total(allocation)!==cost)throw new RangeError('Thruster allocation must exactly equal manoeuvre cost');
 if(cost===0)return true;
 const {aft,forward,port,starboard}=thrusterGroups(libraryId),opposite=dir=>dir===1?port:starboard,same=dir=>dir===1?starboard:port,groupForPair={'forward-port':[forward,port],'forward-starboard':[forward,starboard],'aft-port':[aft,port],'aft-starboard':[aft,starboard]};
 let groups=[];
 if(action.type==='speed'){
  // Acceleration/deceleration refers to signed speed change, including reverse.
  groups=[action.change>0?aft:forward];
 }else if(action.type==='slide'){
  // Slide to starboard uses port thrust; reverse travel swaps side requirements.
  const side=oldState.speed<0?same(action.direction):opposite(action.direction);
  groups=[side];
 }else if(action.type==='turn'||action.type==='extended-start'||action.type==='extended-complete'){
  const reverse=oldState.speed<0;
  const direction=action.type==='extended-complete'?oldState.extendedTurn?.direction:action.direction;
  if(![-1,1].includes(direction))throw new RangeError('Invalid extended turn direction');
  groups=[reverse?forward:aft,reverse?same(direction):opposite(direction)];
 }else if(action.type==='pivot-start'||action.type==='pivot-halt'||action.type==='agile-pivot'){
  groups=groupForPair[action.thrusterPair];
  if(!groups)throw new RangeError('Invalid pivot thruster pair');
 }else if(action.type==='roll-start'||action.type==='roll-halt'||action.type==='agile-roll'){
  return true; // Roll cost may be channelled through any combination of thrusters.
 }else throw new RangeError('Unsupported thrust manoeuvre');
 const eligible=new Set(groups.flat());
 for(const [id,amount] of Object.entries(allocation))if(amount>0&&!eligible.has(id))throw new RangeError('Thruster not eligible for '+action.type+': '+id);
 if(groups.length===2){
  const [a,b]=groups.map(g=>sum(allocation,g));
  if(Math.abs(a-b)>1)throw new RangeError('Manoeuvre thrust must be divided evenly between thruster groups');
 }
 return true;
}
