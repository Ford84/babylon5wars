// SCS diagram transcription provenance. A thick black circled number is armour;
// each discrete damage box is one damage capacity point. Never estimate boxes
// from visual size or assume that a nearby un-circled number is armour.
export function verifyDiagramSystem(system){
 const errors=[];
 if(!system||typeof system!=='object')return {valid:false,errors:['system required']};
 if(!Number.isInteger(system.armour)||system.armour<0)errors.push('armour must be a non-negative integer');
 if(!['circled','legend'].includes(system.armourSource))errors.push('armour source must be circled value or bottom-left legend');
 if(!Array.isArray(system.damageBoxes)||system.damageBoxes.length===0)errors.push('individual damage boxes required');
 else {
  const seen=new Set();
  for(const box of system.damageBoxes){
   if(typeof box!=='string'||!box.trim()||seen.has(box))errors.push('each box needs a unique identifier');
   seen.add(box);
  }
  if(system.boxes!==system.damageBoxes.length)errors.push('box total must equal individually counted boxes');
 }
 if(!system.sourceReference||typeof system.sourceReference!=='string')errors.push('diagram source reference required');
 return {valid:errors.length===0,errors};
}
export function damageBoxState(system,marked=0){
 const check=verifyDiagramSystem(system);if(!check.valid)throw new RangeError(check.errors.join('; '));
 if(!Number.isInteger(marked)||marked<0||marked>system.damageBoxes.length)throw new RangeError('invalid marked box count');
 return system.damageBoxes.map((id,index)=>({id,marked:index<marked}));
}
