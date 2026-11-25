import test from 'node:test';import assert from 'node:assert/strict';
import {validateFleet,fleetTotals,defaultFleetPosition,fighterPurchase} from '../shared/fleet-setup.mjs';
import {createBattle,executeBattle,requiredActors,battleView} from '../shared/automated-battle.mjs';
import {newVorchanTrialState,VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
const members=[{user_id:'p1'},{user_id:'p2'}];
const entries=()=>[0,0,1,1].map((side,i)=>({ownerId:'p'+(side+1),catalogId:LIB.id,...defaultFleetPosition(side,i%2,'standard','meeting')}));
const rows=()=>entries().map((x,i)=>({id:'s'+i,owner_id:x.ownerId,label:'Ship '+i,q:x.q,r:x.r,facing:x.facing,speed:x.speed,private_state:{trial:newVorchanTrialState('s'+i,x.ownerId,x.q,x.r,x.facing)}}));
function state(){return createBattle(rows(),members,'standard',{operations:true});}
test('fleet catalogue validation computes source points and validates meeting engagement rather than free placement',()=>{
 const e=entries();assert.equal(validateFleet(e,members,'standard','meeting').length,4);assert.deepEqual(fleetTotals(e,members).map(x=>x.points),[720,720]);assert.equal(fleetTotals(e,members)[0].ships[0].points,360);
 e[0].r=10;assert.throws(()=>validateFleet(e,members,'standard','meeting'),/edges/);assert.equal(validateFleet(e,members,'standard','free').length,4);e[0].catalogId='unverified';assert.throws(()=>validateFleet(e,members,'standard','free'),/verified/);
});
test('every ship independently commits power, initiative, EW, movement and hangar actions across two fleet turns',()=>{
 let s=state();
 for(let turn=1;turn<=2;turn++){
  for(const p of ['p1','p2'])for(let i=0;i<2;i++){s=executeBattle(s,p,{type:'power'});if(i===0)assert.equal(s.locks[p],undefined);}
  assert.equal(s.phase,'initiative');for(const p of ['p1','p2'])for(let i=0;i<2;i++)s=executeBattle(s,p,{type:'initiative'},()=>p==='p1'?1:20);
  assert.ok(s.ships.every(x=>x.private_state.trial.initiative.turn===turn));
  for(const p of ['p1','p2'])for(let i=0;i<2;i++)s=executeBattle(s,p,{type:'ew'});
  for(const p of ['p1','p2'])for(let i=0;i<2;i++)s=executeBattle(s,p,{type:'jump',open:false});
  assert.equal(s.unitMoveOrder.length,4);while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});
  for(const p of ['p1','p2'])for(let i=0;i<2;i++)s=executeBattle(s,p,{type:'fire',fire:{shots:[]}});
  assert.equal(s.phase,'hangar');for(const p of ['p1','p2'])for(let i=0;i<2;i++)s=executeBattle(s,p,{type:'hangar'});
  assert.equal(s.turn,turn+1);assert.equal(s.status,'active');
 }
});
test('fleet commands reject an enemy or already-committed ship, and surviving fleet ships prevent premature victory',()=>{
 let s=state();assert.throws(()=>executeBattle(s,'p1',{type:'power',shipId:'s2'}),/own/);s=executeBattle(s,'p1',{type:'power',shipId:'s0'});assert.throws(()=>executeBattle(s,'p1',{type:'power',shipId:'s0'}),/already/);s.ships[2].private_state.trial.condition.damage.shipDestroyed=true;s=executeBattle(s,'p2',{type:'power',shipId:'s3'});assert.equal(s.status,'active');assert.equal(battleView(s,'p1').ships.length,4);
});
test('fleet starts preserve each ship’s selected speed and the passive opponent completes every ship',()=>{
 const r=rows();r[0].speed=10;r[1].speed=4;const s=createBattle(r,[members[0],{...members[1],role:'passive'}],'standard',{operations:true,passivePlayerId:'p2'});assert.equal(s.ships[0].speed,10);assert.equal(s.ships[1].speed,4);assert.equal(s.locks.p2,true);assert.ok(s.ships.filter(x=>x.owner_id==='p2').every(x=>x.private_state.trial.powerAllocation.turn===1));
});
test('multiple firing ships retain separate declarations and simultaneous return fire with damage routed to the correct hulls',()=>{
 const r=rows();r.forEach((x,i)=>{x.q=i<2?3+i:6+i-2;x.r=i<2?10:7;x.facing=i<2?0:3;x.private_state.trial=newVorchanTrialState(x.id,x.owner_id,x.q,x.r,x.facing);});
 let s=createBattle(r,members,'standard',{operations:true});
 for(const type of ['power','initiative','ew','jump'])for(const p of ['p1','p2'])for(let i=0;i<2;i++)s=executeBattle(s,p,{type,...(type==='jump'?{open:false}:{})},()=>p==='p1'?1:20);
 while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});
 for(let i=0;i<4;i++){const ship=s.ships[i],target=s.ships[i<2?i+2:i-2];s=executeBattle(s,ship.owner_id,{type:'fire',shipId:ship.id,fire:{shots:[{shipId:ship.id,targetId:target.id,mountId:'twin_nose_port',gun:1,role:'offensive',order:1}]}});}
 let seen=new Set();for(let i=0;s.resolution&&i<100;i++){const z=s.resolution;seen.add(z.attack.shipId);s=executeBattle(s,z.actorId,{type:z.stage.endsWith('_roll')?'combat-roll':z.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:z.stage,attackId:z.attack.id,...(z.candidates.length?{value:z.candidates[0]}:{})},n=>n===10?8:z.stage==='location_roll'?6:1);}
 assert.equal(seen.size,4);assert.ok(s.ships.every(x=>x.private_state.trial.condition.damage.tracks.twin_nose_port.marked===6));assert.equal(s.phase,'hangar');
});

test('Primus purchases whole six-fighter flights with verified costs and capacity',()=>{
 const e=entries(),sentri='centauri-sentri-v3-2e-sf',razik='centauri-razik-v2-2e-sf';
 e[0].catalogId='centauri-primus-v3-2e-sf';e[0].fighterFlights={[sentri]:1,[razik]:1};
 const validated=validateFleet(e,members,'standard','meeting');
 assert.equal(fleetTotals(validated,members)[0].ships[0].points,1262);
 assert.equal(fleetTotals(validated,members)[0].points,1622);
 const p=fighterPurchase({hangar:{fighters:12}},e[0].fighterFlights);
 assert.equal(p.count,12);assert.equal(p.points,432);assert.equal(p.flights.length,2);
 assert.ok(p.flights.every(f=>f.fighters.length===6));
 for(const bad of [{[sentri]:3},{[sentri]:2,[razik]:1},{[sentri]:0.5},{[razik]:-1},{unknown:1}]){
  e[0].fighterFlights=bad;assert.throws(()=>validateFleet(e,members,'standard','meeting'));
 }
 e[0].catalogId=LIB.id;e[0].fighterFlights={[sentri]:1};assert.throws(()=>validateFleet(e,members,'standard','meeting'));
});
