import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILTIN_SHIP_CATALOG,getBuiltinShip,listBuiltinShips} from '../shared/ship-catalog.mjs';
import {auditVorchanIdentification} from '../shared/vorchan-scs-identification.mjs';

test('built-in catalogue contains selectable, versioned Centauri ships',()=>{
 assert.equal(BUILTIN_SHIP_CATALOG.length,5);
 const ship=getBuiltinShip('centauri-vorchan-v3-2e-sf');
 assert.ok(ship);assert.equal(ship.faction,'Centauri Republic');
 assert.equal(ship.source.revision,'Version 3: 2E/SF');
 assert.equal(ship.combatPoints,360);assert.equal(ship.initiativeBonus,8);
 assert.equal(ship.weapons.length,2);assert.equal(ship.weapons.reduce((n,w)=>n+w.mounts,0),3);
 assert.equal(ship.selectable,true);assert.equal(ship.automaticCombatReady,true);
 assert.equal(getBuiltinShip('unknown'),null);
});
test('catalogue preserves independently counted structural damage tracks',()=>{
 const ship=getBuiltinShip('centauri-vorchan-v3-2e-sf');
 assert.equal(ship.scs.systems.length,18);
 assert.deepEqual(auditVorchanIdentification().unverifiedTracks,[]);
 assert.deepEqual(ship.scs.systems.filter(s=>s.kind==='structure').map(s=>s.boxes),[48,28,44]);
 assert.equal(listBuiltinShips().length,5);
});

test('Vorchan three weapon mounts resolve to individually tracked SCS systems',()=>{
 const ship=getBuiltinShip('centauri-vorchan-v3-2e-sf');
 assert.equal(ship.weaponMounts.length,3);
 const systems=new Map(ship.scs.systems.map(s=>[s.id,s]));
 for(const mount of ship.weaponMounts){
  const system=systems.get(mount.id);
  assert.ok(system,'missing mount damage track '+mount.id);
  assert.equal(system.kind,'weapon');
  assert.equal(system.boxes,mount.damageBoxes);
  assert.equal(system.armour,mount.armour);
  assert.ok(ship.weapons.some(w=>w.id===mount.weaponId));
  assert.equal(mount.arc.verified,true,'player-confirmed firing arc required');
 }
 assert.equal(ship.weaponMounts.filter(m=>m.weaponId==='plasma-accelerator').length,1);
 assert.equal(ship.weaponMounts.filter(m=>m.weaponId==='twin-array').length,2);
});
