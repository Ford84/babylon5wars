import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {VORCHAR,VORCHAR_ID,auditVorcharIdentification} from '../shared/vorchar.mjs';
import {newVorchanTrialState,VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {initialVorchanDamage,applyVorchanStandardVolley,rollVorchanDamage,damageSystemCandidates} from '../shared/vorchan-damage.mjs';
import {newCondition,systemPowerForHull,effectiveCondition,resolveShipCritical} from '../shared/ship-condition.mjs';
import {createBattle,executeBattle,battleView,requiredActors} from '../shared/automated-battle.mjs';
import {resolveVorchanShipFire} from '../shared/weapon-resolution.mjs';
import {scsDamageMarkers} from '../shared/scs-markers.mjs';
import {fleetTotals,validateFleet} from '../shared/fleet-setup.mjs';
import {attackCalculation} from '../shared/roll-presentation.mjs';
const players=[{user_id:'p1'},{user_id:'p2'}];
function row(id,owner,scout,q,r,facing){return {id,owner_id:owner,label:id,q,r,facing,private_state:{trial:{...newVorchanTrialState(id,owner,q,r,facing),...(scout?{libraryId:VORCHAR_ID,shipDataRevision:1}:{})}}};}
function fresh(opts={}){return createBattle([row('a','p1',false,3,10,0),row('s','p1',true,4,10,0),row('b','p2',false,6,7,3)],players,'standard',{operations:true,...opts});}
function ewPhase(opts={}){let s=fresh(opts);for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'power',shipId:x.id});for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'initiative',unitId:x.id},()=>x.owner_id==='p1'?2:9);return s;}
test('Vorchar has three numbered Twin Arrays, six guns, original sensor10/power7 and500 points',()=>{
 assert.equal(VORCHAR.combatPoints,500);assert.equal(VORCHAR.sensorStrength,10);assert.equal(VORCHAR.extraPower,6);assert.equal(VORCHAR.weapons[0].mounts,3);
 assert.deepEqual(VORCHAR.weaponMounts.map(x=>x.mountNumber),[1,2,3]);assert.ok(VORCHAR.weaponMounts.every(x=>x.damageBoxes===6&&x.armour===3&&x.arc.coverageDegrees===270));
 assert.equal(systemPowerForHull(VORCHAR_ID).sensors,7);assert.equal(systemPowerForHull(VORCHAR_ID).twin_nose_centre,2);assert.equal(systemPowerForHull(VORCHAR_ID).plasma_forward,undefined);
 assert.equal(auditVorcharIdentification().shipDataVerified,true);assert.equal(auditVorcharIdentification().damageBoxes,281);
 assert.equal(VORCHAR.scs.systems.find(s=>s.id==='sensors').boxes,24);
 const svg=readFileSync(new URL('../public/images/vorchar-v2-schematic.svg',import.meta.url),'utf8');assert.doesNotMatch(svg,/<text\b|<script\b|(?:href|src)=["\']https?:/);
});
test('Vorchar SCS chart, defender choices, damage and nose criticals use the correct profile',()=>{
 const d=initialVorchanDamage(VORCHAR_ID);assert.equal(d.tracks.plasma_forward,undefined);assert.ok(d.tracks.twin_nose_centre);
 const pending=applyVorchanStandardVolley({state:d,damage:9,incoming:'forward',locationRoll:5,plasma:false});assert.equal(pending.requiresChoice,true);assert.equal(pending.choices.length,3);
 const hit=applyVorchanStandardVolley({state:d,damage:9,incoming:'forward',locationRoll:5,plasma:false,systemChoice:'twin_nose_centre'});assert.equal(hit.state.tracks.twin_nose_centre.marked,6);assert.equal(scsDamageMarkers(hit.state).length,6);
 assert.equal(rollVorchanDamage({libraryId:VORCHAR_ID,mountId:'twin_nose_centre',range:3,dice:[10]}).damage,14);
 const t={libraryId:VORCHAR_ID,condition:newCondition(VORCHAR_ID)};t.condition.damage.tracks.twin_nose_centre.marked=1;
 const c=resolveShipCritical(t,1,{systemId:'twin_nose_centre',marked:1,excess:0,cause:'damage'},14);assert.ok(c.result);assert.ok(c.trial.condition.effects.weapons.twin_nose_centre);
 assert.equal(damageSystemCandidates('twin_array','forward',VORCHAR_ID).length,3);
});
test('mixed fleet setup computes source points and each hull retains its own power and EW',()=>{
 const entries=[{ownerId:'p1',catalogId:VORCHAR_ID,q:3,r:10,facing:0,speed:0},{ownerId:'p2',catalogId:LIB.id,q:6,r:7,facing:3,speed:0}];
 assert.equal(validateFleet(entries,players,'standard','free').length,2);assert.deepEqual(fleetTotals(entries,players).map(x=>x.points),[500,360]);
 const s=ewPhase();assert.equal(s.ships[1].private_state.trial.powerAllocation.availablePower,6);assert.equal(effectiveCondition(s.ships[1].private_state.trial,1).sensorStrength,10);
});
test('ELINT allocation remains private until reveal, then scout chooses disruption before movement and reload preserves it',()=>{
 let s=ewPhase();s=executeBattle(s,'p1',{type:'ew',shipId:'a',offensive:{b:2}});s=executeBattle(s,'p1',{type:'ew',shipId:'s',offensive:{a:1,b:4},elint:{disruption:{b:3},defensive:{a:2}}});
 assert.equal(battleView(s,'p2').ships[1].public_state.ew,undefined);
 assert.throws(()=>executeBattle(s,'p2',{type:'ew',offensive:{a:8},elint:{blanket:4}}),/Only an ELINT/);
 s=executeBattle(s,'p2',{type:'ew',offensive:{a:1},defensive:7});assert.equal(s.phase,'ew_disruption');assert.deepEqual(requiredActors(s),['p1']);
 const d=battleView(s,'p1');assert.equal(d.elintDisruption.scoutId,'s');assert.equal(d.ships[2].public_state.ew.offensive.a,1);
 assert.throws(()=>executeBattle(s,'p2',{type:'elint-disrupt',scoutId:'s',targetId:'b',removed:{a:1}}),/Wait/);
 assert.throws(()=>executeBattle(s,'p1',{type:'elint-disrupt',scoutId:'s',targetId:'b',removed:{a:2}}),/exactly/);
 assert.throws(()=>executeBattle(s,'p1',{type:'movement-done'}),/not available/);
 s=JSON.parse(JSON.stringify(s));s=executeBattle(s,'p1',{type:'elint-disrupt',scoutId:'s',targetId:'b',removed:{a:1}});assert.equal(s.phase,'jump_formation');assert.deepEqual(s.elintDisruptions[0].removed,{a:1});
 assert.throws(()=>executeBattle(s,'p1',{type:'elint-disrupt',scoutId:'s',targetId:'b',removed:{a:1}}));
});
test('all six Vorchar guns are ready and resolve to-hit with server ELINT modifiers and visible arithmetic',()=>{
 let s=ewPhase();for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'ew',shipId:x.id,offensive:x.id==='s'?{a:1,b:8}:x.id==='a'?{b:2}:{s:1}});
 for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'jump',shipId:x.id,open:false});
 while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});
 const ships=s.ships,shots=VORCHAR.weaponMounts.flatMap(m=>[1,2].map(gun=>({shipId:'s',targetId:'b',mountId:m.id,gun,role:'offensive',order:gun})));
 const fire=resolveVorchanShipFire({turn:1,ships,declarations:[{playerId:'p1',fire:{shots}}],defences:[],rolls:shots.map(x=>({attackId:`s:${x.mountId}:${x.gun}`,roll:1})),terrainVerified:true,ewSnapshot:s.ewSnapshot});
 assert.equal(fire.complete,true);assert.equal(fire.results.length,6);assert.ok(fire.results.every(x=>x.hit));
 const a={shipId:'a',targetId:'b',mountId:'twin_nose_port',gun:1,role:'offensive',order:1};const supported=resolveVorchanShipFire({turn:1,ships,declarations:[{playerId:'p1',fire:{shots:[a]}}],defences:[],rolls:[{attackId:'a:twin_nose_port:1',roll:1}],terrainVerified:true,ewSnapshot:s.ewSnapshot});assert.equal(supported.results[0].breakdown.elintOffensive,4);assert.ok(attackCalculation(supported.results[0]).some(x=>x.includes('ELINT OEW +4')));
});
test('command-fixed full ELINT is restored automatically without silently losing support',()=>{
 let s=fresh();const t=s.ships[1].private_state.trial;t.condition.effects.ewLock={turn:1,defensive:2,offensive:{a:1,b:2},elint:{defensive:{a:2},disruption:{b:3},blanket:0}};
 for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'power',shipId:x.id});for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'initiative',unitId:x.id},()=>x.owner_id==='p1'?2:9);
 assert.equal(s.unitPhaseLocks.s,true);assert.equal(s.ships[1].private_state.trial.ewAllocation.elint.defensive.a,2);
});
test('guided fire keeps ELINT from the immutable firing snapshot when a scout loses its sensors in the same tier',()=>{
 let s=ewPhase();for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'ew',shipId:x.id,offensive:x.id==='s'?{a:1,b:8}:x.id==='a'?{b:2}:{s:8}});
 for(const x of s.ships)s=executeBattle(s,x.owner_id,{type:'jump',shipId:x.id,open:false});while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});
 s.ships.find(x=>x.id==='s').private_state.trial.condition.damage.tracks.sensors.marked=23;
 const shot=(shipId,targetId,mountId,order)=>({shipId,targetId,mountId,gun:1,role:'offensive',order});
 s=executeBattle(s,'p1',{type:'fire',shipId:'a',fire:{shots:[shot('a','b','twin_nose_port',2)]}});s=executeBattle(s,'p1',{type:'fire',shipId:'s',fire:{shots:[]}});
 s=executeBattle(s,'p2',{type:'fire',shipId:'b',fire:{shots:[shot('b','s','twin_nose_port',1)]}});
 assert.ok(s.resolution);let friendlyAttack,scoutDamaged=false;
 for(let i=0;s.resolution&&i<100;i++){
  const r=s.resolution;if(r.attack.shipId==='a'&&r.stage==='attack_result')friendlyAttack=r.attack;
  if(r.attack.shipId==='b'&&r.stage==='damage_result')scoutDamaged=r.states.s.tracks.sensors.marked===24;
  s=executeBattle(s,r.actorId,{type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates?.length?{value:r.candidates[0]}:{})},n=>n===10?10:r.stage==='location_roll'&&r.attack.shipId==='b'?19:r.stage==='primary_roll'?11:r.stage==='location_roll'?11:1);
 }
 assert.equal(scoutDamaged,true);assert.equal(friendlyAttack.breakdown.elintOffensive,4);assert.equal(s.ships.find(x=>x.id==='s').private_state.trial.condition.damage.tracks.sensors.marked,24);
 assert.equal(effectiveCondition(s.ships.find(x=>x.id==='s').private_state.trial,2).sensorStrength,0);
});
