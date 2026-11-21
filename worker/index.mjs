import {PHASES,phaseById,validateFacing} from '../shared/phases.mjs';
import {validateSCS,initialSCSState} from '../shared/scs.mjs';
import {powerBudget,ewAllocation,initiative,initiativeOrder} from '../shared/preturn.mjs';
import {requiredPlayers,followingPhase,canSubmit,safeShip} from '../shared/coordinator.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const fail=(msg,status=400)=>json({error:msg},status);
const uuid=()=>crypto.randomUUID();
const bytes=n=>crypto.getRandomValues(new Uint8Array(n));
const hex=a=>Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');
async function sha(s){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));}
async function hashPassword(password,salt=hex(bytes(16))){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);return 'pbkdf2:100000:'+salt+':'+hex(new Uint8Array(bits));}
async function verifyPassword(password,stored){if(!stored?.startsWith('pbkdf2:100000:'))return false;const parts=stored.split(':');const candidate=await hashPassword(password,parts[2]);const a=new TextEncoder().encode(candidate),b=new TextEncoder().encode(stored);let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a[i]||0)^(b[i]||0);return difference===0;}
async function currentUser(req,db){const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)return null;return db.prepare("SELECT u.id,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>datetime('now')").bind(await sha(token)).first();}
async function member(db,g,u){return db.prepare('SELECT role FROM memberships WHERE game_id=? AND user_id=?').bind(g,u).first();}
async function memberships(db,g){return (await db.prepare('SELECT m.user_id,m.role,m.faction,m.initiative_rank,u.display_name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.game_id=? ORDER BY m.initiative_rank,m.user_id').bind(g).all()).results;}
async function completedOrders(db,g){return (await db.prepare('SELECT player_id,payload_json,submitted_at FROM orders WHERE game_id=? AND turn=? AND phase_id=? ORDER BY submitted_at,player_id').bind(g.id,g.turn,g.phase_id).all()).results;}
const readBody=async req=>{const b=await req.text();if(b.length>30000)throw Error('Request too large');return JSON.parse(b||'{}');};
const originOk=req=>{const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;};
function event(db,game,actor,type,details){return db.prepare('INSERT INTO events(id,game_id,turn,phase_id,actor_id,event_type,public_json) VALUES(?,?,?,?,?,?,?)').bind(uuid(),game.id,game.turn,game.phase_id,actor,type,JSON.stringify(details));}
export default {async fetch(req,env){try{
 const url=new URL(req.url),db=env.DB,path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 if(req.method!=='GET'&&!originOk(req))return fail('Cross-origin requests are not allowed',403);
 if(path==='/api/health')return json({ok:true,phaseCount:PHASES.length});
 if(path==='/api/diagnostics'){const checks={database:false,passwordHash:false};try{const row=await db.prepare('SELECT COUNT(*) AS n FROM users').first();checks.database=typeof row?.n==='number';}catch(e){console.error('diagnostics database',e);}try{const h=await hashPassword('diagnostic-password-1234');checks.passwordHash=h.startsWith('pbkdf2:100000:');}catch(e){checks.passwordHashError={name:String(e?.name||'Error'),message:String(e?.message||'Unknown').slice(0,200)};console.error('diagnostics password hash',e);}return json({checks,ready:checks.database&&checks.passwordHash});}
 if(path==='/api/phases')return json(PHASES);
 if(path==='/api/register'&&req.method==='POST'){
  const b=await readBody(req),name=String(b.name||'').trim(),password=String(b.password||'');if(name.length<3||name.length>80||password.length<12||password.length>256)return fail('Name 3–80 characters and password 12–256 characters required');
  const id=uuid();try{await db.prepare('INSERT INTO users(id,display_name,password_hash) VALUES(?,?,?)').bind(id,name,await hashPassword(password)).run();}catch(e){if(String(e).includes('UNIQUE'))return fail('Player name already exists',409);throw e;}return json({id},201);
 }
 if(path==='/api/login'&&req.method==='POST'){
  const b=await readBody(req),name=String(b.name||'').trim(),password=String(b.password||'');if(!name||!password)return fail('Invalid credentials',401);
  const limit=await db.prepare('SELECT failures,locked_until FROM login_limits WHERE name=?').bind(name.toLowerCase()).first();if(limit?.locked_until&&Date.parse(limit.locked_until+'Z')>Date.now())return fail('Too many attempts; try again later',429);
  const u=await db.prepare('SELECT * FROM users WHERE display_name=? COLLATE NOCASE').bind(name).first();const valid=u&&await verifyPassword(password,u.password_hash);
  if(!valid){await db.prepare("INSERT INTO login_limits(name,failures,locked_until) VALUES(?,1,NULL) ON CONFLICT(name) DO UPDATE SET failures=failures+1,locked_until=CASE WHEN failures>=4 THEN datetime('now','+15 minutes') ELSE NULL END").bind(name.toLowerCase()).run();return fail('Invalid credentials',401);}
  await db.prepare('DELETE FROM login_limits WHERE name=?').bind(name.toLowerCase()).run();const token=hex(bytes(32));await db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,datetime('now','+30 days'))").bind(await sha(token),u.id).run();return json({token,user:{id:u.id,name:u.display_name}});
 }
 const user=await currentUser(req,db);if(!user)return fail('Sign in required',401);
 if(path==='/api/rules/preturn'&&req.method==='POST'){
  const b=await readBody(req);if(!['power','ew','initiative','initiative-order'].includes(b.operation))return fail('Unknown rules operation');
  try{const result=b.operation==='power'?powerBudget(b.input):b.operation==='ew'?ewAllocation(b.input):b.operation==='initiative'?initiative(b.input):initiativeOrder(b.input.units);
   return json({operation:b.operation,result,authoritative:false,note:'Calculation only; values must be verified against the SCS. No game state modified.'});
  }catch(e){if(e instanceof RangeError||e instanceof TypeError)return fail('Invalid rules input: '+e.message);throw e;}
 }
 if(path==='/api/scs/templates'&&req.method==='GET'){
  const rows=await db.prepare('SELECT id,faction,name,model,sheet_revision,source_publication,source_page FROM scs_templates WHERE faction=? ORDER BY name,model').bind('Centauri Republic').all();return json(rows.results);
 }
 if(path==='/api/scs/templates'&&req.method==='POST'){
  const host=await db.prepare('SELECT id FROM games WHERE host_id=? LIMIT 1').bind(user.id).first();if(!host)return fail('Only battle hosts can import SCS templates',403);
  const b=await readBody(req),definition=b.definition,check=validateSCS(definition);
  if(!check.valid)return json({error:'Invalid SCS',details:check.errors},400);
  const id=uuid();try{
   await db.prepare('INSERT INTO scs_templates(id,faction,name,model,sheet_revision,source_publication,source_page,definition_json,created_by) VALUES(?,?,?,?,?,?,?,?,?)')
    .bind(id,definition.faction,definition.name,definition.model,definition.source.sheetRevision,definition.source.publication,definition.source.page,JSON.stringify(definition),user.id).run();
  }catch(e){if(String(e).includes('UNIQUE'))return fail('This SCS revision is already imported',409);throw e;}
  return json({id,validated:true},201);
 }
 if(path.startsWith('/api/scs/templates/')&&req.method==='GET'){
  const id=path.slice('/api/scs/templates/'.length);
  if(!/^[a-f0-9-]{36}$/i.test(id))return fail('Invalid template ID');
  const record=await db.prepare('SELECT definition_json FROM scs_templates WHERE id=?').bind(id).first();
  if(!record)return fail('SCS not found',404);
  return json({definition:JSON.parse(record.definition_json)});
 }
 if(path==='/api/logout'&&req.method==='POST'){const token=req.headers.get('authorization').slice(7);await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();return json({ok:true});}
 if(path==='/api/me')return json(user);
 if(path==='/api/games'&&req.method==='GET'){const rows=await db.prepare('SELECT g.* FROM games g JOIN memberships m ON m.game_id=g.id WHERE m.user_id=? ORDER BY g.created_at DESC').bind(user.id).all();return json(rows.results);}
 if(path==='/api/games'&&req.method==='POST'){const b=await readBody(req),id=uuid(),title=String(b.title||'New battle').trim().slice(0,100);await db.batch([db.prepare('INSERT INTO games(id,title,host_id) VALUES(?,?,?)').bind(id,title,user.id),db.prepare('INSERT INTO memberships(game_id,user_id,role) VALUES(?,?,?)').bind(id,user.id,'host')]);return json({id},201);}
 if(path==='/api/invitations/redeem'&&req.method==='POST'){const b=await readBody(req);if(typeof b.token!=='string'||b.token.length>200)return fail('Invalid invitation');const key=await sha(b.token);const invite=await db.prepare("SELECT * FROM invitations WHERE token_hash=? AND used_by IS NULL AND expires_at>datetime('now')").bind(key).first();if(!invite)return fail('Invitation expired or already used',404);const result=await db.batch([db.prepare('UPDATE invitations SET used_by=? WHERE token_hash=? AND used_by IS NULL').bind(user.id,key),db.prepare('INSERT OR IGNORE INTO memberships(game_id,user_id) VALUES(?,?)').bind(invite.game_id,user.id)]);if(result[0].meta.changes!==1)return fail('Invitation already used',409);return json({gameId:invite.game_id});}
 const match=path.match(/^\/api\/games\/([^/]+)(?:\/([a-z-]+))?$/);if(!match)return fail('Not found',404);
 const [,gameId,route]=match;if(!await member(db,gameId,user.id))return fail('Not a game member',403);
 const game=await db.prepare('SELECT * FROM games WHERE id=?').bind(gameId).first();if(!game)return fail('Not found',404);
 const members=await memberships(db,gameId),phase=phaseById(game.phase_id);
 if(!route&&req.method==='GET'){
  const ships=(await db.prepare('SELECT * FROM ships WHERE game_id=?').bind(gameId).all()).results.map(s=>safeShip(s,user.id));const orders=await completedOrders(db,game),completed=orders.map(o=>o.player_id),required=requiredPlayers(phase,members,completed);
  return json({game,phase,members,ships,readiness:members.map(m=>({id:m.user_id,name:m.display_name,submitted:completed.includes(m.user_id),required:required.includes(m.user_id)})),needsAction:required.includes(user.id),myOrder:orders.find(o=>o.player_id===user.id)?JSON.parse(orders.find(o=>o.player_id===user.id).payload_json):null});
 }
 if(route==='invite'&&req.method==='POST'){if(user.id!==game.host_id)return fail('Host only',403);const token=hex(bytes(24));await db.prepare("INSERT INTO invitations(token_hash,game_id,created_by,expires_at) VALUES(?,?,?,datetime('now','+7 days'))").bind(await sha(token),gameId,user.id).run();return json({token,expiresInDays:7});}
 if(route==='initiative'&&req.method==='POST'){if(user.id!==game.host_id)return fail('Host only',403);const b=await readBody(req);if(!members.some(m=>m.user_id===b.playerId)||!Number.isInteger(b.rank)||b.rank<0||b.rank>999)return fail('Invalid player or rank');if(game.phase_id==='movement')return fail('Cannot change initiative during movement',409);await db.prepare('UPDATE memberships SET initiative_rank=? WHERE game_id=? AND user_id=?').bind(b.rank,gameId,b.playerId).run();return json({ok:true});}
 if(route==='ships'&&req.method==='POST'){const b=await readBody(req);if(!validateFacing(b.facing)||!Number.isInteger(b.q)||!Number.isInteger(b.r)||Math.abs(b.q)>10000||Math.abs(b.r)>10000)return fail('Invalid hex/facing');const owner=b.ownerId||user.id;if(owner!==user.id&&user.id!==game.host_id)return fail('Cannot create another player\'s ship',403);if(!members.some(m=>m.user_id===owner))return fail('Owner is not a member');const id=uuid(),label=String(b.label||'Ship').slice(0,80);await db.batch([db.prepare('INSERT INTO ships(id,game_id,owner_id,label,q,r,facing) VALUES(?,?,?,?,?,?,?)').bind(id,gameId,owner,label,b.q,b.r,b.facing),event(db,game,user.id,'ship_created',{shipId:id,label,ownerId:owner,q:b.q,r:b.r,facing:b.facing})]);return json({id},201);}
 if(route==='attach-scs'&&req.method==='POST'){
  if(user.id!==game.host_id)return fail('Host only',403);
  const b=await readBody(req);
  if(!/^[a-f0-9-]{36}$/i.test(String(b.shipId||''))||!/^[a-f0-9-]{36}$/i.test(String(b.templateId||'')))return fail('Invalid ship or template ID');
  const ship=await db.prepare('SELECT id,template_id,public_state_json,private_state_json FROM ships WHERE id=? AND game_id=?').bind(b.shipId,gameId).first();
  if(!ship)return fail('Ship not found',404);
  if(ship.template_id)return fail('Ship already has an SCS; replacement requires a separate audited workflow',409);
  const template=await db.prepare('SELECT definition_json FROM scs_templates WHERE id=?').bind(b.templateId).first();
  if(!template)return fail('SCS template not found',404);
  const definition=JSON.parse(template.definition_json),check=validateSCS(definition);
  if(!check.valid)return fail('Stored SCS is invalid',409);
  if(game.phase_id!=='power'||game.turn!==1)return fail('Attach an SCS before the battle begins',409);
  const state=initialSCSState(definition);
  const publicState={...JSON.parse(ship.public_state_json||'{}'),scs:{templateId:b.templateId,revision:definition.source.sheetRevision,systemStatus:Object.fromEntries(Object.entries(state.systems).map(([id,s])=>[id,{damage:s.damage,deactivated:s.deactivated}]))}};
  const result=await db.batch([
   db.prepare('UPDATE ships SET template_id=?,public_state_json=?,private_state_json=? WHERE id=? AND game_id=? AND template_id IS NULL').bind(b.templateId,JSON.stringify(publicState),JSON.stringify({...JSON.parse(ship.private_state_json||'{}'),scs:state}),b.shipId,gameId),
   event(db,game,user.id,'scs_attached',{shipId:b.shipId,templateId:b.templateId,revision:definition.source.sheetRevision})
  ]);
  if(result[0].meta.changes!==1)return fail('Ship changed; reload',409);
  return json({attached:true,shipId:b.shipId,templateId:b.templateId});
 }
 if(route==='host-damage-override'&&req.method==='POST'){
  if(user.id!==game.host_id)return fail('Host only',403);
  const b=await readBody(req);
  if(b.expectedRevision!==game.revision)return fail('Game state changed; reload',409);
  if(!/^[a-f0-9-]{36}$/i.test(String(b.shipId||''))||typeof b.systemId!=='string'||b.systemId.length>64||!Number.isInteger(b.newDamage)||b.newDamage<0||typeof b.reason!=='string'||b.reason.trim().length<8||b.reason.length>500)return fail('Invalid override');
  const ship=await db.prepare('SELECT id,template_id,public_state_json,private_state_json FROM ships WHERE id=? AND game_id=?').bind(b.shipId,gameId).first();
  if(!ship?.template_id)return fail('Ship has no validated SCS',409);
  const privateState=JSON.parse(ship.private_state_json||'{}'),publicState=JSON.parse(ship.public_state_json||'{}');
  const system=privateState.scs?.systems?.[b.systemId];
  if(!system||!Number.isInteger(system.boxes)||b.newDamage>system.boxes)return fail('Unknown system or invalid damage',400);
  const previous=system.damage;
  if(previous===b.newDamage)return fail('Damage is unchanged',409);
  system.damage=b.newDamage;
  if(!publicState.scs?.systemStatus?.[b.systemId])return fail('Public system status missing',409);
  publicState.scs.systemStatus[b.systemId].damage=b.newDamage;
  const batch=await db.batch([
   db.prepare('UPDATE games SET revision=revision+1 WHERE id=? AND revision=?').bind(gameId,game.revision),
   db.prepare('UPDATE ships SET private_state_json=?,public_state_json=? WHERE id=? AND game_id=?').bind(JSON.stringify(privateState),JSON.stringify(publicState),b.shipId,gameId),
   event(db,game,user.id,'host_damage_override',{shipId:b.shipId,systemId:b.systemId,previous,newDamage:b.newDamage,reason:b.reason.trim()})
  ]);
  if(batch[0].meta.changes!==1||batch[1].meta.changes!==1)return fail('Concurrent change; reload',409);
  return json({ok:true,shipId:b.shipId,systemId:b.systemId,previous,newDamage:b.newDamage,revision:game.revision+1});
 }
 if(route==='ship-image'&&req.method==='PUT'){
  if(!env.SHIP_IMAGES)return fail('Image storage unavailable',503);
  const shipId=url.searchParams.get('shipId');
  if(!shipId||!/^[a-f0-9-]{36}$/i.test(shipId))return fail('Invalid ship ID');
  const ship=await db.prepare('SELECT id,owner_id FROM ships WHERE id=? AND game_id=?').bind(shipId,gameId).first();
  if(!ship)return fail('Ship not found',404);
  if(ship.owner_id!==user.id&&game.host_id!==user.id)return fail('Not permitted to change this image',403);
  const mime=req.headers.get('content-type')||'';
  if(!['image/png','image/jpeg','image/webp'].includes(mime))return fail('PNG, JPEG or WebP required',415);
  const size=Number(req.headers.get('content-length'));
  if(!Number.isFinite(size)||size<1||size>2_000_000)return fail('Image must be 1 byte–2 MB',413);
  const body=await req.arrayBuffer();if(body.byteLength!==size)return fail('Image size mismatch',400);
  const b=new Uint8Array(body);
  const png=b.length>=8&&[137,80,78,71,13,10,26,10].every((x,i)=>b[i]===x);
  const jpg=b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  const webp=b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
  if(!(mime==='image/png'&&png||mime==='image/jpeg'&&jpg||mime==='image/webp'&&webp))return fail('Image content does not match declared type',415);
  await env.SHIP_IMAGES.put(gameId+'/'+shipId,body,{httpMetadata:{contentType:mime}});
  return json({ok:true,shipId});
 }
 if(route==='ship-image'&&req.method==='GET'){
  if(!env.SHIP_IMAGES)return fail('Image storage unavailable',503);
  const shipId=url.searchParams.get('shipId');
  if(!shipId||!/^[a-f0-9-]{36}$/i.test(shipId))return fail('Invalid ship ID');
  const ship=await db.prepare('SELECT id FROM ships WHERE id=? AND game_id=?').bind(shipId,gameId).first();if(!ship)return fail('Ship not found',404);
  const object=await env.SHIP_IMAGES.get(gameId+'/'+shipId);if(!object)return fail('Image not found',404);
  return new Response(object.body,{headers:{'content-type':object.httpMetadata?.contentType||'application/octet-stream','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }
 if(route==='events'&&req.method==='GET'){const rows=await db.prepare('SELECT turn,phase_id,actor_id,event_type,public_json,created_at FROM events WHERE game_id=? ORDER BY rowid DESC LIMIT 100').bind(gameId).all();return json(rows.results.map(e=>({...e,public:JSON.parse(e.public_json),public_json:undefined})));}
 if(route==='export'&&req.method==='GET'){if(user.id!==game.host_id)return fail('Host only',403);const ships=(await db.prepare('SELECT * FROM ships WHERE game_id=?').bind(gameId).all()).results;const orders=(await db.prepare('SELECT * FROM orders WHERE game_id=?').bind(gameId).all()).results;const events=(await db.prepare('SELECT * FROM events WHERE game_id=?').bind(gameId).all()).results;return json({format:'b5w-stage1-v1',exportedAt:new Date().toISOString(),game,members,ships,orders,events});}
 if(route==='orders'&&req.method==='POST'){
  const b=await readBody(req),payload=b.payload??{pass:true};if(!phase||phase.mode==='automatic')return fail('No player order needed');if(b.expectedRevision!==game.revision)return fail('Game state changed; reload',409);
  const serialized=JSON.stringify(payload);if(serialized.length>10000||!payload||typeof payload!=='object'||Array.isArray(payload))return fail('Invalid order payload');
  const previous=await completedOrders(db,game),completed=previous.map(o=>o.player_id);if(!canSubmit(phase,members,completed,user.id))return fail('No action required from this player',409);
  const newCompleted=[...completed,user.id],isFinal=newCompleted.length===members.length;
  const next=isFinal?followingPhase(game.phase_id,game.turn):null;
  const inserts=[db.prepare('INSERT INTO orders(id,game_id,turn,phase_id,player_id,payload_json) VALUES(?,?,?,?,?,?)').bind(uuid(),gameId,game.turn,game.phase_id,user.id,serialized),event(db,game,user.id,'order_committed',{playerId:user.id,phaseId:game.phase_id,turn:game.turn})];
  if(isFinal){
   if(phase.secret)inserts.push(event(db,game,null,'orders_revealed',{phaseId:game.phase_id,turn:game.turn,orders:[...previous.map(o=>({playerId:o.player_id,payload:JSON.parse(o.payload_json)})),{playerId:user.id,payload}]}));
   inserts.push(db.prepare('UPDATE games SET phase_id=?,turn=?,revision=revision+1 WHERE id=? AND revision=?').bind(next.phase.id,next.turn,gameId,game.revision));
   inserts.push(event(db,game,null,'phase_advanced',{from:game.phase_id,to:next.phase.id,nextTurn:next.turn}));
  }
  try{const results=await db.batch(inserts);if(results[0].meta.changes!==1||isFinal&&results[results.length-2].meta.changes!==1)return fail('Concurrent update; reload',409);}catch(e){if(/UNIQUE|constraint|abort/i.test(String(e)))return fail('Order already submitted or phase changed; reload',409);throw e;}
  return json({submitted:true,advanced:isFinal,nextPhase:next?.phase.id||null});
 }
 return fail('Not found',404);
 }catch(e){console.error('Worker request failed',e);return fail('Server error',500);}}};