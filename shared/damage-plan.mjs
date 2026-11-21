// Damage-location planning based on B5W 2E Rules Compendium,
// "Determining What Was Hit" and "Weapon Firing Modes".
// This module plans chart rolls; it does not assign damage boxes.
const validInt=(n,min=0)=>Number.isInteger(n)&&n>=min;
export function facingChart({hullClass,attackArc,charts}){
 if(!charts||typeof charts!=='object')throw new RangeError('Missing ship hit charts');
 const arc=String(attackArc);
 let section;
 if(hullClass==='capital'||hullClass==='base')section=arc;
 else if(hullClass==='heavy_combat'||hullClass==='medium'){
  if(arc==='forward'||arc==='aft')section=arc;
  else if(arc==='port_forward'||arc==='starboard_forward')section='forward';
  else if(arc==='port_aft'||arc==='starboard_aft')section='aft';
  else if(arc==='port'||arc==='starboard')return {requiresChoice:true,choices:['forward','aft'].filter(x=>charts[x])};
 }else if(hullClass==='light_combat'){
  const available=Object.keys(charts).filter(k=>k!=='primary');
  if(available.length!==1)throw new RangeError('Light vessel requires one non-primary chart');
  section=available[0];
 }else throw new RangeError('Hull class requires ship-specific section rules');
 if(!charts[section])throw new RangeError('No applicable chart: '+section);
 return {section,requiresChoice:false};
}
export function damagePlan({mode,damage,hullClass,attackArc,charts,offensiveEW=0,rakingSize=10,damageDice=null,sideChoice=null,remainderSections=null}){
 if(!validInt(damage)||damage<1)throw new RangeError('damage');
 const facing=facingChart({hullClass,attackArc,charts});
 if(facing.requiresChoice&&!facing.choices.includes(sideChoice))return {requiresChoice:true,choices:facing.choices};
 const first=facing.requiresChoice?sideChoice:facing.section;
 if(mode==='standard'||mode==='flash'||mode==='linked'||mode==='pulse')return {mode,volleys:[{section:first,damage,armourGroup:0}],requiresChoice:false,requiresSpecialResolution:mode!=='standard'};
 if(mode==='raking'){
  if(!validInt(rakingSize,1))throw new RangeError('rakingSize');
  const volleys=[];for(let remaining=damage;remaining>0;remaining-=rakingSize)volleys.push({section:first,damage:Math.min(rakingSize,remaining),armourGroup:0});
  return {mode,volleys,requiresChoice:false,armourOncePerSystem:true};
 }
 if(mode!=='piercing')throw new RangeError('Unsupported firing mode');
 if(!validInt(offensiveEW)||offensiveEW<4)throw new RangeError('Piercing requires 4 offensive EW');
 if(hullClass==='fighter'||hullClass==='shuttle')throw new RangeError('Piercing prohibited against fighters and shuttles');
 if(hullClass==='medium'||hullClass==='light_combat'){
  if(!validInt(damageDice,1))throw new RangeError('Piercing requires damage dice for small ships');
  // Per-die reduction must be computed from actual dice before summing.
  return {mode,requiresDiceResolution:true,damageReductionPerDie:2,minimumPerDie:1,sections:[first],toHitModifier:-4};
 }
 let sections;
 if(hullClass==='capital'||hullClass==='base'){
  const opposite={forward:'aft',aft:'forward',port:'starboard',starboard:'port'};
  sections=[first,'primary',opposite[first]];
 }else if(hullClass==='heavy_combat'){
  if(attackArc==='forward'||attackArc==='aft')sections=[first,'primary',first==='forward'?'aft':'forward'];
  else sections=[first,'primary'];
 }else throw new RangeError('Piercing hull rules unavailable');
 if(sections.some(s=>!charts[s]))throw new RangeError('Piercing path references missing chart');
 const base=Math.floor(damage/sections.length),remainder=damage%sections.length;
 // The target assigns extra points to DIFFERENT sections (Compendium example).
 if(remainder>0&&(!Array.isArray(remainderSections)||remainderSections.length!==remainder||new Set(remainderSections).size!==remainder||remainderSections.some(s=>!sections.includes(s))))return {mode,requiresChoice:true,choiceType:'piercingRemainder',remainder,choices:sections};
 return {mode,requiresChoice:false,toHitModifier:-4,overkillLost:true,rerollPrimaryOnOuterChart:true,volleys:sections.map((section,i)=>({section,damage:base+(remainderSections?.includes(section)?1:0),armourGroup:i}))};
}
