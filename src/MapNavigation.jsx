import React,{useState} from 'react';
export function useMapNavigation(selected,rows){
 const [view,setView]=useState({zoom:1,focusId:null,panX:0,panZ:0});
 const zoomBy=factor=>setView(v=>({...v,zoom:Math.min(12,Math.max(.4,v.zoom*factor)),focusId:v.focusId??selected}));
 const focus=id=>setView(v=>({zoom:Math.max(4,v.zoom),focusId:id,panX:0,panZ:0}));
 const pan=(x,z)=>setView(v=>({...v,panX:v.panX+x*rows*19/v.zoom*.2,panZ:v.panZ+z*rows*19/v.zoom*.2}));
 return {view,zoomBy,focus,pan,reset:()=>setView({zoom:1,focusId:null,panX:0,panZ:0})};
}
export default function MapNavigation({navigation:n,ships,setSelected}){
 return <div className="map-navigation"><div className="map3d-controls" role="group" aria-label="Map Navigation"><button type="button" onClick={()=>n.zoomBy(1/1.3)}>− Zoom Out</button><button type="button" onClick={()=>n.zoomBy(1.3)}>+ Zoom In</button><button type="button" onClick={n.reset}>Show Whole Map</button>{[['Pan Left',-1,0],['Pan Right',1,0],['Pan Up',0,-1],['Pan Down',0,1]].map(([label,x,z])=><button className="secondary" key={label} type="button" onClick={()=>n.pan(x,z)}>{label}</button>)}</div><div className="map3d-controls" role="group" aria-label="Find Ships">{ships.filter(s=>!s.withdrawn).map(s=><button type="button" className="secondary" key={s.id} onClick={()=>{setSelected(s.id);n.focus(s.id);}}>Find {s.label}</button>)}</div></div>;
}
