import React from 'react';
import {PHASES} from '../shared/phases.mjs';

const GROUPS=[
 {id:'initial',label:'Initial orders'},
 {id:'movement',label:'Movement'},
 {id:'combat',label:'Combat'},
 {id:'end',label:'End of turn'}
];

function shipActionReady(ship,phase,turn){
 const trial=ship.private_state?.trial;
 if(!trial)return null;
 if(phase==='power')return trial.powerAllocation?.turn===turn;
 if(phase==='ew_commit')return trial.ewAllocation?.turn===turn;
 if(phase==='initiative')return trial.initiative?.turn===turn;
 if(phase==='movement')return !ship.speed||trial.movement?.turn===turn&&trial.movement.state?.remaining===0;
 return true;
}

export default function TurnTimeline({detail,user,onRefresh,onOpenSystems}){
 if(!detail)return <section className="panel turn-timeline"><h2>Battle turn guide</h2><p>Start or join a battle to see the current step, who needs to act and what comes next.</p></section>;
 const turn=detail.game.turn;
 const index=Math.max(0,PHASES.findIndex(phase=>phase.id===detail.game.phase_id));
 const current=PHASES[index];
 const previous=PHASES[(index+PHASES.length-1)%PHASES.length];
 const next=PHASES[(index+1)%PHASES.length];
 const ownShips=(detail.ships||[]).filter(ship=>ship.owner_id===user?.id);
 const waiting=detail.needsAction?'Your action is required':detail.myOrder?'Your order is locked; waiting for the other player.':'Waiting for the current player.';
 return <section className="panel turn-timeline" aria-labelledby="turn-guide-title">
  <div className="turn-guide-head">
   <div><small>TURN {turn} · STEP {index+1} OF {PHASES.length}</small><h2 id="turn-guide-title">{current.label}</h2></div>
   <div className="turn-guide-tools"><span className={'turn-action-status '+(detail.needsAction?'is-required':'is-waiting')}>{detail.needsAction?'Action required':'Waiting'}</span><button type="button" className="secondary" onClick={onRefresh}>Refresh</button></div>
  </div>
  <progress className="turn-progress" value={index+1} max={PHASES.length} aria-label={'Turn sequence step '+(index+1)+' of '+PHASES.length}/>
  <div className="turn-groups" aria-label="Turn sequence groups">{GROUPS.map((group,groupIndex)=>{
   const first=PHASES.findIndex(phase=>phase.group===group.id),last=PHASES.map(phase=>phase.group).lastIndexOf(group.id);
   const state=index>last?'complete':index>=first?'current':'upcoming';
   return <div className={'turn-group '+state} key={group.id}><span>{state==='complete'?'✓':groupIndex+1}</span>{group.label}</div>;
  })}</div>
  <p className="turn-waiting"><strong>{waiting}</strong>{current.mode==='automatic'&&' This is an automatic reveal/barrier step; there are no ship settings to enter.'}</p>
  <div className="turn-neighbours"><div><small>PREVIOUS</small><span>{previous.label}</span></div><div><small>UP NEXT</small><span>{next.label}</span></div></div>
  {ownShips.length>0&&<div className="turn-ship-actions"><strong>Your ship actions</strong>{ownShips.map(ship=>{
   const ready=shipActionReady(ship,detail.game.phase_id,turn);
   return <button type="button" className="secondary" key={ship.id} onClick={()=>onOpenSystems(ship)}>{ship.label} <span>{ready===null?'Open systems':ready?'✓ Ready':'● Action needed'}</span></button>;
  })}</div>}
  <div className="turn-readiness">{(detail.readiness||[]).map(player=><span key={player.id} className={player.submitted?'ready':''}>{player.submitted?'✓':'◷'} {player.name}: {player.submitted?'submitted':player.required?'action required':'waiting'}</span>)}</div>
  <div className="turn-guide-foot"><p>Only procedures that apply to this fleet need a response. Inapplicable fighter, ballistic and support-unit steps are skipped for a ship-only Vorchan battle.</p><button type="button" onClick={()=>document.getElementById('phase-submit')?.scrollIntoView({behavior:'smooth',block:'start'})}>Review this step</button></div>
 </section>;
}
