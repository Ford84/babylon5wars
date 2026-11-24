// B5W 2E Compendium, Damage Resolution: standard Vorchan volleys.
// Pure and immutable. All hit rolls, defender system choices and dice are supplied
// explicitly; missing choices or unverified SCS tracks stop resolution.
import {CENTAURI_HIT_CHARTS,hitLocation} from './centauri-combat-data.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from './vorchan-scs-identification.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
const chart=CENTAURI_HIT_CHARTS[LIB.id];
const systems=new Map(SCS.systems.map(s=>[s.id,s]));
const int=(n,min=0)=>Number.isInteger(n)&&n>=min;
export function initialVorchanDamage(){
 return {shipId:null,tracks:Object.fromEntries(SCS.systems.filter(s=>s.verified&&int(s.boxes)&&int(s.armour)).map(s=>[s.id,{marked:0}])),criticalCandidates:[],destroyedSections:[],shipDestroyed:false};
}
export function damageSystemCandidates(token,section){
 const candidates={
  retro_thrust:['forward_port_thrust','forward_starboard_thrust'],plasma_accelerator:['plasma_forward'],
  twin_array:['twin_nose_port','twin_nose_starboard'],
  forward_structure:['forward_structure'],aft_structure:['aft_structure'],primary_structure:['primary_structure'],
  side_thrust:['port_thrust','starboard_thrust'],sensors:['sensors'],engine:['engine'],
  hangar:['hangar'],reactor:['reactor'],command:['command'],
  main_thrust:['aft_port_thrust','aft_starboard_thrust'],
  jump_drive:['jump_aft_centre']
 }[token]||[];
 return candidates.filter(id=>{const s=systems.get(id);return s&&(s.section===section||section==='primary'||token==='jump_drive')});
}
export function vorchanHitToken({incoming,locationRoll,primaryRoll=null,sideChoice=null}){
 if(!['forward','aft','port','starboard'].includes(incoming)||!int(locationRoll,1)||locationRoll>20)throw new RangeError('Invalid hit direction or d20');
 let section=incoming;
 if(incoming==='port'||incoming==='starboard'){
  if(!['forward','aft'].includes(sideChoice))return {requiresChoice:true,choiceType:'hitChart',choices:['forward','aft']};
  section=sideChoice;
 }
 let token=hitLocation(chart[section],locationRoll);
 if(token==='primary'){
  if(!int(primaryRoll,1)||primaryRoll>20)return {requiresChoice:true,choiceType:'primaryRoll',section};
  token=hitLocation(chart.primary,primaryRoll);section='primary';
 }
 return {requiresChoice:false,section,token,candidates:damageSystemCandidates(token,section)};
}
export function rollVorchanDamage({mountId,chargeTurns=3,dice,range,damageLoss=0,mode='Standard'}){
 const mount=LIB.weaponMounts.find(m=>m.id===mountId);
 if(!mount||!int(range)||!LIB.weapons.find(w=>w.id===mount.weaponId).modes.includes(mode))throw new RangeError('Invalid weapon or range');
 const weapon=LIB.weapons.find(w=>w.id===mount.weaponId);
 const option=mount.weaponId==='plasma-accelerator'?weapon.firingOptions.find(o=>o.turns===chargeTurns):weapon.firingOptions[0];
 if(!option)throw new RangeError('Invalid plasma charge');
 const {count,sides,bonus,perHex}=option.damageDice;
 if(!Array.isArray(dice)||dice.length!==count||dice.some(n=>!int(n,1)||n>sides))throw new RangeError('Damage dice mismatch');
 return {weaponId:weapon.id,mode,dice:[...dice],range,raw:dice.reduce((a,b)=>a+Math.max(1,b-damageLoss),bonus),damage:Math.max(0,dice.reduce((a,b)=>a+Math.max(1,b-damageLoss),bonus)+range*perHex),plasma:weapon.class==='Plasma'};
}
function applyToTrack(next,id,damage,plasma,trace){
 const s=systems.get(id);
 if(!s?.verified||!int(s.boxes)||!int(s.armour)||!next.tracks[id])throw new RangeError('Unverified SCS damage track '+id);
 const previous=next.tracks[id].marked;
 const remaining=Math.max(0,s.boxes-previous);
 if(remaining===0)return damage;
 const armour=plasma?Math.floor(s.armour/2):s.armour;
 const penetrated=Math.max(0,damage-armour),marked=Math.min(remaining,penetrated);
 next.tracks[id]={marked:previous+marked};
 if(marked&&!next.criticalCandidates.includes(id))next.criticalCandidates.push(id);
 trace.push({systemId:id,armour,damageIn:damage,marked,damageOut:Math.max(0,penetrated-marked),destroyed:previous+marked===s.boxes});
 return Math.max(0,penetrated-marked);
}
export function applyVorchanStandardVolley({state,damage,plasma=false,incoming,locationRoll,primaryRoll=null,sideChoice=null,systemChoice=null,shieldChoice=null,eligibleSystemIds=null}){
 if(!state||!int(damage)||!['forward','aft','port','starboard'].includes(incoming)||typeof plasma!=='boolean')throw new RangeError('Invalid volley');
 if(shieldChoice!==null)throw new RangeError('Vorchan SCS has no verified shield system');
 if(state.shipDestroyed)throw new RangeError('Ship already destroyed');
 const hit=vorchanHitToken({incoming,locationRoll,primaryRoll,sideChoice});
 if(hit.requiresChoice)return {requiresChoice:true,...hit};
 if(state.sectionsLost?.includes(hit.section)){hit.section='primary';hit.token=hitLocation(chart.primary,primaryRoll||locationRoll);hit.candidates=damageSystemCandidates(hit.token,'primary');}
 const next=structuredClone(state),trace=[];
 let candidates=hit.candidates.filter(id=>(!eligibleSystemIds||eligibleSystemIds.includes(id))&&next.tracks[id]&&next.tracks[id].marked<systems.get(id).boxes);
 if(candidates.length>1&&(!systemChoice||!candidates.includes(systemChoice)))return {requiresChoice:true,choiceType:'system',token:hit.token,choices:candidates};
 if(systemChoice&&candidates.length&&!candidates.includes(systemChoice))throw new RangeError('Invalid defender system choice');
 const selected=systemChoice||candidates[0]||null;
 // Destroyed systems cannot absorb another volley; hit structure instead.
 let structure=hit.section==='primary'?'primary_structure':hit.section==='aft'?'aft_structure':'forward_structure';
 let remaining=damage;
 if(selected)remaining=applyToTrack(next,selected,remaining,plasma,trace);
 else if(hit.token.endsWith('_structure'))structure=hit.token;
 if(!selected||remaining>0){
  if(selected&&systems.get(selected).kind==='structure')structure=selected;
  // An overkill is routed to its own structural area, not necessarily the hit chart.
  else if(selected)structure=['primary','port','starboard'].includes(systems.get(selected).section)?'primary_structure':systems.get(selected).section==='aft'?'aft_structure':'forward_structure';
  if(!selected||systems.get(selected).kind!=='structure'){
   if(next.tracks[structure]?.marked===systems.get(structure)?.boxes)structure='primary_structure';
   if(remaining>0)remaining=applyToTrack(next,structure,remaining,plasma,trace);
   if(remaining>0&&structure!=='primary_structure')remaining=applyToTrack(next,'primary_structure',remaining,plasma,trace);
  }else if(remaining>0&&structure!=='primary_structure'){
   remaining=applyToTrack(next,'primary_structure',remaining,plasma,trace);
  }
 }
 next.destroyedSections=['forward','aft'].filter(section=>next.tracks[section+'_structure']?.marked===systems.get(section+'_structure').boxes);
 next.shipDestroyed=next.tracks.primary_structure?.marked===systems.get('primary_structure').boxes||next.tracks.reactor?.marked===systems.get('reactor').boxes;
 return {requiresChoice:false,hit:{...hit,systemId:selected},state:next,trace,unallocated:remaining,criticalChecksDeferred:true,postTurnSectionLossDeferred:true};
}
export function vorchanPostTurnStructureLoss(state){
 const next=structuredClone(state);
 for(const section of next.destroyedSections||[])for(const s of SCS.systems.filter(s=>s.section===section)){
  if(!s.verified||!next.tracks[s.id])throw new RangeError('Unverified track prevents automatic section loss: '+s.id);
  next.tracks[s.id].marked=s.boxes;
 }
 return next;
}
