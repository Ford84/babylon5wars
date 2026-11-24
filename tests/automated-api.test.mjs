import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import worker from '../worker/index.mjs';
async function fixture({solo=false,start=true,autoReview=true,autoOperations=true}={}){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../migrations/',import.meta.url)).sort())sqlite.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const adapt=sql=>{
  const query=sqlite.prepare(sql);let args=[];
  return {
   bind(...values){args=values;return this;},
   async first(){return query.get(...args)||null;},
   async all(){return {results:query.all(...args)};},
   async run(){const r=query.run(...args);return {meta:{changes:Number(r.changes)}};},
   runSync(){const r=query.run(...args);return {meta:{changes:Number(r.changes)}};}
  };
 };
 const env={
  DB:{
   prepare:adapt,
   async batch(statements){
    sqlite.exec('BEGIN');
    try{const result=statements.map(statement=>statement.runSync());sqlite.exec('COMMIT');return result;}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
   }
  },
  ASSETS:{fetch:()=>new Response('assets')}
 };
 let gameId,revision;
 async function call(path,who='p1',method='GET',body){
  const response=await worker.fetch(new Request('https://battle.test/api'+path,{method,headers:{authorization:'Bearer '+who,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
  return {status:response.status,body:await response.json()};
 }
 for(const user of ['p1','p2']){sqlite.prepare('INSERT INTO users(id,display_name,password_hash) VALUES(?,?,?)').run(user,user,'fixture');const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user))).toString('hex');sqlite.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+1 day'))").run(hash,user);}
 const created=await call('/games','p1','POST',{title:'API Duel',mapPreset:'standard',modelId:'attack-cruiser-rc2',mode:solo?'solo-test':'multiplayer'});assert.equal(created.status,201);gameId=created.body.id;
 if(!solo){
 const invitation=await call('/games/'+gameId+'/invite','p1','POST',{});assert.equal(invitation.status,200);
 const joined=await call('/invitations/redeem','p2','POST',{token:invitation.body.token});assert.equal(joined.status,200);
 }
 let detail=(await call('/games/'+gameId)).body;revision=detail.game.revision;
 const assigned=await call('/games/'+gameId+'/trial-vorchan','p1','POST',{expectedRevision:revision,shipCatalogId:'centauri-vorchan-v3-2e-sf',positions:[{q:3,r:10,facing:0},{q:6,r:7,facing:3}]});assert.equal(assigned.status,201);
 detail=(await call('/games/'+gameId)).body;
 if(start){const started=await call('/games/'+gameId+'/start','p1','POST',{expectedRevision:detail.game.revision});assert.equal(started.status,200,JSON.stringify(started));}
 async function get(who='p1'){return (await call('/games/'+gameId,who)).body;}
 async function send(who,command,expected){
  const d=await get(who),result=await call('/games/'+gameId+'/battle-command',who,'POST',{expectedRevision:expected??d.game.revision,command});
  if(result.status===200)for(let i=0;i<100;i++){
   const now=await get(),r=now.criticalResolution||now.resolution;
   if(autoOperations&&['jump_formation','hangar','vortex_closure'].includes(now.game.phase_id)){const type={jump_formation:'jump',hangar:'hangar',vortex_closure:'vortex'}[now.game.phase_id];for(const actor of now.required){const current=await get(actor);const response=await call('/games/'+gameId+'/battle-command',actor,'POST',{expectedRevision:current.game.revision,command:{type,open:false,maintain:false}});assert.equal(response.status,200,JSON.stringify(response));}continue;}
   if(!r||!autoReview)break;
   const c=now.criticalResolution?{type:r.stage.endsWith('_roll')?'critical-roll':'critical-ok',stage:r.stage,checkId:r.check.id}:{type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates?.length?{value:r.candidates[0]}:{})};
   const response=await call('/games/'+gameId+'/battle-command',r.actorId,'POST',{expectedRevision:now.game.revision,command:c});assert.equal(response.status,200,JSON.stringify(response));
  }
  return result;
 }
 return {sqlite,call,get,send,gameId};
}
test('authenticated staging through two turns: no manual acknowledgements, no terrain entry, persistent server dice and private EW',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture();
 let d=await get();assert.equal(d.automated,true);assert.equal(d.phases.length,11);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'power'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'initiative'})).status,200);
 d=await get();const target=d.ships.find(s=>s.owner_id==='p2');
 assert.equal((await send('p1',{type:'ew',offensive:{[target.id]:8}})).status,200);
 let other=await get('p2');assert.equal(other.ships.find(s=>s.owner_id==='p1').public_state.ew,undefined);
 assert.equal((await send('p2',{type:'ew',defensive:8})).status,200);
 d=await get();assert.equal(d.game.phase_id,'movement');
 for(let i=0;i<2;i++){d=await get();const player=d.readiness.find(p=>p.required).id;assert.equal((await send(player,{type:'movement-done'})).status,200);}
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'fire',fire:{shots:[]}})).status,200);
 d=await get();assert.equal(d.game.turn,2);assert.equal(d.game.phase_id,'power');
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'power'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'initiative'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'ew',defensive:8})).status,200);
 for(let i=0;i<2;i++){d=await get();assert.equal((await send(d.readiness.find(p=>p.required).id,{type:'movement-done'})).status,200);}
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'fire',fire:{shots:[]}})).status,200);
 assert.equal((await get()).game.turn,3);
 const rows=sqlite.prepare('SELECT turn,event_type,public_json FROM events WHERE game_id=?').all(gameId);
 assert.equal(rows.filter(x=>x.event_type==='combat_dice').length,2);
 const exported=await call('/games/'+gameId+'/export','p2');assert.equal(exported.body.ships.find(s=>s.owner_id==='p1').private_state,undefined);
 for(const route of ['manual-combat-resolution','host-damage-override','initiative','combat-terrain'])assert.equal((await call('/games/'+gameId+'/'+route,'p1','POST',{})).status,410);
 sqlite.close();
});
test('duplicate and concurrent revisions cannot reapply commands or write partial battle state',async()=>{
 const {get,send,sqlite,gameId}=await fixture();
 const d=await get(),revision=d.game.revision;
 const result=await send('p1',{type:'power'},revision);assert.equal(result.status,200);
 const before=sqlite.prepare('SELECT * FROM battle_states').get();
 const again=await send('p1',{type:'power'},revision);assert.equal(again.status,409);
 assert.deepEqual(sqlite.prepare('SELECT * FROM battle_states').get(),before);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM events WHERE event_type='power_committed'").get().n,1);
 // Trigger guards stale snapshots even if two requests read the same revision.
 const statement=sqlite.prepare('UPDATE battle_states SET revision=?,state_json=? WHERE game_id=?');
 assert.throws(()=>statement.run(before.revision,before.state_json,gameId),/revision conflict/);
 assert.deepEqual(sqlite.prepare('SELECT * FROM battle_states').get(),before);
 sqlite.close();
});

