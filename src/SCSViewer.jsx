import React,{useEffect,useState} from 'react';
import {VORCHAN_LIBRARY_RECORD} from '../shared/vorchan-trial-library.mjs';
import {VORCHAN_SCS_IDENTIFICATION} from '../shared/vorchan-scs-identification.mjs';

// Read-only: never interpret the partial Vorchan diagram as a combat-ready SCS.
export default function SCSViewer({ship,api}){
 const [definition,setDefinition]=useState(null),[error,setError]=useState('');
 const templateId=ship?.template_id;
 const trial=ship?.public_state?.libraryId===VORCHAN_LIBRARY_RECORD.id||ship?.public_state?.trial===true;
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
 const ready=library?false:!!definition;
 return <section className="panel scs-viewer" aria-label="Ship Control Sheet">
  <h2>Ship Control Sheet</h2>
  {error&&<p className="error" role="alert">{error}</p>}
  {templateId&&!definition&&!error&&<p>Loading linked SCS…</p>}
  {(library||definition)&&<>
   <h3>{library?.name||definition?.name}</h3>
   <p>{library?.source?.revision||definition?.source?.sheetRevision} · {library?.faction||definition?.faction}</p>
   <dl><dt>Combat Points</dt><dd>{stats?.combatPoints??'Unverified'}</dd><dt>Initiative bonus</dt><dd>{stats?.initiativeBonus??'Unverified'}</dd><dt>Extra power</dt><dd>{stats?.extraPower??'Unverified'}</dd></dl>
   {!ready&&<p className="scs-warning" role="status">Partial Vorchan transcription. Structure tracks, individual box coordinates and some combat statistics remain unverified. Diagram is read-only; automatic damage allocation is unavailable.</p>}
   {sections.map(section=><div key={section} className="scs-section"><h3>{section.replaceAll('_',' ').toUpperCase()}</h3>
    {systems.filter(s=>s.section===section).map(system=>{
     const boxes=Number.isInteger(system.boxes)?system.boxes:null;
     const state=ship?.private_state?.scs?.systems?.[system.id];
     const damage=state?.damage??0;
     return <div key={system.id} className="scs-system">
      <div className="scs-system-heading"><span>{system.id.replaceAll('_',' ')}</span><span>Armour {system.armour??'?'} · {boxes===null?'Boxes unverified':boxes+' boxes'}</span></div>
      {boxes!==null&&<div className="scs-boxes" aria-label={boxes+' damage boxes'+(state?', '+damage+' damaged':'')}>
       {Array.from({length:boxes},(_,i)=><span key={i} className={'scs-box'+(i<damage?' damaged':'')} title={'Box '+(i+1)+(i<damage?' damaged':'')}/>)}
      </div>}
      {boxes===null&&<p className="hint">Structure track pending verification</p>}
     </div>;
    })}
   </div>)}
   <p className="hint">Schematic track display only. Not an exact reproduction of original box positions or firing arcs.</p>
  </>}
 </section>;
}
