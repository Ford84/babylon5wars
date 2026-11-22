import test from 'node:test';import assert from 'node:assert/strict';
import {VORCHAN_SCS_IDENTIFICATION as scs,auditVorchanIdentification} from '../shared/vorchan-scs-identification.mjs';
test('all printed Vorchan system icons have unique IDs and armour',()=>{assert.equal(new Set(scs.systems.map(s=>s.id)).size,scs.systems.length);assert.ok(scs.systems.every(s=>Number.isInteger(s.armour)));});
test('verified diagram tracks count individual squares',()=>{for(const s of scs.systems.filter(s=>s.verified))assert.equal(s.rows.reduce((a,b)=>a+b,0),s.boxes,s.id);assert.deepEqual(auditVorchanIdentification().issues,[]);});
test('structure tracks are explicitly blocked from automated combat',()=>{assert.deepEqual(auditVorchanIdentification().unverifiedTracks,['forward_structure','primary_structure','aft_structure']);assert.equal(auditVorchanIdentification().readyForCombat,false);});
test('both plasma accelerator and twin array mounts are individually identified',()=>{assert.equal(scs.systems.filter(s=>s.weaponCardId==='plasma_accelerator').length,2);assert.equal(scs.systems.filter(s=>s.weaponCardId==='twin_array').length,2);});
