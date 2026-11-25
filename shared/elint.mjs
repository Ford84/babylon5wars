// Second Edition Rules Compendium: Offensive / Defensive / Disruption ELINT,
// Blanket Protection and Identification. Clear-space LOS; no guessed hidden units.
import {hexDistance} from './phases.mjs';
import {hullProfile} from './vorchar.mjs';
const fail=m=>{throw new RangeError(m);};
const sum=m=>Object.values(m||{}).reduce((a,b)=>a+b,0);
export const ewKey=u=>u.kind==='shuttle'?u.carrierId+'-shuttle-flight':u.id;
const alloc=u=>u.private_state?.trial?.ewAllocation||u.ewAllocation||u.public_state?.ew||{offensive:{},defensive:0};
const scouts=units=>units.filter(u=>hullProfile(u.public_state?.libraryId||u.private_state?.trial?.libraryId)?.elint&&!u.withdrawn&&!u.private_state?.trial?.condition?.damage?.shipDestroyed);
const snap=(u,units)=>units.find(x=>x.id===u.id);
const within=(a,b,n)=>!!a&&!!b&&hexDistance(a,b)<=n;
const rangeAtBoth=(a,b,initial,n)=>within(a,b,n)&&within(snap(a,initial),snap(b,initial),n);
export function elintBudget(elint={}){return sum(elint.defensive)+sum(elint.disruption)+(elint.blanket||0);}
export function validateElint({ship,units,offensive,elint={},fixed=false}){
 if(!elint||Array.isArray(elint)||typeof elint!=='object'||Object.keys(elint).some(k=>!['defensive','disruption','blanket'].includes(k)))fail('Invalid ELINT allocation');
 const isScout=!!hullProfile(ship.public_state?.libraryId||ship.private_state?.trial?.libraryId)?.elint;
 const out={defensive:{},disruption:{},blanket:elint.blanket??0};
 if(!Number.isInteger(out.blanket)||out.blanket<0||!fixed&&out.blanket>0&&out.blanket<4)fail('Blanket protection requires at least four EW');
 for(const field of ['defensive','disruption']){
  const m=elint[field]||{};if(typeof m!=='object'||Array.isArray(m))fail('Invalid ELINT targets');
  for(const [key,n] of Object.entries(m)){
   if(!Number.isInteger(n)||n<0)fail('ELINT allocations must be non-negative integers');if(!n)continue;
   const targets=units.filter(u=>ewKey(u)===key);if(!targets.length)fail('Unknown ELINT target');
   if(field==='defensive'&&(!fixed&&n<2||targets.some(u=>u.owner_id!==ship.owner_id||u.id===ship.id||!fixed&&!within(ship,u,50))))fail('Defensive ELINT needs two EW and another friendly unit within 50 hexes');
   if(field==='disruption'&&(!fixed&&n<3||targets.some(u=>u.owner_id===ship.owner_id||u.kind==='shuttle'||!fixed&&!within(ship,u,30))))fail('Disruption needs three EW and an enemy ship within 30 hexes');
   out[field][key]=n;
  }
 }
 const friendly=units.filter(u=>u.id!==ship.id&&u.owner_id===ship.owner_id&&offensive[ewKey(u)]>0);
 if(!isScout&&(elintBudget(out)||friendly.length))fail('Only an ELINT ship can allocate fleet support');
 if(friendly.some(u=>!fixed&&!within(ship,u,30)))fail('Offensive support links require a friendly unit within 30 hexes');
 if(out.blanket&&(sum(out.defensive)||sum(out.disruption)||friendly.length))fail('Blanket protection cannot be combined with other ELINT functions');
 return out;
}
export function ewPositionSnapshot(units){return units.map(({id,kind,carrierId,owner_id,q,r})=>({id,kind,carrierId,owner_id,q,r}));}
export function disruptionQueue(units,die){
 const queue=[],journal=[];
 for(const target of units.filter(u=>u.kind!=='shuttle')){
  const candidates=scouts(units).filter(u=>u.owner_id!==target.owner_id&&alloc(u).elint?.disruption?.[target.id]>=3&&within(u,target,30));
  if(!candidates.length)continue;
  const best=Math.max(...candidates.map(u=>alloc(u).elint.disruption[target.id])),tied=candidates.filter(u=>alloc(u).elint.disruption[target.id]===best);
  const roll=tied.length>1?die(tied.length):1,scout=tied[roll-1];if(!scout)fail('Invalid ELINT tie-break roll');
  if(tied.length>1)journal.push({targetId:target.id,scoutIds:tied.map(x=>x.id),roll,chosenScoutId:scout.id});
  const choices={...alloc(target).offensive};if(alloc(target).closeCombatReserve>0)choices['@ccew']=alloc(target).closeCombatReserve;
  const capacity=Math.min(Math.floor(best/3),sum(choices));
  if(capacity)queue.push({scoutId:scout.id,targetId:target.id,actorId:scout.owner_id,capacity,choices,removed:null});
 }
 return {queue,journal};
}
export function selectDisruption(record,removed){
 if(!removed||Array.isArray(removed)||typeof removed!=='object'||Object.entries(removed).some(([id,n])=>!Number.isInteger(n)||n<0||n>(record.choices[id]||0))||sum(removed)!==record.capacity)fail('Choose exactly the available number of enemy OEW points to disrupt');
 return Object.fromEntries(Object.entries(removed).filter(([,n])=>n));
}
export function effectiveOwnOEW(unit,key,units,initial,disruptions=[]){
 let removed=0;const active=[];
 for(const r of disruptions){const scout=scouts(units).find(x=>x.id===r.scoutId);if(r.targetId===unit.id&&r.removed&&scout&&rangeAtBoth(scout,unit,initial,30)){removed+=r.removed[key]||0;if(r.removed[key])active.push(r.scoutId);}}
 return {value:Math.max(0,(alloc(unit).offensive?.[key]||0)-removed),removed,scoutIds:active};
}
export function elintAttackEffects({shooter,target,units,initial=units,disruptions=[],baseDefence}){
 const own=(u,key)=>effectiveOwnOEW(u,key,units,initial,disruptions),o=own(shooter,ewKey(target));
 let offensive=0,offensiveScoutId=null,loanedDefence=0,blanket=0;const defensiveSources=[];
 for(const scout of scouts(units)){
  const a=alloc(scout),e=a.elint||{};
  if(scout.owner_id===shooter.owner_id&&scout.id!==shooter.id&&!e.blanket&&o.value>=2&&rangeAtBoth(scout,shooter,initial,30)&&rangeAtBoth(scout,target,initial,30)&&own(scout,ewKey(shooter)).value>=1){
   const bonus=Math.floor(own(scout,ewKey(target)).value/(shooter.kind==='shuttle'?4:2));if(bonus>offensive){offensive=bonus;offensiveScoutId=scout.id;}
  }
  if(scout.owner_id===target.owner_id){
   if(scout.id!==target.id&&rangeAtBoth(scout,target,initial,50)){const bonus=Math.floor((e.defensive?.[ewKey(target)]||0)/2);loanedDefence+=bonus;if(bonus)defensiveSources.push({scoutId:scout.id,bonus});}
   if(within(scout,target,20))blanket=Math.max(blanket,Math.floor((e.blanket||0)/4));
  }
 }
 const ownDefence=alloc(target).defensive||0,defensive=Math.min(loanedDefence+blanket,Math.max(0,baseDefence-ownDefence));
 const closeCombat=(target.kind==='shuttle'||target.kind==='fighter-flight')&&within(shooter,target,10)?(alloc(shooter).closeCombatTargets?.[ewKey(target)]||0):0;
 return {ownOffensive:o.value+closeCombat,closeCombat,disrupted:o.removed,disruptorIds:o.scoutIds,offensive,offensiveScoutId,defensive,loanedDefence,blanket,defensiveSources};
}

// Lost units release their now unusable fixed allocation into self defence.
export function fixedEWForUnits(lock,units){
 if(!lock)return null;const n=structuredClone(lock),ids=new Set(units.filter(u=>!u.withdrawn&&!u.public_state?.condition?.shipDestroyed&&!u.private_state?.trial?.condition?.damage?.shipDestroyed).map(ewKey));
 for(const m of [n.offensive,n.elint?.defensive,n.elint?.disruption])for(const [id,points] of Object.entries(m||{}))if(!ids.has(id)){n.defensive+=points;delete m[id];}
 return n;
}

export function effectiveCCEWReserve(unit,disruptions=[]){return Math.max(0,(alloc(unit).closeCombatReserve||0)-disruptions.filter(r=>r.targetId===unit.id).reduce((n,r)=>n+(r.removed?.['@ccew']||0),0));}