test('real server dice, same-hex fire, defender choices, damage and criticals persist through reload',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture();
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'power'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'initiative'})).status,200);
 const initial=await get();const a=initial.ships.find(x=>x.owner_id==='p1'),b=initial.ships.find(x=>x.owner_id==='p2');
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'ew',offensive:{[p==='p1'?b.id:a.id]:8}})).status,200);
 for(let i=0;i<2;i++){
  const d=await get(),actor=d.readiness.find(x=>x.required).id;
  if(actor==='p1'){
   let r=await send('p1',{type:'move',action:{type:'speed',change:3,purchasedThrust:0,thrusters:{aft_port_thrust:3,aft_starboard_thrust:3}}});assert.equal(r.status,200,JSON.stringify(r));
   r=await send('p1',{type:'move',action:{type:'advance',hexes:3}});assert.equal(r.status,200,JSON.stringify(r));
  }
  assert.equal((await send(actor,{type:'movement-done'})).status,200);
 }
 let r=await send('p1',{type:'fire',fire:{shots:[{shipId:a.id,targetId:b.id,mountId:'plasma_forward',gun:1,chargeTurns:3,role:'offensive',order:1}]}});assert.equal(r.status,200,JSON.stringify(r));
 assert.equal((await send('p2',{type:'fire',fire:{shots:[]}})).status,200);
 let d=await get();
 for(let i=0;d.pending?.length&&i<5;i++){
  const p=d.pending[0],defender=d.ships.find(x=>x.id===p.targetId).owner_id;
  r=await send(defender,{type:'damage-choice',attackId:p.attackId,value:p.choices[0]});assert.equal(r.status,200,JSON.stringify(r));d=await get();
 }
 assert.ok(d.game.turn===2||d.game.status==='finished');
 const target=d.ships.find(x=>x.id===b.id),damage=target.public_state.damage;
 assert.ok(Object.values(damage.tracks).some(x=>x.marked>0));
 assert.deepEqual((await get()).ships.find(x=>x.id===b.id).public_state.damage,damage);
 const journal=sqlite.prepare("SELECT public_json FROM events WHERE event_type='combat_dice' AND game_id=?").all(gameId);
 assert.equal(journal.length,1);const dice=JSON.parse(journal[0].public_json).rolls[0];
 assert.equal(dice.damageDice.length,4);assert.ok(dice.roll>=1&&dice.roll<=20);
 const raw=await call('/games/'+gameId+'/events','p2');assert.ok(raw.body.some(x=>x.event_type==='damage_resolved'));
 sqlite.close();
});

