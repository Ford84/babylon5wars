import test from 'node:test';
import assert from 'node:assert/strict';
import {CENTAURI_HEADERS,validateCentauriHeader} from '../shared/centauri-headers.mjs';
test('source-labelled Centauri headers have unique identifiers',()=>{
 assert.equal(CENTAURI_HEADERS.length,3);
 assert.equal(new Set(CENTAURI_HEADERS.map(s=>s.id)).size,3);
 for(const ship of CENTAURI_HEADERS)assert.equal(validateCentauriHeader(ship),true,ship.name);
});
test('Primus and Vorchan turn tables and known ratings match transcribed sheets',()=>{
 const [primus,vorchan,sentri]=CENTAURI_HEADERS;
 assert.deepEqual(primus.turnCost,[1,2,2,3,4,4,5,6,6,7,8,8]);
 assert.deepEqual(vorchan.turnDelay,[1,1,1,2,2,2,3,3,3,4,4,4]);
 assert.equal(vorchan.extraPower,4);
 assert.equal(primus.hangar.fighters,12);
 assert.equal(sentri.flightSize,6);
 assert.equal(sentri.freeThrust,12);
});
test('headers do not masquerade as combat-ready control sheets',async()=>{
 const {validateSCS}=await import('../shared/scs.mjs');
 for(const ship of CENTAURI_HEADERS)assert.equal(validateSCS(ship).valid,false);
});
