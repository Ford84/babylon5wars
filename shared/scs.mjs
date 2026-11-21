// Canonical SCS data model, v1. Values are transcribed from an identified
// printed control sheet; never inferred from faction or ship name.
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v,min=0)=>Number.isInteger(v)&&v>=min;
const str=(v,max=120)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const kinds=new Set(['reactor','engine','sensor','thruster','weapon','structure','command','hangar','shield','other']);
const sides=new Set(['forward','aft','port','starboard','primary','other']);
export function validateSCS(s){
 const errors=[];
 if(!obj(s))return {valid:false,errors:['SCS must be an object']};
 if(s.schemaVersion!==1)errors.push('schemaVersion must be 1');
 if(s.faction!=='Centauri Republic')errors.push('This import stage supports Centauri Republic only');
 if(!str(s.name))errors.push('name required');
 if(!str(s.model))errors.push('model required');
 if(!str(s.source?.publication)||!str(s.source?.sheetRevision,30))errors.push('source publication and revision required');
 if(!str(s.source?.page,30))errors.push('source page or sheet identifier required');
 if(!['capital','heavy_combat','medium','light_combat','base','fighter','other'].includes(s.class))errors.push('invalid class');
 for(const field of ['combatPoints','initiativeBonus','extraPower','engineEfficiency','turnCost','turnDelay']){
  if(!int(s.stats?.[field],field==='extraPower'||field==='initiativeBonus'?-10000:0))errors.push('invalid stats.'+field);
 }
 if(!Array.isArray(s.systems)||s.systems.length===0)errors.push('systems required');
 else {
  const ids=new Set();
  for(const sys of s.systems){
   if(!obj(sys)||!str(sys.id,64)||ids.has(sys.id)){errors.push('duplicate or missing system id');continue;}
   ids.add(sys.id);
   if(!kinds.has(sys.kind))errors.push(sys.id+': invalid kind');
   if(!sides.has(sys.section))errors.push(sys.id+': invalid section');
   if(!int(sys.armour)||!int(sys.boxes)||sys.boxes===0)errors.push(sys.id+': invalid armour/boxes');
   if(sys.power!==null&&sys.power!==undefined&&!int(sys.power))errors.push(sys.id+': invalid power');
   if(sys.kind==='sensor'&&!int(sys.sensorStrength))errors.push(sys.id+': sensor strength required');
   if(sys.kind==='engine'&&!int(sys.freeThrust))errors.push(sys.id+': free thrust required');
   if(sys.kind==='weapon'&&!str(sys.weaponCardId,64))errors.push(sys.id+': weapon datacard reference required');
  }
 }
 if(!Array.isArray(s.weaponCards))errors.push('weaponCards array required');
 else {
  const cards=new Set();
  for(const card of s.weaponCards){if(!obj(card)||!str(card.id,64)||cards.has(card.id)||!str(card.name)||!int(card.power))errors.push('invalid weapon datacard');else cards.add(card.id);}
  for(const sys of s.systems||[])if(sys?.kind==='weapon'&&!cards.has(sys.weaponCardId))errors.push(sys.id+': missing weapon datacard');
 }
 if(!obj(s.hitLocations)||Object.keys(s.hitLocations).length===0)errors.push('hit location charts required');
 if(!obj(s.notes))errors.push('notes object required');
 return {valid:errors.length===0,errors};
}
export function initialSCSState(s){
 const check=validateSCS(s);if(!check.valid)throw new RangeError(check.errors.join('; '));
 return {schemaVersion:1,sourceRevision:s.source.sheetRevision,systems:Object.fromEntries(s.systems.map(sys=>[sys.id,{damage:0,deactivated:false,criticalEffects:[]}])),power:{spent:0,allocations:{}},ew:{defensive:0,offensive:{},extra:{}},initiative:{roll:null,total:null},movement:{thrustSpent:0,turnDelay:0}};
}
export function redactSCSForPlayer(s){
 const {source,...rest}=s;
 return {...rest,source:{publication:source.publication,sheetRevision:source.sheetRevision,page:source.page}};
}
