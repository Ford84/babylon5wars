import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASES,PHASE_PROCEDURES,phaseById} from '../shared/phases.mjs';
import {followingPhase} from '../shared/coordinator.mjs';

test('all 23 Appendix A tactical segments have explicit procedures',()=>{
 assert.equal(PHASES.length,23);
 assert.equal(new Set(PHASES.map(p=>p.id)).size,23);
 for(const p of PHASES){assert.ok(PHASE_PROCEDURES[p.id]?.length>0,p.id);assert.deepEqual(p.procedures,PHASE_PROCEDURES[p.id]);}
});
test('a complete turn traverses each actionable segment and wraps exactly once',()=>{
 let phase='power',turn=1;const visited=[];
 do{visited.push(phase);const next=followingPhase(phase,turn);phase=next.phase.id;turn=next.turn;assert.ok(visited.length<=23);}while(phase!=='power');
 assert.equal(turn,2);
 assert.deepEqual(visited,PHASES.filter(p=>p.mode!=='automatic').map(p=>p.id));
});
test('secret commitment and reveal barriers are paired',()=>{
 for(const [commit,reveal] of [['ew_commit','ew_reveal'],['ccew_commit','ccew_reveal'],['fire_commit','fire_reveal']]){
  assert.equal(phaseById(commit).secret,true);
  assert.equal(phaseById(reveal).mode,'automatic');
  assert.ok(PHASES.findIndex(p=>p.id===reveal)>PHASES.findIndex(p=>p.id===commit));
 }
});
