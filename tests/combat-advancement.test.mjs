import test from 'node:test';
import assert from 'node:assert/strict';
import {combatAdvancementGuard} from '../shared/combat-advancement.mjs';
const d=(shots)=>({playerId:'p1',fire:{shots}});
test('empty fire remains able to complete two-player phase',()=>{
 assert.deepEqual(combatAdvancementGuard({declarations:[d([]),{playerId:'p2',fire:{shots:[]} }]}),{allowed:true,reason:null,offensiveShots:0});
});
test('defensive-only reservations do not falsely imply attacks',()=>{
 assert.equal(combatAdvancementGuard({declarations:[d([{role:'defensive',mountId:'twin_nose_port',gun:1}])]}).allowed,true);
});
test('any offensive attack blocks premature progression even if client claims completion',()=>{
 const declarations=[d([{role:'offensive',shipId:'a',targetId:'b',mountId:'twin_nose_port',gun:1}])];
 for(const resolution of [null,{complete:true,damageApplied:true},{rollsCommitted:true,damageApplied:true}]){
  const result=combatAdvancementGuard({declarations,resolution});
  assert.equal(result.allowed,false);assert.equal(result.offensiveShots,1);
  assert.match(result.reason,/saved player rolls/);
 }
});
test('malformed or missing declarations fail closed',()=>{
 assert.throws(()=>combatAdvancementGuard({declarations:[{playerId:'p1'}]}),/Missing committed/);
 assert.throws(()=>combatAdvancementGuard({declarations:null}),/array/);
});
