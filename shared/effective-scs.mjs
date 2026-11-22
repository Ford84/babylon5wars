// Derive current ship characteristics from a validated immutable SCS
// and its per-ship mutable damage state. Never trust client-provided limits.
import {validateSCS} from './scs.mjs';
const integer=n=>Number.isInteger(n)&&n>=0;
export function effectiveShipSystems(template,shipState){
 const checked=validateSCS(template);
 if(!checked.valid)throw new RangeError('Invalid library SCS: '+checked.errors.join('; '));
 if(!shipState?.systems||typeof shipState.systems!=='object')throw new RangeError('Missing ship SCS state');
 const systems={};
 for(const system of template.systems){
  const current=shipState.systems[system.id];
  if(!current||!integer(current.damage)||current.damage>system.boxes||typeof current.deactivated!=='boolean')
   throw new RangeError('Invalid condition for '+system.id);
  const destroyed=current.damage===system.boxes;
  systems[system.id]={
   id:system.id,kind:system.kind,section:system.section,
   originalBoxes:system.boxes,damage:current.damage,remainingBoxes:system.boxes-current.damage,
   originalArmour:system.armour,armour:system.armour,
   destroyed,deactivated:current.deactivated,
   operational:!destroyed&&!current.deactivated,
   criticalEffects:Array.isArray(current.criticalEffects)?current.criticalEffects:[]
  };
  // Critical modifiers must be resolved by their own rules, not guessed
  // from the number of damage boxes lost.
  if(system.kind==='engine')systems[system.id].printedFreeThrust=system.freeThrust;
  if(system.kind==='sensor')systems[system.id].printedSensorStrength=system.sensorStrength;
  if(system.kind==='weapon')systems[system.id].weaponCardId=system.weaponCardId;
 }
 return {template:{name:template.name,model:template.model,revision:template.source.sheetRevision,
   stats:template.stats},systems};
}
export function derivePrintedEngineThrust(template,shipState){
 const effective=effectiveShipSystems(template,shipState);
 const engines=template.systems.filter(s=>s.kind==='engine');
 if(!engines.length)throw new RangeError('SCS has no engine');
 const printed=engines.reduce((sum,s)=>sum+s.freeThrust,0);
 const operational=engines.filter(s=>effective.systems[s.id].operational);
 const unaffected=operational.reduce((sum,s)=>sum+s.freeThrust,0);
 return {printed,unaffected,engineIds:engines.map(s=>s.id),
  requiresCriticalAndDamageResolution:engines.some(s=>effective.systems[s.id].damage>0||effective.systems[s.id].criticalEffects.length>0),
  // An engine with partial damage cannot automatically be assumed to lose
  // proportional thrust; the critical/system rules determine that.
  safeForAutomaticMovement:operational.length===engines.length&&engines.every(s=>effective.systems[s.id].damage===0)};
}
