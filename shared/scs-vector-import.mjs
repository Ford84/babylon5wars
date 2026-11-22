// Convert reviewed vector extraction records to the existing Babylon 5 Wars SCS v1 contract.
// This module deliberately never infers missing source values or invents damage boxes.
import {validateSCS} from './scs.mjs';

const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=v=>Number.isInteger(v)&&v>=0;
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const fail=(message)=>{throw new RangeError(message);};
const unique=(items,label)=>{const s=new Set();for(const item of items){if(s.has(item))fail('Duplicate '+label+': '+item);s.add(item);}};

export function validateVectorExtraction(raw){
 const errors=[];
 if(!object(raw))return {valid:false,errors:['Extraction must be an object']};
 if(raw.extractionVersion!==1)errors.push('extractionVersion must be 1');
 if(raw.verification?.status!=='verified')errors.push('Source extraction must be independently verified');
 if(!Array.isArray(raw.systems)||!raw.systems.length)errors.push('Verified systems required');
 else {
  const ids=new Set(),boxIds=new Set();
  for(const system of raw.systems){
   if(!object(system)||!nonempty(system.id)){errors.push('Invalid system identifier');continue;}
   if(ids.has(system.id))errors.push('Duplicate system: '+system.id);
   ids.add(system.id);
   if(!integer(system.armour)||!['circled','legend'].includes(system.armourSource))errors.push(system.id+': verified armour and source required');
   if(!Array.isArray(system.damageBoxes)||!system.damageBoxes.length)errors.push(system.id+': damage box geometry required');
   else for(const box of system.damageBoxes){
    if(!object(box)||!nonempty(box.id)||!Number.isFinite(box.x)||!Number.isFinite(box.y)){
     errors.push(system.id+': invalid damage box geometry');continue;
    }
    if(boxIds.has(box.id))errors.push('Duplicate damage box: '+box.id);
    boxIds.add(box.id);
   }
   if(!nonempty(system.sourceReference))errors.push(system.id+': source reference required');
  }
 }
 return {valid:errors.length===0,errors};
}

export function importVerifiedVectorSCS(raw){
 const check=validateVectorExtraction(raw);
 if(!check.valid)fail(check.errors.join('; '));
 if(!object(raw.identity)||!object(raw.source)||!object(raw.stats))fail('Missing ship identity, source or statistics');
 if(!Array.isArray(raw.sections)||!Array.isArray(raw.weaponCards)||!object(raw.hitLocations)||!object(raw.notes))fail('Missing required SCS collections');
 const systems=raw.systems.map(system=>{
  const {damageBoxes,geometry,...rest}=system;
  return {...rest,boxes:damageBoxes.length,damageBoxes:damageBoxes.map(box=>box.id)};
 });
 const definition={
  schemaVersion:1,
  faction:raw.identity.faction,
  name:raw.identity.name,
  model:raw.identity.model,
  class:raw.identity.class,
  source:{publication:raw.source.publication,sheetRevision:raw.source.sheetRevision,page:raw.source.page},
  stats:structuredClone(raw.stats),
  sections:structuredClone(raw.sections),
  systems,
  weaponCards:structuredClone(raw.weaponCards),
  hitLocations:structuredClone(raw.hitLocations),
  notes:structuredClone(raw.notes)
 };
 const validation=validateSCS(definition);
 if(!validation.valid)fail('Existing SCS v1 validation failed: '+validation.errors.join('; '));
 return {
  definition,
  geometry:{
   schemaVersion:1,
   sourcePdfSha256:raw.source.pdfSha256??null,
   coordinateSystem:raw.source.coordinateSystem??'pdf-points',
   systems:raw.systems.map(s=>({id:s.id,damageBoxes:structuredClone(s.damageBoxes),geometry:structuredClone(s.geometry??null)}))
  }
 };
}
