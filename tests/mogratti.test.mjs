import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {MOGRATTI,MOGRATTI_ID,auditMograttiIdentification} from '../shared/mogratti.mjs';import {MOGRATH} from '../shared/mograth.mjs';
import {newVorchanTrialState,VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {createBattle,executeBattle,requiredActors} from '../shared/automated-battle.mjs';
import {initialVorchanDamage,applyVorchanStandardVolley,damageSystemCandidates,rollVorchanDamage} from '../shared/vorchan-damage.mjs';
import {effectiveCondition,resolveShipCritical,systemPowerForHull} from '../shared/ship-condition.mjs';import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {scsDamageMarkers} from '../shared/scs-markers.mjs';import {criticalTable,locationTable} from '../shared/rule-tables.mjs';
import {fleetTotals,validateFleet} from '../shared/fleet-setup.mjs';import {validateFireDeclaration} from '../shared/fire-orders.mjs';import {interceptModifiers} from '../shared/weapon-interception.mjs';
const players=[{user_id:'p1'},{user_id:'p2'}];
const row=(id,owner_id,variant,q,r,facing)=>({id,owner_id,label:id,q,r,facing,private_state:{trial:{...newVorchanTrialState(id,owner_id,q,r,facing),...(variant?{libraryId:MOGRATTI_ID,shipDataRevision:1}:{})}}});
function fresh(){return createBattle([row('a','p1',true,4,10,0),row('b','p2',false,7,7,3)],players,'standard',{operations:true});}
function ready(){let s=fresh();for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'power'});for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'initiative'},()=>p==='p1'?1:9);for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'ew',offensive:{[p==='p1'?'b':'a']:8}});s=executeBattle(s,'p2',{type:'jump',open:false});while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});return s;}
test('Mogratti source profile replaces stream and Guardian, adds primary Twin Array and preserves medium agile hull',()=>{
 assert.equal(MOGRATTI.combatPoints,575);assert.equal(MOGRATTI.serviceYear,2236);assert.equal(MOGRATTI.extraPower,2);assert.equal(MOGRATTI.class,'medium');assert.equal(MOGRATTI.agile,true);assert.equal(MOGRATTI.initiativeBonus,12);assert.equal(MOGRATTI.shuttles,1);assert.equal(MOGRATTI.jumpDelay,null);assert.equal(MOGRATTI.modelUrl,MOGRATH.modelUrl);
 assert.equal(MOGRATTI.weaponMounts.length,6);assert.equal(MOGRATTI.weaponMounts.filter(x=>x.weaponId==='twin-array').length,3);assert.equal(MOGRATTI.weapons.find(x=>x.id==='twin-array').mounts,3);assert.equal(MOGRATTI.weapons.some(x=>['plasma-stream','guardian-array'].includes(x.id)),false);
 const primary=MOGRATTI.weaponMounts.find(x=>x.id==='twin_primary');assert.equal(primary.armour,4);assert.equal(primary.arc.coverageDegrees,360);assert.equal(primary.damageBoxes,6);assert.equal(primary.mountNumber,6);
 assert.equal(MOGRATTI.weaponMounts[0].armour,3);assert.equal(MOGRATTI.weaponMounts[0].damageBoxes,10);assert.equal(MOGRATTI.weaponMounts[0].arc.coverageDegrees,120);
});
test('all200 original SCS boxes are unique, source-backed and automatically marked',()=>{
 const audit=auditMograttiIdentification();assert.equal(audit.shipDataVerified,true);assert.equal(audit.damageBoxes,200);assert.deepEqual(audit.issues,[]);
 const damage=initialVorchanDamage(MOGRATTI_ID);assert.equal(damage.tracks.guardian,undefined);assert.equal(damage.tracks.plasma_stream,undefined);damage.tracks.plasma_forward.marked=10;damage.tracks.twin_primary.marked=6;assert.equal(scsDamageMarkers(damage).length,16);
 const svg=readFileSync(new URL('../public/images/mogratti-v2-schematic.svg',import.meta.url),'utf8');assert.doesNotMatch(svg,/<text\b|<script\b/);
});
test('Mogratti hit charts distinguish forward arrays from the primary array and route destroyed mounts to structure',()=>{
 assert.deepEqual(locationTable('forward',MOGRATTI_ID).find(x=>x[2]==='plasma_accelerator'),[4,5,'plasma_accelerator']);assert.deepEqual(locationTable('primary',MOGRATTI_ID).find(x=>x[2]==='twin_array'),[8,9,'twin_array']);
 assert.deepEqual(damageSystemCandidates('twin_array','forward',MOGRATTI_ID),['twin_port','twin_starboard']);assert.deepEqual(damageSystemCandidates('twin_array','primary',MOGRATTI_ID),['twin_primary']);
 let d=initialVorchanDamage(MOGRATTI_ID);let hit=applyVorchanStandardVolley({state:d,damage:9,incoming:'forward',locationRoll:18,primaryRoll:8});assert.equal(hit.requiresChoice,false);assert.equal(hit.state.tracks.twin_primary.marked,5);assert.equal(hit.trace[0].armour,4);
 d=hit.state;d.tracks.twin_primary.marked=6;hit=applyVorchanStandardVolley({state:d,damage:9,incoming:'forward',locationRoll:18,primaryRoll:8});assert.equal(hit.state.tracks.primary_structure.marked,4);assert.equal(hit.state.tracks.twin_port.marked,0);
});
test('accelerator charge uses printed one/two/three-turn dice, half armour and authoritative readiness',()=>{
 const s=ready(),t=s.ships[0].private_state.trial;assert.equal(t.powerAllocation.availablePower,2);assert.equal(systemPowerForHull(MOGRATTI_ID).plasma_forward,5);assert.equal(systemPowerForHull(MOGRATTI_ID).twin_primary,2);assert.equal(systemPowerForHull(MOGRATTI_ID).guardian,undefined);
 for(const [turns,dice,expected] of [[1,[10],11],[2,[10,10],25],[3,[10,10,10,10],49]]){assert.equal(weaponReadiness({trial:t,mountId:'plasma_forward',turn:1,chargeTurns:turns}).ready,true);const r=rollVorchanDamage({libraryId:MOGRATTI_ID,mountId:'plasma_forward',chargeTurns:turns,range:3,dice});assert.equal(r.damage,expected);assert.equal(r.plasma,true);assert.equal(r.raking,null);}
 t.weaponReadiness.plasma_forward[1].lastFiredTurn=1;assert.equal(weaponReadiness({trial:t,mountId:'plasma_forward',turn:2,chargeTurns:1}).ready,true);assert.equal(weaponReadiness({trial:t,mountId:'plasma_forward',turn:2,chargeTurns:2}).ready,false);assert.equal(weaponReadiness({trial:t,mountId:'plasma_forward',turn:3,chargeTurns:2}).ready,true);
});
test('all nine guns have arming state; primary guns intercept independently and use Twin Array critical table',()=>{
 const s=ready(),t=s.ships[0].private_state.trial;assert.equal(Object.values(t.weaponReadiness).flatMap(Object.values).length,9);
 const declaration=validateFireDeclaration({playerId:'p1',ships:s.ships,turn:1,fire:{shots:[{shipId:'a',mountId:'twin_primary',gun:1,role:'defensive'},{shipId:'a',mountId:'twin_primary',gun:2,role:'defensive'}]}});assert.equal(declaration.shots.length,2);
 const incoming={playerId:'p2',fire:{shots:[{shipId:'b',targetId:'a',mountId:'twin_nose_port',gun:1,role:'offensive'}]}},assignments=[1,2].map(gun=>({shipId:'a',mountId:'twin_primary',gun,attackId:'b:twin_nose_port:1'}));assert.equal(interceptModifiers({declarations:[{playerId:'p1',fire:declaration},incoming],defences:[{playerId:'p1',defence:{assignments}}]})['b:twin_nose_port:1'].total,-3);
 assert.equal(criticalTable('twin_primary',false,MOGRATTI_ID).at(-1)[0],20);t.condition.damage.tracks.twin_primary.marked=1;const result=resolveShipCritical(t,1,{systemId:'twin_primary',kind:'damage',excess:0},19);assert.deepEqual(result.trial.condition.effects.weapons.twin_primary.destroyedGuns,[2]);
});
test('fleet totals count575 points and Mogratti guided accelerator fire completes with its own SCS state',()=>{
 const entries=[{ownerId:'p1',catalogId:MOGRATTI_ID,q:4,r:10,facing:0,speed:0},{ownerId:'p2',catalogId:LIB.id,q:7,r:7,facing:3,speed:0}];validateFleet(entries,players,'standard','free');assert.equal(fleetTotals(entries,players)[0].points,575);
 let s=ready();s=executeBattle(s,'p1',{type:'fire',fire:{shots:[{shipId:'a',targetId:'b',mountId:'plasma_forward',gun:1,role:'offensive',chargeTurns:3,order:1}]}});s=executeBattle(s,'p2',{type:'fire',fire:{shots:[]}});let damageRolls=0;
 for(let i=0;s.resolution&&i<60;i++){const r=s.resolution;if(r.stage==='damage_roll')damageRolls++;s=executeBattle(s,r.actorId,{type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates.length?{value:r.candidates[0]}:{})},n=>n===10?3:r.stage==='location_roll'?12:1);}
 assert.equal(s.phase,'hangar');assert.equal(damageRolls,1);assert.equal(s.dice[0].damageDice.length,4);assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.forward_structure.marked,19);assert.equal(s.ships[0].private_state.trial.weaponReadiness.plasma_forward[1].lastFiredTurn,1);assert.equal(effectiveCondition(s.ships[0].private_state.trial,1).freeThrust,10);
});
