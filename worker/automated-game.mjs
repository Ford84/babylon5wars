import {enableOperations} from '../shared/vorchan-operations.mjs';
import {createBattle,executeBattle,battleView,PLAY_PHASES} from '../shared/automated-battle.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const error=(message,status=409)=>json({error:message},status);
export async function automatedGame({req,db,game,members,user,route}){
 if(['manual-combat-resolution','host-damage-override','initiative','combat-terrain'].includes(route))return error('Manual adjudication is retired. Use the available battle actions.',410);
 // Staging and account flows continue to use their existing routes.
 if(game.status==='setup'&&route!=='start')return null;
 const stored=await db.prepare('SELECT revision,state_json FROM battle_states WHERE game_id=?').bind(game.id).first();
 let s=stored?JSON.parse(stored.state_json):null;if(s&&s.operations!==false)enableOperations(s);
 if(req.method==='GET'){
  if(!s){if(!route)return json({game,members,ships:[],automated:false,legacy:true,phases:PLAY_PHASES,readiness:[],needsAction:false});return null;}
  const view=battleView(s,user.id);
  if(!route)return json({...view,game:{...game,turn:s.turn,phase_id:s.phase,status:s.status},members,automated:true,readiness:members.map(m=>({id:m.user_id,name:m.display_name,submitted:!!s.locks[m.user_id],required:view.required.includes(m.user_id)}))});
  if(route==='fire-orders'||route==='fire-resolution')return json(view);
  if(route==='export')return json({game,scenario:s.scenario,...view});
  if(route==='events'||route==='ship-image')return null;
  return error('This legacy view has been replaced by the live battle state.',410);
 }
 if(route!=='start'&&route!=='battle-command')return error('This legacy command has been retired. Use the current battle controls.',410);
 const raw=await req.text();if(raw.length>30000)return error('Command too large',400);
 let body;try{body=JSON.parse(raw||'{}');}catch{return error('Invalid command',400);}
 if(body.expectedRevision!==game.revision||stored&&stored.revision!==game.revision)return error('Battle changed; refresh before trying again');
 try{
  if(route==='start'){
   if(user.id!==game.host_id)return error('Only the host can start the battle',403);
   if(game.status!=='setup'||stored)return error('Battle already started');
   if(game.mode==='solo-test'&&(members.length!==2||members.filter(m=>m.role==='passive').length!==1))return error('Solo test requires its passive opponent');
   const rows=(await db.prepare('SELECT * FROM ships WHERE game_id=?').bind(game.id).all()).results;
   s=createBattle(rows,members,game.map_preset,{operations:true,passivePlayerId:game.mode==='solo-test'?members.find(m=>m.role==='passive')?.user_id:null});s.journal=[{turn:1,phase:'power',type:'battle_started',scenario:s.scenario,mode:game.mode},...s.journal];
  }else{
   if(!s)return error('Start a new battle to use automated condition and rules; existing records are preserved.');
   s=executeBattle(s,user.id,body.command);
  }
  const revision=game.revision+1,events=s.journal;s.journal=[];
  const statements=[stored?db.prepare('UPDATE battle_states SET revision=?,state_json=? WHERE game_id=?').bind(revision,JSON.stringify(s),game.id):db.prepare('INSERT INTO battle_states(game_id,revision,state_json) VALUES(?,?,?)').bind(game.id,revision,JSON.stringify(s))];
  statements.push(db.prepare('UPDATE games SET revision=?,phase_id=?,turn=?,status=? WHERE id=?').bind(revision,s.phase,s.turn,s.status,game.id));
  for(const ship of s.ships)statements.push(db.prepare('UPDATE ships SET q=?,r=?,facing=?,speed=?,public_state_json=?,private_state_json=? WHERE id=? AND game_id=?').bind(ship.q,ship.r,ship.facing,ship.speed,JSON.stringify(ship.public_state),JSON.stringify(ship.private_state),ship.id,game.id));
  for(const e of events)statements.push(db.prepare('INSERT INTO events(id,game_id,turn,phase_id,actor_id,event_type,public_json) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),game.id,e.turn,e.phase,user.id,e.type,JSON.stringify(e)));
  await db.batch(statements);
  return json({ok:true,revision,phase:s.phase,turn:s.turn,status:s.status,events});
 }catch(e){if(/constraint|revision conflict|unique/i.test(String(e)))return error('Battle changed; refresh before trying again');if(e instanceof RangeError||e instanceof TypeError)return error(e.message,400);throw e;}
}
