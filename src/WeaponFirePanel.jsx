import React,{useMemo,useState,useEffect} from 'react';
import {VORCHAN_LIBRARY_RECORD as VORCHAN} from '../shared/vorchan-trial-library.mjs';
import {checkMountArc,vorchanTargetingPreview} from '../shared/weapon-targeting.mjs';
import {attackId} from '../shared/weapon-resolution.mjs';
import {vorchanHitToken} from '../shared/vorchan-damage.mjs';
import {facingDirections} from '../shared/weapon-targeting.mjs';
const names={plasma_forward:'Plasma Accelerator',twin_nose_port:'Port Twin Array',twin_nose_starboard:'Starboard Twin Array'};
const mountOrder=VORCHAN.weaponMounts;
const gunKeys=ship=>mountOrder.flatMap(m=>Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>({shipId:ship.id,mountId:m.id,gun:i+1})));
const xy=p=>({x:Math.sqrt(3)*(p.q+p.r/2),y:1.5*p.r});
function ArcPlot({ship,ships,selectedMount,selectedTarget,onTarget}){
 const m=mountOrder.find(x=>x.id===selectedMount)||mountOrder[0],range=10;
 const facing=-60+ship.facing*60;
 const half=m.arc.coverageDegrees/2;
 const points=Array.from({length:61},(_,i)=>{const a=(facing-half+i*2*half/60)*Math.PI/180;return [100+range*7*Math.cos(a),100+range*7*Math.sin(a)]});
 const path='M100 100 L'+points.map(p=>p.join(' ')).join(' L')+' Z';
 return <svg className="weapon-arc-map" viewBox="0 0 200 200" role="img" aria-label={m.arc.coverageDegrees+' degree forward firing arc and nearby ships'}>
  <circle cx="100" cy="100" r="70" fill="none" stroke="#43637b" strokeDasharray="3 5"/>
  <path d={path} fill="#59a8db" fillOpacity=".17" stroke="#8bcdf2" strokeWidth="1"/>
  <line x1="100" y1="100" x2={100+75*Math.cos(facing*Math.PI/180)} y2={100+75*Math.sin(facing*Math.PI/180)} stroke="#f1d39b" strokeWidth="1.5"/>
  <circle cx="100" cy="100" r="5" fill="#f1d39b"/>
  {ships.filter(s=>s.id!==ship.id).map(s=>{const p=xy(s),o=xy(ship),dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy)||1,scale=Math.min(65/d,7),x=100+dx*scale,y=100+dy*scale,allowed=checkMountArc({shooter:ship,target:s,arc:m.arc}).allowed;return <g key={s.id} onClick={()=>onTarget(s.id)} style={{cursor:'pointer'}}><circle cx={x} cy={y} r="7" fill={allowed?'#66bfb5':'#a25d63'} stroke={selectedTarget===s.id?'white':'#a8c4d8'} strokeWidth={selectedTarget===s.id?2:1}/><text x={x} y={y-11} fill="#eaf5ff" fontSize="8" textAnchor="middle">{s.label||s.id.slice(0,7)}</text></g>})}
 </svg>;
}
export default function WeaponFirePanel({phase,ships=[],userId,fireView,preflight,fireDraft,onFireDraft,defenceDraft,onDefenceDraft,onCombatAction,isHost=false}){
 const own=ships.filter(s=>s.owner_id===userId&&s.public_state?.libraryId===VORCHAN.id);
 const enemy=ships.filter(s=>s.owner_id!==userId);
 const [shipId,setShipId]=useState('');
 const [mountId,setMountId]=useState('plasma_forward');
 const [targetId,setTargetId]=useState('');
 const [role,setRole]=useState('offensive');
 const [gun,setGun]=useState(1);
 const [chargeTurns,setChargeTurns]=useState(3);
 const [firingOrder,setFiringOrder]=useState(1);
 const [choiceError,setChoiceError]=useState('');
 const [terrainText,setTerrainText]=useState('[]');
 const [combatChoices,setCombatChoices]=useState({});
 const [combatBusy,setCombatBusy]=useState(false);
 async function combatAction(route,body){setCombatBusy(true);setChoiceError('');try{await onCombatAction(route,body)}catch(e){setChoiceError(e.message)}finally{setCombatBusy(false)}}
 const ship=own.find(s=>s.id===shipId)||own[0];
 const target=enemy.find(s=>s.id===targetId)||enemy[0];
 const mount=mountOrder.find(m=>m.id===mountId);
 const fire=useMemo(()=>{try{const x=JSON.parse(fireDraft);return Array.isArray(x.shots)?x.shots:[]}catch{return []}},[fireDraft]);
 const defence=useMemo(()=>{try{const x=JSON.parse(defenceDraft);return Array.isArray(x.assignments)?x.assignments:[]}catch{return []}},[defenceDraft]);
 const preview=useMemo(()=>{if(!ship||!target||role!=='offensive')return null;try{return vorchanTargetingPreview({shooter:ship,target:{...target,libraryId:target.public_state?.libraryId,hullClass:'heavy_combat'},mountId,verifiedTerrain:false})}catch(e){return {blockers:[e.message]}}},[ship,target,mountId,role]);
 function setShots(shots){onFireDraft(JSON.stringify({shots}));setChoiceError('')}
 function addShot(){
  if(!ship||!mount){setChoiceError('Select a ship and a weapon');return}
  if(role==='offensive'&&!target){setChoiceError('Select an enemy target');return}
  if(role==='offensive'&&!checkMountArc({shooter:ship,target,arc:mount.arc}).allowed){setChoiceError('Enemy outside the selected weapon arc');return}
  const next={shipId:ship.id,mountId,gun,role};
  if(role==='offensive'){next.targetId=target.id;next.order=firingOrder;if(mountId==='plasma_forward')next.chargeTurns=chargeTurns}
  const shots=fire.filter(s=>!(s.shipId===ship.id&&s.mountId===mountId&&s.gun===gun));
  if(next.role==='offensive'&&shots.some(s=>s.role==='offensive'&&s.shipId===ship.id&&s.targetId===target.id&&s.order===next.order)){setChoiceError('This ship already uses that firing priority against this target');return}
  setShots([...shots,next]);
 }
 const declarations=fireView?.declarations||[];
 const incoming=declarations.flatMap(d=>(d.fire?.shots||[]).filter(s=>s.role==='offensive'&&own.some(o=>o.id===s.targetId)).map(s=>({...s,id:attackId(s)})));
 const reserves=declarations.find(d=>d.playerId===userId)?.fire?.shots.filter(s=>s.role==='defensive')||[];
 function allocate(reserve,attack){const key=attackId(reserve);onDefenceDraft(JSON.stringify({assignments:[...defence.filter(d=>attackId(d)!==key),{shipId:reserve.shipId,mountId:reserve.mountId,gun:reserve.gun,attackId:attack}]}))}
 return <section className="panel weapon-fire-ui" id="weapon-fire"><h2>{phase==='fire_commit'?'Secret weapon orders':'Fire reveal and defensive allocation'}</h2>
 {phase==='fire_commit'?<>
  <p>Three forward mounts: one Plasma Accelerator (90°) and two Twin Arrays (270° each). Each Twin Array has two independent guns. Declarations remain secret until both players lock.</p>
  <div className="weapon-grid"><div>
   <label>Firing ship <select aria-label="Firing ship" value={ship?.id||''} onChange={e=>setShipId(e.target.value)}>{own.map(s=><option key={s.id} value={s.id}>{s.label||s.id}</option>)}</select></label>
   <label>Forward weapon <select aria-label="Weapon mount" value={mountId} onChange={e=>{setMountId(e.target.value);setGun(1);if(e.target.value==='plasma_forward')setRole('offensive')}}>{mountOrder.map(m=><option key={m.id} value={m.id}>{names[m.id]} — {m.arc.coverageDegrees}°</option>)}</select></label>
   <label>Gun <select aria-label="Gun number" value={gun} onChange={e=>setGun(Number(e.target.value))}>{Array.from({length:mount?.weaponId==='twin-array'?2:1},(_,i)=><option key={i} value={i+1}>{i+1}</option>)}</select></label>
   <label>Assignment <select aria-label="Fire role" value={role} onChange={e=>setRole(e.target.value)}><option value="offensive">Offensive fire</option>{mountId!=='plasma_forward'&&<option value="defensive">Reserve for defence</option>}</select></label>
   {role==='offensive'&&<><label>Target <select aria-label="Fire target" value={target?.id||''} onChange={e=>setTargetId(e.target.value)}>{enemy.map(s=><option key={s.id} value={s.id}>{s.label||s.id}</option>)}</select></label>{mountId==='plasma_forward'&&<label>Plasma charging <select aria-label="Plasma charging turns" value={chargeTurns} onChange={e=>setChargeTurns(Number(e.target.value))}><option value={1}>1 turn — 1d10+4</option><option value={2}>2 turns — 2d10+8</option><option value={3}>3 turns — 4d10+12</option></select></label>}</>}
   {role==='offensive'&&<label>Firing priority (1–100) <input aria-label="Firing order" type="number" min="1" max="100" value={firingOrder} onChange={e=>setFiringOrder(Math.max(1,Math.min(100,Math.floor(Number(e.target.value)||1))))}/></label>}
   <button type="button" disabled={!ship} onClick={addShot}>Add / update gun order</button>{choiceError&&<p className="error" role="alert">{choiceError}</p>}
   {preview&&<p className="hint">Arc: {preview.attackArc?.allowed?'in arc':'outside arc'}. Distance: {preview.distance??'unknown'} hexes. {preview.blockers?.length?'Final hit preview pending: '+preview.blockers.join('; '):'Ready for calculation'}.</p>}
  </div><div>{ship&&<ArcPlot ship={ship} ships={ships} selectedMount={mountId} selectedTarget={target?.id} onTarget={setTargetId}/>}<p className="hint">Highlighted sector shows the selected mount's firing coverage. Click an enemy marker to select it. This is a geometric preview, not a verified line-of-sight or hit roll.</p></div></div>
  <h3>Prepared declarations ({fire.length})</h3>{fire.length?<table><thead><tr><th>Ship / weapon</th><th>Gun</th><th>Order</th><th>Action</th></tr></thead><tbody>{fire.map(s=><tr key={attackId(s)}><td>{ships.find(x=>x.id===s.shipId)?.label||s.shipId} · {names[s.mountId]}</td><td>{s.gun}</td><td>{s.role==='defensive'?'Defensive reserve':(ships.find(x=>x.id===s.targetId)?.label||s.targetId)+' · #'+s.order}</td><td><button type="button" onClick={()=>setShots(fire.filter(x=>attackId(x)!==attackId(s)))}>Remove</button></td></tr>)}</tbody></table>:<p>All guns holding fire.</p>}
  <p>Locked players: {fireView?.committed?.length||0}. {fireView?.own?'Your order has been submitted.':''}</p>
 </>:<>
  <p>Both players' declared attacks are visible. Only previously reserved guns may be allocated to incoming attacks. Offensive attacks cannot advance to the next phase until authoritative server resolution is implemented. Battles without offensive attacks can still advance.</p>
  {declarations.map(d=><div key={d.playerId}><h3>{d.playerId===userId?'Your declared fire':'Opponent declared fire'}</h3>{d.fire?.shots?.length?<table><thead><tr><th>Weapon</th><th>Gun</th><th>Assignment</th></tr></thead><tbody>{d.fire.shots.map(s=><tr key={attackId(s)}><td>{names[s.mountId]} ({ships.find(x=>x.id===s.shipId)?.label||s.shipId})</td><td>{s.gun}</td><td>{s.role==='defensive'?'Reserved':(ships.find(x=>x.id===s.targetId)?.label||s.targetId)+' · order '+s.order}</td></tr>)}</tbody></table>:<p>Holding fire.</p>}</div>)}
  <h3>Defensive interception</h3>{reserves.length?reserves.map(r=>{const key=attackId(r),eligible=incoming.filter(a=>a.targetId===r.shipId&&checkMountArc({shooter:ships.find(s=>s.id===r.shipId),target:ships.find(s=>s.id===a.shipId),arc:mountOrder.find(m=>m.id===r.mountId).arc}).allowed);const selected=defence.find(d=>attackId(d)===key)?.attackId||'';return <label key={key} className="weapon-defence-row">{names[r.mountId]} gun {r.gun} <select aria-label={'Defensive target for '+key} value={selected} onChange={e=>{if(e.target.value)allocate(r,e.target.value);else onDefenceDraft(JSON.stringify({assignments:defence.filter(d=>attackId(d)!==key)}))}}><option value="">Do not intercept</option>{eligible.map(a=><option key={a.id} value={a.id}>{ships.find(s=>s.id===a.shipId)?.label||a.shipId} · {names[a.mountId]} gun {a.gun}</option>)}</select></label>}):<p>No defensive guns were reserved.</p>}
  <h3>Server dice journal</h3>{preflight?.rollsCommitted?<><p>Both defenders have locked. These dice are stored and will not be rerolled on refresh. Damage remains pending verified adjudication.</p><table><thead><tr><th>Attack</th><th>Hit d20</th><th>Location d20</th><th>Primary d20</th><th>Damage d10</th></tr></thead><tbody>{(preflight.rollJournal||[]).map(r=><tr key={r.attackId}><td>{r.attackId}</td><td>{r.roll}</td><td>{r.locationRoll}</td><td>{r.primaryRoll}</td><td>{r.damageDice.join(', ')}</td></tr>)}</tbody></table></>:<p>Dice are rolled by the server only after both defensive allocations have been committed.</p>}
  {preflight?.rollsCommitted&&<>
   <h3>Combat adjudication</h3>
   {isHost&&!preflight.terrainVerified&&<div><p>Confirm the battlefield's blocking terrain before rolling hits. Enter the blocking hex coordinates as a JSON array, e.g. <code>{'[{"q":2,"r":3}]'} </code>. An empty array explicitly confirms clear terrain.</p><label>Blocking terrain hexes <textarea value={terrainText} onChange={e=>setTerrainText(e.target.value)} rows={3}/></label><button disabled={combatBusy} onClick={()=>{try{const blockingHexes=JSON.parse(terrainText);combatAction('combat-terrain',{confirmed:true,blockingHexes})}catch{setChoiceError('Invalid terrain JSON')}}}>Confirm battlefield terrain</button></div>}
   {preflight.terrainVerified&&<p>Battlefield terrain verified. {preflight.damageApplied?'Damage committed.':'Defenders may allocate confirmed hits before the final damage commit.'}</p>}
   {(preflight.attacks||[]).filter(a=>own.some(o=>o.id===a.targetId)&&(a.hit===true&&!preflight.defenderChoices?.[a.id]?.systemChoice||a.hit===null&&a.blockers?.some(x=>/boundary direction/i.test(x)))).map(a=>{
    const source=ships.find(x=>x.id===a.shipId),defender=ships.find(x=>x.id===a.targetId);
    const dir=source&&defender?facingDirections(source,defender):null;
    const c=combatChoices[a.id]||{incoming:preflight.defenderChoices?.[a.id]?.incoming||(dir?.requiresChoice?'':dir?.direction||'forward'),sideChoice:'',systemChoice:''};
    const dice=preflight.rollJournal?.find(r=>r.attackId===a.id);
    let hit=null;try{if(dice&&c.incoming)hit=vorchanHitToken({incoming:c.incoming,locationRoll:dice.locationRoll,primaryRoll:dice.primaryRoll,sideChoice:c.sideChoice||null})}catch{}
    const update=(key,value)=>setCombatChoices(prev=>({...prev,[a.id]:{...c,[key]:value}}));
    return <div key={a.id} className="weapon-defence-row"><strong>Allocate hit: {a.id}</strong>
     <label>Incoming direction <select value={c.incoming} onChange={e=>update('incoming',e.target.value)}><option value="">Choose…</option>{(dir?.requiresChoice?dir.choices:[dir?.direction]).filter(Boolean).map(x=><option key={x} value={x}>{x}</option>)}</select></label>
     {['port','starboard'].includes(c.incoming)&&<label>Side hit chart <select value={c.sideChoice} onChange={e=>update('sideChoice',e.target.value)}><option value="">Choose…</option><option value="forward">Forward hull</option><option value="aft">Aft hull</option></select></label>}
     {hit&&!hit.requiresChoice&&hit.candidates.length>1&&<label>Damaged system <select value={c.systemChoice} onChange={e=>update('systemChoice',e.target.value)}><option value="">Choose…</option>{hit.candidates.map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>}
     <button disabled={combatBusy||!c.incoming||a.hit===true&&(['port','starboard'].includes(c.incoming)&&!c.sideChoice||hit?.candidates?.length>1&&!c.systemChoice)} onClick={()=>combatAction('combat-choice',{attackId:a.id,choice:{incoming:c.incoming,...(a.hit===true&&c.sideChoice?{sideChoice:c.sideChoice}:{}),...(a.hit===true&&c.systemChoice?{systemChoice:c.systemChoice}:{})}})}>Lock defender choice</button>
    </div>;
   })}
   {isHost&&preflight.terrainVerified&&!preflight.damageApplied&&<button disabled={combatBusy} onClick={()=>combatAction('combat-resolve',{})}>Resolve verified combat and advance</button>}
   {choiceError&&<p className="error" role="alert">{choiceError}</p>}
  </>}
  <h3>Authoritative firing preflight</h3>{preflight?.attacks?.length?preflight.attacks.map(a=><p key={a.id}>{a.id} → {a.targetId}: {a.blockers.length?a.blockers.join('; '):'Awaiting server attack roll'}</p>):<p>No attacks available for resolution.</p>}
 </>}</section>;
}
