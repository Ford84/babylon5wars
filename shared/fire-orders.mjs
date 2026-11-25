import {elintAttackEffects} from './elint.mjs';
import {guardianCanProtect} from './guardian-array.mjs';
import {hullProfile} from './vorchar.mjs';
// W3: authoritative fire declarations and defensive reservations, without attack rolls.
// The commit is secret until every participant has locked. Defensive assignment happens
// only after simultaneous reveal and before the first firing die is rolled.
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
import {checkMountArc,lineOfSight} from './weapon-targeting.mjs';
const mounts=new Map(LIB.weaponMounts.map(m=>[m.id,m]));
const isId=x=>typeof x==='string'&&x.length>0&&x.length<=128;
const integer=x=>Number.isInteger(x);
export function validateFireDeclaration({playerId,ships,fire,turn,ewSnapshot,elintDisruptions=[]}){
 if(!Array.isArray(ships)||!isId(playerId)||!integer(turn)||turn<1||!fire||typeof fire!=='object'||Array.isArray(fire))throw new RangeError('Invalid fire declaration');
 if(!Array.isArray(fire.shots)||fire.shots.length>ships.reduce((n,s)=>n+(hullProfile(s.public_state?.libraryId)?.weaponMounts.reduce((a,m)=>a+(m.weaponId==='twin-array'?2:1),0)||0),0)||fire.shots.length>1000)throw new RangeError('Invalid fire shots');
 const byId=new Map(ships.map(s=>[s.id,s])),used=new Set(),out=[];
 for(const shot of fire.shots){
  if(!shot||!isId(shot.shipId)||!isId(shot.mountId)||!integer(shot.gun)||!['offensive','defensive'].includes(shot.role))throw new RangeError('Invalid gun declaration');
  const ship=byId.get(shot.shipId),mount=hullProfile(ship?.public_state?.libraryId)?.weaponMounts.find(m=>m.id===shot.mountId);
  if(!ship||ship.owner_id!==playerId||!hullProfile(ship.public_state?.libraryId)?.weaponMounts.some(m=>m.id===shot.mountId)||!mount)throw new RangeError('Weapon is not on your Vorchan');
  const weapon=hullProfile(ship.public_state.libraryId).weapons.find(w=>w.id===mount.weaponId),gunCount=mount.weaponId==='twin-array'?2:1;
  if(shot.gun<1||shot.gun>gunCount)throw new RangeError('Gun number outside mount');
  const key=shot.shipId+':'+shot.mountId+':'+shot.gun;
  if(used.has(key))throw new RangeError('Gun may be declared only once');
  used.add(key);
  if(shot.role==='offensive'){
   const target=byId.get(shot.targetId);
   if(!target||target.owner_id===playerId||!isId(shot.targetId))throw new RangeError('Offensive fire needs an enemy ship target');
   if(weapon.id==='guardian-array'&&(target.kind!=='shuttle'||ship.private_state?.trial?.guardianMode?.mode!=='offensive'))throw new RangeError('Guardian offensive mode only targets fighters or shuttles');
   const arc=checkMountArc({shooter:ship,target,arc:mount.arc});
   if(!arc.allowed)throw new RangeError(arc.reason||'Target outside weapon arc');
   if(shot.mode!==undefined&&!weapon.modes.includes(shot.mode))throw new RangeError('Unsupported firing mode');
   if(shot.mode==='Piercing'){const ew=elintAttackEffects({shooter:ship,target,units:ships,initial:ewSnapshot||ships,disruptions:elintDisruptions,baseDefence:0});if(target.kind==='shuttle'||ew.ownOffensive+ew.offensive<4)throw new RangeError('Piercing requires a ship target and at least 4 effective offensive EW');}
   if(shot.calledShot!==undefined&&shot.calledShot!==null)throw new RangeError('Called shots require separate verified rules');
   if(!integer(shot.order)||shot.order<1||shot.order>100)throw new RangeError('Declare firing order before dice');
  }else if(!weapon.intercept||weapon.id==='guardian-array'&&ship.private_state?.trial?.guardianMode?.mode!=='defensive')throw new RangeError(weapon.name+' cannot intercept in its current mode');
  else if(shot.targetId!==undefined||shot.order!==undefined)throw new RangeError('Defensive reserve cannot preselect incoming attacks');
  if(mount.weaponId==='plasma-accelerator'){
   if(shot.role==='defensive')throw new RangeError('Plasma accelerator cannot intercept');
   if(![1,2,3].includes(shot.chargeTurns))throw new RangeError('Plasma charge interval must be 1, 2 or 3 turns');
  }else if(shot.chargeTurns!==undefined)throw new RangeError('Twin Array has no plasma charge');
  out.push({...shot,mode:shot.mode||weapon.modes[0]});
 }
 const orders=new Map();
 for(const shot of out.filter(s=>s.role==='offensive')){
  const key=shot.shipId+':'+shot.targetId;
  if(!orders.has(key))orders.set(key,new Set());
  if(orders.get(key).has(shot.order))throw new RangeError('Duplicate shot resolution order against a target');
  orders.get(key).add(shot.order);
 }
 return {shots:out};
}
export function validateDefensiveAssignment({playerId,ships,declarations,assignments,directions={}}){
 if(!isId(playerId)||!Array.isArray(ships)||!Array.isArray(declarations)||!Array.isArray(assignments)||assignments.length>100)throw new RangeError('Invalid defensive assignments');
 const byId=new Map(ships.map(s=>[s.id,s]));
 const attacks=new Map(),reserves=new Map();
 for(const d of declarations)for(const shot of d.fire.shots){
  const key=shot.shipId+':'+shot.mountId+':'+shot.gun;
  if(shot.role==='offensive')attacks.set(key,{...shot,playerId:d.playerId});
  else reserves.set(key,{...shot,playerId:d.playerId});
 }
 const used=new Set(),out=[];
 for(const a of assignments){
  if(!a||!isId(a.shipId)||!isId(a.mountId)||!integer(a.gun)||!isId(a.attackId))throw new RangeError('Invalid defensive allocation');
  const key=a.shipId+':'+a.mountId+':'+a.gun,defender=reserves.get(key),attack=attacks.get(a.attackId);
  if(used.has(key)||!defender||defender.playerId!==playerId||!attack||attack.playerId===playerId)throw new RangeError('Defence must use a unique reserved gun against an incoming attack');
  if(!byId.has(attack.shipId)||!byId.has(a.shipId))throw new RangeError('Unknown ship in defensive assignment');
  const attackingHull=hullProfile(byId.get(attack.shipId)?.public_state?.libraryId),attackingMount=attackingHull?.weaponMounts.find(m=>m.id===attack.mountId);if(attackingHull?.weapons.find(w=>w.id===attackingMount?.weaponId)?.class==='Laser')throw new RangeError('Laser weapons cannot be intercepted');
  const mount=hullProfile(byId.get(a.shipId)?.public_state?.libraryId)?.weaponMounts.find(m=>m.id===a.mountId),weapon=hullProfile(byId.get(a.shipId)?.public_state?.libraryId)?.weapons.find(w=>w.id===mount?.weaponId);
  if(!weapon||weapon.intercept===null)throw new RangeError('Gun cannot intercept');
  if(!guardianCanProtect({defender:byId.get(a.shipId),source:byId.get(attack.shipId),target:byId.get(attack.targetId),mount,direction:directions[attack.shipId+':'+attack.targetId]}))throw new RangeError('Incoming attacker outside defensive firing arc or Guardian protection geometry');
  used.add(key);out.push({...a});
 }
 return {assignments:out};
}
export function publicFireView({phase,playerId,declarations,assignments=[]}){
 if(phase==='fire_commit')return {revealed:false,own:declarations.find(d=>d.playerId===playerId)?.fire??null,committed:declarations.map(d=>d.playerId),declarations:[]};
 if(!['fire_resolution','marine','criticals','vortex','hangar','links','adjust'].includes(phase))return {revealed:false,own:null,committed:[],declarations:[]};
 return {revealed:true,declarations,assignments};
}
