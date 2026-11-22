import test from 'node:test';
import assert from 'node:assert/strict';
import {interceptModifiers} from '../shared/weapon-interception.mjs';
const attack={shipId:'a',mountId:'plasma_forward',gun:1,role:'offensive',targetId:'b',order:1,chargeTurns:1};
const guns=[1,2].map(gun=>({shipId:'b',mountId:'twin_nose_port',gun,role:'defensive'}));
const d=[{playerId:'p1',fire:{shots:[attack]}},{playerId:'p2',fire:{shots:guns}}];
const a=guns.map(g=>({...g,attackId:'a:plasma_forward:1'}));
test('one and two reserved twin guns intercept one shot, with -2 then -1 degradation',()=>{
 assert.equal(interceptModifiers({declarations:d,defences:[{playerId:'p2',defence:{assignments:a.slice(0,1)}}]})['a:plasma_forward:1'].total,-2);
 const result=interceptModifiers({declarations:d,defences:[{playerId:'p2',defence:{assignments:a}}]})['a:plasma_forward:1'];
 assert.equal(result.total,-3);assert.deepEqual(result.contributions.map(x=>x.modifier),[-2,-1]);
});
test('interception cannot reuse a gun, intercept an unannounced shot or target a different ship',()=>{
 assert.throws(()=>interceptModifiers({declarations:d,defences:[{playerId:'p2',defence:{assignments:[a[0],a[0]]}}]}),/duplicated/);
 assert.throws(()=>interceptModifiers({declarations:d,defences:[{playerId:'p2',defence:{assignments:[{...a[0],attackId:'missing'}]}}]}),/Invalid/);
 assert.throws(()=>interceptModifiers({declarations:d,defences:[{playerId:'p1',defence:{assignments:[a[0]]}}]}),/Invalid/);
});
