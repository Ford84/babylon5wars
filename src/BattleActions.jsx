import {fighterTargeting} from '../shared/fighter-targeting.mjs';
import {guardianCanProtect,guardianPowerMode} from '../shared/guardian-array.mjs';
import {EWActions,ElintDisruption} from './ElintActions.jsx';
import {elintAttackEffects} from '../shared/elint.mjs';
import {hullProfile} from '../shared/vorchar.mjs';
import {JumpFormation,VortexActions,HangarActions,ShuttleMovement} from './OperationsActions.jsx';
import {movementHeading,turnIntoPivotDirection} from '../shared/movement-rules.mjs';
import CriticalActions from './CriticalActions.jsx';
import {facingLabel} from '../shared/ship-facing.mjs';
import React,{useState} from 'react';
import {SYSTEMS,systemPowerForHull,effectiveCondition,labelSystem} from '../shared/ship-condition.mjs';
import {extraEWCost} from '../shared/preturn.mjs';
import {commitMovement} from '../shared/movement-commit.mjs';
import GuidedCombat from './GuidedCombat.jsx';
import {movementOptions,movementOptionGroup} from '../shared/movement-options.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {vorchanTargetingPreview,facingDirections,checkMountArc} from '../shared/weapon-targeting.mjs';
const numbers=(max)=>Array.from({length:Math.max(0,Math.floor(max))+1},(_,i)=>i);
function Amount({label,value,max,onChange}){return <label>{label}<select value={value} onChange={e=>onChange(Number(e.target.value))}>{numbers(max).map(n=><option key={n} value={n}>{n}</option>)}</select></label>;}
export default function BattleActions(props){
 const {detail,userId,send}=props,[chosen,setChosen]=useState('');
 if(detail.carrierEscape)return <CarrierEscape key={detail.carrierEscape.carrierId} options={detail.carrierEscape} userId={userId} send={send} busy={props.busy}/>;
 if(detail.game.phase_id==='fighter_orders')return <FighterOrders key={detail.game.turn} {...props}/>;
 if(detail.game.phase_id==='fighter_damage')return <FighterDamage {...props}/>;
 const own=detail.ships.filter(x=>x.owner_id===userId&&!x.withdrawn&&!x.public_state.condition.shipDestroyed),movement=detail.game.phase_id==='movement',selected=movement?own.find(x=>x.id===detail.movingUnitId):own.find(x=>x.id===chosen&&!detail.unitPhaseLocks?.[x.id])||own.find(x=>!detail.unitPhaseLocks?.[x.id])||own[0];
 return <>{!movement&&own.length>1&&detail.needsAction&&!detail.resolution&&!detail.criticalResolution&&!['initiative','ew_disruption'].includes(detail.game.phase_id)&&<label>Acting Ship<select value={selected?.id} onChange={e=>setChosen(e.target.value)}>{own.filter(x=>!detail.unitPhaseLocks?.[x.id]).map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>}<UnitBattleActions key={selected?.id+':'+detail.game.phase_id} {...props} activeShipId={selected?.id} send={c=>send({...c,shipId:selected?.id})}/></>;
}
function UnitBattleActions({detail,userId,send,busy,onInitiative,onAttackRevealed,activeShipId}){
 const ship=detail.ships.find(x=>x.id===activeShipId)||detail.ships.find(x=>x.owner_id===userId),t=ship?.private_state?.trial;
 if(!t||!detail.automated||detail.game.status!=='active')return null;
 const phase=detail.game.phase_id,turn=detail.game.turn;
 if(phase==='ew_disruption')return <ElintDisruption key={detail.elintDisruption?.scoutId+':'+detail.elintDisruption?.targetId} detail={detail} userId={userId} send={send} busy={busy}/>;
 if(phase==='critical_resolution'&&detail.criticalResolution)return <CriticalActions detail={detail} userId={userId} send={send} busy={busy}/>;
 if(phase==='fire_resolution'&&detail.resolution)return <GuidedCombat detail={detail} userId={userId} send={send} busy={busy} onAttackRevealed={onAttackRevealed}/>;
 if(!detail.needsAction)return <section className="panel"><h2>{detail.locked?'Orders Locked':'Waiting For Opponent'}</h2><p>{detail.locked?'Your choices are saved. The next step opens when both players are ready.':'The other player has the next required action.'}</p></section>;
 const props={ship,detail,send,busy,turn,t};
 if(phase==='jump_formation')return <JumpFormation {...props}/>;
 if(phase==='vortex_closure')return <VortexActions {...props}/>;
 if(phase==='hangar')return <HangarActions {...props}/>;
 if(phase==='movement'&&[...(detail.shuttles||[]),...(detail.fighterFlights||[])].some(x=>x.id===detail.movingUnitId))return <ShuttleMovement {...props}/>;
 return <section className="panel battle-actions" id="battle-actions"><h2>{detail.phase.label}</h2>
  {phase==='power'&&<Power {...props}/>}{phase==='initiative'&&<><p>Roll this ship’s initiative. The server applies speed and command modifiers and resolves opposing ties.</p><button disabled={busy} onClick={onInitiative}>Roll Initiative</button></>}
  {phase==='ew_commit'&&<EWActions {...props}/>}{phase==='movement'&&<Movement {...props}/>}
  {phase==='fire_commit'&&<Weapons {...props}/>}{phase==='fire_resolution'&&<Defence {...props}/>}
 </section>;
}
function Power({t,ship,turn,send,busy,detail}){
 const hull=hullProfile(t.libraryId)||LIB,systemPower=systemPowerForHull(hull.id);
 const [deactivated,setDeactivated]=useState(()=>t.jump?.maintaining?hull.weaponMounts.map(x=>x.id).filter(id=>!effectiveCondition(t,turn).destroyedSystems.includes(id)):[]),[purchasedThrust,setThrust]=useState(0),[extraEW,setEW]=useState(0),[shutdown,setShutdown]=useState(false);
 const [guardianMode,setGuardianMode]=useState(t.guardianMode?.pendingMode||t.guardianMode?.mode||'defensive');
 const hasGuardian=hull.weaponMounts.some(m=>m.weaponId==='guardian-array')&&!effectiveCondition(t,turn).destroyedSystems.includes('guardian'),mode=hasGuardian?guardianPowerMode(t,turn,guardianMode):null,inactive=[...new Set([...deactivated,...(mode?.mode==='switching'?['guardian']:[])])];
 const e=effectiveCondition(t,turn),available=t.jump?.maintaining?0:Math.max(0,hull.extraPower-e.reactorLoss+inactive.reduce((n,id)=>n+systemPower[id],0));
 const forced=hull.extraPower-e.reactorLoss+inactive.reduce((n,id)=>n+systemPower[id],0)<0,off=shutdown||forced;
 const maxEW=!t.jump?.maintaining&&e.sensorStrength&&!inactive.includes('sensors')&&!off?numbers(4).filter(n=>extraEWCost(hull.sensorStrength,n)<=available).at(-1):0;
 const ew=Math.min(extraEW,maxEW),maxThrust=t.jump?.maintaining||e.commandDisabled||e.engineShort||e.destroyedSystems.includes('engine')||off?0:Math.floor((available-extraEWCost(hull.sensorStrength,ew))/2),thrust=Math.min(purchasedThrust,maxThrust);
 return <>{hasGuardian&&<><label>Guardian Array Mode<select value={guardianMode} onChange={e=>setGuardianMode(e.target.value)}><option value="defensive">Defensive · Intercept For This Ship Or Eligible Friendlies</option><option value="offensive">Offensive · Fighters And Shuttles Only</option></select></label><p>{turn===1?'Starting Mode Is Available Immediately':'Changing Mode Deactivates The Array For One Full Turn'}{mode?.mode==='switching'?' · Ready Turn '+mode.readyTurn:''}</p></>}<p><strong>{available}</strong> Power Available · <strong>{off?0:available-thrust*2-extraEWCost(hull.sensorStrength,ew)}</strong> Remaining</p>
  {e.reactorLoss>0&&<p>Reactor Criticals: −{e.reactorLoss} Power</p>}
  {t.jump?.maintaining&&<p>Maintaining Jump Point: Weapons And Hangar Must Remain Shut Down; All Spare Power Goes To The Jump Engine.</p>}<fieldset><legend>Deactivate Systems To Release Power</legend>{Object.entries(systemPower).filter(([id])=>!e.destroyedSystems.includes(id)&&(id!=='jump_aft_centre'||!detail?.operations||t.condition.damage.tracks.jump_aft_centre.marked>hull.scs.systems.find(x=>x.id==='jump_aft_centre').boxes/2)).map(([id,power])=><label className="check-row" key={id}><input type="checkbox" disabled={t.jump?.maintaining||id==='guardian'&&mode?.mode==='switching'} checked={inactive.includes(id)} onChange={event=>setDeactivated(old=>event.target.checked?[...old,id]:old.filter(x=>x!==id))}/>{labelSystem(id)} · {power} Power</label>)}</fieldset>
  {t.condition.effects.containmentBreach&&<label className="check-row"><input type="checkbox" checked={shutdown} onChange={e=>setShutdown(e.target.checked)}/>Shut Down Reactor To Avoid Detonation ({t.condition.damage.tracks.reactor.marked}% Risk)</label>}
  {off?<p className="error">Reactor Shutdown: No Powered Systems Or Purchased Thrust This Turn.{forced?' Deactivate more systems to cover the shortage, or commit shutdown.':''}</p>:<><div className="thrust-purchase"><Amount label="Extra Thrust · 2 Power Each" value={thrust} max={maxThrust} onChange={setThrust}/><p><strong>Current Thrust: {e.freeThrust+thrust}</strong><br/>{e.freeThrust} Available + {thrust} Extra</p></div>{maxEW>0&&<Amount label={'Extra EW · '+(hull.sensorStrength+1)+' Power For The First Point'} value={ew} max={maxEW} onChange={setEW}/>}</>}
  <button disabled={busy} onClick={()=>send({type:'power',deactivated:inactive,...(hasGuardian?{guardianMode}:{}),purchasedThrust:off?0:thrust,extraEW:off?0:ew,shutdown})}>Commit Power</button>
 </>;
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
 const hull=hullProfile(t.libraryId)||LIB;
 const enemies=[...detail.ships,...(detail.shuttles||[]).filter(x=>x.status==='deployed')].filter(s=>s.owner_id!==ship.owner_id&&!s.withdrawn&&!s.public_state.condition.shipDestroyed),[targetId,setTargetId]=useState(''),target=enemies.find(x=>x.id===targetId)||enemies[0];
 const [shots,setShots]=useState([]),[charge,setCharge]=useState(3),[modes,setModes]=useState({}),e=effectiveCondition(t,turn);
 const options=(hull.weaponMounts.some(x=>x.id==='plasma_forward')?[1,2,3]:[]).filter(n=>weaponReadiness({trial:t,mountId:'plasma_forward',turn,chargeTurns:n}).ready),chosen=options.includes(charge)?charge:options.at(-1);
 const modify=(mountId,gun,role,enemyId=target?.id)=>setShots(old=>{const others=old.filter(s=>s.mountId!==mountId||s.gun!==gun);return role==='unused'?others:[...others,{shipId:ship.id,mountId,gun,role,...(role==='offensive'?{targetId:enemyId,mode:modes[mountId]||hull.weapons.find(w=>w.id===hull.weaponMounts.find(m=>m.id===mountId).weaponId).modes[0],order:others.length+1,...(mountId==='plasma_forward'?{chargeTurns:chosen}:{})}:{})}];});
 const reorder=(i,d)=>setShots(old=>{const next=[...old];[next[i],next[i+d]]=[next[i+d],next[i]];return next;});
 return <>{(detail.shuttles||[]).filter(x=>x.owner_id===ship.owner_id&&x.status==='deployed'&&x.movement?.spent+3<=(x.stats?.thrust??4)).map(x=><div key={x.id}><p>{x.label} · Optional Combat Pivot · 3 Thrust Per 60°</p>{[-1,1].map(direction=><button key={direction} className="secondary" disabled={busy} onClick={()=>send({type:'shuttle-combat-pivot',unitId:x.id,direction})}>{direction<0?'Port':'Starboard'} Combat Pivot</button>)}</div>)}{enemies.length>1&&<label>Target For Range And To-Hit Preview<select value={target?.id} onChange={e=>setTargetId(e.target.value)}>{enemies.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>}<p>Target: <strong>{target?.label||'No Surviving Target'}</strong>. Choose each gun’s job, then lock your orders. Fire is revealed together.</p>
  {hull.weaponMounts.map(m=>{
   const w=hull.weapons.find(x=>x.id===m.weaponId),weaponEffect=e.weapons[m.id]||{};
   let preview;try{preview=vorchanTargetingPreview({shooter:{...ship,libraryId:hull.id,hullClass:hull.class},target:{...target,libraryId:target.public_state.libraryId,hullClass:target.kind==='shuttle'?'shuttle':hullProfile(target.public_state.libraryId)?.class},mountId:m.id,mode:modes[m.id]||w.modes[0],rangePenaltyAdjustment:weaponEffect.rangeLoss||0,attackerOffensiveEW:t.ewAllocation?.offensive?.[target?.kind==='shuttle'?target.carrierId+'-shuttle-flight':target?.id]||0,targetDefensiveEW:target?.public_state.ew?.defensive||0,otherModifiers:e.fireModifier?[{value:e.fireModifier,reason:'Condition',verified:true}]:[]});const elint=elintAttackEffects({shooter:ship,target,units:[...detail.ships,...(detail.shuttles||[]).filter(x=>x.status==='deployed')],initial:detail.elintContext?.initial||detail.ships,disruptions:detail.elintContext?.disruptions||[],baseDefence:preview.breakdown.baseDefence??0});preview=vorchanTargetingPreview({shooter:{...ship,libraryId:hull.id,hullClass:hull.class},target:{...target,libraryId:target.public_state.libraryId,hullClass:target.kind==='shuttle'?'shuttle':hullProfile(target.public_state.libraryId)?.class},mountId:m.id,mode:modes[m.id]||w.modes[0],rangePenaltyAdjustment:weaponEffect.rangeLoss||0,attackerOffensiveEW:elint.ownOffensive,targetDefensiveEW:target.public_state.ew?.defensive||0,elintOffensive:elint.offensive,elintDefensive:elint.defensive,disruptedEW:elint.disrupted,otherModifiers:e.fireModifier?[{value:e.fireModifier,reason:'Condition',verified:true}]:[]});}catch{}
   const arc=target&&checkMountArc({shooter:ship,target,arc:m.arc}).allowed;
   return <article className="weapon-datacard" key={m.id}><h3>{w.name} · Mount {m.mountNumber}</h3>{m.weaponId==='twin-array'&&<p>Two Independent Guns · Separate Attack And Location Rolls</p>}
    <p>{preview?.distance??'—'} Hexes · {m.arc.coverageDegrees}° Arc · {arc?'Target In Arc':'Target Outside Arc'}{preview?.readyForHitRoll?' · Hit On '+preview.hitOnD20AtOrBelow+' Or Less':''}</p>
    {preview&&(preview.breakdown.elintOffensive>0||preview.breakdown.elintDefensive>0||preview.breakdown.disruptedEW>0)&&<p>ELINT: +{preview.breakdown.elintOffensive} OEW · −{preview.breakdown.elintDefensive} DEW · {preview.breakdown.disruptedEW} Own OEW Disrupted</p>}
    {w.modes.length>1&&<label>Firing Mode<select value={modes[m.id]||w.modes[0]} onChange={ev=>{const mode=ev.target.value;setModes(old=>({...old,[m.id]:mode}));setShots(old=>old.map(x=>x.mountId===m.id?{...x,mode}:x));}}>{w.modes.map(mode=><option key={mode}>{mode}</option>)}</select></label>}
    {w.id==='battle-laser'&&<p>Raking: 10-Point Groups, Armour Once Per System. Piercing: At Least 4 Effective OEW, −4 To Hit, Separate Sections, No Overkill. Lasers Cannot Be Intercepted.</p>}
    {preview?.blockers?.map(reason=><p key={reason}>{reason}</p>)}
    <p>{modes[m.id]||w.modes[0]} Damage · {w.id==='plasma-stream'?'Separate Locations Per 5 Points · Permanent Armour Erosion':w.class==='Matter'?'Ignores Armour · Excess Damage Lost':w.id==='battle-laser'?'Roll Damage Once, Then Resolve Each Section Or Group':'One Hit Location'}{w.class==='Plasma'?' · Half Armour':''}</p>{w.armingTurns>1&&<p>Fires Every {w.armingTurns} Turns · {t.weaponReadiness[m.id][1].lastFiredTurn>0?'Last Fired Turn '+t.weaponReadiness[m.id][1].lastFiredTurn:'Starts Fully Armed'}</p>}{w.id==='guardian-array'&&<p>Current Mode: {t.guardianMode?.mode||'defensive'} · No Passive Defence Bonus</p>}
    <p>{m.weaponId==='plasma-accelerator'&&chosen?w.firingOptions.find(o=>o.turns===chosen).damageDice.count+'d10 + '+w.firingOptions.find(o=>o.turns===chosen).damageDice.bonus+' − Range':w.damage}{weaponEffect.damageLoss?' · −'+weaponEffect.damageLoss+' Per Die (Minimum 1)':''}</p>
    {m.weaponId==='plasma-accelerator'&&options.length>0&&<><p>Available Charge: {options.at(-1)||0}/3 · {t.weaponReadiness.plasma_forward[1].lastActivatedTurn>t.weaponReadiness.plasma_forward[1].lastFiredTurn&&t.weaponReadiness.plasma_forward[1].lastActivatedTurn>0?'Reactivated Turn '+t.weaponReadiness.plasma_forward[1].lastActivatedTurn:t.weaponReadiness.plasma_forward[1].lastFiredTurn>0?'Last Fired Turn '+t.weaponReadiness.plasma_forward[1].lastFiredTurn:'Starts Fully Charged'}</p><label>Firing Strength<select value={chosen} onChange={event=>{const n=Number(event.target.value);setCharge(n);setShots(old=>old.map(x=>x.mountId===m.id?{...x,chargeTurns:n}:x));}}>{options.map(n=><option key={n} value={n}>{n}-Turn Charge</option>)}</select></label><p>Firing Resets Charge · Next Turn: 1 · Skip One Turn: 2 · Skip Two Turns: 3</p></>}
    {Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>{const gun=i+1,r=weaponReadiness({trial:t,mountId:m.id,turn,gun,chargeTurns:m.id==='plasma_forward'?chosen:null}),selected=shots.find(x=>x.mountId===m.id&&x.gun===gun);return <label key={gun}>Gun {gun}{!r.ready?' · '+r.reasons.join(', '):''}<select disabled={!r.ready||!target} value={selected?.role==='offensive'?'attack:'+selected.targetId:selected?.role||'unused'} onChange={event=>{const [role,id]=event.target.value.split(':');modify(m.id,gun,role==='attack'?'offensive':role,id);}}><option value="unused">Hold Fire</option>{enemies.filter(enemy=>((modes[m.id]||w.modes[0])!=='Piercing'||enemy.kind!=='shuttle'&&(()=>{const ew=elintAttackEffects({shooter:ship,target:enemy,units:detail.ships,initial:detail.elintContext?.initial||detail.ships,disruptions:detail.elintContext?.disruptions||[],baseDefence:0});return ew.ownOffensive+ew.offensive>=4;})())&&(w.id!=='guardian-array'||enemy.kind==='shuttle'&&t.guardianMode?.mode==='offensive')&&checkMountArc({shooter:ship,target:enemy,arc:m.arc}).allowed).map(enemy=><option key={enemy.id} value={'attack:'+enemy.id}>Fire At {enemy.label}</option>)}{w.intercept&&arc&&(w.id!=='guardian-array'||t.guardianMode?.mode==='defensive')&&<option value="defensive">Reserve For Interception</option>}</select></label>;})}
   </article>;
  })}
  {shots.length>0&&<div><h3>Resolution Order</h3>{shots.map((x,i)=><div key={x.mountId+':'+x.gun} className="order-line"><span>{labelSystem(x.mountId)} · Gun {x.gun} · {x.role==='offensive'?'Attack':'Defensive Reserve'}</span><button className="secondary" disabled={!i} onClick={()=>reorder(i,-1)}>Earlier</button><button className="secondary" disabled={i===shots.length-1} onClick={()=>reorder(i,1)}>Later</button></div>)}</div>}
  <button disabled={busy} onClick={()=>send({type:'fire',fire:{shots:shots.map((s,i)=>({...s,...(s.role==='offensive'?{order:i+1}:{})}))}})}>{shots.length?'Lock Weapon Orders':'Hold All Fire'}</button>
 </>;
}
function Defence({ship,detail,send,busy}){
 const [assignments,setAssignments]=useState({}),[directions,setDirections]=useState({});
 const declarations=detail.declarations||[],incoming=declarations.flatMap(d=>d.fire.shots.filter(s=>s.role==='offensive'&&[...detail.ships,...(detail.shuttles||[])].some(x=>x.id===s.targetId&&x.owner_id===ship.owner_id))),reserves=declarations.filter(d=>d.playerId===ship.owner_id).flatMap(d=>d.fire.shots.filter(s=>s.role==='defensive'));
 const id=s=>s.shipId+':'+s.mountId+':'+s.gun;
 if(detail.pending.length){const p=detail.pending[0];return <><p>Allocate the confirmed hit to an eligible {p.type==='system'?'system':'hull section'}. The engine applies armour and damage.</p>{p.choices.map(value=><button key={value} disabled={busy} onClick={()=>send({type:'damage-choice',attackId:p.attackId,value})}>{labelSystem(value)}</button>)}</>;}
 const boundaries=new Map();for(const shot of incoming){const shooter=detail.ships.find(x=>x.id===shot.shipId);const target=[...detail.ships,...(detail.shuttles||[])].find(x=>x.id===shot.targetId),f=facingDirections(shooter,target,{sameHexPrevious:shooter.sameHexPrevious?.[target.id]});if(f.requiresChoice)boundaries.set(shooter.id+':'+target.id,{...f,shooter,target});}
 return <><p>{incoming.length} Incoming Attack{incoming.length===1?'':'s'} · {reserves.length} Reserved Gun{reserves.length===1?'':'s'}</p>
  {reserves.map(r=><label key={id(r)}>{labelSystem(r.mountId)} · Gun {r.gun}<select value={assignments[id(r)]||''} onChange={e=>setAssignments(old=>({...old,[id(r)]:e.target.value}))}><option value="">Do Not Intercept</option>{incoming.filter(a=>{const defender=detail.ships.find(x=>x.id===r.shipId),mount=hullProfile(defender.public_state.libraryId).weaponMounts.find(m=>m.id===r.mountId);const h=hullProfile(detail.ships.find(x=>x.id===a.shipId)?.public_state.libraryId);if(h?.weapons.find(w=>w.id===h.weaponMounts.find(m=>m.id===a.mountId)?.weaponId)?.class==='Laser')return false;return guardianCanProtect({defender,source:detail.ships.find(x=>x.id===a.shipId),target:[...detail.ships,...(detail.shuttles||[])].find(x=>x.id===a.targetId),mount,direction:directions[a.shipId+':'+a.targetId]});}).map(a=><option key={id(a)} value={id(a)}>{detail.ships.find(x=>x.id===a.targetId)?.label||'Shuttle'} ← {labelSystem(a.mountId)} · Gun {a.gun}</option>)}</select></label>)}
  {[...boundaries].map(([key,f])=><label key={key}>Incoming Aspect On {f.target.label} From {f.shooter.label}<select value={directions[key]||''} onChange={e=>setDirections(old=>({...old,[key]:e.target.value}))}><option value="">Choose Boundary Aspect</option>{f.choices.map(c=><option key={c} value={c}>{labelSystem(c)}</option>)}</select></label>)}
  <p>After both players lock, the server rolls all attacks. Damage, criticals and the next turn follow automatically; the game pauses only for a required defender choice.</p>
  <button disabled={busy||[...boundaries.keys()].some(k=>!directions[k])} onClick={()=>send({type:'defence',directions,assignments:reserves.filter(r=>assignments[id(r)]).map(r=>({shipId:r.shipId,mountId:r.mountId,gun:r.gun,attackId:assignments[id(r)]}))})}>Lock Defence And Resolve Fire</button>
 </>;
}

function CarrierEscape({options:o,userId,send,busy}){const [selected,setSelected]=useState([]);return <section className="panel battle-actions"><h2>Carrier Escape</h2><p>D20: {o.roll} · {o.count} Of {o.craft.length} Craft May Escape</p>{o.actorId!==userId?<p>Waiting For The Carrier Owner To Select Survivors.</p>:<><p>Select exactly {o.count} surviving craft.</p>{o.craft.map(x=><label className="check-row" key={x.id}><input type="checkbox" checked={selected.includes(x.id)} disabled={busy||(!selected.includes(x.id)&&selected.length>=o.count)} onChange={e=>setSelected(old=>e.target.checked?[...old,x.id]:old.filter(id=>id!==x.id))}/>{x.label||x.id}</label>)}<button disabled={busy||selected.length!==o.count} onClick={()=>send({type:'carrier-escape',selected})}>Confirm Survivors ({selected.length}/{o.count})</button></>}</section>;}

function FighterOrders({detail,userId,send,busy}){
 const [targets,setTargets]=useState({});
 const flights=(detail.fighterFlights||[]).filter(f=>f.status==='deployed'&&f.escapedTurn!==detail.game.turn&&f.fighters.some(x=>!x.destroyed&&!x.droppedOut));
 const own=flights.filter(f=>f.owner_id===userId),enemy=flights.filter(f=>f.owner_id!==userId);
 return <section className="panel battle-actions"><h2>Fighter Weapon Orders</h2>{!detail.needsAction?<p>Waiting For Opponent</p>:<>{own.map(f=><label key={f.id}>{f.label}<select value={targets[f.id]||''} onChange={e=>setTargets(old=>({...old,[f.id]:e.target.value}))}><option value="">Hold Fire</option>{enemy.map(t=>{const g=fighterTargeting(f,t);return g.ready?<option key={t.id} value={t.id}>{t.label} · {g.range} Hexes · Hit On {g.chanceToHit}</option>:null;})}</select></label>)}<button disabled={busy} onClick={()=>send({type:'fighter-orders',orders:own.filter(f=>targets[f.id]).map(f=>({attackerId:f.id,targetId:targets[f.id]}))})}>Lock Fighter Orders</button></>}</section>;
}
function FighterDamage({detail,userId,send,busy}){
 const p=detail.fighterDamage,f=(detail.fighterFlights||[]).find(x=>x.id===p?.targetId);
 return <section className="panel battle-actions"><h2>Fighter Damage</h2>{!p||p.actorId!==userId?<p>Waiting For Defender</p>:<><p>{f?.label||p.targetId} · Linked Weapon Damage: {p.volleys.join(' + ')}</p>{p.slots.map(slot=><button key={slot} disabled={busy} onClick={()=>send({type:'fighter-damage',slot})}>Fighter {slot} · {f?.fighters.find(x=>x.slot===slot)?.damage||0} Damage</button>)}</>}</section>;
}
