import RuleTable from './RuleTable.jsx';
import {locationTable} from '../shared/rule-tables.mjs';
import React,{useState} from 'react';
import AnimatedDice from './AnimatedDice.jsx';
import {labelSystem} from '../shared/ship-condition.mjs';
export default function GuidedCombat({detail,userId,send,busy,onAttackRevealed}){
 const r=detail.resolution,a=r.attack,attacker=detail.ships.find(s=>s.id===a.shipId),target=detail.ships.find(s=>s.id===a.targetId),actor=detail.members?.find(m=>m.user_id===r.actorId),mine=r.actorId===userId;
 const [revealed,setRevealed]=useState(null),attackKey=detail.game.turn+':'+a.id,rollKey=attackKey+':'+r.stage,isResult=r.stage.endsWith('_result'),animating=isResult&&revealed!==rollKey;
 const damageResult=r.stage==='damage_result',locationResult=['location_result','primary_result'].includes(r.stage),values=damageResult?r.damage.dice:locationResult?[r.locationResults.at(-1).roll]:[a.roll],diceLabel=damageResult?'Damage Dice':locationResult?'Hit Location d20':'Attack d20';
 const labels={attack_roll:'Roll To Hit',attack_result:'Attack Result',location_roll:'Roll Hit Location',location_result:'Hit Location Result',primary_roll:'Roll Primary Hit Location',primary_result:'Primary Hit Result',hull_choice:'Defender Chooses Hull',system_choice:'Defender Chooses System',damage_roll:'Roll Damage',damage_result:'Damage Result'};
 const action=type=>send({type,stage:r.stage,attackId:a.id});
 const isRoll=r.stage.endsWith('_roll'),isChoice=r.stage.endsWith('_choice');
 return <section className="panel combat-review" aria-live="polite"><h2>{animating?(damageResult?'Rolling Damage…':locationResult?'Rolling Hit Location…':'Rolling To Hit…'):labels[r.stage]}</h2><p>Attack {r.index} Of {r.total} · {attacker?.label} → {target?.label}</p><p>{labelSystem(a.mountId)} · Gun {a.gun} · {a.mode||'Standard'} Damage</p>
  {isResult&&<AnimatedDice key={rollKey} values={values} sides={damageResult?10:20} label={diceLabel} onSettled={()=>{setRevealed(rollKey);if(r.stage==='attack_result')onAttackRevealed?.(attackKey);}}/>}
  {(!animating||r.stage!=='attack_result')&&a.roll!=null&&<p className="server-dice"><strong>d20 {a.roll} · Needs {a.targetNumber} Or Less · {a.hit?'Hit':'Miss'}</strong></p>}
  {!animating&&r.skipDamage&&<p>Target Already Destroyed · No Further Damage Will Be Allocated</p>}
  {r.locationResults.filter((_,i)=>!animating||!locationResult||i<r.locationResults.length-1).map((location,i)=><p key={i} className="server-dice">{labelSystem(location.chart)} Hits · d20 {location.roll} · <strong>{labelSystem(location.token)}</strong></p>)}
  {r.stage==='location_roll'&&<p>The firing player rolls on the {labelSystem(r.chart)} Hits table.</p>}
  {r.stage==='primary_roll'&&<p>The hit penetrated to primary systems. The firing player rolls again on the Primary Hits table.</p>}
  {r.stage==='system_choice'&&<p>The defender selects which eligible {labelSystem(r.token)} receives this hit.</p>}
  {r.selected&&<p>Selected System: <strong>{labelSystem(r.selected)}</strong></p>}
  {r.damage&&!animating&&<><p className="server-dice">Damage Dice: {r.damage.dice.join(' + ')} · Total <strong>{r.damage.damage}</strong> Before Armour</p>{r.trace.map((t,i)=><p key={i}>{labelSystem(t.systemId)} · Armour {t.armour} · {t.marked} Boxes Marked{t.destroyed?' · Destroyed':''}</p>)}</>}
  {['location_roll','location_result','primary_roll','primary_result'].includes(r.stage)&&<RuleTable title={'Possible '+labelSystem(r.chart)+' Hit Locations'} rows={locationTable(r.chart)} locations selected={!animating&&locationResult?r.locationResults.at(-1)?.roll:null} note="The firing player rolls; the defender chooses among eligible systems when required. Primary means a second roll on the Primary Hits table."/>}
  {!mine&&<p>Waiting For {actor?.display_name||'The Other Player'}</p>}
  {isRoll&&<button disabled={busy||!mine} onClick={()=>action('combat-roll')}>{labels[r.stage]}</button>}
  {isResult&&!animating&&<button disabled={busy||!mine} onClick={()=>action('combat-ok')}>OK</button>}
  {isChoice&&r.candidates.map(value=><button key={value} disabled={busy||!mine} onClick={()=>send({type:'combat-choice',stage:r.stage,attackId:a.id,value})}>{labelSystem(value)}</button>)}
  <p>Declared return fire remains valid throughout this simultaneous ship-fire step.</p>
 </section>;
}
