import test from 'node:test';
import assert from 'node:assert/strict';
import {escapeAllowance,carrierEscapeOptions,applyCarrierEscape} from '../shared/carrier-escape.mjs';
import {newSentriFlight} from '../shared/centauri-combat-data.mjs';
test('escape table rounds down combined complement',()=>{for(const [roll,n] of [[1,0],[5,0],[6,3],[10,3],[11,7],[18,7],[19,14],[20,14]])assert.equal(escapeAllowance(14,roll),n);assert.equal(escapeAllowance(7,6),1);});
test('owner selects survivors and launch state is inherited',()=>{const ship={id:'c',owner_id:'p',q:2,r:3,facing:1,speed:4};const s={turn:2,ships:[ship],shuttles:[{id:'s',carrierId:'c',status:'aboard'}],fighterFlights:[{...newSentriFlight(),id:'f',carrierId:'c',status:'aboard'}]};const o=carrierEscapeOptions(s,ship,11);assert.equal(o.count,3);assert.throws(()=>applyCarrierEscape(s,o,'enemy',['s','f:1','f:2']));applyCarrierEscape(s,o,'p',['s','f:1','f:2']);assert.equal(s.fighterFlights[0].fighters.filter(x=>!x.destroyed).length,2);assert.equal(s.fighterFlights[0].launchedTurn,2);assert.equal(s.shuttles[0].speed,4);});
