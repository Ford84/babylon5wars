import {facingLabel} from '../shared/ship-facing.mjs';
import InitiativeDialog from './InitiativeDialog.jsx';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Map3D,{saveLocalVorchanModel,clearLocalVorchanModel,hasLocalVorchanModel} from './Map3D.jsx';
import Map2D from './Map2D.jsx';
import VorchanShowcase from './VorchanShowcase.jsx';
import BattleSetupPanel from './BattleSetupPanel.jsx';
import BattleLobbyList from './BattleLobbyList.jsx';
import ShipSystems from './ShipSystems.jsx';
import BattleActions from './BattleActions.jsx';
import {useWeaponPlayback,ShotResults} from './WeaponEffects.jsx';
import {PLAY_PHASES,SCENARIO_RULES} from '../shared/automated-battle.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import BattleJournal from './BattleJournal.jsx';
import './style.css';


function App(){
 const [token,setToken]=useState(()=>sessionStorage.getItem('b5w_token')||''),[user,setUser]=useState(null),[games,setGames]=useState([]),[gameId,setGame]=useState(''),[detail,setDetail]=useState(null),[events,setEvents]=useState([]);
 const [name,setName]=useState(''),[password,setPassword]=useState(''),[title,setTitle]=useState('New Battle'),[joinCode,setJoin]=useState(''),[invite,setInvite]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [mapPreset,setMap]=useState('standard'),[mapMode,setMode]=useState('3d'),[modelId,setModel]=useState('attack-cruiser-rc2'),[localModel,setLocal]=useState(false),[positions,setPositions]=useState([{q:3,r:10,facing:0},{q:15,r:10,facing:3}]);
 const [selected,setSelected]=useState(''),[scs,setSCS]=useState(false),[initiativeOpen,setInitiativeOpen]=useState(false),[revealedAttack,setRevealedAttack]=useState(null);
 const {volley,latest,replay}=useWeaponPlayback(events,gameId,detail?.game.id===gameId,detail?.resolution?.stage==='attack_result'&&revealedAttack!==detail.game.turn+':'+detail.resolution.attack.id);
 const requestScope=useRef(''),loadNumber=useRef(0);requestScope.current=token+':'+gameId;
 const api=useCallback(async(path,method='GET',body)=>{
  const response=await fetch('/api'+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const value=await response.json();if(!response.ok){const e=new Error(value.error||'Request Failed');e.status=response.status;throw e;}return value;
 },[token]);
 const load=useCallback(async()=>{
  if(!token)return;
  const scope=token+':'+gameId,request=++loadNumber.current;
  try{
   const [me,list,d,log]=await Promise.all([api('/me'),api('/games'),gameId?api('/games/'+gameId):null,gameId?api('/games/'+gameId+'/events'):[]]);
   if(requestScope.current!==scope||request!==loadNumber.current)return;
   setUser(me);setGames(list);setDetail(d);setEvents(log);
   if(d){setMap(d.game.map_preset||'standard');setModel(d.game.model_id||'attack-cruiser-rc2');}
  }catch(e){if(requestScope.current!==scope||request!==loadNumber.current)return;if(e.status===401){setToken('');sessionStorage.removeItem('b5w_token');}setError(e.message);}
 },[api,gameId,token]);
 useEffect(()=>{load();if(!token)return;const timer=setInterval(load,3000);return()=>clearInterval(timer);},[load,token]);
 useEffect(()=>{hasLocalVorchanModel().then(setLocal).catch(()=>{});},[]);
 useEffect(()=>{const close=e=>{if(e.key==='Escape')setSCS(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
 async function action(fn){setBusy(true);setError('');try{await fn();await load();}catch(e){setError(e.message);await load();}finally{setBusy(false);}}
 const send=command=>action(async()=>{await api('/games/'+gameId+'/battle-command','POST',{expectedRevision:detail.game.revision,command});});
 const login=register=>action(async()=>{if(register)await api('/register','POST',{name,password});const result=await api('/login','POST',{name,password});sessionStorage.setItem('b5w_token',result.token);setToken(result.token);setPassword('');});
 const setup=patch=>action(async()=>{const map=patch.mapPreset??mapPreset,model=patch.modelId??modelId;if(detail?.game.status==='setup')await api('/games/'+gameId+'/setup','POST',{expectedRevision:detail.game.revision,mapPreset:map,modelId:model});setMap(map);setModel(model);});
 const ships=detail?.ships||[],shuttles=detail?.shuttles||[],mapUnits=[...ships.filter(x=>!x.withdrawn&&!x.public_state?.condition?.shipDestroyed),...shuttles.filter(x=>x.status==='deployed'),...(detail?.jumpPoints||[])],selectedUnit=mapUnits.find(x=>x.id===selected),current=ships.find(s=>s.id===selected)||ships.find(s=>s.owner_id===user?.id)||ships[0],active=detail&&detail.game.status!=='setup';
 const openGame=id=>{setGame(id);setDetail(null);setSCS(false);setInitiativeOpen(false);setRevealedAttack(null);setInvite('');setError('');};
 return <main className={active?'automated-game':'staging'}><header><div><small>{active?'TACTICAL COMMAND':'BATTLE PREPARATION'}</small><h1>Babylon 5 Wars</h1></div><div>{token&&<><button className="secondary" onClick={()=>openGame('')}>Battle Lobby</button><button className="secondary" onClick={()=>action(async()=>{await api('/logout','POST');sessionStorage.removeItem('b5w_token');setToken('');setUser(null);openGame('');})}>Sign Out</button></>}</div></header>
  {error&&<p role="alert" className="error">{error}</p>}
  {!token?<><section className="panel auth-panel"><h2>Player Access</h2><form onSubmit={e=>{e.preventDefault();login(false);}}><label>Player Name<input required autoComplete="username" maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" minLength={12} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label><button disabled={busy}>Sign In</button><button type="button" className="secondary" disabled={busy||name.length<3||password.length<12} onClick={()=>login(true)}>Create Account</button></form></section><VorchanShowcase selectedModelId={modelId} onSelectedModelChange={setModel}/></>:!active?<>
   <section className="panel"><h2>Battle Lobby</h2><p>Signed In As {user?.display_name||user?.name}</p><label>Battle Name<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={100}/></label><button disabled={busy} onClick={()=>action(async()=>{const g=await api('/games','POST',{title,mapPreset,modelId});openGame(g.id);})}>Create Battle</button><button className="secondary" disabled={busy} onClick={()=>action(async()=>{const g=await api('/games','POST',{title:title==='New Battle'?'Solo Test Battle':title,mapPreset,modelId,mode:'solo-test'});setPositions([{q:3,r:10,facing:0},{q:6,r:7,facing:3}]);openGame(g.id);})}>Create Solo Test</button><p>Solo Test adds a passive opponent automatically. No second login is needed.</p><label>Invitation Code<input value={joinCode} onChange={e=>setJoin(e.target.value)}/></label><button disabled={busy||!joinCode.trim()} onClick={()=>action(async()=>{const r=await api('/invitations/redeem','POST',{token:joinCode.trim()});openGame(r.gameId);setJoin('');})}>Join Battle</button>
    <BattleLobbyList games={games} userId={user?.id} currentGameId={gameId} deletingGameId={busy?'busy':''} onOpen={g=>openGame(g.id)} onDelete={g=>{if(window.confirm('Delete this battle and its saved records?'))action(async()=>{await api('/games/'+g.id,'DELETE');if(g.id===gameId)openGame('');});}}/>
   </section>
   <details className="panel"><summary>Scenario Rules</summary><p>{SCENARIO_RULES.label} · {SCENARIO_RULES.terrain}</p><p>{SCENARIO_RULES.scope}</p><p>Weapon Critical 13: {SCENARIO_RULES.weaponCritical13}</p><p>All weapons start fully armed. Criticals and upkeep resolve automatically.</p></details>
   <BattleSetupPanel game={detail?.game} user={user} mapPreset={mapPreset} onMapPresetChange={value=>setup({mapPreset:value})} mapMode={mapMode} onMapModeChange={setMode} modelId={modelId} onModelChange={value=>setup({modelId:value})} busy={busy} positions={positions} onPositionsChange={setPositions} hasLocalModel={localModel} onLocalModel={file=>file&&action(async()=>{await saveLocalVorchanModel(file);setLocal(true);})} onClearLocalModel={()=>action(async()=>{await clearLocalVorchanModel();setLocal(false);})}/>
   {detail?.game.status==='setup'&&<section className="panel"><h2>{detail.game.title}</h2><h3>{detail.game.mode==='solo-test'?'Solo Test · You And A Passive Opponent':'Players · '+detail.members.length+'/2'}</h3>{detail.game.mode==='solo-test'&&<p>The opponent holds fire and makes no voluntary moves. Its required actions and damage choices complete automatically.</p>}{detail.members.map(m=><p key={m.user_id}>{m.display_name}</p>)}
    {detail.game.host_id===user?.id&&<>{detail.game.mode!=='solo-test'&&<button disabled={busy} onClick={()=>action(async()=>{const r=await api('/games/'+gameId+'/invite','POST',{});setInvite(r.token);})}>Create Invitation</button>}{invite&&<label>Single-Use Invitation Code<input readOnly value={invite} onFocus={e=>e.target.select()}/></label>}
     {detail.ships.length===0?<button disabled={busy||detail.members.length!==2} onClick={()=>action(async()=>{await api('/games/'+gameId+'/trial-vorchan','POST',{expectedRevision:detail.game.revision,shipCatalogId:LIB.id,positions});})}>Assign Two Vorchans</button>:<button disabled={busy||detail.ships.length!==2||detail.members.length!==2} onClick={()=>action(async()=>{await api('/games/'+gameId+'/start','POST',{expectedRevision:detail.game.revision});})}>Start Battle</button>}
    </>}{detail.ships.map(s=><p key={s.id}>{s.label} · Hex ({s.q}, {s.r})</p>)}</section>}
  </>:!detail.automated?<section className="panel"><h2>Earlier Battle Version</h2><p>This battle’s records are preserved. Start a new battle to use automatic condition, rules and damage tracking.</p><button onClick={()=>openGame('')}>Return To Battle Lobby</button></section>:<>
   <section className="panel turn-timeline"><div className="sectionhead"><h2>{detail.game.title} · {detail.game.status==='finished'?'Battle Finished':'Turn '+detail.game.turn+' · '+detail.phase.label}</h2><span className="pill">{detail.game.status==='finished'?(detail.winner?detail.members.find(m=>m.user_id===detail.winner)?.display_name+' Wins':'Draw'):detail.needsAction?'Your Action':'Waiting'}</span></div>
    <nav className="phase-nav" aria-label="Turn Sequence">{PLAY_PHASES.map(p=><span className={p.id===detail.game.phase_id?'current-phase':''} key={p.id}>{p.label}</span>)}</nav>
    {detail.game.status==='finished'&&<p>All final damage and critical results are saved below.</p>}
   </section>
   {ships.filter(x=>x.public_state.jumpCheck?.turn===detail.game.turn).map(x=><section className="panel" key={x.id}><h2>Jump Engine Check · {x.label}</h2><p>d100 {x.public_state.jumpCheck.roll} · {x.public_state.jumpCheck.risk}% Explosion Risk · <strong>{x.public_state.jumpCheck.exploded?'Ship Destroyed':'Jump Engine Safe'}</strong></p></section>)}
   <div className="layout"><section className="battle"><div className="sectionhead"><h2>Tactical Battlefield</h2><label>View<select value={mapMode} onChange={e=>setMode(e.target.value)}><option value="3d">3D</option><option value="2d">2D</option></select></label></div>
    {mapMode==='3d'?<Map3D ships={mapUnits} selected={selectedUnit?.id||current?.id} setSelected={setSelected} preset={mapPreset} modelId={modelId} volley={volley}/>:<Map2D ships={mapUnits} selected={selectedUnit?.id||current?.id} setSelected={setSelected} preset={mapPreset} volley={volley}/>}
    <div className="ship-status-grid">{ships.map(s=><button className="secondary" key={s.id} onClick={()=>{setSelected(s.id);setSCS(true);}}><strong>{s.label}</strong><span>{s.public_state.condition.shipDestroyed?'Destroyed':s.withdrawn?'Withdrawn':'Speed '+s.speed+' · '+(s.public_state.condition.commandDisabled?'Command Disabled':'Hex '+s.q+', '+s.r)}</span><span>Facing: {facingLabel(s.facing)}</span><span>Travel Direction: {s.public_state.travelFacing===null?'Stationary':facingLabel(s.public_state.travelFacing)}</span><span>Open Live SCS</span></button>)}</div><div className="ship-status-grid">{shuttles.filter(x=>x.status!=='aboard').map(x=><button key={x.id} className="secondary" onClick={()=>setSelected(x.id)}><strong>{x.label}</strong><span>{x.status} · Damage {x.public_state.damage.shuttleDamage}/10 · Armour 0</span><span>Speed {x.speed} · Hex ({x.q}, {x.r})</span><span>Facing: {facingLabel(x.facing)} · Travel: {x.public_state.travelFacing===null?'Stationary':facingLabel(x.public_state.travelFacing)}</span></button>)}</div>{detail.jumpPoints?.map(p=><p key={p.id}>{p.label} · {p.status==='forming'?'Forming · Usable From Turn '+p.activeTurn:p.forcedClose?'Open · Closes At Turn’s End':'Open'} · Hex ({p.q}, {p.r}) · Entry From {facingLabel(p.facing)}</p>)}
   </section><aside>
    <BattleActions key={gameId+':'+detail.game.turn+':'+detail.game.phase_id} detail={detail} userId={user?.id} send={send} busy={busy} onInitiative={()=>setInitiativeOpen(true)} onAttackRevealed={setRevealedAttack}/>
    {!detail.resolution&&<ShotResults event={latest} replay={replay}/>}
    <BattleJournal events={events} ships={[...ships,...shuttles]} members={detail.members}/>
   </aside></div>
   {initiativeOpen&&<InitiativeDialog key={gameId+':'+detail.game.turn} detail={detail} userId={user?.id} send={send} busy={busy} error={error} onClose={()=>setInitiativeOpen(false)}/>}
   {scs&&current&&<ShipSystems ship={current} shuttles={shuttles.filter(x=>x.carrierId===current.id)} onClose={()=>setSCS(false)}/>}
  </>}
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
