import React,{useEffect,useRef,useState} from 'react';
import {weaponEffects,sampleWeaponEffect,weaponPlaybackDuration} from '../shared/weapon-effects.mjs';
export function useWeaponPlayback(events,gameId,ready=true){
 const seen=useRef({gameId:null,ids:new Set()}),[volley,setVolley]=useState(null);
 const latest=ready&&events.find(e=>e.event_type==='weapons_fired'&&e.public?.attacks?.length);
 useEffect(()=>{
  if(!ready){seen.current={gameId:null,ids:new Set()};setVolley(null);return;}
  const shots=events.filter(e=>e.event_type==='weapons_fired');
  if(seen.current.gameId!==gameId){seen.current={gameId,ids:new Set(shots.map(e=>e.id))};setVolley(null);return;}
  const fresh=shots.filter(e=>!seen.current.ids.has(e.id));
  for(const e of shots)seen.current.ids.add(e.id);
  if(fresh.length){const e=fresh[0];setVolley({id:e.id,startedAt:performance.now(),effects:weaponEffects(e)});}
 },[events,gameId,ready]);
 useEffect(()=>{if(!volley)return;const timeout=setTimeout(()=>setVolley(null),weaponPlaybackDuration(volley.effects)+100);return()=>clearTimeout(timeout);},[volley]);
 return {volley,latest,replay:()=>latest&&setVolley({id:latest.id,startedAt:performance.now(),effects:weaponEffects(latest)})};
}
export function ShotResults({event,replay}){
 if(!event)return null;
 return <section className="panel"><h2>Latest Weapon Fire · Turn {event.turn}</h2>{event.public.attacks.map(a=><div key={a.id} className="server-dice"><p><strong>Attack d20 {a.roll} · Needs {a.targetNumber} Or Less · {a.hit?'Hit':'Miss'}</strong></p>{a.hit&&!a.damageDiscarded?<p>Damage: {a.damageDice.join(' + ')} · Total {a.damage} Before Armour · {a.mode||'Standard'}</p>:<p>{a.damageDiscarded?'Target Already Destroyed · No Further Damage':'No Damage Roll'}</p>}</div>)}<button className="secondary" onClick={replay}>Replay Weapon Effects</button></section>;
}
export default function WeaponEffects2D({volley,xy}){
 const [elapsed,setElapsed]=useState(0);
 useEffect(()=>{if(!volley)return;let frame;const tick=()=>{const time=performance.now()-volley.startedAt;setElapsed(time);if(time<weaponPlaybackDuration(volley.effects))frame=requestAnimationFrame(tick);};tick();return()=>cancelAnimationFrame(frame);},[volley]);
 if(!volley)return null;
 return <g pointerEvents="none" aria-label="Weapon Fire Animation">{volley.effects.map(e=>{
  const s=sampleWeaponEffect(e,elapsed);if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){s.t=1;s.tail=0;}if(!s.visible)return null;
  const a=xy(e.from.q,e.from.r),b=xy(e.to.q,e.to.r),point=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}),head=point(s.t),tail=point(e.effect==='beam'?0:s.tail);
  return <g key={e.id}><title>{e.hit?'Hit':'Miss'} · Weapon Fire</title>{s.t<1&&<><line x1={tail.x} y1={tail.y} x2={head.x} y2={head.y} stroke={e.colour} strokeWidth={e.effect==='plasma'?3:1.6} strokeLinecap="round"/><circle cx={head.x} cy={head.y} r={e.effect==='plasma'?2.2:1.4} fill="white"/></>}{s.impact>0&&<circle cx={b.x} cy={b.y} r={3+(1-s.impact)*9} fill="none" stroke={e.colour} opacity={s.impact} strokeWidth="2"/>}</g>;
 })}</g>;
}
