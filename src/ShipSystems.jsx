import React from 'react';
import {scsDamageMarkers} from '../shared/scs-markers.mjs';
import {hullSystems,VORCHAR_ID} from '../shared/vorchar.mjs';
import {labelSystem} from '../shared/ship-condition.mjs';
export default function ShipSystems({ship,onClose,shuttles=[]}){
 const libraryId=ship.public_state?.libraryId;
 const damage=ship.public_state?.damage||ship.private_state?.trial?.condition?.damage;
 return <div className="scs-diagram-overlay" role="dialog" aria-modal="true" aria-label={ship.label+' Ship Systems'} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="scs-diagram-dialog live-scs"><div className="sectionhead"><h2>{ship.label} — Ship Systems</h2><button onClick={onClose}>Close</button></div>
   <p>Damage marks update automatically after fire resolves. Each red cross is one destroyed box.</p>
   <svg viewBox="0 0 612 792" className="live-scs-page" role="img" aria-label={ship.label+" Control Sheet"}>
    <image href={libraryId===VORCHAR_ID?"/images/vorchar-v2-schematic.svg":"/images/vorchan-v3-schematic.svg"} x="0" y="0" width="612" height="792"/>
    {scsDamageMarkers(damage,libraryId).map(box=>{const [x,y,right,bottom]=box.rect;return <g key={box.id}><title>{labelSystem(box.systemId)}: Destroyed Box</title><rect x={x} y={y} width={right-x} height={bottom-y} fill="#df1538" opacity=".4"/><path d={`M${x+.6},${y+.6} L${right-.6},${bottom-.6} M${right-.6},${y+.6} L${x+.6},${bottom-.6}`} stroke="#ab0724" strokeWidth="1.3"/></g>;})}
   </svg>
   {shuttles.length>0&&<section><h3>Shuttle Tracks</h3>{shuttles.map(x=><div key={x.id}><p>{x.label} · {x.status} · Damage {x.public_state.damage.shuttleDamage}/10 · Thrust 4 · Armour 0 · Defence 8/10</p><div className="shuttle-damage-track" aria-label={x.label+' Damage '+x.public_state.damage.shuttleDamage+' Of 10'}>{Array.from({length:10},(_,i)=><span key={i} className={i<x.public_state.damage.shuttleDamage?'marked':''}>{i<x.public_state.damage.shuttleDamage?'×':''}</span>)}</div></div>)}</section>}
   {damage&&<details><summary>Component Condition</summary><table><thead><tr><th>System</th><th>Damage</th><th>Armour</th></tr></thead><tbody>{hullSystems(libraryId).map(s=><tr key={s.id}><td>{labelSystem(s.id)}</td><td>{damage.tracks[s.id]?.marked||0}/{s.boxes}</td><td>{s.armour}</td></tr>)}</tbody></table></details>}
  </section>
 </div>;
}
