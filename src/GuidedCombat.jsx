import React from 'react';
import {labelSystem} from '../shared/ship-condition.mjs';
export default function GuidedCombat({detail,userId,send,busy}){
 const r=detail.resolution,a=r.attack,attacker=detail.ships.find(s=>s.id===a.shipId),target=detail.ships.find(s=>s.id===a.targetId),actor=detail.members?.find(m=>m.user_id===r.actorId),mine=r.actorId===userId;
 const labels={attack_roll:'Roll To Hit',attack_result:'Attack Result',location_roll:'Roll Hit Location',location_result:'Hit Location Result',primary_roll:'Roll Primary Hit Location',primary_result:'Primary Hit Result',hull_choice:'Defender Chooses Hull',system_choice:'Defender Chooses System',damage_roll:'Roll Damage',damage_result:'Damage Result'};
 const action=type=>send({type,stage:r.stage,attackId:a.id});
 const isRoll=r.stage.endsWith('_roll'),isResult=r.stage.endsWith('_result'),isChoice=r.stage.endsWith('_choice');
 return <section className="panel combat-review" aria-live="polite"><h2>{labels[r.stage]}</h2><p>Attack {r.index} Of {r.total} · {attacker?.label} → {target?.label}</p><p>{labelSystem(a.mountId)} · Gun {a.gun} · {a.mode||'Standard'} Damage</p>
  {a.roll!=null&&<p className="server-dice"><strong>d20 {a.roll} · Needs {a.targetNumber} Or Less · {a.hit?'Hit':'Miss'}</strong></p>}
  {r.skipDamage&&<p>Target Already Destroyed · No Further Damage Will Be Allocated</p>}
  {r.locationResults.map((location,i)=><p key={i} className="server-dice">{labelSystem(location.chart)} Hits · d20 {location.roll} · <strong>{labelSystem(location.token)}</strong></p>)}
  {r.stage==='location_roll'&&<p>The firing player rolls on the {labelSystem(r.chart)} Hits table.</p>}
  {r.stage==='primary_roll'&&<p>The hit penetrated to primary systems. The firing player rolls again on the Primary Hits table.</p>}
  {r.stage==='system_choice'&&<p>The defender selects which eligible {labelSystem(r.token)} receives this hit.</p>}
  {r.selected&&<p>Selected System: <strong>{labelSystem(r.selected)}</strong></p>}
  {r.damage&&<><p className="server-dice">Damage Dice: {r.damage.dice.join(' + ')} · Total <strong>{r.damage.damage}</strong> Before Armour</p>{r.trace.map((t,i)=><p key={i}>{labelSystem(t.systemId)} · Armour {t.armour} · {t.marked} Boxes Marked{t.destroyed?' · Destroyed':''}</p>)}</>}
  {!mine&&<p>Waiting For {actor?.display_name||'The Other Player'}</p>}
  {isRoll&&<button disabled={busy||!mine} onClick={()=>action('combat-roll')}>{labels[r.stage]}</button>}
  {isResult&&<button disabled={busy||!mine} onClick={()=>action('combat-ok')}>OK</button>}
  {isChoice&&r.candidates.map(value=><button key={value} disabled={busy||!mine} onClick={()=>send({type:'combat-choice',stage:r.stage,attackId:a.id,value})}>{labelSystem(value)}</button>)}
  <p>Declared return fire remains valid throughout this simultaneous ship-fire step.</p>
 </section>;
}
