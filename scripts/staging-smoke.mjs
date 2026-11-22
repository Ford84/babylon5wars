const base='https://babylon5wars-movement-test.brettsidford.workers.dev';
const get=async path=>{const response=await fetch(base+path);const data=await response.json();if(!response.ok)throw Error(path+' HTTP '+response.status+': '+JSON.stringify(data));return data;};
const health=await get('/api/health');
if(health.ok!==true||health.phaseCount!==23)throw Error('Unexpected health result: '+JSON.stringify(health));
console.log('PASS /api/health, 23 phases');
const diagnostics=await get('/api/diagnostics');
if(diagnostics.ready!==true||!diagnostics.checks?.database||!diagnostics.checks?.passwordHash)throw Error('D1 or password diagnostics failed: '+JSON.stringify(diagnostics));
console.log('PASS /api/diagnostics, isolated D1 and password hashing');
const phases=await get('/api/phases');
if(!Array.isArray(phases)||phases.length!==23)throw Error('Incorrect phase catalogue');
console.log('PASS /api/phases');
const catalogue=await get('/api/ships/catalog');
if(!Array.isArray(catalogue)||!catalogue.length)throw Error('Ship catalogue missing');
console.log('PASS /api/ships/catalog');
const unauthorised=await fetch(base+'/api/games/nonexistent/trial-movement',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
if(unauthorised.status!==401)throw Error('Movement API unauthorised request returned '+unauthorised.status);
console.log('PASS movement authorisation gate');
console.log('STAGING SMOKE PASSED '+base);

const suffix=crypto.randomUUID().slice(0,8);
const post=async(path,body,token)=>{const response=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
const authed=async(path,token)=>{const response=await fetch(base+path,{headers:{authorization:'Bearer '+token}});if(!response.ok)throw Error(path+' returned '+response.status);return response.json();};
const credentials=[0,1].map(i=>({name:'staging'+i+suffix,password:'MovementStaging-'+suffix+'-2026!'}));
for(const cred of credentials){const r=await post('/api/register',cred);if(r.status!==201)throw Error('Registration failed '+JSON.stringify(r));}
const logins=await Promise.all(credentials.map(x=>post('/api/login',x)));
if(logins.some(x=>x.status!==200))throw Error('Staging login failed');
const [host,guest]=logins.map(x=>x.body.token);
const created=await post('/api/games',{title:'Automated staging lifecycle '+suffix},host);
if(created.status!==201)throw Error('Battle creation failed '+JSON.stringify(created));
const id=created.body.id;
let detail=await authed('/api/games/'+id,host);
if(detail.game.status!=='setup')throw Error('New battle did not begin in staging');
const early=await post('/api/games/'+id+'/orders',{expectedRevision:detail.game.revision,payload:{acknowledgedPhase:'power',acknowledgedProcedures:true}},host);
if(early.status!==409)throw Error('Pre-start orders were allowed');
const invite=await post('/api/games/'+id+'/invite',{},host);
if(invite.status!==200)throw Error('Invite failed');
const joined=await post('/api/invitations/redeem',{token:invite.body.token},guest);
if(joined.status!==200)throw Error('Joining failed');
detail=await authed('/api/games/'+id,host);
const setup=await post('/api/games/'+id+'/trial-vorchan',{shipCatalogId:'centauri-vorchan-v3-2e-sf',expectedRevision:detail.game.revision},host);
if(setup.status!==201)throw Error('SCS-backed ship assignment failed '+JSON.stringify(setup));
detail=await authed('/api/games/'+id,host);
if(detail.ships.length!==2)throw Error('Ship assignment count mismatch');
const scs=await authed('/api/games/'+id+'/trial-ship?shipId='+detail.ships[0].id,host);
if(scs.library.name!=='Vorchan Warship'||scs.scsIdentification.systems.length<20)throw Error('Integrated SCS missing');
const started=await post('/api/games/'+id+'/start',{expectedRevision:detail.game.revision},host);
if(started.status!==200)throw Error('Start failed '+JSON.stringify(started));
detail=await authed('/api/games/'+id,host);
if(detail.game.status!=='active'||detail.game.phase_id!=='power'||detail.game.turn!==1)throw Error('Battle start state invalid');
const lateInvite=await post('/api/games/'+id+'/invite',{},host);
if(lateInvite.status!==409)throw Error('Invitation allowed after start');
const lateShip=await post('/api/games/'+id+'/ships',{label:'Late',q:2,r:2,facing:0},host);
if(lateShip.status!==409)throw Error('Ship added after start');
console.log('PASS full two-account staging lifecycle, invitation, SCS database, start and post-start locks');

const tokens=[host,guest];
async function phaseOrder(token,phase){const d=await authed('/api/games/'+id,token);if(d.game.phase_id!==phase)throw Error('Expected '+phase+', got '+d.game.phase_id);const r=await post('/api/games/'+id+'/orders',{expectedRevision:d.game.revision,payload:{notes:'Automated staging integration',acknowledgedPhase:phase,acknowledgedProcedures:true}},token);if(r.status!==200)throw Error('Lock '+phase+' failed '+JSON.stringify(r));}
async function commitShipAction(token,route,body){const d=await authed('/api/games/'+id,token);const own=d.ships.find(s=>s.owner_id===d.members.find(m=>m.display_name===credentials[tokens.indexOf(token)].name)?.user_id);if(!own)throw Error('Owned ship missing');const r=await post('/api/games/'+id+'/'+route,{shipId:own.id,expectedRevision:d.game.revision,...body},token);if(r.status!==200)throw Error(route+' failed '+JSON.stringify(r));return r.body;}
for(const token of tokens){await commitShipAction(token,'trial-power',{purchasedThrust:0,extraEW:0,deactivated:[]});await phaseOrder(token,'power');}
for(const token of tokens){await commitShipAction(token,'trial-roll',{});await phaseOrder(token,'initiative');}
for(const token of tokens){await commitShipAction(token,'trial-ew',{defensive:2,offensive:{}});await phaseOrder(token,'ew_commit');}
for(const phase of ['jump','terrain_pre'])for(const token of tokens)await phaseOrder(token,phase);
let movement=await authed('/api/games/'+id,host);if(movement.game.phase_id!=='movement')throw Error('Movement phase not reached');
const hostShip=movement.ships.find(s=>s.owner_id===movement.members.find(m=>m.display_name===credentials[0].name)?.user_id);
if(!hostShip)throw Error('Host Vorchan missing in movement');
for(const action of [
 {type:'speed',change:2,purchasedThrust:0,thrusters:{aft_port_thrust:4}},
 {type:'turn',direction:1,shortenBy:0,thrusters:{aft_port_thrust:1}},
 {type:'advance',hexes:2}
]){const currentMove=await authed('/api/games/'+id,host);const moved=await post('/api/games/'+id+'/trial-movement',{shipId:hostShip.id,expectedRevision:currentMove.game.revision,action},host);if(moved.status!==200)throw Error('Live manoeuvre '+action.type+' failed '+JSON.stringify(moved));}
const movedState=await authed('/api/games/'+id,host);const actual=movedState.ships.find(s=>s.id===hostShip.id);
if(actual.speed!==2||actual.private_state?.trial?.movement?.state?.remaining!==0||actual.private_state?.trial?.movement?.thrusterLedger?.aft_port_thrust?.used!==5)throw Error('SCS-backed movement and thruster ledger not persisted');
console.log('PASS speed change, turn, advance and SCS thruster-ledger persistence');
for(const token of tokens)await phaseOrder(token,'movement');
const afterMovement=await authed('/api/games/'+id,host);
if(afterMovement.game.phase_id!=='terrain_post')throw Error('Stationary ship movement could not complete');
console.log('PASS two-player authoritative SCS power, initiative, EW and stationary movement phase advancement');

