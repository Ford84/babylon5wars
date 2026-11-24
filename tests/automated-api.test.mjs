import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import worker from '../worker/index.mjs';
async function fixture({solo=false,start=true}={}){
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
 async function send(who,command,expected){const d=await get(who);return call('/games/'+gameId+'/battle-command',who,'POST',{expectedRevision:expected??d.game.revision,command});}
 return {sqlite,call,get,send,gameId};
}
test('authenticated staging through two turns: no manual acknowledgements, no terrain entry, persistent server dice and private EW',async()=>{
 const {get,send,call,gameId,sqlite}=await fixture();
 let d=await get();assert.equal(d.automated,true);assert.equal(d.phases.length,6);
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
