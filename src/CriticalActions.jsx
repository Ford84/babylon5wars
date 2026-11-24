import React,{useState} from 'react';
import AnimatedD20 from './AnimatedD20.jsx';
import RuleTable from './RuleTable.jsx';
import {criticalTable} from '../shared/rule-tables.mjs';
import {labelSystem} from '../shared/ship-condition.mjs';
export default function CriticalActions({detail,userId,send,busy}){
 const r=detail.criticalResolution,c=r.check,ship=detail.ships.find(s=>s.id===c.shipId),roller=detail.members.find(m=>m.user_id===r.rollerId),actor=detail.members.find(m=>m.user_id===r.actorId),secondary=r.stage.startsWith('secondary'),result=r.stage.endsWith('_result'),mine=r.actorId===userId;
 const key=detail.game.turn+':'+c.id+':'+r.stage,[revealed,setRevealed]=useState(null),animating=result&&revealed!==key;
 const roll=secondary?r.secondaryRoll:r.roll,total=secondary?roll:r.result?.total;
 const command=type=>send({type,stage:r.stage,checkId:c.id});
 return <section className="panel critical-review" aria-live="polite"><h2>End Of Turn · Critical Checks</h2><p>Check {r.index} Of {r.total} · <strong>{ship.label}</strong></p><h3>{labelSystem(c.systemId)} · {secondary?'Engine Short Follow-Up':c.kind==='overthrust'?'Overthrust Critical':'Damage Critical'}</h3><p>{roller?.display_name||'Ship Owner'} Rolls · {secondary?'Unmodified d20':`d20 + ${c.marked} Damage${c.excess?' + '+c.excess+' Overthrust':''}`}</p>
  {result&&<AnimatedD20 key={key} value={roll} label={secondary?'Engine Short d20':'Critical d20'} onSettled={()=>setRevealed(key)}/>}
  {!animating&&result&&<div className="server-dice"><p><strong>{'d20 '+r.roll+' + '+r.result.modifier+' = '+r.result.total}</strong></p>{secondary&&<p>Follow-Up d20 {roll} · No Modifier</p>}{r.result.effects.length?r.result.effects.map((x,i)=><p key={i}>{labelSystem(x)}</p>):<p>No Additional Effect</p>}{r.result.clarification&&<p>{r.result.clarification}</p>}</div>}
  <RuleTable title={secondary?'Possible Engine Short Results':'Possible Critical Results'} rows={criticalTable(c.systemId,secondary,ship.public_state?.libraryId)} unmodified={secondary} selected={!animating&&result?total:null} note={secondary?'No modifiers apply to this follow-up roll.':'Use the modified total. Repeated critical effects are cumulative unless the rule says otherwise.'}/>
  {!mine&&<p>Waiting For {actor?.display_name||'The Other Player'}</p>}
  {!result?<button disabled={busy||!mine} onClick={()=>command('critical-roll')}>{secondary?'Roll Engine Short':'Roll Critical Check'}</button>:!animating&&<button disabled={busy||!mine} onClick={()=>command('critical-ok')}>OK</button>}
  <p>The next turn waits until all critical results have been reviewed.</p>
 </section>;
}
