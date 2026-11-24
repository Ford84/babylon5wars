import React,{useEffect,useRef,useState} from 'react';
// Intermediate faces are cosmetic; final values are authoritative saved dice.
export default function AnimatedDice({values,sides=20,label='Dice',onSettled}){
 const [settled,setSettled]=useState(false),[frame,setFrame]=useState(0),callback=useRef(onSettled);callback.current=onSettled;
 const key=JSON.stringify([sides,values]),ready=values.length>0&&values.every(Number.isInteger);
 useEffect(()=>{
  setSettled(false);setFrame(0);if(!ready)return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ticker=reduced?null:setInterval(()=>setFrame(n=>n+1),70);
  const timer=setTimeout(()=>{clearInterval(ticker);setSettled(true);callback.current?.();},reduced?0:1200);
  return()=>{clearInterval(ticker);clearTimeout(timer);};
 },[key]);
 return <div className="animated-d20-tray" role="status" aria-live="polite" aria-label={settled?`${label}: ${values.join(', ')}`:ready?`${label}: Rolling`:`${label}: Ready`}><div className="animated-dice-faces" data-multiple={values.length>1}>{values.map((value,i)=><div key={i}><div className={'animated-d20'+(!settled&&ready?' tumbling':'')} aria-hidden="true" style={{animationDelay:`${i*-.08}s`}}><svg viewBox="0 0 120 120" data-die-sides={sides} aria-label={sides===10?'Ten-Sided Die':'Twenty-Sided Die'}>{sides===10?<><path d="M60 3 114 46 60 117 6 46Z"/><path className="die-edges" d="M60 3 38 48 60 117 82 48Z M6 46 38 48 82 48 114 46 M38 48 60 68 82 48"/></>:<><path d="M60 4 110 32 110 88 60 116 10 88 10 32Z"/><path className="die-edges" d="M60 4 30 75 90 75Z M10 32 30 75 10 88 M110 32 90 75 110 88 M30 75 60 116 90 75 M10 32 60 4 110 32"/></>}</svg><strong>{settled?value:ready?(frame*7+3+i*3)%sides+1:'—'}</strong></div><small>d{sides}</small></div>)}</div><span>{label} · {settled?'Result':ready?'Rolling…':'Ready'}</span></div>;
}
