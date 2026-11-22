// Second Edition Rules Compendium, Combat Sequence / Weapons Fire Step.
// Fire is declared simultaneously; resolution follows four published tiers.
export const FIRE_TIERS=Object.freeze([
 {id:'ballistic',label:'Ballistic weapons'},
 {id:'ship',label:'Ship weapons'},
 {id:'fighter_vs_fighter',label:'Fighter versus fighter'},
 {id:'fighter_vs_ship',label:'Fighter versus ship'}
]);
const TIER_IDS=new Set(FIRE_TIERS.map(t=>t.id));
export function lockFireDeclarations({requiredPlayerIds,declarations}){
 if(!Array.isArray(requiredPlayerIds)||!Array.isArray(declarations))throw new RangeError('Invalid fire declarations');
 const expected=new Set(requiredPlayerIds),seen=new Set();
 for(const d of declarations){
  if(!expected.has(d.playerId)||seen.has(d.playerId)||!Array.isArray(d.attacks))throw new RangeError('Missing or duplicate player fire orders');
  seen.add(d.playerId);
  for(const attack of d.attacks)if(!TIER_IDS.has(attack.tier)||typeof attack.weaponId!=='string'||typeof attack.targetId!=='string'||typeof attack.shipId!=='string')throw new RangeError('Invalid attack declaration');
 }
 if(seen.size!==expected.size)throw new RangeError('Fire declarations are not complete');
 return {locked:true,tiers:FIRE_TIERS.map(t=>({id:t.id,attacks:declarations.flatMap(d=>d.attacks.filter(a=>a.tier===t.id).map(a=>({...a,playerId:d.playerId})))})),
  // A declaration lock is not an attack-resolution result.
  requiresTargetAndWeaponValidation:true};
}
export function nextFireTier(locked,completed=[]){
 if(!locked?.locked||!Array.isArray(locked.tiers)||!Array.isArray(completed))throw new RangeError('Invalid locked fire');
 const done=new Set(completed);
 return locked.tiers.find(t=>!done.has(t.id))||null;
}
