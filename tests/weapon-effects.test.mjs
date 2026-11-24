import test from 'node:test';import assert from 'node:assert/strict';
import {weaponEffects,sampleWeaponEffect,weaponPlaybackDuration} from '../shared/weapon-effects.mjs';
import {scsDamageMarkers} from '../shared/scs-markers.mjs';
import {VORCHAN_SCS_IDENTIFICATION as SCS} from '../shared/vorchan-scs-identification.mjs';
test('effects travel from the saved firing hex to the target and only hits produce impacts',()=>{
 const event={public:{attacks:[{id:'a',from:{q:1,r:2},to:{q:9,r:6},hit:true,effect:'plasma'},{id:'b',from:{q:9,r:6},to:{q:1,r:2},hit:false,effect:'pulse'}]}};
 const effects=weaponEffects(event);assert.equal(effects.length,2);assert.equal(sampleWeaponEffect(effects[0],0).t,0);assert.equal(sampleWeaponEffect(effects[0],310).t,.5);
 assert.equal(sampleWeaponEffect(effects[0],620).t,1);assert.equal(sampleWeaponEffect(effects[0],620).impact,1);
 assert.equal(sampleWeaponEffect(effects[1],760).impact,0);assert.equal(sampleWeaponEffect(effects[0],weaponPlaybackDuration(effects)).visible,false);
 assert.deepEqual(event.public.attacks[0].to,{q:9,r:6});
});
test('live SCS maps all 281 boxes exactly once and partial damage uses its actual system track',()=>{
 assert.equal(scsDamageMarkers(null).length,0);
 const partial=scsDamageMarkers({tracks:{sensors:{marked:3}}});assert.equal(partial.length,3);assert.ok(partial.every(x=>x.systemId==='sensors'&&x.rect.length===4));
 const all=scsDamageMarkers({tracks:Object.fromEntries(SCS.systems.map(x=>[x.id,{marked:x.boxes}]))});assert.equal(all.length,281);assert.equal(new Set(all.map(x=>x.id)).size,281);
});
