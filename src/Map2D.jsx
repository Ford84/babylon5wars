import React from 'react';
import {MAP_PRESETS} from '../shared/battle-setup.mjs';
export default function Map2D({ships,selected,setSelected,preset='standard'}){
 const {columns,rows}=MAP_PRESETS[preset]||MAP_PRESETS.standard;
 const size=12,dx=Math.sqrt(3)*size,dy=1.5*size,margin=36;
 const width=margin*2+dx*(columns+(rows-1)/2),height=margin*2+dy*(rows-1)+size*2;
 const xy=(q,r)=>({x:margin+dx*(q+r/2),y:margin+dy*r});
 const stars=Array.from({length:90},(_,i)=>({x:(i*97+11)%width,y:(i*67+13)%height}));
 return <div className="mapviewport"><svg viewBox={`0 0 ${width} ${height}`} className="map" aria-label={`Battlefield hex map ${columns} columns by ${rows} rows`}><rect width={width} height={height} fill="#071328"/>{stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r=".8" fill="#dcefff" opacity=".45"/>)}{Array.from({length:columns},(_,q)=>Array.from({length:rows},(_,r)=>{const p=xy(q,r);return <polygon key={`${q}-${r}`} points={Array.from({length:6},(_,k)=>`${p.x+size*Math.cos((60*k-30)*Math.PI/180)},${p.y+size*Math.sin((60*k-30)*Math.PI/180)}`).join(' ')} fill="none" stroke="#4a6687" strokeWidth=".8" opacity=".65"/>}))}{ships.filter(s=>Number.isInteger(s.q)&&Number.isInteger(s.r)&&s.q>=0&&s.q<columns&&s.r>=0&&s.r<rows).map((s,i)=>{const p=xy(s.q,s.r);return <g key={s.id||i} onClick={()=>setSelected(s.id||i)} style={{cursor:'pointer'}} transform={`translate(${p.x} ${p.y})`}><circle r="10" fill={selected===(s.id||i)?'#235578':'#16283d'} stroke={selected===(s.id||i)?'#8bdcff':'#6288ad'} strokeWidth="1.5"/><g transform={`rotate(${s.facing*60+30})`}><path d="M0 -9 L5 -3 L3 7 L0 4 L-3 7 L-5 -3 Z" fill={i===0?'#d2dbe4':i===1?'#73b8b3':'#c69d79'} stroke="#f4faff"/></g><text y="19" textAnchor="middle" fill="#e7f3ff" fontSize="9">{s.label}</text></g>})}</svg></div>
}
