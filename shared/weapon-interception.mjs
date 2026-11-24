import {MOGRATTI} from './mogratti.mjs';
import {MOGRATH} from './mograth.mjs';
import {VORCHAR} from './vorchar.mjs';
// B5W 2E Rules Compendium, Defensive Fire: a reserved gun may engage
// exactly one incoming shot. Additional guns degrade by one point each,
// never contributing a positive modifier. All decisions precede attack dice.
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
const attackId=s=>[s.shipId,s.mountId,s.gun].join(':');
const mounts=new Map([...LIB.weaponMounts,...VORCHAR.weaponMounts,...MOGRATH.weaponMounts,...MOGRATTI.weaponMounts].map(m=>[m.id,m]));
export function interceptModifiers({declarations,defences}){
 if(!Array.isArray(declarations)||!Array.isArray(defences))throw new RangeError('Committed fire and defence required');
 const attacks=new Map(),reserves=new Map(),used=new Set(),byAttack=new Map();
 for(const d of declarations)for(const shot of d.fire.shots){
  const key=attackId(shot);
  if(shot.role==='offensive')attacks.set(key,{...shot,playerId:d.playerId});
  else if(shot.role==='defensive')reserves.set(key,{...shot,playerId:d.playerId});
 }
 for(const d of defences)for(const a of d.defence?.assignments||[]){
  const key=attackId(a),reserve=reserves.get(key),attack=attacks.get(a.attackId),mount=mounts.get(a.mountId);
  if(used.has(key)||!reserve||reserve.playerId!==d.playerId||!attack||attack.playerId===d.playerId||attack.targetId!==a.shipId&&mount?.weaponId!=='guardian-array'||!mount)throw new RangeError('Invalid or duplicated defensive interception');
  const weapon=[...LIB.weapons,...MOGRATH.weapons].find(w=>w.id===mount.weaponId);
  if(!Number.isInteger(weapon?.intercept)||weapon.intercept>=0)throw new RangeError('Weapon cannot intercept');
  used.add(key);
  const group=byAttack.get(a.attackId)||[];
  group.push({gunId:key,base:weapon.intercept});
  byAttack.set(a.attackId,group);
 }
 const out={};
 for(const [id,group] of byAttack){
  group.sort((a,b)=>a.gunId.localeCompare(b.gunId));
  let total=0;
  const contributions=group.map((g,i)=>{const modifier=Math.min(0,g.base+i);total+=modifier;return {...g,modifier}});
  out[id]={total,contributions};
 }
 return out;
}
