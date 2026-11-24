import React from 'react';
import {scsDamageMarkers} from '../shared/scs-markers.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from '../shared/vorchan-scs-identification.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {labelSystem} from '../shared/ship-condition.mjs';
export default function ShipSystems({ship,onClose}){
 const damage=ship.public_state?.damage||ship.private_state?.trial?.condition?.damage;
 return <div className="scs-diagram-overlay" role="dialog" aria-modal="true" aria-label={ship.label+' Ship Systems'} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="scs-diagram-dialog live-scs"><div className="sectionhead"><h2>{ship.label} — Ship Systems</h2><button onClick={onClose}>Close</button></div>
   <p>Damage marks update automatically after fire resolves. Each red cross is one destroyed box.</p>
   <svg viewBox="0 0 612 792" className="live-scs-page" role="img" aria-label="Live Vorchan Control Sheet">
    <image href="/images/vorchan-v3-schematic.svg" x="0" y="0" width="612" height="792"/>
    {scsDamageMarkers(damage).map(box=>{const [x,y,right,bottom]=box.rect;return <g key={box.id}><title>{labelSystem(box.systemId)}: Destroyed Box</title><rect x={x} y={y} width={right-x} height={bottom-y} fill="#df1538" opacity=".4"/><path d={`M${x+.6},${y+.6} L${right-.6},${bottom-.6} M${right-.6},${y+.6} L${x+.6},${bottom-.6}`} stroke="#ab0724" strokeWidth="1.3"/></g>;})}
   </svg>
   <h3>Weapon Mounts</h3><div className="scs-weapon-cards">{LIB.weaponMounts.map(m=>{const w=LIB.weapons.find(x=>x.id===m.weaponId);return <article key={m.id}><strong>{w.name} · Mount {m.mountNumber}</strong><p>{w.damage} · {m.arc.coverageDegrees}° Arc · {w.powerRequired} Power</p></article>;})}</div>
   {damage&&<details><summary>Component Condition</summary><table><thead><tr><th>System</th><th>Damage</th><th>Armour</th></tr></thead><tbody>{SCS.systems.map(s=><tr key={s.id}><td>{labelSystem(s.id)}</td><td>{damage.tracks[s.id]?.marked||0}/{s.boxes}</td><td>{s.armour}</td></tr>)}</tbody></table></details>}
  </section>
 </div>;
}
