import {VORCHAN_VECTOR_BOXES,VORCHAN_VECTOR_AUDIT} from '../shared/vorchan-vector-geometry.mjs';
import React,{useEffect,useState} from 'react';
import {VORCHAN_LIBRARY_RECORD} from '../shared/vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION} from '../shared/vorchan-scs-identification.mjs';

// Coordinates are in original PDF points (612 x 792). Verified track topology
// is from vorchan-scs-identification; incomplete structure tracks are excluded.
// The backdrop is a schematic outline, NOT a copied official SCS illustration.
// Audited rectangle origins from original Vorchan SCS PDF, page 1.
// Only spatially unambiguous components are included; no inferred hull tracks.
const VORCHAN_HALF_SILHOUETTE='M310.5 212.5 C310.5 212.5 256.5 279.25 258.75 301.75 C261 324.25 283.5 336.25 283.5 336.25 L254.25 473.5 L216 473.5 L195.75 530.5 C195.75 530.5 151.05 531.17 125.5 519.25 C73.5 495 51.75 455.5 51.75 455.5 C51.75 455.5 58.87 587.79 134.25 641.5 C207.81 693.91 254.25 691.75 254.25 691.75 L267.75 653.5 L272.25 662.5 L285.75 662.5 L285.75 676 L292.5 676 L292.5 662.5 L301.5 662.5 L303.75 651.25 L310.5 739';
function boxGeometry(system){
 const points=VORCHAN_VECTOR_BOXES[system.id];
 if(!points||!points.length)return [];
 return points.map(([x,y],i)=>({id:system.id+':'+(i+1),x,y,width:6.75}));
}
export default function SCSViewer({ship,api,gameId,revision,onSaved}){
 const [definition,setDefinition]=useState(null),[error,setError]=useState('');
 const [marked,setMarked]=useState({});
 const [saving,setSaving]=useState(false);
 const templateId=ship?.template_id;
 const trial=ship?.public_state?.libraryId===VORCHAN_LIBRARY_RECORD.id||ship?.public_state?.trial===true;
 useEffect(()=>{setMarked(ship?.public_state?.scsAnnotations?.marks||{});},[ship?.id,ship?.public_state?.scsAnnotations]);
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
 const toggle=async id=>{
  if(saving)return;
  const next=!marked[id];
  if(!gameId||!api){setError('No game available for persistent marking');return;}
  setSaving(true);setError('');
  try{
   await api('/games/'+encodeURIComponent(gameId)+'/trial-scs-mark','POST',{shipId:ship.id,boxId:id,marked:next,expectedRevision:revision});
   setMarked(old=>({...old,[id]:next}));
   if(onSaved)await onSaved();
  }catch(e){setError(e.message)}finally{setSaving(false)}
 };
 return <section className="panel scs-viewer" aria-label="Ship Control Sheet">
  <h2>Ship Control Sheet</h2>
  {error&&<p className="error" role="alert">{error}</p>}
  {templateId&&!definition&&!error&&<p>Loading linked SCS…</p>}
  {(library||definition)&&<>
   <h3>{library?.name||definition?.name}</h3>
   <p>{library?.source?.revision||definition?.source?.sheetRevision} · {library?.faction||definition?.faction}</p>
   <dl><dt>Combat Points</dt><dd>{stats?.combatPoints??'Unverified'}</dd><dt>Initiative bonus</dt><dd>{stats?.initiativeBonus??'Unverified'}</dd><dt>Extra power</dt><dd>{stats?.extraPower??'Unverified'}</dd></dl>
   {library&&<>
    <p className="scs-warning" role="status">Vorchan geometry prototype: original PDF vector rectangles, deduplicated by exact position on the original 612×792 sheet coordinate system. Structure tracks and firing arcs remain incomplete. Clicking a mapped box saves a persistent trial annotation. These marks are not authoritative combat damage.</p>
    <div className="scs-diagram-wrap">
     <svg className="scs-diagram" viewBox="0 0 612 792" role="group" aria-label="Vorchan diagram with individually selectable verified damage boxes">
      <path d={VORCHAN_HALF_SILHOUETTE} fill="#aab7c8" fillOpacity=".3" stroke="#8ca8c7" strokeWidth="1.5"/>
      <path d={VORCHAN_HALF_SILHOUETTE} transform="translate(621 0) scale(-1 1)" fill="#aab7c8" fillOpacity=".3" stroke="#8ca8c7" strokeWidth="1.5"/>
      {systems.filter(s=>VORCHAN_VECTOR_BOXES[s.id]).flatMap(system=>boxGeometry(system).map((box,index)=>{
       const active=!!marked[box.id];
       return <rect key={box.id} x={box.x} y={box.y} width={box.width} height={box.width}
        fill={active?'#f17a66':'#eef4fa'} stroke="#192a3a" strokeWidth=".8"
        role="checkbox" aria-checked={active} aria-disabled={saving} aria-label={system.id.replaceAll('_',' ')+' damage box '+(index+1)}
        tabIndex="0" onClick={()=>toggle(box.id)}
        onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(box.id)}}}>
        <title>{system.id.replaceAll('_',' ')} — box {index+1} (armour {system.armour})</title>
       </rect>;
      }))}
     </svg>
    </div>

    <p className="hint">{Object.values(marked).filter(Boolean).length} persistent trial annotations. Combat damage is unchanged.</p>
   </>}
   {sections.map(section=><div key={section} className="scs-section"><h3>{section.replaceAll('_',' ').toUpperCase()}</h3>
    {systems.filter(s=>s.section===section).map(system=>{
     const boxes=library?(VORCHAN_VECTOR_BOXES[system.id]?.length??null):(Number.isInteger(system.boxes)?system.boxes:null);
     const count=library?boxGeometry(system).filter(b=>marked[b.id]).length:(ship?.private_state?.scs?.systems?.[system.id]?.damage||0);
     return <div key={system.id} className="scs-system"><div className="scs-system-heading"><span>{system.id.replaceAll('_',' ')}</span><span>Armour {system.armour??'?'} · {boxes===null?'Boxes unverified':boxes+' boxes'}{library&&boxes!==null?' · '+count+' marked':''}</span></div>
      {boxes===null&&<p className="hint">Structure track pending verification</p>}
     </div>;
    })}
   </div>)}
   <p className="hint">Source rectangle audit: 301 unique boxes, including 20 shuttle-reference boxes excluded from the ship. Original SCS data is still undergoing gameplay validation.</p>
  </>}
 </section>;
}