test('two concurrent commands against one revision commit exactly one full transaction',async()=>{
 const {get,send,sqlite}=await fixture(),d=await get();
 const results=await Promise.all([send('p1',{type:'power'},d.game.revision),send('p2',{type:'power'},d.game.revision)]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
 assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM events WHERE event_type='power_committed'").get().n,1);
 const snapshot=sqlite.prepare('SELECT revision,state_json FROM battle_states').get();
 assert.equal(snapshot.revision,(await get()).game.revision);
 assert.equal(Object.keys(JSON.parse(snapshot.state_json).locks).length,1);
 sqlite.close();
});

test('authenticated combined thrust and travel capture one revision and persist the new hex',async()=>{
 const {get,send,sqlite}=await fixture();
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'power'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'initiative'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'ew',defensive:8})).status,200);
 const before=await get(),actor=before.readiness.find(p=>p.required).id,ship=before.ships.find(x=>x.owner_id===actor);
 const action={type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}};
 const result=await send(actor,{type:'move',action,advanceAfter:1});assert.equal(result.status,200,JSON.stringify(result));
 const after=await get(actor),moved=after.ships.find(x=>x.id===ship.id);
 assert.equal(after.game.revision,before.game.revision+1);assert.equal(moved.speed,1);assert.notDeepEqual([moved.q,moved.r],[ship.q,ship.r]);
 assert.equal(moved.private_state.trial.movement.state.remaining,0);
 const event=sqlite.prepare("SELECT public_json FROM events WHERE event_type='ship_moved'").get();assert.equal(JSON.parse(event.public_json).advanceAfter,1);
 const row=sqlite.prepare('SELECT q,r FROM ships WHERE id=?').get(ship.id);assert.deepEqual([row.q,row.r],[moved.q,moved.r]);
 sqlite.close();
});

