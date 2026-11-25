import {validateFleet,fleetTotals,fighterPurchase,fleetEntryPoints} from '../shared/fleet-setup.mjs';
import {automatedGame} from './automated-game.mjs';
import {PLAY_PHASES} from '../shared/automated-battle.mjs';
import {getBuiltinShip,listBuiltinShips} from '../shared/ship-catalog.mjs';
import {VORCHAN_LIBRARY_RECORD,newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {phaseById} from '../shared/phases.mjs';
import {initialWeaponHistory} from '../shared/weapon-resolution.mjs';
import {validateSCS} from '../shared/scs.mjs';
import {powerBudget,ewAllocation,initiative,initiativeOrder} from '../shared/preturn.mjs';
import {requiredPlayers,safeShip} from '../shared/coordinator.mjs';
import {isMapPreset,MAP_PRESETS} from '../shared/battle-setup.mjs';
import {isVorchanModelId} from '../shared/vorchan-models.mjs';
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
async function memberships(db,g){return (await db.prepare("SELECT m.user_id,m.role,m.faction,m.initiative_rank,CASE WHEN m.role='passive' THEN 'Passive Opponent' ELSE u.display_name END AS display_name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.game_id=? ORDER BY CASE WHEN m.role='host' THEN 0 ELSE 1 END,m.initiative_rank,m.user_id").bind(g).all()).results;}
async function completedOrders(db,g){return (await db.prepare('SELECT player_id,payload_json,submitted_at FROM orders WHERE game_id=? AND turn=? AND phase_id=? ORDER BY submitted_at,player_id').bind(g.id,g.turn,g.phase_id).all()).results;}
const readBody=async req=>{const b=await req.text();if(b.length>30000)throw Error('Request too large');return JSON.parse(b||'{}');};
const originOk=req=>{const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;};
function event(db,game,actor,type,details){return db.prepare('INSERT INTO events(id,game_id,turn,phase_id,actor_id,event_type,public_json) VALUES(?,?,?,?,?,?,?)').bind(uuid(),game.id,game.turn,game.phase_id,actor,type,JSON.stringify(details));}
export default {async fetch(req,env){try{
 const url=new URL(req.url),db=env.DB,path=url.pathname;
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 if(req.method!=='GET'&&!originOk(req))return fail('Cross-origin requests are not allowed',403);
 if(path==='/api/health')return json({ok:true,phaseCount:PLAY_PHASES.length});
 if(path==='/api/diagnostics'){const checks={database:false,passwordHash:false};try{const row=await db.prepare('SELECT COUNT(*) AS n FROM users').first();checks.database=typeof row?.n==='number';}catch(e){console.error('diagnostics database',e);}try{const h=await hashPassword('diagnostic-password-1234');checks.passwordHash=h.startsWith('pbkdf2:100000:');}catch(e){checks.passwordHashError={name:String(e?.name||'Error'),message:String(e?.message||'Unknown').slice(0,200)};console.error('diagnostics password hash',e);}return json({checks,ready:checks.database&&checks.passwordHash});}
 if(path==='/api/phases')return json(PLAY_PHASES);
 if(path==='/api/ships/catalog'&&req.method==='GET')return json(listBuiltinShips());
 if(path.startsWith('/api/ships/catalog/')&&req.method==='GET'){const ship=getBuiltinShip(decodeURIComponent(path.slice('/api/ships/catalog/'.length)));return ship?json(ship):fail('Ship not found',404);}
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
 if(path==='/api/games'&&req.method==='POST'){
  const b=await readBody(req),id=uuid(),title=String(b.title||'New battle').trim().slice(0,100),mapPreset=b.mapPreset??'standard',modelId=b.modelId??'attack-cruiser-rc2',mode=b.mode??'multiplayer';
  if(!isMapPreset(mapPreset)||!isVorchanModelId(modelId)||!['multiplayer','solo-test'].includes(mode))return fail('Invalid battlefield setup choice');
  const statements=[db.prepare("INSERT INTO games(id,title,host_id,status,map_preset,model_id,mode) VALUES(?,?,?,'setup',?,?,?)").bind(id,title,user.id,mapPreset,modelId,mode),db.prepare('INSERT INTO memberships(game_id,user_id,role) VALUES(?,?,?)').bind(id,user.id,'host')];
  if(mode==='solo-test'){
   const passiveId='passive:'+id;
   // No password can authenticate this internal per-battle identity.
   statements.push(db.prepare('INSERT INTO users(id,display_name,password_hash) VALUES(?,?,?)').bind(passiveId,'Passive Opponent ('+id+')','disabled:passive'));
   statements.push(db.prepare('INSERT INTO memberships(game_id,user_id,role) VALUES(?,?,?)').bind(id,passiveId,'passive'));
  }
  await db.batch(statements);return json({id,mode},201);
 }
 if(path==='/api/invitations/redeem'&&req.method==='POST'){const b=await readBody(req);if(typeof b.token!=='string'||b.token.length>200)return fail('Invalid invitation');const key=await sha(b.token);const invite=await db.prepare("SELECT * FROM invitations WHERE token_hash=? AND used_by IS NULL AND expires_at>datetime('now')").bind(key).first();if(!invite)return fail('Invitation expired or already used',404);const invitedGame=await db.prepare('SELECT status,mode FROM games WHERE id=?').bind(invite.game_id).first();if(invitedGame?.mode==='solo-test')return fail('Solo tests do not accept other players',409);if(invitedGame?.status!=='setup')return fail('This battle has already started',409);const result=await db.batch([db.prepare('UPDATE invitations SET used_by=? WHERE token_hash=? AND used_by IS NULL').bind(user.id,key),db.prepare('INSERT OR IGNORE INTO memberships(game_id,user_id) VALUES(?,?)').bind(invite.game_id,user.id)]);if(result[0].meta.changes!==1)return fail('Invitation already used',409);return json({gameId:invite.game_id});}
 const match=path.match(/^\/api\/games\/([^/]+)(?:\/([a-z-]+))?$/);if(!match)return fail('Not found',404);
 const [,gameId,route]=match;
 if(!route&&req.method==='DELETE'){
  const existing=await db.prepare('SELECT host_id FROM games WHERE id=?').bind(gameId).first();
  if(!existing)return fail('Battle not found',404);
  if(existing.host_id!==user.id)return fail('Only the battle host can delete this battle',403);
  await db.batch([
   db.prepare('DELETE FROM combat_rolls WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM combat_choices WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM combat_terrain WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM events WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM orders WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM ships WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM invitations WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM memberships WHERE game_id=?').bind(gameId),
   db.prepare('DELETE FROM games WHERE id=? AND host_id=?').bind(gameId,user.id),
   db.prepare("DELETE FROM users WHERE id=? AND password_hash='disabled:passive'").bind('passive:'+gameId),
  ]);
  return json({deleted:true});
 }
 if(!await member(db,gameId,user.id))return fail('Not a game member',403);
 const game=await db.prepare('SELECT * FROM games WHERE id=?').bind(gameId).first();if(!game)return fail('Not found',404);
 const members=await memberships(db,gameId),phase=phaseById(game.phase_id);
 const automatic=await automatedGame({req,db,game,members,user,route});if(automatic)return automatic;
 if(route==='setup'&&req.method==='POST'){
  if(game.host_id!==user.id)return fail('Only the battle host can change these settings',403);
  if(game.status!=='setup')return fail('Battle setup is locked after the battle starts',409);
  const b=await readBody(req),mapPreset=b.mapPreset,modelId=b.modelId;
  if(b.expectedRevision!==game.revision)return fail('Battle changed; refresh and try again',409);
  if(!isMapPreset(mapPreset)||!isVorchanModelId(modelId))return fail('Invalid battlefield setup choice');
  const updated=await db.prepare("UPDATE games SET map_preset=?,model_id=?,revision=revision+1 WHERE id=? AND revision=? AND status='setup'").bind(mapPreset,modelId,gameId,game.revision).run();
  if(updated.meta.changes!==1)return fail('Battle changed; refresh and try again',409);
  return json({updated:true,mapPreset,modelId});
 }
 if(!route&&req.method==='GET'){
  const shipRows=(await db.prepare('SELECT * FROM ships WHERE game_id=?').bind(gameId).all()).results;const templateRows=(await db.prepare('SELECT id,definition_json FROM scs_templates WHERE id IN (SELECT template_id FROM ships WHERE game_id=? AND template_id IS NOT NULL)').bind(gameId).all()).results;const templateById=new Map(templateRows.map(t=>[t.id,JSON.parse(t.definition_json)]));const ships=shipRows.map(s=>{const visible=safeShip(s,user.id);if(s.owner_id===user.id||game.host_id===user.id){if(JSON.parse(s.public_state_json||'{}').libraryId===VORCHAN_LIBRARY_RECORD.id)visible.library_stats={engineEfficiency:VORCHAN_LIBRARY_RECORD.engineEfficiency.power,accelerationCost:VORCHAN_LIBRARY_RECORD.accelerationCost,initiativeBonus:VORCHAN_LIBRARY_RECORD.initiativeBonus,source:VORCHAN_LIBRARY_RECORD.source};const definition=templateById.get(s.template_id);if(definition){visible.library_stats={engineEfficiency:definition.stats.engineEfficiency,accelerationCost:definition.stats.accelerationCost??null,initiativeBonus:definition.stats.initiativeBonus};}}return visible;});const orders=await completedOrders(db,game),completed=orders.map(o=>o.player_id),required=requiredPlayers(phase,members,completed);
  return json({game,phase,members,ships,readiness:members.map(m=>({id:m.user_id,name:m.display_name,submitted:completed.includes(m.user_id),required:required.includes(m.user_id)})),needsAction:required.includes(user.id),myOrder:orders.find(o=>o.player_id===user.id)?JSON.parse(orders.find(o=>o.player_id===user.id).payload_json):null});
 }
 if(route==='fleet-setup'&&req.method==='POST'){
  if(game.host_id!==user.id)return fail('Only the battle host can build the fleets',403);
  if(game.status!=='setup')return fail('Fleet setup is locked after battle start',409);
  const b=await readBody(req);if(b.expectedRevision!==game.revision)return fail('Battle changed; reload',409);
  let fleet;try{fleet=validateFleet(b.entries,members,game.map_preset,b.deploymentMode);}catch(e){return fail(e.message);}
  const nextRevision=game.revision+1,ids=fleet.map(()=>uuid());
  let result;try{result=await db.batch([
   db.prepare('INSERT INTO fleet_setup_guards(game_id,expected_revision) VALUES(?,?)').bind(gameId,game.revision),
   db.prepare("UPDATE games SET revision=revision+1,deployment_mode=? WHERE id=? AND revision=? AND status='setup'").bind(b.deploymentMode,gameId,game.revision),
   db.prepare('DELETE FROM ships WHERE game_id=? AND EXISTS(SELECT 1 FROM games WHERE id=? AND revision=?)').bind(gameId,gameId,nextRevision),
   ...fleet.map((x,i)=>{const trial={...newVorchanTrialState(ids[i],x.ownerId,x.q,x.r,x.facing),libraryId:x.catalogId,shipDataRevision:getBuiltinShip(x.catalogId).dataRevision,fighterFlights:x.fighterFlights,fighterComplement:fighterPurchase(getBuiltinShip(x.catalogId),x.fighterFlights).flights};return db.prepare('INSERT INTO ships(id,game_id,owner_id,label,q,r,facing,speed,public_state_json,private_state_json) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM games WHERE id=? AND revision=?)').bind(ids[i],gameId,x.ownerId,getBuiltinShip(x.catalogId).name+' '+(i+1),x.q,x.r,x.facing,x.speed,JSON.stringify({libraryId:x.catalogId,trial:true,combatPoints:fleetEntryPoints(x),fighterFlights:x.fighterFlights}),JSON.stringify({trial}),gameId,nextRevision);}),
   db.prepare('INSERT INTO events(id,game_id,turn,phase_id,actor_id,event_type,public_json) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM games WHERE id=? AND revision=?)').bind(uuid(),gameId,1,'power',user.id,'fleets_saved',JSON.stringify({deploymentMode:b.deploymentMode,fleets:fleetTotals(fleet,members)}),gameId,nextRevision),
   db.prepare('DELETE FROM fleet_setup_guards WHERE game_id=?').bind(gameId)
  ]);}catch(e){if(/revision conflict|unique/i.test(String(e)))return fail('Battle changed; reload',409);throw e;}
  if(result[0].meta.changes!==1)return fail('Battle changed; reload',409);
  return json({saved:true,fleets:fleetTotals(fleet,members),shipIds:ids},201);
 }
 if(route==='trial-vorchan'&&req.method==='POST'){
  if(user.id!==game.host_id)return fail('Host only',403);
  if(game.turn!==1||game.phase_id!=='power'||game.status!=='setup')return fail('Trial setup is available only in the battle staging room',409);
  if(members.length!==2)return fail('Two distinct battle members are required before trial setup',409);
  const existing=await db.prepare('SELECT COUNT(*) AS n FROM ships WHERE game_id=?').bind(gameId).first();
  if(existing.n!==0)return fail('Trial requires an empty battlefield',409);
  const b=await readBody(req);
  if(b.shipCatalogId!==VORCHAN_LIBRARY_RECORD.id||!getBuiltinShip(b.shipCatalogId)?.selectable)return fail('Select a supported ship from the catalogue',400);
  if(b.expectedRevision!==game.revision)return fail('Game changed; reload',409);
  const map=MAP_PRESETS[game.map_preset]||MAP_PRESETS.standard;
  const positions=Array.isArray(b.positions)?b.positions:[{q:3,r:10,facing:0},{q:15,r:10,facing:3}];
  if(positions.length!==2||positions.some(p=>!p||!Number.isInteger(p.q)||!Number.isInteger(p.r)||!Number.isInteger(p.facing)||p.q<0||p.q>=map.columns||p.r<0||p.r>=map.rows||p.facing<0||p.facing>5)||positions[0].q===positions[1].q&&positions[0].r===positions[1].r)return fail('Choose two distinct starting hexes on the selected map and a facing from 0 to 5',400);
  const ids=[uuid(),uuid()];
  const inserts=members.map((m,i)=>{
   const p=positions[i],trial=newVorchanTrialState(ids[i],m.user_id,p.q,p.r,p.facing);
   return db.prepare('INSERT INTO ships(id,game_id,owner_id,label,q,r,facing,public_state_json,private_state_json) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM games WHERE id=? AND revision=? AND phase_id=?) AND NOT EXISTS(SELECT 1 FROM ships WHERE game_id=?)').bind(ids[i],gameId,m.user_id,'Vorchan Warship '+(i+1),p.q,p.r,p.facing,JSON.stringify({libraryId:trial.libraryId,trial:true}),JSON.stringify({trial}),gameId,game.revision,'power',gameId);
  });
  // The first insert changes the NOT EXISTS predicate for the second. Use a
  // dedicated trial marker and conditional game revision as the setup lock.
  const result=await db.batch([
   db.prepare('UPDATE games SET revision=revision+1 WHERE id=? AND revision=? AND phase_id=? AND NOT EXISTS(SELECT 1 FROM ships WHERE game_id=?)').bind(gameId,game.revision,'power',gameId),
   ...members.map((m,i)=>{const p=positions[i],trial=newVorchanTrialState(ids[i],m.user_id,p.q,p.r,p.facing);trial.weaponReadiness=initialWeaponHistory(1);return db.prepare('INSERT INTO ships(id,game_id,owner_id,label,q,r,facing,public_state_json,private_state_json) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM games WHERE id=? AND revision=?)').bind(ids[i],gameId,m.user_id,'Vorchan Warship '+(i+1),p.q,p.r,p.facing,JSON.stringify({libraryId:trial.libraryId,trial:true}),JSON.stringify({trial}),gameId,game.revision+1);}),
   db.prepare('INSERT INTO events(id,game_id,turn,phase_id,actor_id,event_type,public_json) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM games WHERE id=? AND revision=?)').bind(uuid(),gameId,game.turn,game.phase_id,user.id,'vorchan_trial_created',JSON.stringify({shipIds:ids,positions,libraryId:VORCHAN_LIBRARY_RECORD.id,scenario:'vorchan-clear-space-duel'}),gameId,game.revision+1)
  ]);
  if(result.some(x=>x.meta.changes!==1))return fail('Concurrent trial setup; reload',409);
  return json({created:true,shipIds:ids,libraryId:VORCHAN_LIBRARY_RECORD.id,automaticCombatReady:true},201);
 }
 if(route==='invite'&&req.method==='POST'){if(game.mode==='solo-test')return fail('Solo tests do not need invitations',409);if(game.status!=='setup')return fail('Invitations are closed after battle start',409);if(user.id!==game.host_id)return fail('Host only',403);const token=hex(bytes(24));await db.prepare("INSERT INTO invitations(token_hash,game_id,created_by,expires_at) VALUES(?,?,?,datetime('now','+7 days'))").bind(await sha(token),gameId,user.id).run();return json({token,expiresInDays:7});}
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
 if(route==='events'&&req.method==='GET'){const rows=await db.prepare('SELECT id,turn,phase_id,actor_id,event_type,public_json,created_at FROM events WHERE game_id=? ORDER BY rowid DESC LIMIT 100').bind(gameId).all();return json(rows.results.map(e=>({...e,public:JSON.parse(e.public_json),public_json:undefined})));}
 if(route==='export'&&req.method==='GET'){if(user.id!==game.host_id)return fail('Host only',403);const ships=(await db.prepare('SELECT * FROM ships WHERE game_id=?').bind(gameId).all()).results;const orders=(await db.prepare('SELECT * FROM orders WHERE game_id=?').bind(gameId).all()).results;const events=(await db.prepare('SELECT * FROM events WHERE game_id=?').bind(gameId).all()).results;return json({format:'b5w-stage1-v1',exportedAt:new Date().toISOString(),game,members,ships,orders,events});}
 return fail('Not found',404);
 }catch(e){console.error('Worker request failed',e);return fail('Server error',500);}}};
