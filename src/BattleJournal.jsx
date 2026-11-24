import React from 'react';
import {PLAY_PHASES} from '../shared/automated-battle.mjs';
import {labelSystem} from '../shared/ship-condition.mjs';

export default function BattleJournal({events,ships,members}){
 const names=new Map(ships.map(s=>[s.id,s.label])),players=new Map(members.map(m=>[m.user_id,m.display_name]));
 const label=id=>names.get(id)||players.get(id)||'Ship';
 return <details className="panel battle-log" open><summary>Battle Log</summary><ol>{events.filter(e=>!['critical_rolled','ew_committed','fire_committed','defence_committed','weapons_fired'].includes(e.event_type)).slice(0,80).map(e=>{const p=e.public||{};return <li key={e.id}><strong>Turn {e.turn} · {e.event_type.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}</strong>
  {p.shipId&&<span> · {label(p.shipId)}</span>}
  {e.event_type==='phase_advanced'&&<p>{PLAY_PHASES.find(x=>x.id===p.to)?.label||p.to}</p>}
  {e.event_type==='initiative_rolled'&&<p>d20 {p.roll} + Modifiers {p.total-p.roll} = <strong>{p.total}</strong></p>}
  {e.event_type==='initiative_rolloff'&&<p>Opposing Tie Resolved: {p.rolls.map(r=>r.join(' / ')).join('; ')}</p>}
  {e.event_type==='ew_allocations_revealed'&&p.allocations?.map(x=><p key={x.shipId}>{label(x.shipId)} · DEW {x.defensive} · OEW {Object.entries(x.offensive||{}).filter(([,n])=>n).map(([id,n])=>label(id)+': '+n).join(', ')||'None'}{x.elint&&<> · ELINT: {Object.entries(x.elint.defensive||{}).filter(([,n])=>n).map(([id,n])=>'Loan '+label(id)+': '+n).concat(Object.entries(x.elint.disruption||{}).filter(([,n])=>n).map(([id,n])=>'Disrupt '+label(id)+': '+n)).concat(x.elint.blanket?['Blanket: '+x.elint.blanket]:[]).join(', ')||'None'}</>}</p>)}
  {e.event_type==='elint_disruption_selected'&&<p>{label(p.scoutId)} Disrupts {label(p.targetId)}: {Object.entries(p.removed).map(([id,n])=>n+' OEW Against '+label(id)).join(', ')}</p>}
  {e.event_type==='elint_disruption_tiebreak'&&<p>Equal Scout Allocations · Random Selection {p.roll} Of {p.scoutIds.length} · {label(p.chosenScoutId)} Controls Disruption Against {label(p.targetId)}</p>}
  {e.event_type==='initiative_order'&&<p>{p.shipIds.map(label).join(' Then ')}</p>}
  {e.event_type==='damage_resolved'&&<>{p.attacks.map(a=><p key={a.id}>{label(a.shipId)} · {labelSystem(a.mountId)} · d20 {a.roll} Against {a.targetNumber}: <strong>{a.hit?'Hit':'Miss'}</strong></p>)}{p.outcomes.map(o=><p key={o.attackId}>{label(o.targetId)}: {o.trace?.map(x=>labelSystem(x.systemId)+' '+x.marked+' Damage').join(', ')||'No Further Damage'}{o.shipDestroyed?' · Destroyed':''}</p>)}</>}
  {e.event_type==='critical_checks'&&<>{p.results.length?p.results.map((r,i)=><p key={i}>{labelSystem(r.systemId)} · {r.kind==='overthrust'?'Overthrust':'Damage'} · d20 {r.roll} + {r.modifier} = {r.total}: {r.effects.length?r.effects.map(labelSystem).join(', '):'No Additional Effect'}{r.secondaryRoll?' · Secondary d20 '+r.secondaryRoll:''}{r.clarification?' · '+r.clarification:''}</p>):<p>No Critical Checks Due</p>}</>}
  {e.event_type==='containment_check'&&<p>d100 {p.roll} · {p.chance}% Detonation Chance</p>}
  {e.event_type==='jump_engine_check'&&<p>d100 {p.roll} · {p.risk}% Explosion Risk · <strong>{p.exploded?'Ship Destroyed':'Safe'}</strong></p>}
  {e.event_type==='jump_point_opened'&&<p>Hex ({p.point.q}, {p.point.r}) · Usable From Turn {p.point.activeTurn}</p>}
  {e.event_type==='jump_point_closed'&&<p>Jump Engine Ready Again On Turn {p.readyTurn}</p>}
  {p.shuttleId&&<p>{label(p.shuttleId)}</p>}
  {e.event_type==='forced_acceleration'&&<p>{p.thrust} Thrust Applied Automatically · Speed {p.speed}</p>}
  {e.event_type==='battle_finished'&&<p>{p.winner?label(p.winner)+' Wins':'Draw — Both Ships Lost'}</p>}
  {e.event_type==='defender_choice'&&<p>{labelSystem(p.value)}</p>}
  {e.event_type==='combat_dice'&&<details><summary>Server Dice Journal</summary>{p.rolls.map(r=><p key={r.attackId}>{label(r.attackId.split(':')[0])}: Attack {r.roll} · Location {r.locationRoll} · Primary {r.primaryRoll} · {r.hit===false?'Miss · No Damage Roll':'Damage '+r.damageDice.join(', ')}</p>)}</details>}
 </li>;})}</ol></details>;
}
