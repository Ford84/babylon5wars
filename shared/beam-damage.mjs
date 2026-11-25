import {VORCHAN_LIBRARY_RECORD as LIB} from './vorchan-trial-library.mjs';
// Compendium pp. 41–42: raking armour is paid once per shot; piercing has no overkill.
import {hullProfile} from './vorchar.mjs';
import {applyVorchanStandardVolley} from './vorchan-damage.mjs';
export function piercingSections(libraryId,incoming,sideChoice=null){
 const h=(hullProfile(libraryId)||LIB);
 if(['medium','light_combat'].includes(h.class))return [incoming];
 if(h.class==='capital')return [incoming,'primary',({forward:'aft',aft:'forward',port:'starboard',starboard:'port'})[incoming]];
 if(['forward','aft'].includes(incoming))return [incoming,'primary',incoming==='forward'?'aft':'forward'];
 if(!['forward','aft'].includes(sideChoice))return null;
 return [sideChoice,'primary'];
}
export function beamPlan(damage,libraryId,incoming,sideChoice,extras=[]){
 if(damage.raking)return Array.from({length:Math.ceil(damage.damage/damage.raking)},(_,i)=>({damage:Math.min(damage.raking,damage.damage-i*damage.raking),chart:null}));
 const sections=piercingSections(libraryId,incoming,sideChoice);if(!sections)throw new RangeError('Defender must choose the piercing entry section');
 const remainder=damage.damage%sections.length;
 if(extras.length!==remainder||new Set(extras).size!==extras.length||extras.some(x=>!sections.includes(x)))throw new RangeError('Defender must allocate piercing remainder to distinct sections');
 return sections.map(chart=>({chart:['medium','light_combat'].includes((hullProfile(libraryId)||LIB).class)?null:chart,damage:Math.floor(damage.damage/sections.length)+(extras.includes(chart)?1:0)}));
}
export function applyBeamPart({state,damage,part,location,incoming,armourPaid=[]}){
 if(!part.damage||state.shipDestroyed||damage.piercing&&state.sectionsLost?.includes(part.chart))return {state:structuredClone(state),trace:[],requiresChoice:false};
 if(damage.piercing&&part.chart&&(hullProfile(state.libraryId)||LIB).hitCharts[part.chart]?.find(([lo,hi])=>location.locationRoll>=lo&&location.locationRoll<=hi)?.[2]==='primary')throw new RangeError('Piercing primary redirects must be rerolled');
 const result=applyVorchanStandardVolley({state,damage:part.damage,plasma:damage.plasma,plasmaStream:damage.plasmaStream,incoming,locationRoll:location.locationRoll,primaryRoll:location.primaryRoll??null,sideChoice:location.sideChoice,systemChoice:location.systemChoice,forcedChart:damage.piercing?part.chart:null,noOverkill:!!damage.piercing,armourPaid:damage.raking&&!damage.plasmaStream?armourPaid:[],eligibleSystemIds:location.primaryRoll&&['port','starboard'].includes(incoming)&&(hullProfile(state.libraryId)||LIB).hitCharts.primary.find(([lo,hi])=>location.primaryRoll>=lo&&location.primaryRoll<=hi)?.[2]==='side_thrust'?[incoming+'_thrust']:null});
 if(result.requiresChoice)return result;
 return result;
}
