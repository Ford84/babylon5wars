import {hullWeapon} from './vorchar.mjs';
import {hexDistance} from './phases.mjs';
import {facingDirections,checkMountArc} from './weapon-targeting.mjs';
// Guardian arrays follow Interceptor mode-switch timing, without an energy web.
export function guardianPowerMode(trial,turn,requested){
 const old=trial.guardianMode||{mode:'defensive'};
 const current=old.mode==='switching'&&old.readyTurn<=turn?{mode:old.pendingMode}:old;
 const desired=requested??(current.mode==='switching'?current.pendingMode:current.mode);
 if(!['offensive','defensive'].includes(desired))throw new RangeError('Choose a Guardian Array mode');
 if(current.mode==='switching'){
  if(desired!==current.pendingMode)throw new RangeError('Guardian Array mode change is already in progress');
  return current;
 }
 if(turn===1||current.mode===desired)return {mode:desired};
 return {mode:'switching',pendingMode:desired,readyTurn:turn+1};
}
export function guardianCanProtect({defender,source,target,mount,direction=null}){
 if(!defender||!source||!target||defender.owner_id!==target.owner_id)return false;
 let reconstructed=false;
 // If all three share a hex, reconstruct the latest entry from the recorded
 // pair approaches; rewind that unit once, rather than every pair independently.
 if(defender.id!==target.id&&source.q===target.q&&source.r===target.r&&defender.q===target.q&&defender.r===target.r){
  const units=[source,defender,target],later=new Map();
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
   const a=units[i],b=units[j],p=a.sameHexPrevious?.[b.id]||(b.sameHexPrevious?.[a.id]?{shooter:b.sameHexPrevious[a.id].target,target:b.sameHexPrevious[a.id].shooter}:null);
   if(!p)continue;const moved=p.shooter.q!==a.q||p.shooter.r!==a.r?a:p.target.q!==b.q||p.target.r!==b.r?b:null;
   if(moved){const entry=later.get(moved.id)||{count:0,position:moved.id===a.id?p.shooter:p.target};entry.count++;later.set(moved.id,entry);}
  }
  const last=[...later].find(([,entry])=>entry.count===2);if(!last)return false;
  const reposition=u=>u.id===last[0]?{...u,...last[1].position}:u;
  source=reposition(source);defender=reposition(defender);target=reposition(target);reconstructed=true;
 }

 if(!checkMountArc({shooter:defender,target:source,arc:mount.arc}).allowed)return false;
 if(defender.id===target.id)return true;
 if(hullWeapon(defender.public_state?.libraryId,mount.id)?.id!=='guardian-array')return false;
 const shot=facingDirections(source,target),guard=facingDirections(defender,target);
 const aspects=x=>x.requiresChoice?x.choices||[]:[x.direction];
 if(!aspects(guard).some(x=>(direction?[direction]:aspects(shot)).includes(x)))return false;
 const range=(a,b)=>{if(reconstructed||a.q!==b.q||a.r!==b.r)return hexDistance(a,b);const prev=a.sameHexPrevious?.[b.id];return prev?hexDistance(prev.shooter,prev.target):0;};
 return range(source,defender)<range(source,target);
}
