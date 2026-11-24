import {facingSVGDegrees,FACING_NAMES} from '../shared/ship-facing.mjs';
import MapNavigation,{useMapNavigation} from './MapNavigation.jsx';
import {mapCameraTarget} from '../shared/map-camera.mjs';
import React from 'react';
import WeaponEffects2D from './WeaponEffects.jsx';
import {MAP_PRESETS} from '../shared/battle-setup.mjs';
export default function Map2D({ships,selected,setSelected,preset='standard',volley}){
 const {columns,rows}=MAP_PRESETS[preset]||MAP_PRESETS.standard;
 const navigation=useMapNavigation(selected,rows);
 const size=12,dx=Math.sqrt(3)*size,dy=1.5*size,margin=36;
 const width=margin*2+dx*(columns+(rows-1)/2),height=margin*2+dy*(rows-1)+size*2;
 const xy=(q,r)=>({x:margin+dx*(q+r/2),y:margin+dy*r});
 const stars=Array.from({length:90},(_,i)=>({x:(i*97+11)%width,y:(i*67+13)%height}));
 const centre=mapCameraTarget(navigation.view,ships,columns,rows),w=width/navigation.view.zoom,h=height/navigation.view.zoom;
 return <div><MapNavigation navigation={navigation} ships={ships} setSelected={setSelected}/><div className="mapviewport"><svg viewBox={`${centre.x+margin-w/2} ${centre.z+margin-h/2} ${w} ${h}`} className="map" aria-label={`Battlefield hex map ${columns} columns by ${rows} rows`}><rect width={width} height={height} fill="#071328"/>{stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r=".8" fill="#dcefff" opacity=".45"/>)}{Array.from({length:columns},(_,q)=>Array.from({length:rows},(_,r)=>{const p=xy(q,r);return <polygon key={`${q}-${r}`} points={Array.from({length:6},(_,k)=>`${p.x+size*Math.cos((60*k-30)*Math.PI/180)},${p.y+size*Math.sin((60*k-30)*Math.PI/180)}`).join(' ')} fill="none" stroke="#4a6687" strokeWidth=".8" opacity=".65"/>}))}{ships.filter(s=>Number.isInteger(s.q)&&Number.isInteger(s.r)&&s.q>=0&&s.q<columns&&s.r>=0&&s.r<rows).map((s,i)=>{const p=xy(s.q,s.r);return <g key={s.id||i} onClick={()=>setSelected(s.id||i)} style={{cursor:'pointer'}} transform={`translate(${p.x} ${p.y})`}><circle r={s.kind==='jump-point'?14:s.kind==='shuttle'?7:10} fill={s.kind==='jump-point'?'none':selected===(s.id||i)?'#235578':'#16283d'} stroke={selected===(s.id||i)?'#8bdcff':'#6288ad'} strokeWidth={s.kind==='jump-point'?3:1.5} strokeDasharray={s.kind==='jump-point'&&s.status==='forming'?'3 2':undefined}/><g transform={`rotate(${facingSVGDegrees(s.facing)})`}><path d={s.kind==='jump-point'?'M-4 -15 L0 -20 L4 -15 M0 -20 L0 -10':s.kind==='shuttle'?'M0 -6 L5 4 L0 2 L-5 4 Z':['centauri-mograth-v2-2e-sf','centauri-mogratti-v2-2e-sf'].includes(s.public_state?.libraryId)?'M-2 -9 L2 -9 L3 -3 L2 0 L9 -2 Q10 7 0 9 Q-10 7 -9 -2 L-2 0 L-3 -3 Z':'M0 -9 L5 -3 L3 7 L0 4 L-3 7 L-5 -3 Z'} fill={s.kind==='jump-point'?'#e4a8ff':s.kind==='shuttle'?'#ffdf8d':i===0?'#d2dbe4':i===1?'#73b8b3':'#c69d79'} stroke="#f4faff"/></g><title>{s.kind==='jump-point'?`${s.label} · ${s.status} · Entry From ${FACING_NAMES[s.facing]}`:s.label}</title><text y={s.kind==='shuttle'?29:19} textAnchor="middle" fill="#e7f3ff" fontSize="9">{s.label}</text></g>})}<WeaponEffects2D volley={volley} xy={xy}/></svg></div></div>
}
