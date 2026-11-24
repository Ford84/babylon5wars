import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';

function fixture(trial){
 const record=JSON.stringify({trial});
 const env={DB:{prepare(sql){return {
  bind(){return this},
  async first(){
   if(sql.includes('FROM sessions'))return {id:'owner'};
   if(sql.startsWith('SELECT role FROM memberships'))return {role:'host'};
   if(sql.startsWith('SELECT * FROM games'))return {id:'battle',host_id:'owner',status:'active',phase_id:'power',turn:1,revision:1};
   throw Error('Unexpected query: '+sql);
  },
  async all(){
   if(sql.includes('JOIN users u'))return {results:[{user_id:'owner',role:'host'}]};
   if(sql.startsWith('SELECT public_state_json,private_state_json FROM ships'))return {results:[{public_state_json:JSON.stringify({libraryId:trial.libraryId}),private_state_json:record}]};
   throw Error('Unexpected query: '+sql);
  },
  run(){throw Error('Version validation must not write')}
 }},batch(){throw Error('Version validation must not write')}},ASSETS:{}};
 return {env,record};
}
async function order(env){
 return worker.fetch(new Request('https://example.test/api/games/battle/orders',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({expectedRevision:1,payload:{}})}),env);
}
test('legacy ship data is rejected before any command writes or reinterpretation of saved damage',async()=>{
 const trial=newVorchanTrialState('s','owner',3,10,0);
 delete trial.shipDataRevision;
 trial.damage={tracks:{reactor:{marked:5},retro:{marked:1}}};
 const before=JSON.stringify(trial),{env,record}=fixture(trial);
 const response=await order(env);
 assert.equal(response.status,409);
 assert.match((await response.json()).error,/superseded Vorchan ship data/);
 assert.equal(JSON.stringify(trial),before);
 assert.equal(record,JSON.stringify({trial}));
});
test('new revision passes data validation and reaches ordinary order validation',async()=>{
 const {env}=fixture(newVorchanTrialState('s','owner',3,10,0));
 const response=await order(env);
 assert.equal(response.status,400);
 assert.match((await response.json()).error,/acknowledge/);
});
