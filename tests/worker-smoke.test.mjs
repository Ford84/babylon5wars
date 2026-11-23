import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.mjs';

const env={DB:{prepare(){throw new Error('Unexpected database access');}},ASSETS:{fetch(){throw new Error('Unexpected asset access');}}};
async function request(path,options={}){
 const response=await worker.fetch(new Request('https://example.test'+path,options),env);
 return {status:response.status,body:await response.json(),headers:response.headers};
}
test('worker serves health, phases and verified catalogue without authentication or database',async()=>{
 const health=await request('/api/health');
 assert.equal(health.status,200);assert.equal(health.body.ok,true);assert.equal(health.body.phaseCount,23);
 const phases=await request('/api/phases');assert.equal(phases.status,200);assert.equal(phases.body.length,23);
 const catalogue=await request('/api/ships/catalog');assert.equal(catalogue.status,200);
 assert.equal(catalogue.body.length,1);assert.equal(catalogue.body[0].automaticCombatReady,false);
});
test('worker rejects unauthenticated movement and cross-origin state changes',async()=>{
 const movement=await request('/api/games/demo/trial-movement',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
 assert.equal(movement.status,401);assert.match(movement.body.error,/Sign in/);
 const cross=await request('/api/games/demo/trial-movement',{method:'POST',headers:{origin:'https://attacker.test','content-type':'application/json'},body:'{}'});
 assert.equal(cross.status,403);assert.match(cross.body.error,/Cross-origin/);
});