test('solo test needs one human through three turns and the passive account cannot sign in',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture({solo:true});
 let d=await get();const passive=d.members.find(m=>m.role==='passive');assert.ok(passive);assert.equal(passive.display_name,'Passive Opponent');
 assert.equal(d.readiness.find(x=>x.id===passive.user_id).submitted,true);
 assert.equal((await call('/games/'+gameId,'p2')).status,403);
 assert.equal((await call('/games/'+gameId+'/invite','p1','POST',{})).status,410);
 assert.equal((await call('/login','p1','POST',{name:'Passive Opponent ('+gameId+')',password:'disabled:passive'})).status,401);
 for(let turn=1;turn<=3;turn++){
  for(const command of [{type:'power'},{type:'initiative'},{type:'ew',defensive:8}])assert.equal((await send('p1',command)).status,200);
  d=await get();assert.equal(d.game.phase_id,'movement');assert.deepEqual(d.required,['p1']);
  assert.equal((await send('p1',{type:'movement-done'})).status,200);
  assert.equal((await send('p1',{type:'fire',fire:{shots:[]}})).status,200);
  d=await get();assert.equal(d.game.turn,turn+1);assert.equal(d.game.phase_id,'power');assert.deepEqual(d.required,['p1']);
  const ship=d.ships.find(s=>s.owner_id===passive.user_id);assert.deepEqual([ship.q,ship.r,ship.speed],[6,7,0]);
 }
 const rows=sqlite.prepare("SELECT public_json FROM events WHERE event_type='fire_revealed'").all();
 for(const row of rows){const orders=JSON.parse(row.public_json).declarations.find(x=>x.playerId===passive.user_id);assert.deepEqual(orders.fire.shots,[]);}
 const deleted=await call('/games/'+gameId,'p1','DELETE');assert.equal(deleted.status,200);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM users WHERE id=?').get(passive.user_id).n,0);
 sqlite.close();
});
test('solo opponent resolves required damage allocation without another player command',async()=>{
 const {get,send,sqlite}=await fixture({solo:true});
 for(const command of [{type:'power'},{type:'initiative'},{type:'ew',offensive:{[(await get()).ships.find(s=>s.owner_id!=='p1').id]:8}},{type:'movement-done'}])assert.equal((await send('p1',command)).status,200);
 const d=await get(),a=d.ships.find(s=>s.owner_id==='p1'),b=d.ships.find(s=>s.owner_id!=='p1');
 // At this range and EW a plasma shot has a guaranteed hit. A system-choice
 // result is also covered deterministically by the pure reducer regression.
 const r=await send('p1',{type:'fire',fire:{shots:[{shipId:a.id,targetId:b.id,mountId:'plasma_forward',chargeTurns:3,gun:1,role:'offensive',order:1}]}});assert.equal(r.status,200,JSON.stringify(r));
 const after=await get();assert.equal(after.pending.length,0);if(after.game.status==='active'){assert.equal(after.game.turn,2);assert.equal(after.game.phase_id,'power');assert.deepEqual(after.required,['p1']);}
 const damaged=after.ships.find(s=>s.id===b.id).public_state.damage;assert.ok(Object.values(damaged.tracks).some(t=>t.marked>0));
 sqlite.close();
});

test('solo setup adds exactly one internal opponent, blocks invitations and rejects invented modes',async()=>{
 const {get,call,gameId,sqlite}=await fixture({solo:true,start:false});
 const d=await get();assert.equal(d.game.mode,'solo-test');assert.equal(d.members.length,2);assert.equal(d.members[0].user_id,'p1');assert.equal(d.members[1].role,'passive');
 assert.equal((await call('/games/'+gameId+'/invite','p1','POST',{})).status,409);
 assert.equal((await call('/games','p1','POST',{mode:'evil-bot'})).status,400);
 const bot=d.members[1].user_id;assert.equal((await call('/games/'+gameId,bot)).status,401);
 assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM sessions WHERE user_id=?').get(bot).n,0);
 sqlite.close();
});

