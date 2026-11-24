import test from 'node:test';import assert from 'node:assert/strict';
import {VORCHAN_SCS_IDENTIFICATION as scs,auditVorchanIdentification} from '../shared/vorchan-scs-identification.mjs';
import {VORCHAN_VECTOR_AUDIT as vector} from '../shared/vorchan-vector-tracks.mjs';
test('eighteen physical systems have unique IDs, verified armour and all 281 unique vector boxes',()=>{
 assert.equal(scs.systems.length,18);
 assert.equal(new Set(scs.systems.map(s=>s.id)).size,18);
 const boxes=scs.systems.flatMap(s=>s.damageBoxes);
 assert.equal(boxes.length,281);assert.equal(new Set(boxes.map(b=>b.id)).size,281);
 assert.ok(scs.systems.every(s=>s.verified&&Number.isInteger(s.armour)));
 for(const s of scs.systems)assert.equal(s.rows.reduce((a,b)=>a+b,0),s.boxes,s.id);
 assert.equal(vector.totalBoxes,281);
 assert.ok(boxes.every(b=>b.rect.length===4&&b.rect[2]-b.rect[0]===6.75&&b.rect[3]-b.rect[1]===6.75));
});
test('ship data is fully verified without enabling unfinished combat automation',()=>{
 const audit=auditVorchanIdentification();
 assert.deepEqual(audit.unverifiedTracks,[]);assert.deepEqual(audit.issues,[]);
 assert.equal(audit.shipDataVerified,true);assert.equal(audit.readyForCombat,true);
});
test('arc diagrams do not create phantom systems or extra jump drives',()=>{
 assert.equal(scs.systems.some(s=>s.id==='retro'),false);
 assert.deepEqual(scs.systems.filter(s=>s.kind==='jump-engine').map(s=>s.id),['jump_aft_centre']);
 assert.equal(scs.systems.filter(s=>s.kind==='thruster').length,6);
 assert.equal(scs.systems.filter(s=>s.weaponCardId==='plasma-accelerator').length,1);
 assert.equal(scs.systems.filter(s=>s.weaponCardId==='twin-array').length,2);
});
