import React,{useEffect,useRef,useState} from 'react';
import AnimatedD20 from './AnimatedD20.jsx';
export default function InitiativeDialog({detail,userId,send,busy,error,onClose}){
 const dialog=useRef(null),[revealed,setRevealed]=useState({});
 const ships=[...detail.ships,...(detail.shuttles||[]).filter(x=>x.status==='deployed')].filter(s=>s.owner_id===userId&&!s.withdrawn&&!s.public_state.condition.shipDestroyed),turn=detail.game.turn;
 const rolls=ships.map(ship=>({ship,result:ship.kind==='shuttle'?(ship.initiative?.turn===turn?ship.initiative:null):ship.private_state?.trial?.initiative?.turn===turn?ship.private_state.trial.initiative:null}));
 const animating=rolls.some(({ship,result})=>result&&!revealed[ship.id]);
 useEffect(()=>{dialog.current.showModal();return()=>dialog.current?.close();},[]);
 return <dialog ref={dialog} className="roll-dialog" aria-labelledby="initiative-title" onCancel={e=>{e.preventDefault();if(!busy&&!animating)onClose();}}><h2 id="initiative-title">Ship Initiative · Turn {turn}</h2>{rolls.map(({ship,result})=><section className="initiative-ship" key={ship.id}><h3>{ship.label}</h3><AnimatedD20 value={result?.roll} label="Initiative d20" onSettled={()=>setRevealed(old=>({...old,[ship.id]:true}))}/>{result&&revealed[ship.id]?<p className="server-dice">d20 {result.roll} · Ship Bonus {result.printedBonus} · Modifiers {Object.values(result.modifiers).reduce((a,b)=>a+b,0)} · <strong>Initiative {result.total}</strong></p>:!result&&<button disabled={busy||detail.game.phase_id!=='initiative'||!detail.needsAction} onClick={()=>send({type:'initiative',unitId:ship.id})}>{busy?'Rolling…':'Roll For '+ship.label}</button>}</section>)}{error&&<p role="alert" className="error">{error}</p>}<button disabled={busy||animating} onClick={onClose}>{rolls.every(r=>r.result)?'OK':'Close'}</button></dialog>;
}
