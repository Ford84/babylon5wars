import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN_SHIP_CATALOG,getBuiltinShip,listBuiltinShips} from '../shared/ship-catalog.mjs';
import {auditVorchanIdentification} from '../shared/vorchan-scs-identification.mjs';

test('built-in catalogue contains one selectable, versioned Vorchan',()=>{
 assert.equal(BUILTIN_SHIP_CATALOG.length,1);
 const ship=getBuiltinShip('centauri-vorchan-v3-2e-sf');
 assert.ok(ship);assert.equal(ship.faction,'Centauri Republic');
 assert.equal(ship.source.revision,'Version 3: 2E/SF');
 assert.equal(ship.combatPoints,360);assert.equal(ship.initiativeBonus,8);
 assert.equal(ship.weapons.length,2);assert.equal(ship.weapons.reduce((n,w)=>n+w.mounts,0),4);
 assert.equal(ship.selectable,true);assert.equal(ship.automaticCombatReady,false);
 assert.equal(getBuiltinShip('unknown'),null);
});
test('catalogue preserves incomplete structural damage without fabricating boxes',()=>{
 const ship=getBuiltinShip('centauri-vorchan-v3-2e-sf');
 assert.equal(ship.scs.systems.length,18);
 assert.deepEqual(auditVorchanIdentification().unverifiedTracks,['forward_structure','primary_structure','aft_structure']);
 for(const system of ship.scs.systems.filter(s=>!s.verified))assert.equal(system.boxes,null);
 assert.equal(listBuiltinShips().length,1);
});
