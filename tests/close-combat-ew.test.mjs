import test from 'node:test';
import assert from 'node:assert/strict';
import {allocateCloseCombatEW} from '../shared/close-combat-ew.mjs';
import {effectiveCCEWReserve,elintAttackEffects} from '../shared/elint.mjs';
const ship={id:'s',owner_id:'a',q:0,r:0,ewAllocation:{offensive:{},closeCombatReserve:4,closeCombatTargets:{'c-shuttle-flight':3}}};
const target={id:'f',carrierId:'c',kind:'shuttle',owner_id:'b',q:10,r:0,status:'deployed'};
test('CCEW allocation enforces budget and range',()=>{
 assert.equal(allocateCloseCombatEW(ship,[target],4,{f:3}).unallocated,1);
 assert.throws(()=>allocateCloseCombatEW(ship,[target],4,{f:5}));
 assert.throws(()=>allocateCloseCombatEW(ship,[{...target,q:11}],4,{f:1}));
});
test('CCEW disruption reduces reserved points',()=>{
 assert.equal(effectiveCCEWReserve(ship,[{targetId:'s',removed:{'@ccew':2}}]),2);
});
test('CCEW applies only to designated small craft within ten hexes',()=>{
 const effects=t=>elintAttackEffects({shooter:ship,target:t,units:[ship,t],baseDefence:7});
 assert.equal(effects(target).ownOffensive,3);
 assert.equal(effects({...target,q:11}).ownOffensive,0);
 assert.equal(effects({...target,carrierId:'other'}).ownOffensive,0);
});
