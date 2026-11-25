import React,{useState} from 'react';
import {hullProfile} from '../shared/vorchar.mjs';
import {effectiveCondition} from '../shared/ship-condition.mjs';
import {elintBudget,validateElint,ewKey,fixedEWForUnits} from '../shared/elint.mjs';
import {hexDistance} from '../shared/phases.mjs';
const sum=m=>Object.values(m||{}).reduce((a,b)=>a+b,0);
function Amount({label,value=0,max,min=1,onChange}){const choices=[0,...Array.from({length:Math.max(0,max-min+1)},(_,i)=>i+min)];if(!choices.includes(value))choices.push(value);return <label>{label}<select value={value} onChange={e=>onChange(Number(e.target.value))}>{choices.sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}</option>)}</select></label>;}
export function EWActions({t,ship,turn,detail,send,busy}){
 const e=effectiveCondition(t,turn),scout=!!hullProfile(t.libraryId)?.elint,available=e.sensorStrength+(e.sensorStrength>0?t.powerAllocation.extraEW:0),limit=e.offensiveLimited?Math.floor(available/2):available;
 const units=[...detail.ships.filter(x=>!x.withdrawn&&!x.public_state.condition.shipDestroyed),...(detail.shuttles||[]).filter(x=>x.status==='deployed')];
 const groups=[...new Map(units.map(x=>[ewKey(x),{...x,id:ewKey(x),label:x.kind==='shuttle'?'Shuttle Group · '+detail.ships.find(y=>y.id===x.carrierId)?.label:x.label}])).values()];
 const enemies=groups.filter(x=>x.owner_id!==ship.owner_id),friends=groups.filter(x=>x.owner_id===ship.owner_id&&x.id!==ship.id);
 const fixed=fixedEWForUnits(e.ewLock,units);
 const [defensive,setDefensive]=useState(fixed?.defensive||0),[offensive,setOffensive]=useState(fixed?.offensive||{}),[elint,setElint]=useState(fixed?.elint||{defensive:{},disruption:{},blanket:0});
 const [closeCombatReserve,setCloseCombatReserve]=useState(0);
 const attack=sum(offensive),spent=defensive+attack+elintBudget(elint)+closeCombatReserve;
 let error='';try{validateElint({ship,units,offensive,elint,fixed:!!e.ewLock});}catch(err){error=err.message;}
 const update=(field,id,n)=>setElint(old=>({...old,[field]:{...old[field],[id]:n}}));
 return <><p><strong>{available}</strong> EW Available · <strong>{available-spent}</strong> Unallocated</p>{e.ewLock&&<p>Command Damage Fixes Last Turn’s Normal And ELINT Allocations; Reduce Points Only Where Output Has Fallen.</p>}{e.offensiveLimited&&<p>Command Damage Limits Normal Offensive EW To {limit}.</p>}
 {!e.ewLock&&<Amount label="Reserve Close Combat EW" value={closeCombatReserve} max={available} onChange={setCloseCombatReserve}/>}
 <Amount label="Defensive EW" value={defensive} max={available} onChange={setDefensive}/>{enemies.map(x=><Amount key={x.id} label={'Offensive EW Against '+x.label} value={offensive[x.id]||0} max={limit} onChange={n=>setOffensive(old=>({...old,[x.id]:n}))}/>)}
 {enemies.some(x=>x.kind==='shuttle')&&<p>Each Shuttle Group Shares Its Offensive EW Lock-On (Up To Six Individual Shuttles).</p>}
 {scout&&<fieldset><legend>ELINT Fleet Support</legend><p>Support uses this same EW pool. Ranges for offensive, defensive and disruption support must be legal now and when weapons fire.</p>
 <Amount label="Blanket Protection · 4 EW Per +1 DEW Within 20 Hexes At Fire" min={e.ewLock?1:4} max={available} value={elint.blanket||0} onChange={n=>{setElint(n?{blanket:n,defensive:{},disruption:{}}:{...elint,blanket:0});if(n)setOffensive(old=>Object.fromEntries(Object.entries(old).filter(([id])=>enemies.some(x=>x.id===id))));}}/>
 {!elint.blanket&&<><h3>Offensive Support</h3><p>Spend 1 OEW to link each friendly ship, and at least 2 OEW against its enemy. That ship must commit at least 2 own OEW against the same enemy. Each pair of scout OEW adds +1; only the best scout applies. Both ships must be within 30 hexes of the scout.</p>
 {friends.filter(x=>x.kind!=='shuttle'&&(hexDistance(ship,x)<=30||offensive[x.id])).map(x=><Amount key={x.id} label={'Friendly OEW Link · '+x.label} value={offensive[x.id]||0} max={limit} onChange={n=>setOffensive(old=>({...old,[x.id]:n}))}/>)}
 <h3>Defensive Support</h3><p>Each pair of EW loaned to a friendly unit adds +1 DEW. Maximum range 50 hexes. Loans cannot reduce its defence below zero.</p>
 {friends.filter(x=>hexDistance(ship,x)<=50||elint.defensive?.[x.id]).map(x=><Amount key={x.id} label={'Loan DEW · '+x.label} min={e.ewLock?1:2} value={elint.defensive?.[x.id]||0} max={available} onChange={n=>update('defensive',x.id,n)}/>)}
 <h3>Disruption</h3><p>Each 3 EW cancels one enemy OEW. After all EW is revealed, you choose which allocations to break before movement. Maximum range 30 hexes. The strongest scout applies to each enemy.</p>
 {enemies.filter(x=>x.kind!=='shuttle'&&(hexDistance(ship,x)<=30||elint.disruption?.[x.id])).map(x=><Amount key={x.id} label={'Disrupt OEW · '+x.label} min={e.ewLock?1:3} value={elint.disruption?.[x.id]||0} max={available} onChange={n=>update('disruption',x.id,n)}/>)}</>}
 </fieldset>}
 {error&&<p className="error">{error}</p>}
 <button disabled={busy||!!error||spent>available||attack>limit} onClick={()=>send({type:'ew',defensive,closeCombatReserve,offensive:Object.fromEntries(Object.entries(offensive).filter(([,n])=>n)),elint})}>Lock EW Allocation</button></>;
}
export function ElintDisruption({detail,userId,send,busy}){
 const r=detail.elintDisruption,[removed,setRemoved]=useState({});if(!r)return null;
 const name=id=>id==='@ccew'?'Reserved Close Combat EW':detail.ships.find(x=>x.id===id)?.label||((detail.ships.find(x=>id===x.id+'-shuttle-flight')?.label||id)+' Shuttle Group');
 const own=r.actorId===userId;
 return <section className="panel battle-actions"><h2>ELINT Disruption</h2><p><strong>{name(r.scoutId)}</strong> can remove <strong>{r.capacity}</strong> OEW from {name(r.targetId)}. The scout’s player chooses now, before movement.</p>{own?<>
 {Object.entries(r.choices).filter(([,n])=>n>0).map(([id,n])=><Amount key={id} label={'Remove EW From '+name(id)+' · '+n+' Committed'} value={removed[id]||0} max={Math.min(n,r.capacity)} onChange={n=>setRemoved(old=>({...old,[id]:n}))}/>)}
 <p>{sum(removed)} / {r.capacity} Points Selected</p><button disabled={busy||sum(removed)!==r.capacity} onClick={()=>send({type:'elint-disrupt',scoutId:r.scoutId,targetId:r.targetId,removed})}>Commit Disruption</button></>:<p>Waiting For The Scout’s Player To Select Enemy OEW Points.</p>}</section>;
}
