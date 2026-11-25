import {hullProfile,hullSystems} from './vorchar.mjs';
// B5W 2E Compendium, Damage Resolution: standard Vorchan volleys.
// Pure and immutable. All hit rolls, defender system choices and dice are supplied
// explicitly; missing choices or unverified SCS tracks stop resolution.
import {CENTAURI_HIT_CHARTS,hitLocation} from './centauri-combat-data.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from './vorchan-scs-identification.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
const hitCharts=id=>hullProfile(id)?.hitCharts??CENTAURI_HIT_CHARTS[LIB.id];
const systems=new Map(SCS.systems.map(s=>[s.id,s]));
const int=(n,min=0)=>Number.isInteger(n)&&n>=min;
export function initialVorchanDamage(libraryId){
 return {shipId:null,...(libraryId&&libraryId!==LIB.id?{libraryId}:{}),tracks:Object.fromEntries(hullSystems(libraryId).filter(s=>s.verified&&int(s.boxes)&&int(s.armour)).map(s=>[s.id,{marked:0}])),criticalCandidates:[],destroyedSections:[],shipDestroyed:false};
}
export function damageSystemCandidates(token,section,libraryId){
 const systems=new Map(hullSystems(libraryId).map(s=>[s.id,s]));
 const candidates={
  retro_thrust:['forward_port_thrust','forward_starboard_thrust'],plasma_accelerator:['plasma_forward'],
  twin_array:hullSystems(libraryId).filter(s=>s.weaponCardId==='twin-array').map(s=>s.id),
  battle_laser:hullSystems(libraryId).filter(s=>s.weaponCardId==='battle-laser').map(s=>s.id),side_structure:[section+'_structure'],plasma_stream:['plasma_stream'],matter_cannon:['matter_port','matter_starboard'],guardian_array:['guardian'],
  forward_structure:['forward_structure'],aft_structure:['aft_structure'],primary_structure:['primary_structure'],
  side_thrust:['port_thrust','starboard_thrust'],sensors:['sensors'],engine:['engine'],
  hangar:['hangar'],reactor:['reactor'],command:['command'],
  main_thrust:hullSystems(libraryId).filter(s=>s.kind==='thruster'&&s.section==='aft').map(s=>s.id),
  jump_drive:['jump_aft_centre']
 }[token]||[];
 return candidates.filter(id=>{const s=systems.get(id);return s&&(s.section===section||section==='primary'||token==='jump_drive')&&!(section==='primary'&&s.kind==='weapon'&&hullProfile(libraryId)?.hitCharts.primary.some(row=>row[2]===token)&&s.section!=='primary')});
}
export function vorchanHitToken({incoming,locationRoll,primaryRoll=null,sideChoice=null,libraryId,forcedChart=null}){
 if(!['forward','aft','port','starboard'].includes(incoming)||!int(locationRoll,1)||locationRoll>20)throw new RangeError('Invalid hit direction or d20');
 let section=forcedChart||incoming;
 if(!forcedChart&&!hitCharts(libraryId)[incoming]&&(incoming==='port'||incoming==='starboard')){
  if(!['forward','aft'].includes(sideChoice))return {requiresChoice:true,choiceType:'hitChart',choices:['forward','aft']};
  section=sideChoice;
 }
 const chart=hitCharts(libraryId);
 let token=hitLocation(chart[section],locationRoll);
 if(token==='primary'){
  if(!int(primaryRoll,1)||primaryRoll>20)return {requiresChoice:true,choiceType:'primaryRoll',section};
  token=hitLocation(chart.primary,primaryRoll);section='primary';
 }
 return {requiresChoice:false,section,token,candidates:damageSystemCandidates(token,section,libraryId)};
}
export function rollVorchanDamage({mountId,chargeTurns=3,dice,range,damageLoss=0,mode='Standard',libraryId=LIB.id,targetClass=null}){
 const hull=hullProfile(libraryId);
 const mount=hull.weaponMounts.find(m=>m.id===mountId);
 if(!mount||!int(range)||!hull.weapons.find(w=>w.id===mount.weaponId).modes.includes(mode))throw new RangeError('Invalid weapon or range');
 const weapon=hull.weapons.find(w=>w.id===mount.weaponId);
 const option=mount.weaponId==='plasma-accelerator'?weapon.firingOptions.find(o=>o.turns===chargeTurns):weapon.firingOptions[0];
 if(!option)throw new RangeError('Invalid plasma charge');
 const {count,sides,bonus,perHex}=option.damageDice;
 const piercingLoss=mode==='Piercing'&&['medium','light_combat'].includes(targetClass)?2:0;damageLoss+=piercingLoss;
 if(!Array.isArray(dice)||dice.length!==count||dice.some(n=>!int(n,1)||n>sides))throw new RangeError('Damage dice mismatch');
 return {weaponId:weapon.id,mode,dice:[...dice],range,formula:{count,sides,bonus,perHex,damageLoss,piercingLoss},raw:dice.reduce((a,b)=>a+Math.max(1,b-damageLoss),bonus),damage:Math.max(0,dice.reduce((a,b)=>a+Math.max(1,b-damageLoss),bonus)+range*perHex),plasma:weapon.class==='Plasma',matter:weapon.class==='Matter',plasmaStream:weapon.id==='plasma-stream',raking:weapon.id==='plasma-stream'?5:mode==='Raking'?10:null,piercing:mode==='Piercing'};
}
function applyToTrack(next,id,damage,plasma,trace,systems,{matter=false,plasmaStream=false,noOverkill=false,armourPaid=[]}={}){
 const s=systems.get(id);
 if(!s?.verified||!int(s.boxes)||!int(s.armour)||!next.tracks[id])throw new RangeError('Unverified SCS damage track '+id);
 const previous=next.tracks[id].marked;
 const remaining=Math.max(0,s.boxes-previous);
 if(remaining===0)return damage;
 const currentArmour=Math.max(0,s.armour-(next.armourLoss?.[id]||0)),armour=matter||armourPaid.includes(id)?0:plasma?Math.floor(currentArmour/2):currentArmour;
 if(plasmaStream&&damage>=5){next.armourLoss??={};next.armourLoss[id]=(next.armourLoss[id]||0)+Math.min(1,currentArmour);}
 const penetrated=Math.max(0,damage-armour),marked=Math.min(remaining,penetrated);
 next.tracks[id]={marked:previous+marked};
 if(marked&&!next.criticalCandidates.includes(id))next.criticalCandidates.push(id);
 trace.push({systemId:id,armour,damageIn:damage,marked,damageOut:matter||noOverkill?0:Math.max(0,penetrated-marked),armourLost:plasmaStream&&damage>=5&&currentArmour>0?1:0,destroyed:previous+marked===s.boxes});
 return matter||noOverkill?0:Math.max(0,penetrated-marked);
}
export function applyVorchanStandardVolley({state,damage,plasma=false,matter=false,plasmaStream=false,incoming,locationRoll,primaryRoll=null,sideChoice=null,systemChoice=null,shieldChoice=null,eligibleSystemIds=null,forcedChart=null,noOverkill=false,armourPaid=[]}){
 if(!state||!int(damage)||!['forward','aft','port','starboard'].includes(incoming)||typeof plasma!=='boolean')throw new RangeError('Invalid volley');
 if(shieldChoice!==null)throw new RangeError('Vorchan SCS has no verified shield system');
 if(state.shipDestroyed)throw new RangeError('Ship already destroyed');
 const systems=new Map(hullSystems(state.libraryId).map(system=>[system.id,system]));
 const chart=hitCharts(state.libraryId);
 const hit=vorchanHitToken({incoming,locationRoll,primaryRoll,sideChoice,libraryId:state.libraryId,forcedChart});
 if(hit.requiresChoice)return {requiresChoice:true,...hit};
 if(!noOverkill&&state.sectionsLost?.includes(hit.section)){hit.section='primary';hit.token=hitLocation(chart.primary,primaryRoll||locationRoll);hit.candidates=damageSystemCandidates(hit.token,'primary',state.libraryId);}
 const next=structuredClone(state),trace=[];
 if(noOverkill&&state.sectionsLost?.includes(forcedChart))return {requiresChoice:false,state:next,trace,unallocated:damage};
 let candidates=hit.candidates.filter(id=>(!eligibleSystemIds||eligibleSystemIds.includes(id))&&next.tracks[id]&&next.tracks[id].marked<systems.get(id).boxes);
 if(candidates.length>1&&(!systemChoice||!candidates.includes(systemChoice)))return {requiresChoice:true,choiceType:'system',token:hit.token,choices:candidates};
 if(systemChoice&&candidates.length&&!candidates.includes(systemChoice))throw new RangeError('Invalid defender system choice');
 const selected=systemChoice||candidates[0]||null;
 // Destroyed systems cannot absorb another volley; hit structure instead.
 const medium=hullProfile(state.libraryId)?.class==='medium';
 let structure=medium?'primary_structure':systems.has(hit.section+'_structure')?hit.section+'_structure':'primary_structure';
 let remaining=damage;
 if(selected)remaining=applyToTrack(next,selected,remaining,plasma,trace,systems,{matter,plasmaStream,noOverkill,armourPaid});
 else if(hit.token.endsWith('_structure')&&systems.has(hit.token))structure=hit.token;
 if(noOverkill&&!selected&&next.tracks[structure]?.marked===systems.get(structure)?.boxes)return {requiresChoice:false,state:next,trace,unallocated:damage};
 if(!selected||remaining>0){
  if(selected&&systems.get(selected).kind==='structure')structure=selected;
  // An overkill is routed to its own structural area, not necessarily the hit chart.
  else if(selected)structure=medium?'primary_structure':systems.has(systems.get(selected).section+'_structure')?systems.get(selected).section+'_structure':'primary_structure';
  if(!selected||systems.get(selected).kind!=='structure'){
   if(next.tracks[structure]?.marked===systems.get(structure)?.boxes)structure='primary_structure';
   if(remaining>0)remaining=applyToTrack(next,structure,remaining,plasma,trace,systems,{matter,plasmaStream,noOverkill,armourPaid});
   if(remaining>0&&structure!=='primary_structure')remaining=applyToTrack(next,'primary_structure',remaining,plasma,trace,systems,{matter,plasmaStream,noOverkill,armourPaid});
  }else if(remaining>0&&structure!=='primary_structure'){
   remaining=applyToTrack(next,'primary_structure',remaining,plasma,trace,systems,{matter,plasmaStream,noOverkill,armourPaid});
  }
 }
 next.destroyedSections=['forward','aft','port','starboard'].filter(section=>systems.has(section+'_structure')&&next.tracks[section+'_structure']?.marked===systems.get(section+'_structure').boxes);
 next.shipDestroyed=next.tracks.primary_structure?.marked===systems.get('primary_structure').boxes||next.tracks.reactor?.marked===systems.get('reactor').boxes;
 return {requiresChoice:false,hit:{...hit,systemId:selected},state:next,trace,unallocated:remaining,criticalChecksDeferred:true,postTurnSectionLossDeferred:true};
}
export function vorchanPostTurnStructureLoss(state){
 const next=structuredClone(state);
 for(const section of next.destroyedSections||[])for(const s of hullSystems(state.libraryId).filter(s=>s.section===section)){
  if(!s.verified||!next.tracks[s.id])throw new RangeError('Unverified track prevents automatic section loss: '+s.id);
  next.tracks[s.id].marked=s.boxes;
 }
 return next;
}