test('guided API preserves prompts through reload and rejects repeat rolls and the wrong player',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture({autoReview:false});
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'power'})).status,200);
 for(const p of ['p1','p2'])assert.equal((await send(p,{type:'initiative'})).status,200);
 const ships=(await get()).ships,a=ships.find(s=>s.owner_id==='p1'),b=ships.find(s=>s.owner_id==='p2');
 assert.equal((await send('p1',{type:'ew',offensive:{[b.id]:8}})).status,200);assert.equal((await send('p2',{type:'ew'})).status,200);
 for(let i=0;i<2;i++){const d=await get();assert.equal((await send(d.required[0],{type:'movement-done'})).status,200);}
 assert.equal((await send('p1',{type:'fire',fire:{shots:[{shipId:a.id,targetId:b.id,mountId:'plasma_forward',gun:1,chargeTurns:3,role:'offensive',order:1}]}})).status,200);assert.equal((await send('p2',{type:'fire',fire:{shots:[]}})).status,200);
 let d=await get(),r=d.resolution;assert.equal(r.stage,'attack_roll');assert.equal(r.dice.roll,undefined);
 const cmd={type:'combat-roll',stage:r.stage,attackId:r.attack.id};
 assert.equal((await send('p2',cmd)).status,400);
 assert.equal((await send('p1',cmd,d.game.revision)).status,200);
 const rolled=(await get()).resolution;assert.equal(rolled.stage,'attack_result');assert.ok(rolled.attack.hit);
 assert.equal((await send('p1',cmd,d.game.revision)).status,409);assert.deepEqual((await get()).resolution,rolled);
 for(let i=0;i<30;i++){
  d=await get();r=d.resolution;if(!r)break;
  if(r.stage.endsWith('_roll'))assert.equal(r.actorId,'p1');else if(r.stage.endsWith('_choice'))assert.equal(r.actorId,'p2');
  const c={type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates.length?{value:r.candidates[0]}:{})};
  assert.equal((await send(r.actorId,c)).status,200);
 }
 for(let i=0;i<50;i++){d=await get();const r=d.criticalResolution;if(!r)break;assert.equal((await send(r.actorId,{type:r.stage.endsWith('_roll')?'critical-roll':'critical-ok',stage:r.stage,checkId:r.check.id})).status,200);}
 d=await get();assert.equal(d.resolution,null);assert.ok(d.game.turn===2||d.game.status==='finished');sqlite.close();
});
test('critical prompts persist through the Worker API and enforce defender ownership and revision checks',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture({autoReview:false});
 // Trusted scenario fixture: start at an end-of-turn engine check. All actions below use real API routes.
 const {beginCriticals}=await import('../shared/guided-criticals.mjs');
 const row=sqlite.prepare('SELECT state_json FROM battle_states WHERE game_id=?').get(gameId),state=JSON.parse(row.state_json),target=state.ships.find(s=>s.owner_id==='p2');
 target.private_state.trial.condition.damage.tracks.engine.marked=8;target.private_state.trial.condition.damage.criticalCandidates=['engine'];beginCriticals(state);
 sqlite.exec('BEGIN');sqlite.prepare('UPDATE battle_states SET state_json=?,revision=revision+1 WHERE game_id=?').run(JSON.stringify(state),gameId);sqlite.prepare("UPDATE games SET revision=revision+1,phase_id='critical_resolution' WHERE id=?").run(gameId);sqlite.exec('COMMIT');
 let d=await get(),r=d.criticalResolution;assert.equal(d.game.phase_id,'critical_resolution');assert.equal(r.actorId,'p2');
 const command={type:'critical-roll',stage:r.stage,checkId:r.check.id};assert.equal((await send('p1',command)).status,400);
 assert.equal((await send('p2',command,d.game.revision)).status,200);const saved=(await get()).criticalResolution;assert.equal(saved.stage,'critical_result');assert.ok(Number.isInteger(saved.result.roll));
 assert.equal((await send('p2',command,d.game.revision)).status,409);assert.deepEqual((await get()).criticalResolution,saved);
 for(let i=0;i<8;i++){d=await get();r=d.criticalResolution;if(!r)break;assert.equal((await send(r.actorId,{type:r.stage.endsWith('_roll')?'critical-roll':'critical-ok',stage:r.stage,checkId:r.check.id})).status,200);}
 d=await get();assert.equal(d.criticalResolution,null);assert.equal(d.game.turn,2);sqlite.close();
});
test('jump tokens and launched shuttle inventory persist through the authenticated API',async()=>{
 const {get,send,call,gameId}=await fixture({autoOperations:false});
 for(const p of ['p1','p2'])await send(p,{type:'power'});
 for(const p of ['p1','p2'])await send(p,{type:'initiative'});
 for(const p of ['p1','p2'])await send(p,{type:'ew'});
 let d=await get();assert.equal(d.game.phase_id,'jump_formation');const a=d.ships.find(x=>x.owner_id==='p1');
 assert.equal((await send('p1',{type:'jump',open:true,q:a.q,r:a.r,facing:0})).status,200);d=await get('p2');assert.equal(d.jumpPoints.length,1);assert.equal(d.jumpPoints[0].status,'forming');
 assert.equal((await send('p2',{type:'jump',open:false})).status,200);
 for(let i=0;i<2;i++){d=await get();await send(d.required[0],{type:'movement-done'});}
 for(const p of ['p1','p2'])await send(p,{type:'fire',fire:{shots:[]}});
 d=await get();assert.equal(d.game.phase_id,'hangar');const x=d.shuttles.find(x=>x.owner_id==='p1');const rev=d.game.revision;
 assert.equal((await send('p1',{type:'hangar',launch:[x.id]})).status,200);assert.equal((await call('/games/'+gameId+'/battle-command','p1','POST',{expectedRevision:rev,command:{type:'hangar',launch:[x.id]}})).status,409);
 await send('p2',{type:'hangar'});d=await get();assert.equal(d.game.turn,2);assert.equal(d.shuttles.find(y=>y.id===x.id).status,'deployed');assert.equal(d.jumpPoints[0].status,'open');assert.equal(d.shuttles.find(y=>y.id===x.id).public_state.damage.shuttleDamage,0);
});
test('host can build either fleet with catalogue points and meeting deployment, with locked ownership and revisions',async()=>{
 const {get,call,gameId}=await fixture({start:false});let d=await get();const members=d.members;
 const entries=[0,0,1].map((side,i)=>({ownerId:members[side].user_id,catalogId:'centauri-vorchan-v3-2e-sf',q:side?19:i,r:side?31:0,facing:side?5:2,speed:i+1}));
 const path='/games/'+gameId+'/fleet-setup',body={expectedRevision:d.game.revision,entries,deploymentMode:'meeting'};
 assert.equal((await call(path,'p2','POST',body)).status,403);let r=await call(path,'p1','POST',body);assert.equal(r.status,201,JSON.stringify(r));assert.deepEqual(r.body.fleets.map(x=>x.points).sort((a,b)=>a-b),[360,720]);assert.equal((await call(path,'p1','POST',body)).status,409);
 d=await get();assert.equal(d.ships.length,3);assert.equal(d.game.deployment_mode,'meeting');assert.equal((await call('/games/'+gameId+'/start','p1','POST',{expectedRevision:d.game.revision})).status,200);d=await get();assert.equal(d.ships.length,3);assert.deepEqual(d.ships.map(x=>x.speed).sort(),[1,2,3]);assert.equal((await call(path,'p1','POST',{...body,expectedRevision:d.game.revision})).status,409);
});
test('Vorchar fleet and ELINT disruption persist through authenticated API reloads and reject stale or opposing choices',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture({start:false,autoOperations:false,autoReview:false});let d=await get();
 const entries=[{ownerId:'p1',catalogId:'centauri-vorchan-v3-2e-sf',q:3,r:10,facing:0,speed:0},{ownerId:'p1',catalogId:'centauri-vorchar-v2-2e-sf',q:4,r:10,facing:0,speed:0},{ownerId:'p2',catalogId:'centauri-vorchan-v3-2e-sf',q:6,r:7,facing:3,speed:0}];
 assert.equal((await call('/games/'+gameId+'/fleet-setup','p1','POST',{expectedRevision:d.game.revision,entries,deploymentMode:'free'})).status,201);d=await get();
 assert.equal((await call('/games/'+gameId+'/start','p1','POST',{expectedRevision:d.game.revision})).status,200);d=await get();
 const a=d.ships.find(x=>x.owner_id==='p1'&&x.public_state.libraryId===entries[0].catalogId),scout=d.ships.find(x=>x.public_state.libraryId===entries[1].catalogId),b=d.ships.find(x=>x.owner_id==='p2');
 for(const x of [a,scout,b])assert.equal((await send(x.owner_id,{type:'power',shipId:x.id})).status,200);
 for(const x of [a,scout,b])assert.equal((await send(x.owner_id,{type:'initiative',unitId:x.id})).status,200);
 assert.equal((await send('p1',{type:'ew',shipId:a.id,offensive:{[b.id]:2}})).status,200);
 assert.equal((await send('p1',{type:'ew',shipId:scout.id,offensive:{[a.id]:1,[b.id]:6},elint:{disruption:{[b.id]:3}}})).status,200);
 let enemy=await get('p2');assert.equal(enemy.ships.find(x=>x.id===scout.id).public_state.ew,undefined);
 assert.equal((await send('p2',{type:'ew',shipId:b.id,offensive:{[a.id]:1},defensive:7})).status,200);
 d=await get();assert.equal(d.game.phase_id,'ew_disruption');assert.equal(d.elintDisruption.scoutId,scout.id);const rev=d.game.revision;
 const command={type:'elint-disrupt',scoutId:scout.id,targetId:b.id,removed:{[a.id]:1}};
 assert.equal((await send('p2',command)).status,400);assert.equal((await get()).game.revision,rev);
 const stored=JSON.parse(sqlite.prepare('SELECT state_json FROM battle_states WHERE game_id=?').get(gameId).state_json);assert.equal(stored.elintDisruptions[0].removed,null);
 assert.equal((await send('p1',command)).status,200);assert.equal((await get()).game.phase_id,'jump_formation');
 assert.equal((await send('p1',command,rev)).status,409);const after=await get('p2');assert.deepEqual(after.elintContext.disruptions[0].removed,{[a.id]:1});
 const event=sqlite.prepare("SELECT public_json FROM events WHERE game_id=? AND event_type='elint_disruption_selected'").get(gameId);assert.equal(JSON.parse(event.public_json).scoutId,scout.id);
});
test('Mograth fleet starts through API with one shuttle, no jump prompts and persisted guided plasma sub-volleys',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture({start:false,autoReview:false,autoOperations:false});let d=await get();
 const entries=[{ownerId:'p1',catalogId:'centauri-mograth-v2-2e-sf',q:4,r:10,facing:0,speed:0},{ownerId:'p2',catalogId:'centauri-vorchan-v3-2e-sf',q:7,r:7,facing:3,speed:0}];
 const setup=await call('/games/'+gameId+'/fleet-setup','p1','POST',{expectedRevision:d.game.revision,entries,deploymentMode:'free'});assert.equal(setup.status,201);assert.equal(setup.body.fleets.find(x=>x.ownerId==='p1')?.points??setup.body.fleets[0].points,450);
 d=await get();assert.equal((await call('/games/'+gameId+'/start','p1','POST',{expectedRevision:d.game.revision})).status,200);d=await get();const m=d.ships.find(x=>x.owner_id==='p1'),v=d.ships.find(x=>x.owner_id==='p2');
 assert.equal(d.shuttles.filter(x=>x.carrierId===m.id).length,1);assert.equal(d.jumpStatus[m.id].ready,false);
 assert.equal((await send('p1',{type:'power',deactivated:['matter_port','matter_starboard','guardian'],extraEW:1})).status,200);await send('p2',{type:'power'});for(const p of ['p1','p2'])await send(p,{type:'initiative'});
 await send('p1',{type:'ew',offensive:{[v.id]:9}});await send('p2',{type:'ew'});d=await get();assert.equal(d.game.phase_id,'jump_formation');assert.deepEqual(d.required,['p2']);await send('p2',{type:'jump',open:false});
 while((d=await get()).game.phase_id==='movement')await send(d.required[0],{type:'movement-done'});
 await send('p1',{type:'fire',fire:{shots:[{shipId:m.id,targetId:v.id,mountId:'plasma_stream',gun:1,role:'offensive',order:1}]}});await send('p2',{type:'fire',fire:{shots:[]}});
 d=await get();assert.equal(d.resolution.stage,'attack_roll');await send('p1',{type:'combat-roll',stage:'attack_roll',attackId:d.resolution.attack.id});d=await get();assert.equal(d.resolution.attack.hit,true);await send('p1',{type:'combat-ok',stage:'attack_result',attackId:d.resolution.attack.id});d=await get();assert.equal(d.resolution.stage,'damage_roll');
 await send('p1',{type:'combat-roll',stage:'damage_roll',attackId:d.resolution.attack.id});d=await get();assert.equal(d.resolution.dice.damageDice.length,3);const revision=d.game.revision,dice=structuredClone(d.resolution.dice.damageDice);
 assert.equal((await send('p1',{type:'combat-roll',stage:'damage_roll',attackId:d.resolution.attack.id},revision-1)).status,409);assert.deepEqual((await get()).resolution.dice.damageDice,dice);
 for(let i=0;(d=await get()).resolution&&i<150;i++){const r=d.resolution;const response=await send(r.actorId,{type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates.length?{value:r.candidates[0]}:{})});assert.equal(response.status,200,JSON.stringify(response));}
 const stored=JSON.parse(sqlite.prepare('SELECT state_json FROM battle_states WHERE game_id=?').get(gameId).state_json);assert.ok(stored.dice[0].subVolleys.length>=1);assert.equal(stored.dice[0].subVolleys.length,Math.ceil(Math.max(0,dice.reduce((a,b)=>a+b,1))/5));assert.equal(stored.ships.find(x=>x.id===m.id).private_state.trial.weaponReadiness.plasma_stream[1].lastFiredTurn,1);
});
test('Mogratti fleet API preserves variant points, all nine gun histories and separate SCS damage across two turns',async()=>{
 const {get,send,call,gameId}=await fixture({start:false,autoOperations:false});let d=await get();
 const entries=[{ownerId:'p1',catalogId:'centauri-mogratti-v2-2e-sf',q:4,r:10,facing:0,speed:0},{ownerId:'p2',catalogId:'centauri-mograth-v2-2e-sf',q:7,r:7,facing:3,speed:0}];
 const setup=await call('/games/'+gameId+'/fleet-setup','p1','POST',{expectedRevision:d.game.revision,entries,deploymentMode:'free'});assert.equal(setup.status,201);assert.deepEqual(setup.body.fleets.map(x=>x.points).sort((a,b)=>a-b),[450,575]);d=await get();assert.equal((await call('/games/'+gameId+'/start','p1','POST',{expectedRevision:d.game.revision})).status,200);
 d=await get();const a=d.ships.find(x=>x.owner_id==='p1');assert.equal(Object.values(a.private_state.trial.weaponReadiness).flatMap(Object.values).length,9);assert.equal(a.private_state.trial.condition.damage.tracks.guardian,undefined);assert.ok(a.private_state.trial.condition.damage.tracks.twin_primary);assert.equal(d.shuttles.filter(x=>x.carrierId===a.id).length,1);
 for(let turn=1;turn<=2;turn++){
  assert.equal((await send('p1',{type:'power',purchasedThrust:1})).status,200);await send('p2',{type:'power'});d=await get();assert.equal(d.ships.find(x=>x.id===a.id).private_state.trial.powerAllocation.availablePower,2);
  for(const p of ['p1','p2'])await send(p,{type:'initiative'});for(const p of ['p1','p2'])await send(p,{type:'ew'});d=await get();assert.equal(d.game.phase_id,'movement');
  while((d=await get()).game.phase_id==='movement')assert.equal((await send(d.required[0],{type:'movement-done'})).status,200);
  for(const p of ['p1','p2'])await send(p,{type:'fire',fire:{shots:[]}});d=await get();assert.equal(d.game.phase_id,'hangar');for(const p of ['p1','p2'])await send(p,{type:'hangar'});assert.equal((await get()).game.turn,turn+1);
 }
});
