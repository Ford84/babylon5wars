import React,{useEffect,useRef,useState} from 'react';
// Cosmetic frames only. The final value always comes from the saved server roll.
export default function AnimatedD20({value,label='d20',onSettled}){
 const [settled,setSettled]=useState(false),[frame,setFrame]=useState(0),callback=useRef(onSettled);callback.current=onSettled;
 useEffect(()=>{
  setSettled(false);setFrame(0);
  if(!Number.isInteger(value))return;
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ticker=reduced?null:setInterval(()=>setFrame(n=>n+1),70);
  const timer=setTimeout(()=>{clearInterval(ticker);setSettled(true);callback.current?.();},reduced?0:1200);
  return()=>{clearInterval(ticker);clearTimeout(timer);};
 },[value]);
 const face=settled?value:Number.isInteger(value)?(frame*7+3)%20+1:'—';
 return <div className="animated-d20-tray" role="status" aria-live="polite" aria-label={settled?`${label}: ${value}`:Number.isInteger(value)?`${label}: Rolling`:`${label}: Ready`}><div className={'animated-d20'+(!settled&&Number.isInteger(value)?' tumbling':'')} aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M60 4 110 32 110 88 60 116 10 88 10 32Z"/><path className="die-edges" d="M60 4 30 75 90 75Z M10 32 30 75 10 88 M110 32 90 75 110 88 M30 75 60 116 90 75 M10 32 60 4 110 32"/></svg><strong>{face}</strong></div><span>{label} · {settled?'Result':Number.isInteger(value)?'Rolling…':'Ready'}</span></div>;
}
