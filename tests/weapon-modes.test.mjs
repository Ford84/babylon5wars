import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../worker/index.mjs';
test('Quick Combat and enhanced weapon modes appear separately',async()=>{const r=await app.fetch(new Request('https://local.test/'),{DB:{}});const html=await r.text();assert.match(html,/Enhanced weapons/);assert.match(html,/Quick Combat/);assert.match(html,/Fire Interceptors!/);assert.match(html,/Shake The Lock!/);});
test('Public catalogue retains weapon traits and Tri-Star shield definitions',async()=>{const r=await app.fetch(new Request('https://local.test/api/ship-presets'),{DB:{}});const {ships}=await r.json();const tri=ships.find(x=>x.id==='tri-star');assert.ok(tri.stats.weapons.some(w=>w.special.includes('Rapid Fire 6')));assert.ok(tri.stats.weapons.some(w=>w.special.includes('Intercept 25')));assert.ok(ships.find(x=>x.id==='victory').stats.weapons.some(w=>w.offence===300&&w.automatic===false));});
