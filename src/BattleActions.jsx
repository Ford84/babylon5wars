import {JumpFormation,VortexActions,HangarActions,ShuttleMovement} from './OperationsActions.jsx';
import {movementHeading,turnIntoPivotDirection} from '../shared/movement-rules.mjs';
import CriticalActions from './CriticalActions.jsx';
import {facingLabel} from '../shared/ship-facing.mjs';
import React,{useState} from 'react';
import {SYSTEMS,SYSTEM_POWER,effectiveCondition,labelSystem} from '../shared/ship-condition.mjs';
import {extraEWCost} from '../shared/preturn.mjs';
import {commitMovement} from '../shared/movement-commit.mjs';
import GuidedCombat from './GuidedCombat.jsx';
import {movementOptions,movementOptionGroup} from '../shared/movement-options.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {vorchanTargetingPreview,facingDirections,checkMountArc} from '../shared/weapon-targeting.mjs';
const numbers=(max)=>Array.from({length:Math.max(0,Math.floor(max))+1},(_,i)=>i);
function Amount({label,value,max,onChange}){return <label>{label}<select value={value} onChange={e=>onChange(Number(e.target.value))}>{numbers(max).map(n=><option key={n} value={n}>{n}</option>)}</select></label>;}
export default function BattleActions({detail,userId,send,busy,onInitiative,onAttackRevealed}){
 const ship=detail.ships.find(x=>x.owner_id===userId),t=ship?.private_state?.trial;
 if(!t||!detail.automated||detail.game.status!=='active')return null;
 const phase=detail.game.phase_id,turn=detail.game.turn;
 if(phase==='critical_resolution'&&detail.criticalResolution)return <CriticalActions detail={detail} userId={userId} send={send} busy={busy}/>;
 if(phase==='fire_resolution'&&detail.resolution)return <GuidedCombat detail={detail} userId={userId} send={send} busy={busy} onAttackRevealed={onAttackRevealed}/>;
 if(!detail.needsAction)return <section className="panel"><h2>{detail.locked?'Orders Locked':'Waiting For Opponent'}</h2><p>{detail.locked?'Your choices are saved. The next step opens when both players are ready.':'The other player has the next required action.'}</p></section>;
 const props={ship,detail,send,busy,turn,t};
 if(phase==='jump_formation')return <JumpFormation {...props}/>;
 if(phase==='vortex_closure')return <VortexActions {...props}/>;
 if(phase==='hangar')return <HangarActions {...props}/>;
 if(phase==='movement'&&detail.shuttles?.some(x=>x.id===detail.movingUnitId))return <ShuttleMovement {...props}/>;
 return <section className="panel battle-actions" id="battle-actions"><h2>{detail.phase.label}</h2>
  {phase==='power'&&<Power {...props}/>}{phase==='initiative'&&<><p>Roll this ship’s initiative. The server applies speed and command modifiers and resolves opposing ties.</p><button disabled={busy} onClick={onInitiative}>Roll Initiative</button></>}
  {phase==='ew_commit'&&<EW {...props}/>}{phase==='movement'&&<Movement {...props}/>}
  {phase==='fire_commit'&&<Weapons {...props}/>}{phase==='fire_resolution'&&<Defence {...props}/>}
 </section>;
}
function Power({t,ship,turn,send,busy,detail}){
 const [deactivated,setDeactivated]=useState(()=>t.jump?.maintaining?LIB.weaponMounts.map(x=>x.id).filter(id=>!effectiveCondition(t,turn).destroyedSystems.includes(id)):[]),[purchasedThrust,setThrust]=useState(0),[extraEW,setEW]=useState(0),[shutdown,setShutdown]=useState(false);
 const e=effectiveCondition(t,turn),available=t.jump?.maintaining?0:Math.max(0,4-e.reactorLoss+deactivated.reduce((n,id)=>n+SYSTEM_POWER[id],0));
 const forced=4-e.reactorLoss+deactivated.reduce((n,id)=>n+SYSTEM_POWER[id],0)<0,off=shutdown||forced;
 const maxEW=!t.jump?.maintaining&&e.sensorStrength&&!deactivated.includes('sensors')&&!off?numbers(4).filter(n=>extraEWCost(8,n)<=available).at(-1):0;
 const ew=Math.min(extraEW,maxEW),maxThrust=t.jump?.maintaining||e.commandDisabled||e.engineShort||e.destroyedSystems.includes('engine')||off?0:Math.floor((available-extraEWCost(8,ew))/2),thrust=Math.min(purchasedThrust,maxThrust);
 return <><p><strong>{available}</strong> Power Available · <strong>{off?0:available-thrust*2-extraEWCost(8,ew)}</strong> Remaining</p>
  {e.reactorLoss>0&&<p>Reactor Criticals: −{e.reactorLoss} Power</p>}
  {t.jump?.maintaining&&<p>Maintaining Jump Point: Weapons And Hangar Must Remain Shut Down; All Spare Power Goes To The Jump Engine.</p>}<fieldset><legend>Deactivate Systems To Release Power</legend>{Object.entries(SYSTEM_POWER).filter(([id])=>!e.destroyedSystems.includes(id)&&(id!=='jump_aft_centre'||!detail?.operations||t.condition.damage.tracks.jump_aft_centre.marked>SYSTEMS.get('jump_aft_centre').boxes/2)).map(([id,power])=><label className="check-row" key={id}><input type="checkbox" disabled={t.jump?.maintaining} checked={deactivated.includes(id)} onChange={event=>setDeactivated(old=>event.target.checked?[...old,id]:old.filter(x=>x!==id))}/>{labelSystem(id)} · {power} Power</label>)}</fieldset>
  {t.condition.effects.containmentBreach&&<label className="check-row"><input type="checkbox" checked={shutdown} onChange={e=>setShutdown(e.target.checked)}/>Shut Down Reactor To Avoid Detonation ({t.condition.damage.tracks.reactor.marked}% Risk)</label>}
  {off?<p className="error">Reactor Shutdown: No Powered Systems Or Purchased Thrust This Turn.{forced?' Deactivate more systems to cover the shortage, or commit shutdown.':''}</p>:<><div className="thrust-purchase"><Amount label="Extra Thrust · 2 Power Each" value={thrust} max={maxThrust} onChange={setThrust}/><p><strong>Current Thrust: {e.freeThrust+thrust}</strong><br/>{e.freeThrust} Available + {thrust} Extra</p></div>{maxEW>0&&<Amount label="Extra EW · 9 Power For The First Point" value={ew} max={maxEW} onChange={setEW}/>}</>}
  <button disabled={busy} onClick={()=>send({type:'power',deactivated,purchasedThrust:off?0:thrust,extraEW:off?0:ew,shutdown})}>Commit Power</button>
 </>;
}
function EW({t,ship,turn,detail,send,busy}){
 const e=effectiveCondition(t,turn),available=e.sensorStrength+(e.sensorStrength>0?t.powerAllocation.extraEW:0),attackLimit=e.offensiveLimited?Math.floor(available/2):available;
 const targets=detail.ships.filter(x=>x.owner_id!==ship.owner_id&&!x.withdrawn&&!x.public_state.condition.shipDestroyed).map(x=>({id:x.id,label:x.label}));
 for(const x of detail.shuttles||[])if(x.owner_id!==ship.owner_id&&x.status==='deployed'&&!targets.some(t=>t.id===x.carrierId+'-shuttle-flight'))targets.push({id:x.carrierId+'-shuttle-flight',label:'Shuttle Group · '+detail.ships.find(y=>y.id===x.carrierId)?.label});
 const [defensive,setDefensive]=useState(e.ewLock?.defensive||0),[offensive,setOffensive]=useState(e.ewLock?.offensive||{}),attack=Object.values(offensive).reduce((n,v)=>n+v,0);
 return <><p><strong>{available}</strong> EW Available · {available-defensive-attack} Unallocated</p>{e.ewLock&&<p>Command Damage Fixes Last Turn’s Allocations; Reduce Points Only Where Output Has Fallen.</p>}{e.offensiveLimited&&<p>Command Damage Limits Total Offensive EW To {attackLimit}.</p>}
 <Amount label="Defensive EW" value={defensive} max={available} onChange={setDefensive}/>{targets.map(x=><Amount key={x.id} label={'Offensive EW Against '+x.label} value={offensive[x.id]||0} max={attackLimit} onChange={n=>setOffensive(old=>({...old,[x.id]:n}))}/>)}{targets.some(x=>x.id.endsWith('-shuttle-flight'))&&<p>Each Shuttle Group Shares Its Offensive EW Lock-On (Up To Six Individual Shuttles).</p>}
 <button disabled={busy||defensive+attack>available||attack>attackLimit} onClick={()=>send({type:'ew',defensive,offensive:Object.fromEntries(Object.entries(offensive).filter(([,n])=>n>0))})}>Lock EW Allocation</button></>;
}
function Movement({t,ship,turn,detail,send,busy}){
 const [category,setCategory]=useState('movement');
 const allOptions=movementOptions(ship,turn,detail.game.map_preset),options=allOptions.filter(o=>movementOptionGroup(o)===category),[selected,setSelected]=useState(''),[choice,setChoice]=useState(0),[travel,setTravel]=useState(1);
 const current=options.find(x=>x.name===selected)||options[0],pick=current?.choices[Math.min(choice,current.choices.length-1)],e=effectiveCondition(t,turn),spent=t.movement.engineThrustSpent||0;
 const canTravel=pick&&!['advance','slide','extended-cancel'].includes(pick.action.type),advanceAfter=canTravel?Math.min(travel,pick.remaining):0;
 const state=t.movement.state,turns=allOptions.filter(o=>o.choices[0].action.type==='turn');
 const turningReason=e.commandDisabled||e.powerOff?'Powered Manoeuvres Unavailable':state.rollInProgress?'Halt The Roll Before Turning':state.pivotInProgress?'Halt The Pivot Before Turning':state.extendedTurn?'Resolve The Extended Turn First':state.pivotActive&&turnIntoPivotDirection(state)===null?'A Turn Into Pivot Requires A Halted 60° Pivot':state.turnDelayRemaining>0?`Move ${state.turnDelayRemaining} More ${state.turnDelayRemaining===1?'Hex':'Hexes'} To Satisfy Turn Delay`:'Insufficient Thrust Or Working Thruster Capacity';
 let destination=pick?.position,destinationTravel=null;try{if(pick){const result=commitMovement({ship,turn,action:pick.action,advanceAfter,mapPreset:detail.game.map_preset});destination=result.nextShip;destinationTravel=destination.speed===0?null:movementHeading(result.nextPrivateState.trial.movement.state);}}catch{}
 return <><p>Speed <strong>{ship.speed}</strong> · {t.movement.state.remaining} Hexes Remaining · Thrust <strong>{spent}/{e.freeThrust+t.powerAllocation.purchasedThrust}</strong> · Turn Delay {t.movement.state.turnDelayRemaining}</p>
  <p>Speed Sets This Turn’s Total Travel. Normal Movement Uses Remaining Hexes; Extra Thrust Is For Manoeuvres.</p>
  <p>Facing: {facingLabel(t.movement.state.facing)} · Travel Direction: {ship.public_state.travelFacing===null?'Stationary':facingLabel(ship.public_state.travelFacing)}</p>
  {!t.movement.state.started?<p>Change Speed First If Desired. Starting Travel Or A Manoeuvre Keeps Your Current Speed And Closes Acceleration For This Turn. A Pivot May Begin Before Travel; Choose 0 Travel To Stay In This Hex.</p>:<p>Speed Is Fixed For This Turn. The Options Below Are Validated Against Your Remaining Movement, Thrust And Manoeuvres.</p>}
  {e.commandDisabled&&<p>Command Systems Disabled: Inertial Movement Only</p>}
  <p>Turning: {turns.length?(state.pivotActive?'Turn Into Pivot Is Available':'Available Under Manoeuvre'):turningReason}</p>
  {turns.length>0&&<button className="secondary" onClick={()=>{setCategory('manoeuvre');setSelected(turns[0].name);setChoice(0);}}>Choose Turn</button>}
  <label>Movement Type<select value={category} onChange={e=>{setCategory(e.target.value);setSelected('');setChoice(0);}}><option value="movement">Movement</option><option value="manoeuvre">Manoeuvre</option></select></label>
  {current?<><label>{category==='movement'?'Movement Action':'Legal Manoeuvre'}<select value={current.name} onChange={e=>{setSelected(e.target.value);setChoice(0);}}>{options.map(o=><option key={o.name} value={o.name}>{o.name}</option>)}</select></label>
   {current.choices.length>1&&<label>Thruster Distribution<select value={Math.min(choice,current.choices.length-1)} onChange={e=>setChoice(Number(e.target.value))}>{current.choices.map((c,i)=><option key={i} value={i}>{Object.entries(c.action.thrusters||{}).map(([id,n])=>labelSystem(id)+' '+n).join(', ')}{c.overthrust.length?' · Overthrust Risk':''}</option>)}</select></label>}
   {canTravel&&pick.remaining>0&&<Amount label="Travel After This Action · Hexes" value={advanceAfter} max={pick.remaining} onChange={setTravel}/>}
   <p>{pick.cost} Engine Thrust · Destination ({destination.q}, {destination.r}) · Speed {destination.speed}<br/>Facing: {facingLabel(destination.facing)} · Travel Direction: {destinationTravel===null?'Stationary':facingLabel(destinationTravel)}</p>
   {!!pick.overthrust.length&&<p className="error">End-Of-Turn Critical Checks: {pick.overthrust.map(x=>labelSystem(x.id)+' +'+x.excess+' Overthrust').join(', ')}</p>}
   <button disabled={busy} onClick={()=>send({type:'move',action:pick.action,advanceAfter})}>{pick.action.type==='advance'?'Move Selected Segment':'Commit Thrust And Move'}</button>
  </>:<p>{category==='movement'?(t.movement.state.remaining>0?'Resolve The Carried Extended Turn Under Manoeuvre Before Normal Travel.':`No normal movement remains at speed ${ship.speed}. Choose Manoeuvre to use remaining thrust, or finish movement.`):'No legal manoeuvre is currently available.'}</p>}
  {detail.entryPoints?.map(p=><button key={p.id} disabled={busy} onClick={()=>send({type:'enter-jump',pointId:p.id})}>Enter {p.label}</button>)}
  <button disabled={busy||t.movement.state.remaining!==0} className="secondary" onClick={()=>send({type:'movement-done'})}>Finish Movement</button>
 </>;
}
function Weapons({ship,t,turn,detail,send,busy}){
 const enemies=[...detail.ships,...(detail.shuttles||[]).filter(x=>x.status==='deployed')].filter(s=>s.owner_id!==ship.owner_id&&!s.withdrawn&&!s.public_state.condition.shipDestroyed),[targetId,setTargetId]=useState(''),target=enemies.find(x=>x.id===targetId)||enemies[0];
 const [shots,setShots]=useState([]),[charge,setCharge]=useState(3),e=effectiveCondition(t,turn);
 const options=[1,2,3].filter(n=>weaponReadiness({trial:t,mountId:'plasma_forward',turn,chargeTurns:n}).ready),chosen=options.includes(charge)?charge:options.at(-1);
 const modify=(mountId,gun,role,enemyId=target?.id)=>setShots(old=>{const others=old.filter(s=>s.mountId!==mountId||s.gun!==gun);return role==='unused'?others:[...others,{shipId:ship.id,mountId,gun,role,...(role==='offensive'?{targetId:enemyId,order:others.length+1,...(mountId==='plasma_forward'?{chargeTurns:chosen}:{})}:{})}];});
 const reorder=(i,d)=>setShots(old=>{const next=[...old];[next[i],next[i+d]]=[next[i+d],next[i]];return next;});
 return <>{(detail.shuttles||[]).filter(x=>x.owner_id===ship.owner_id&&x.status==='deployed'&&x.movement?.spent<=1).map(x=><div key={x.id}><p>{x.label} · Optional Combat Pivot · 3 Thrust Per 60°</p>{[-1,1].map(direction=><button key={direction} className="secondary" disabled={busy} onClick={()=>send({type:'shuttle-combat-pivot',unitId:x.id,direction})}>{direction<0?'Port':'Starboard'} Combat Pivot</button>)}</div>)}{enemies.length>1&&<label>Target For Range And To-Hit Preview<select value={target?.id} onChange={e=>setTargetId(e.target.value)}>{enemies.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>}<p>Target: <strong>{target?.label||'No Surviving Target'}</strong>. Choose each gun’s job, then lock your orders. Fire is revealed together.</p>
  {LIB.weaponMounts.map(m=>{
   const w=LIB.weapons.find(x=>x.id===m.weaponId),weaponEffect=e.weapons[m.id]||{};
   let preview;try{preview=vorchanTargetingPreview({shooter:{...ship,libraryId:LIB.id,hullClass:LIB.class},target:{...target,libraryId:target.public_state.libraryId,hullClass:target.kind==='shuttle'?'shuttle':LIB.class},mountId:m.id,rangePenaltyAdjustment:weaponEffect.rangeLoss||0,attackerOffensiveEW:t.ewAllocation?.offensive?.[target?.kind==='shuttle'?target.carrierId+'-shuttle-flight':target?.id]||0,targetDefensiveEW:target?.public_state.ew?.defensive||0,otherModifiers:e.fireModifier?[{value:e.fireModifier,reason:'Condition',verified:true}]:[]});}catch{}
   const arc=target&&checkMountArc({shooter:ship,target,arc:m.arc}).allowed;
   return <article className="weapon-datacard" key={m.id}><h3>{w.name} · Mount {m.mountNumber}</h3>{m.weaponId==='twin-array'&&<p>Two Independent Guns · Separate Attack And Location Rolls</p>}
    <p>{preview?.distance??'—'} Hexes · {m.arc.coverageDegrees}° Arc · {arc?'Target In Arc':'Target Outside Arc'}{preview?.readyForHitRoll?' · Hit On '+preview.hitOnD20AtOrBelow+' Or Less':''}</p>
    <p>Standard Damage · One Hit Location{w.class==='Plasma'?' · Half Armour':''}</p>
    <p>{m.weaponId==='plasma-accelerator'&&chosen?w.firingOptions.find(o=>o.turns===chosen).damageDice.count+'d10 + '+w.firingOptions.find(o=>o.turns===chosen).damageDice.bonus+' − Range':w.damage}{weaponEffect.damageLoss?' · −'+weaponEffect.damageLoss+' Per Die (Minimum 1)':''}</p>
    {m.weaponId==='plasma-accelerator'&&options.length>0&&<><p>Available Charge: {options.at(-1)||0}/3 · {t.weaponReadiness.plasma_forward[1].lastActivatedTurn>t.weaponReadiness.plasma_forward[1].lastFiredTurn&&t.weaponReadiness.plasma_forward[1].lastActivatedTurn>0?'Reactivated Turn '+t.weaponReadiness.plasma_forward[1].lastActivatedTurn:t.weaponReadiness.plasma_forward[1].lastFiredTurn>0?'Last Fired Turn '+t.weaponReadiness.plasma_forward[1].lastFiredTurn:'Starts Fully Charged'}</p><label>Firing Strength<select value={chosen} onChange={event=>{const n=Number(event.target.value);setCharge(n);setShots(old=>old.map(x=>x.mountId===m.id?{...x,chargeTurns:n}:x));}}>{options.map(n=><option key={n} value={n}>{n}-Turn Charge</option>)}</select></label><p>Firing Resets Charge · Next Turn: 1 · Skip One Turn: 2 · Skip Two Turns: 3</p></>}
    {Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>{const gun=i+1,r=weaponReadiness({trial:t,mountId:m.id,turn,gun,chargeTurns:m.id==='plasma_forward'?chosen:null}),selected=shots.find(x=>x.mountId===m.id&&x.gun===gun);return <label key={gun}>Gun {gun}{!r.ready?' · '+r.reasons.join(', '):''}<select disabled={!r.ready||!target} value={selected?.role==='offensive'?'attack:'+selected.targetId:selected?.role||'unused'} onChange={event=>{const [role,id]=event.target.value.split(':');modify(m.id,gun,role==='attack'?'offensive':role,id);}}><option value="unused">Hold Fire</option>{enemies.filter(enemy=>checkMountArc({shooter:ship,target:enemy,arc:m.arc}).allowed).map(enemy=><option key={enemy.id} value={'attack:'+enemy.id}>Fire At {enemy.label}</option>)}{w.intercept&&arc&&<option value="defensive">Reserve For Interception</option>}</select></label>;})}
   </article>;
  })}
  {shots.length>0&&<div><h3>Resolution Order</h3>{shots.map((x,i)=><div key={x.mountId+':'+x.gun} className="order-line"><span>{labelSystem(x.mountId)} · Gun {x.gun} · {x.role==='offensive'?'Attack':'Defensive Reserve'}</span><button className="secondary" disabled={!i} onClick={()=>reorder(i,-1)}>Earlier</button><button className="secondary" disabled={i===shots.length-1} onClick={()=>reorder(i,1)}>Later</button></div>)}</div>}
  <button disabled={busy} onClick={()=>send({type:'fire',fire:{shots:shots.map((s,i)=>({...s,...(s.role==='offensive'?{order:i+1}:{})}))}})}>{shots.length?'Lock Weapon Orders':'Hold All Fire'}</button>
 </>;
}
function Defence({ship,detail,send,busy}){
 const [assignments,setAssignments]=useState({}),[directions,setDirections]=useState({});
 const declarations=detail.declarations||[],incoming=declarations.flatMap(d=>d.fire.shots.filter(s=>s.role==='offensive'&&[...detail.ships,...(detail.shuttles||[])].some(x=>x.id===s.targetId&&x.owner_id===ship.owner_id))),reserves=declarations.find(d=>d.playerId===ship.owner_id)?.fire.shots.filter(s=>s.role==='defensive')||[];
 const id=s=>s.shipId+':'+s.mountId+':'+s.gun;
 if(detail.pending.length){const p=detail.pending[0];return <><p>Allocate the confirmed hit to an eligible {p.type==='system'?'system':'hull section'}. The engine applies armour and damage.</p>{p.choices.map(value=><button key={value} disabled={busy} onClick={()=>send({type:'damage-choice',attackId:p.attackId,value})}>{labelSystem(value)}</button>)}</>;}
 const boundaries=new Map();for(const shot of incoming){const shooter=detail.ships.find(x=>x.id===shot.shipId);const target=[...detail.ships,...(detail.shuttles||[])].find(x=>x.id===shot.targetId),f=facingDirections(shooter,target,{sameHexPrevious:shooter.sameHexPrevious?.[target.id]});if(f.requiresChoice)boundaries.set(shooter.id+':'+target.id,{...f,shooter,target});}
 return <><p>{incoming.length} Incoming Attack{incoming.length===1?'':'s'} · {reserves.length} Reserved Gun{reserves.length===1?'':'s'}</p>
  {reserves.map(r=><label key={id(r)}>{labelSystem(r.mountId)} · Gun {r.gun}<select value={assignments[id(r)]||''} onChange={e=>setAssignments(old=>({...old,[id(r)]:e.target.value}))}><option value="">Do Not Intercept</option>{incoming.filter(a=>a.targetId===ship.id).map(a=><option key={id(a)} value={id(a)}>{labelSystem(a.mountId)} · Gun {a.gun}</option>)}</select></label>)}
  {[...boundaries].map(([key,f])=><label key={key}>Incoming Aspect On {f.target.label} From {f.shooter.label}<select value={directions[key]||''} onChange={e=>setDirections(old=>({...old,[key]:e.target.value}))}><option value="">Choose Boundary Aspect</option>{f.choices.map(c=><option key={c} value={c}>{labelSystem(c)}</option>)}</select></label>)}
  <p>After both players lock, the server rolls all attacks. Damage, criticals and the next turn follow automatically; the game pauses only for a required defender choice.</p>
  <button disabled={busy||[...boundaries.keys()].some(k=>!directions[k])} onClick={()=>send({type:'defence',directions,assignments:reserves.filter(r=>assignments[id(r)]).map(r=>({shipId:r.shipId,mountId:r.mountId,gun:r.gun,attackId:assignments[id(r)]}))})}>Lock Defence And Resolve Fire</button>
 </>;
}
