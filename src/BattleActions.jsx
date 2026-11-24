import React,{useState} from 'react';
import {SYSTEM_POWER,effectiveCondition,labelSystem} from '../shared/ship-condition.mjs';
import {extraEWCost} from '../shared/preturn.mjs';
import {movementOptions} from '../shared/movement-options.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {vorchanTargetingPreview,facingDirections,checkMountArc} from '../shared/weapon-targeting.mjs';
const numbers=(max)=>Array.from({length:Math.max(0,Math.floor(max))+1},(_,i)=>i);
function Amount({label,value,max,onChange}){return <label>{label}<select value={value} onChange={e=>onChange(Number(e.target.value))}>{numbers(max).map(n=><option key={n} value={n}>{n}</option>)}</select></label>;}
export default function BattleActions({detail,userId,send,busy}){
 const ship=detail.ships.find(x=>x.owner_id===userId),t=ship?.private_state?.trial;
 if(!t||!detail.automated||detail.game.status!=='active')return null;
 const phase=detail.game.phase_id,turn=detail.game.turn;
 if(!detail.needsAction)return <section className="panel"><h2>{detail.locked?'Orders Locked':'Waiting For Opponent'}</h2><p>{detail.locked?'Your choices are saved. The next step opens when both players are ready.':'The other player has the next required action.'}</p></section>;
 const props={ship,detail,send,busy,turn,t};
 return <section className="panel battle-actions" id="battle-actions"><h2>{detail.phase.label}</h2>
  {phase==='power'&&<Power {...props}/>}{phase==='initiative'&&<><p>Roll this ship’s initiative. The server applies speed and command modifiers and resolves opposing ties.</p><button disabled={busy} onClick={()=>send({type:'initiative'})}>Roll Initiative</button></>}
  {phase==='ew_commit'&&<EW {...props}/>}{phase==='movement'&&<Movement {...props}/>}
  {phase==='fire_commit'&&<Weapons {...props}/>}{phase==='fire_resolution'&&<Defence {...props}/>}
 </section>;
}
function Power({t,ship,turn,send,busy}){
 const [deactivated,setDeactivated]=useState([]),[purchasedThrust,setThrust]=useState(0),[extraEW,setEW]=useState(0),[shutdown,setShutdown]=useState(false);
 const e=effectiveCondition(t,turn),available=Math.max(0,4-e.reactorLoss+deactivated.reduce((n,id)=>n+SYSTEM_POWER[id],0));
 const forced=4-e.reactorLoss+deactivated.reduce((n,id)=>n+SYSTEM_POWER[id],0)<0,off=shutdown||forced;
 const maxEW=e.sensorStrength&&!deactivated.includes('sensors')&&!off?numbers(4).filter(n=>extraEWCost(8,n)<=available).at(-1):0;
 const ew=Math.min(extraEW,maxEW),maxThrust=e.commandDisabled||e.engineShort||e.destroyedSystems.includes('engine')||off?0:Math.floor((available-extraEWCost(8,ew))/2),thrust=Math.min(purchasedThrust,maxThrust);
 return <><p><strong>{available}</strong> Power Available · <strong>{off?0:available-thrust*2-extraEWCost(8,ew)}</strong> Remaining</p>
  {e.reactorLoss>0&&<p>Reactor Criticals: −{e.reactorLoss} Power</p>}
  <fieldset><legend>Deactivate Systems To Release Power</legend>{Object.entries(SYSTEM_POWER).filter(([id])=>!e.destroyedSystems.includes(id)).map(([id,power])=><label className="check-row" key={id}><input type="checkbox" checked={deactivated.includes(id)} onChange={event=>setDeactivated(old=>event.target.checked?[...old,id]:old.filter(x=>x!==id))}/>{labelSystem(id)} · {power} Power</label>)}</fieldset>
  {t.condition.effects.containmentBreach&&<label className="check-row"><input type="checkbox" checked={shutdown} onChange={e=>setShutdown(e.target.checked)}/>Shut Down Reactor To Avoid Detonation ({t.condition.damage.tracks.reactor.marked}% Risk)</label>}
  {off?<p className="error">Reactor Shutdown: No Powered Systems Or Purchased Thrust This Turn.{forced?' Deactivate more systems to cover the shortage, or commit shutdown.':''}</p>:<>{maxThrust>0&&<Amount label="Extra Thrust · 2 Power Each" value={thrust} max={maxThrust} onChange={setThrust}/>}{maxEW>0&&<Amount label="Extra EW · 9 Power For The First Point" value={ew} max={maxEW} onChange={setEW}/>}</>}
  <button disabled={busy} onClick={()=>send({type:'power',deactivated,purchasedThrust:off?0:thrust,extraEW:off?0:ew,shutdown})}>Commit Power</button>
 </>;
}
function EW({t,turn,detail,send,busy}){
 const e=effectiveCondition(t,turn),available=e.sensorStrength+(e.sensorStrength>0?t.powerAllocation.extraEW:0),enemy=detail.ships.find(s=>s.owner_id!==t.ownerId);
 const [defensive,setDefensive]=useState(e.ewLock?.defensive||0),[offensive,setOffensive]=useState(e.ewLock?.offensive?.[enemy?.id]||0);
 const attackLimit=e.offensiveLimited?Math.floor(available/2):available;
 const defence=Math.min(defensive,available),attack=Math.min(offensive,attackLimit);
 return <><p><strong>{available}</strong> EW Available · {available-defence-attack} Unallocated</p>
  {e.ewLock&&<p>Command damage fixes last turn’s allocations. Reduce points only where sensor output has fallen.</p>}
  {e.offensiveLimited&&<p>Command damage limits offensive EW to {attackLimit}.</p>}
  <Amount label="Defensive EW" value={defence} max={available} onChange={setDefensive}/>
  {enemy&&<Amount label={'Offensive EW Against '+enemy.label} value={attack} max={attackLimit} onChange={setOffensive}/>}
  <button disabled={busy||defence+attack>available} onClick={()=>send({type:'ew',defensive:defence,offensive:enemy?{[enemy.id]:attack}:{}})}>Lock EW Allocation</button>
 </>;
}
function Movement({t,ship,turn,detail,send,busy}){
 const options=movementOptions(ship,turn,detail.game.map_preset),[selected,setSelected]=useState(''),[choice,setChoice]=useState(0);
 const current=options.find(x=>x.name===selected)||options[0],pick=current?.choices[Math.min(choice,current.choices.length-1)],e=effectiveCondition(t,turn),spent=t.movement.engineThrustSpent||0;
 return <><p>Speed <strong>{ship.speed}</strong> · {t.movement.state.remaining} Hexes Remaining · Thrust <strong>{spent}/{e.freeThrust+t.powerAllocation.purchasedThrust}</strong> · Turn Delay {t.movement.state.turnDelayRemaining}</p>
  {e.commandDisabled&&<p>Command Systems Disabled: Inertial Movement Only</p>}
  {current?<><label>Legal Manoeuvre<select value={current.name} onChange={e=>{setSelected(e.target.value);setChoice(0);}}>{options.map(o=><option key={o.name} value={o.name}>{o.name}</option>)}</select></label>
   {current.choices.length>1&&<label>Thruster Distribution<select value={Math.min(choice,current.choices.length-1)} onChange={e=>setChoice(Number(e.target.value))}>{current.choices.map((c,i)=><option key={i} value={i}>{Object.entries(c.action.thrusters||{}).map(([id,n])=>labelSystem(id)+' '+n).join(', ')}{c.overthrust.length?' · Overthrust Risk':''}</option>)}</select></label>}
   <p>{pick.cost} Engine Thrust · Destination ({pick.position.q}, {pick.position.r}) · Speed {pick.position.speed}</p>
   {!!pick.overthrust.length&&<p className="error">End-Of-Turn Critical Checks: {pick.overthrust.map(x=>labelSystem(x.id)+' +'+x.excess+' Overthrust').join(', ')}</p>}
   <button disabled={busy} onClick={()=>send({type:'move',action:pick.action})}>Execute Manoeuvre</button>
  </>:<p>No powered manoeuvre is currently available.</p>}
  <button disabled={busy||t.movement.state.remaining!==0} className="secondary" onClick={()=>send({type:'movement-done'})}>Finish Movement</button>
 </>;
}
function Weapons({ship,t,turn,detail,send,busy}){
 const target=detail.ships.find(s=>s.owner_id!==ship.owner_id&&!s.public_state.condition.shipDestroyed);
 const [shots,setShots]=useState([]),[charge,setCharge]=useState(3),e=effectiveCondition(t,turn);
 const options=[1,2,3].filter(n=>weaponReadiness({trial:t,mountId:'plasma_forward',turn,chargeTurns:n}).ready),chosen=options.includes(charge)?charge:options.at(-1);
 const modify=(mountId,gun,role)=>setShots(old=>{const others=old.filter(s=>s.mountId!==mountId||s.gun!==gun);return role==='unused'?others:[...others,{shipId:ship.id,mountId,gun,role,...(role==='offensive'?{targetId:target.id,order:others.length+1,...(mountId==='plasma_forward'?{chargeTurns:chosen}:{})}:{})}];});
 const reorder=(i,d)=>setShots(old=>{const next=[...old];[next[i],next[i+d]]=[next[i+d],next[i]];return next;});
 return <><p>Target: <strong>{target?.label||'No Surviving Target'}</strong>. Choose each gun’s job, then lock your orders. Fire is revealed together.</p>
  {LIB.weaponMounts.map(m=>{
   const w=LIB.weapons.find(x=>x.id===m.weaponId),weaponEffect=e.weapons[m.id]||{};
   let preview;try{preview=vorchanTargetingPreview({shooter:{...ship,libraryId:LIB.id,hullClass:LIB.class},target:{...target,libraryId:LIB.id,hullClass:LIB.class},mountId:m.id,rangePenaltyAdjustment:weaponEffect.rangeLoss||0,attackerOffensiveEW:t.ewAllocation?.offensive?.[target?.id]||0,targetDefensiveEW:target?.public_state.ew?.defensive||0,otherModifiers:e.fireModifier?[{value:e.fireModifier,reason:'Condition',verified:true}]:[]});}catch{}
   const arc=target&&checkMountArc({shooter:ship,target,arc:m.arc}).allowed;
   return <article className="weapon-datacard" key={m.id}><h3>{w.name} · Mount {m.mountNumber}</h3>
    <p>{preview?.distance??'—'} Hexes · {m.arc.coverageDegrees}° Arc · {arc?'Target In Arc':'Target Outside Arc'}{preview?.readyForHitRoll?' · Hit On '+preview.hitOnD20AtOrBelow+' Or Less':''}</p>
    <p>{m.weaponId==='plasma-accelerator'&&chosen?w.firingOptions.find(o=>o.turns===chosen).damageDice.count+'d10 + '+w.firingOptions.find(o=>o.turns===chosen).damageDice.bonus+' − Range':w.damage}{weaponEffect.damageLoss?' · −'+weaponEffect.damageLoss+' Per Die (Minimum 1)':''}</p>
    {m.weaponId==='plasma-accelerator'&&options.length>0&&<label>Available Charge<select value={chosen} onChange={event=>{const n=Number(event.target.value);setCharge(n);setShots(old=>old.map(x=>x.mountId===m.id?{...x,chargeTurns:n}:x));}}>{options.map(n=><option key={n} value={n}>{n} Turn{n===1?'':'s'}</option>)}</select></label>}
    {Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>{const gun=i+1,r=weaponReadiness({trial:t,mountId:m.id,turn,gun,chargeTurns:m.id==='plasma_forward'?chosen:null}),selected=shots.find(x=>x.mountId===m.id&&x.gun===gun);return <label key={gun}>Gun {gun}{!r.ready?' · '+r.reasons.join(', '):''}<select disabled={!r.ready||!target} value={selected?.role||'unused'} onChange={event=>modify(m.id,gun,event.target.value)}><option value="unused">Hold Fire</option>{arc&&<option value="offensive">Fire At {target?.label}</option>}{w.intercept&&arc&&<option value="defensive">Reserve For Interception</option>}</select></label>;})}
   </article>;
  })}
  {shots.length>0&&<div><h3>Resolution Order</h3>{shots.map((x,i)=><div key={x.mountId+':'+x.gun} className="order-line"><span>{labelSystem(x.mountId)} · Gun {x.gun} · {x.role==='offensive'?'Attack':'Defensive Reserve'}</span><button className="secondary" disabled={!i} onClick={()=>reorder(i,-1)}>Earlier</button><button className="secondary" disabled={i===shots.length-1} onClick={()=>reorder(i,1)}>Later</button></div>)}</div>}
  <button disabled={busy} onClick={()=>send({type:'fire',fire:{shots:shots.map((s,i)=>({...s,...(s.role==='offensive'?{order:i+1}:{})}))}})}>{shots.length?'Lock Weapon Orders':'Hold All Fire'}</button>
 </>;
}
function Defence({ship,detail,send,busy}){
 const [assignments,setAssignments]=useState({}),[directions,setDirections]=useState({});
 const declarations=detail.declarations||[],incoming=declarations.flatMap(d=>d.fire.shots.filter(s=>s.role==='offensive'&&s.targetId===ship.id)),reserves=declarations.find(d=>d.playerId===ship.owner_id)?.fire.shots.filter(s=>s.role==='defensive')||[];
 const id=s=>s.shipId+':'+s.mountId+':'+s.gun;
 if(detail.pending.length){const p=detail.pending[0];return <><p>Allocate the confirmed hit to an eligible {p.type==='system'?'system':'hull section'}. The engine applies armour and damage.</p>{p.choices.map(value=><button key={value} disabled={busy} onClick={()=>send({type:'damage-choice',attackId:p.attackId,value})}>{labelSystem(value)}</button>)}</>;}
 const boundaries=new Map();for(const shot of incoming){const shooter=detail.ships.find(x=>x.id===shot.shipId);const f=facingDirections(shooter,ship,{sameHexPrevious:shooter.sameHexPrevious?.[ship.id]});if(f.requiresChoice)boundaries.set(shooter.id+':'+ship.id,{...f,shooter});}
 return <><p>{incoming.length} Incoming Attack{incoming.length===1?'':'s'} · {reserves.length} Reserved Gun{reserves.length===1?'':'s'}</p>
  {reserves.map(r=><label key={id(r)}>{labelSystem(r.mountId)} · Gun {r.gun}<select value={assignments[id(r)]||''} onChange={e=>setAssignments(old=>({...old,[id(r)]:e.target.value}))}><option value="">Do Not Intercept</option>{incoming.map(a=><option key={id(a)} value={id(a)}>{labelSystem(a.mountId)} · Gun {a.gun}</option>)}</select></label>)}
  {[...boundaries].map(([key,f])=><label key={key}>Incoming Aspect From {f.shooter.label}<select value={directions[key]||''} onChange={e=>setDirections(old=>({...old,[key]:e.target.value}))}><option value="">Choose Boundary Aspect</option>{f.choices.map(c=><option key={c} value={c}>{labelSystem(c)}</option>)}</select></label>)}
  <p>After both players lock, the server rolls all attacks. Damage, criticals and the next turn follow automatically; the game pauses only for a required defender choice.</p>
  <button disabled={busy||[...boundaries.keys()].some(k=>!directions[k])} onClick={()=>send({type:'defence',directions,assignments:reserves.filter(r=>assignments[id(r)]).map(r=>({shipId:r.shipId,mountId:r.mountId,gun:r.gun,attackId:assignments[id(r)]}))})}>Lock Defence And Resolve Fire</button>
 </>;
}
