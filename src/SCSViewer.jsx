import React,{useEffect,useState} from 'react';
import {VORCHAN_LIBRARY_RECORD} from '../shared/vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION} from '../shared/vorchan-scs-identification.mjs';

// Coordinates are in original PDF points (612 x 792). Verified track topology
// is from vorchan-scs-identification; incomplete structure tracks are excluded.
// The backdrop is a schematic outline, NOT a copied official SCS illustration.
const placements={
 retro:[294.2,250.7],plasma_port:[274.5,291.2],plasma_starboard:[326.2,291.2],
 twin_forward_port:[219.2,410.5],twin_forward_starboard:[367.8,410.5],
 hangar:[297,455.5],engine:[231.8,492.2],reactor:[293.5,505],sensors:[353.2,494.9],
 command:[364.5,543.2],port_thrust:[121.5,547.9],starboard_thrust:[474.8,550.7],
 aft_port_thrust:[209.8,644.5],aft_starboard_thrust:[383,644.5],jump_drive:[297.1,635.5]
};
function boxGeometry(system){
 const anchor=placements[system.id];
 if(!anchor||!system.verified||!Array.isArray(system.rows))return [];
 const width=6.75, step=6.75, max=Math.max(...system.rows);
 return system.rows.flatMap((count,row)=>Array.from({length:count},(_,column)=>({
  id:system.id+':'+(system.rows.slice(0,row).reduce((a,b)=>a+b,0)+column+1),
  x:anchor[0]+(max-count)*step/2+column*step,
  y:anchor[1]+row*step,width
 })));
}
export default function SCSViewer({ship,api}){
 const [definition,setDefinition]=useState(null),[error,setError]=useState('');
 const [marked,setMarked]=useState({});
 const templateId=ship?.template_id;
 const trial=ship?.public_state?.libraryId===VORCHAN_LIBRARY_RECORD.id||ship?.public_state?.trial===true;
 useEffect(()=>{setMarked({});},[ship?.id]);
 useEffect(()=>{
  let active=true;setDefinition(null);setError('');
  if(!templateId||!api)return;
  api('/scs/templates/'+encodeURIComponent(templateId)).then(data=>{if(active)setDefinition(data.definition)}).catch(e=>{if(active)setError(e.message)});
  return()=>{active=false};
 },[templateId,api]);
 if(!trial&&!templateId)return <section className="panel"><h2>Ship Control Sheet</h2><p>This ship has no linked SCS definition.</p></section>;
 const library=trial?VORCHAN_LIBRARY_RECORD:null;
 const systems=library?VORCHAN_SCS_IDENTIFICATION.systems:(definition?.systems||[]);
 const stats=library?{combatPoints:library.combatPoints,initiativeBonus:library.initiativeBonus,extraPower:library.extraPower}:definition?.stats;
 const sections=library?VORCHAN_SCS_IDENTIFICATION.sections:definition?.sections?.map(s=>s.id)||[];
 const toggle=id=>setMarked(old=>({...old,[id]:!old[id]}));
 return <section className="panel scs-viewer" aria-label="Ship Control Sheet">
  <h2>Ship Control Sheet</h2>
  {error&&<p className="error" role="alert">{error}</p>}
  {templateId&&!definition&&!error&&<p>Loading linked SCS…</p>}
  {(library||definition)&&<>
   <h3>{library?.name||definition?.name}</h3>
   <p>{library?.source?.revision||definition?.source?.sheetRevision} · {library?.faction||definition?.faction}</p>
   <dl><dt>Combat Points</dt><dd>{stats?.combatPoints??'Unverified'}</dd><dt>Initiative bonus</dt><dd>{stats?.initiativeBonus??'Unverified'}</dd><dt>Extra power</dt><dd>{stats?.extraPower??'Unverified'}</dd></dl>
   {library&&<>
    <p className="scs-warning" role="status">Vorchan geometry prototype: verified component box counts with approximate positions on the original 612×792 sheet coordinate system. Structure tracks and firing arcs remain incomplete. Clicking boxes marks them locally for inspection only; no combat damage is saved.</p>
    <div className="scs-diagram-wrap">
     <svg className="scs-diagram" viewBox="0 0 612 792" role="group" aria-label="Vorchan diagram with individually selectable verified damage boxes">
      <path d="M310 196 L360 280 L360 410 L404 473 L570 455 Q560 640 366 690 L353 650 L327 676 L310 737 L293 676 L267 650 L254 690 Q60 640 52 455 L208 473 L250 410 L260 280 Z" fill="#aab7c8" fillOpacity=".2" stroke="#8ca8c7" strokeWidth="2"/>
      <path d="M310 196 L310 737 M270 429 L350 429 M265 583 L355 583" stroke="#56728c" strokeDasharray="3 4" fill="none"/>
      {['FORWARD','PRIMARY','AFT','PORT','STARBOARD'].map((label,i)=><text key={label} x={[310,310,310,115,485][i]} y={[397,559,601,539,539][i]} textAnchor="middle" fontSize="11" fill="#d3e3f6" letterSpacing="2">{label}</text>)}
      {systems.filter(s=>s.verified).flatMap(system=>boxGeometry(system).map((box,index)=>{
       const active=!!marked[box.id];
       return <rect key={box.id} x={box.x} y={box.y} width={box.width} height={box.width}
        fill={active?'#f17a66':'#eef4fa'} stroke="#192a3a" strokeWidth=".8"
        role="checkbox" aria-checked={active} aria-label={system.id.replaceAll('_',' ')+' damage box '+(index+1)}
        tabIndex="0" onClick={()=>toggle(box.id)}
        onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(box.id)}}}>
        <title>{system.id.replaceAll('_',' ')} — box {index+1} (armour {system.armour})</title>
       </rect>;
      }))}
     </svg>
    </div>
    <button className="secondary" onClick={()=>setMarked({})}>Clear local marks</button>
    <p className="hint">{Object.values(marked).filter(Boolean).length} locally marked boxes. No server changes.</p>
   </>}
   {sections.map(section=><div key={section} className="scs-section"><h3>{section.replaceAll('_',' ').toUpperCase()}</h3>
    {systems.filter(s=>s.section===section).map(system=>{
     const boxes=Number.isInteger(system.boxes)?system.boxes:null;
     const count=library?boxGeometry(system).filter(b=>marked[b.id]).length:(ship?.private_state?.scs?.systems?.[system.id]?.damage||0);
     return <div key={system.id} className="scs-system"><div className="scs-system-heading"><span>{system.id.replaceAll('_',' ')}</span><span>Armour {system.armour??'?'} · {boxes===null?'Boxes unverified':boxes+' boxes'}{library&&boxes!==null?' · '+count+' marked':''}</span></div>
      {boxes===null&&<p className="hint">Structure track pending verification</p>}
     </div>;
    })}
   </div>)}
   <p className="hint">Component placement is provisional; it must be reconciled against exact source vector coordinates before claiming a faithful reproduction.</p>
  </>}
 </section>;
}
