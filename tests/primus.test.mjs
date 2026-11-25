import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {PRIMUS,PRIMUS_ID,auditPrimusIdentification} from '../shared/primus.mjs';
import {MOGRATH_ID} from '../shared/mograth.mjs';import {VORCHAN_LIBRARY_RECORD as LIB,newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {createBattle,executeBattle,requiredActors} from '../shared/automated-battle.mjs';import {initialVorchanDamage,applyVorchanStandardVolley,rollVorchanDamage,damageSystemCandidates} from '../shared/vorchan-damage.mjs';
import {beamPlan,applyBeamPart,piercingSections} from '../shared/beam-damage.mjs';import {movementOptions} from '../shared/movement-options.mjs';import {applyVorchanStage} from '../shared/vorchan-stage-server.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';import {systemPowerForHull} from '../shared/ship-condition.mjs';import {scsDamageMarkers} from '../shared/scs-markers.mjs';
import {validateFireDeclaration,validateDefensiveAssignment} from '../shared/fire-orders.mjs';import {vorchanTargetingPreview,checkMountArc} from '../shared/weapon-targeting.mjs';import {attackCalculation} from '../shared/roll-presentation.mjs';
import {moveShuttle,newShuttleMovement,jumpAvailability} from '../shared/vorchan-operations.mjs';
const members=[{user_id:'p1'},{user_id:'p2'}];
function fresh(targetId=PRIMUS_ID){return createBattle([['a','p1',4,10,0,PRIMUS_ID],['b','p2',4,7,3,targetId]].map(([id,owner_id,q,r,facing,libraryId])=>({id,owner_id,label:id,q,r,facing,private_state:{trial:{...newVorchanTrialState(id,owner_id,q,r,facing),libraryId,shipDataRevision:libraryId===LIB.id?2:1}}})),members,'standard',{operations:true});}
function ready(targetId=PRIMUS_ID){let s=fresh(targetId);for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'power'});for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'initiative'},()=>p==='p1'?1:9);for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'ew',offensive:{[p==='p1'?'b':'a']:8}});while(s.phase==='jump_formation')s=executeBattle(s,requiredActors(s)[0],{type:'jump',open:false});return s;}
function fireReady(targetId=PRIMUS_ID){let s=ready(targetId);while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});return s;}
const shot=(mode='Raking')=>({shipId:'a',targetId:'b',mountId:'laser_1',gun:1,role:'offensive',order:1,mode});
function fire(mode='Raking',targetId=PRIMUS_ID){let s=fireReady(targetId);s=executeBattle(s,'p1',{type:'fire',fire:{shots:[shot(mode)]}});return executeBattle(s,'p2',{type:'fire',fire:{shots:[]}});}
function finishCombat(s,{reroll=false}={}){const prompts=[];let redirected=false;for(let i=0;s.resolution&&i<150;i++){const r=s.resolution;prompts.push([r.stage,r.actorId,r.chart]);const type=r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice';s=executeBattle(s,r.actorId,{type,attackId:r.attack.id,stage:r.stage,...(type==='combat-choice'?{value:r.candidates[0]}:{})},sides=>{if(sides===10)return 7;if(r.stage==='location_roll'){if(reroll&&!redirected&&r.chart!=='primary'){redirected=true;return 20;}return r.chart==='primary'?1:12;}return 1;});}assert.equal(s.resolution,null,'Combat must finish');return {s,prompts};}
test('Primus source data: 830 points, all 507 squares, 12 mounts, five structural areas, sensor 10/power5',()=>{
 assert.equal(PRIMUS.combatPoints,830);assert.equal(PRIMUS.class,'capital');assert.equal(PRIMUS.initiativeBonus,0);assert.equal(PRIMUS.sensorStrength,10);assert.equal(systemPowerForHull(PRIMUS_ID).sensors,5);assert.equal(PRIMUS.weaponMounts.length,12);assert.equal(auditPrimusIdentification().damageBoxes,507);assert.deepEqual(auditPrimusIdentification().issues,[]);
 assert.equal(PRIMUS.scs.systems.find(s=>s.id==='reactor').armour,8);assert.equal(PRIMUS.scs.systems.find(s=>s.id==='sensors').armour,7);assert.equal(PRIMUS.scs.systems.find(s=>s.id==='primary_structure').armour,7);
 const d=initialVorchanDamage(PRIMUS_ID);for(const s of PRIMUS.scs.systems)d.tracks[s.id].marked=s.boxes;assert.equal(scsDamageMarkers(d).length,507);assert.doesNotMatch(readFileSync(new URL('../public/images/primus-v3-schematic.svg',import.meta.url),'utf8'),/<text\b|<script\b/);
 assert.equal(fresh().ships[0].public_state.combatPoints,830);assert.equal(Object.values(fresh().ships[0].private_state.trial.weaponReadiness).flatMap(Object.keys).length,20);
});
test('Primus capital side charts, port-only guns, side overkill and section loss',()=>{
 assert.deepEqual(damageSystemCandidates('battle_laser','port',PRIMUS_ID),['laser_1','laser_2']);assert.deepEqual(damageSystemCandidates('twin_array','starboard',PRIMUS_ID),['twin_11','twin_12']);assert.equal(damageSystemCandidates('main_thrust','aft',PRIMUS_ID).length,4);
 let d=initialVorchanDamage(PRIMUS_ID),r=applyVorchanStandardVolley({state:d,damage:20,incoming:'port',locationRoll:4,systemChoice:'laser_1'});assert.equal(r.state.tracks.laser_1.marked,6);assert.equal(r.state.tracks.port_structure.marked,4);assert.equal(r.state.tracks.primary_structure.marked,0);
 d=r.state;d.sectionsLost=['port'];r=applyVorchanStandardVolley({state:d,damage:10,incoming:'port',locationRoll:12,primaryRoll:1});assert.equal(r.state.tracks.primary_structure.marked,3);
 r=applyVorchanStandardVolley({state:initialVorchanDamage(PRIMUS_ID),damage:62,incoming:'port',locationRoll:12});assert.ok(r.state.destroyedSections.includes('port'));
});
test('capital movement offers actual acceleration, 2/3 turns, 3+3 pivots, 2+2 rolls and all four aft outlets',()=>{
 const s=ready(),a=s.ships[0];a.speed=6;Object.assign(a.private_state.trial.movement.state,{speed:6,remaining:6});let opts=movementOptions(a,1);assert.equal(opts.find(x=>x.name==='Accelerate +1').choices[0].cost,3);assert.equal(opts.find(x=>x.name==='Turn Port').choices[0].cost,4);assert.equal(opts.find(x=>x.name==='Start Roll').choices[0].cost,2);assert.equal(opts.find(x=>x.name.startsWith('Start Pivot')).choices[0].cost,3);
 const move=applyVorchanStage({ship:a,privateState:a.private_state,turn:1,action:{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_outer_thrust:2,aft_starboard_outer_thrust:1}}});assert.equal(move.nextShip.speed,7);
 a.speed=15;Object.assign(a.private_state.trial.movement.state,{speed:15,remaining:15});opts=movementOptions(a,1);const turn=opts.find(x=>x.name==='Turn Port').choices[0];const result=applyVorchanStage({ship:a,privateState:a.private_state,turn:1,action:turn.action});assert.equal(result.movement.turnDelayRemaining,10);assert.equal(result.spent,10);
});
test('Battle Laser modes require correct EW and class; firing mode survives server validation; lasers cannot be intercepted',()=>{
 const s=fireReady(),a=s.ships[0],b=s.ships[1];assert.equal(validateFireDeclaration({playerId:'p1',ships:s.ships,turn:1,fire:{shots:[shot('Piercing')]}}).shots[0].mode,'Piercing');
 const args={shooter:{...a,libraryId:PRIMUS_ID,hullClass:'capital'},target:{...b,libraryId:PRIMUS_ID,hullClass:'capital'},mountId:'laser_1',attackerOffensiveEW:4,mode:'Piercing'};
 const p=vorchanTargetingPreview(args);assert.equal(p.breakdown.modeModifier,-4);assert.equal(p.readyForHitRoll,true);assert.ok(attackCalculation({breakdown:p.breakdown}).some(x=>x.startsWith('Piercing −4')));assert.equal(vorchanTargetingPreview({...args,attackerOffensiveEW:3}).readyForHitRoll,false);
 a.private_state.trial.ewAllocation.offensive.b=3;assert.throws(()=>validateFireDeclaration({playerId:'p1',ships:s.ships,turn:1,fire:{shots:[shot('Piercing')]}}),/4 effective/);
 const declarations=[{playerId:'p1',fire:{shots:[shot()]}},{playerId:'p2',fire:{shots:[{shipId:'b',mountId:'twin_9',gun:1,role:'defensive'}]}}];assert.throws(()=>validateDefensiveAssignment({playerId:'p2',ships:s.ships,declarations,assignments:[{shipId:'b',mountId:'twin_9',gun:1,attackId:'a:laser_1:1'}]}),/cannot be intercepted/);
});
test('laser raking pays armour once per system per shot, uses 10-point groups and preserves 3-turn recharge',()=>{
 const {s,prompts}=finishCombat(fire());assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.port_structure.marked,35);assert.equal(s.dice[0].subVolleys.length,4);assert.equal(prompts.filter(x=>x[0]==='damage_roll').length,1);assert.equal(prompts.filter(x=>x[0]==='location_roll').length,4);assert.deepEqual(s.dice[0].damageDice,[7,7,7,7]);
 const t=s.ships[0].private_state.trial;for(const turn of [2,3])assert.equal(weaponReadiness({trial:t,mountId:'laser_1',turn}).ready,false);assert.equal(weaponReadiness({trial:t,mountId:'laser_1',turn:4}).ready,true);
});
test('guided piercing divides across capital sections, defender assigns remainder, primary redirects reroll, replay matches',()=>{
 const {s,prompts}=finishCombat(fire('Piercing'),{reroll:true}),d=s.ships[1].private_state.trial.condition.damage;
 assert.equal(d.tracks.port_structure.marked,9);assert.equal(d.tracks.primary_structure.marked,6);assert.equal(d.tracks.starboard_structure.marked,8);assert.deepEqual(s.dice[0].piercingExtras,['port']);assert.equal(s.dice[0].subVolleys.length,3);assert.ok(prompts.some(x=>x[0]==='piercing_choice'&&x[1]==='p2'));assert.equal(prompts.filter(x=>x[0]==='location_roll').length,4);
});
test('piercing medium damage loses2 per die, heavy side splits2 and defender remainder cannot duplicate sections',()=>{
 assert.deepEqual(piercingSections(LIB.id,'port','aft'),['aft','primary']);assert.deepEqual(piercingSections(PRIMUS_ID,'forward'),['forward','primary','aft']);
 const d=rollVorchanDamage({libraryId:PRIMUS_ID,mountId:'laser_1',dice:[1,2,3,10],range:5,mode:'Piercing',targetClass:'medium'});assert.equal(d.damage,23);assert.equal(d.formula.piercingLoss,2);
 assert.throws(()=>beamPlan({...d,damage:35},PRIMUS_ID,'forward',null,['forward','forward']),/distinct/);
 const {s}=finishCombat(fire('Piercing',MOGRATH_ID));assert.equal(s.dice[0].subVolleys.length,1);assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.primary_structure.marked,27);
});
test('piercing discards excess on systems and damage allocated to previously lost sections',()=>{
 const d={piercing:true,damage:52,plasma:false,plasmaStream:false};let state=initialVorchanDamage(PRIMUS_ID);let r=applyBeamPart({state,damage:d,part:{chart:'port',damage:18},location:{locationRoll:4,systemChoice:'laser_1'},incoming:'port'});assert.equal(r.state.tracks.laser_1.marked,6);assert.equal(r.state.tracks.port_structure.marked,0);
 state.sectionsLost=['port'];r=applyBeamPart({state,damage:d,part:{chart:'port',damage:18},location:{},incoming:'port'});assert.deepEqual(r.trace,[]);assert.equal(r.state.tracks.primary_structure.marked,0);
});
test('Primus carries two correctly rated shuttles, jump damage uses its25-box drive',()=>{
 const s=fresh(),x=s.shuttles[0];assert.equal(x.stats.thrust,3);assert.equal(x.stats.armour,1);newShuttleMovement(x);assert.throws(()=>moveShuttle(x,{type:'speed',change:4}),/Insufficient/);assert.equal(moveShuttle(x,{type:'speed',change:3}).speed,3);
 s.ships[0].private_state.trial.condition.damage.tracks.jump_aft_centre.marked=5;assert.equal(jumpAvailability(s,s.ships[0]).risk,20);
});
test('Primus may declare all20 guns; there is no old eight-shot-per-ship cap',()=>{
 const s=fireReady();s.ships[1].q=7;s.ships[1].r=7;const shots=PRIMUS.weaponMounts.flatMap(m=>Array.from({length:m.weaponId==='twin-array'?2:1},(_,i)=>({shipId:'a',targetId:'b',mountId:m.id,gun:i+1,role:'offensive'}))).map((x,i)=>({...x,order:i+1}));
 assert.equal(validateFireDeclaration({playerId:'p1',ships:s.ships,turn:1,fire:{shots}}).shots.length,20);
});
test('heavy side piercing and medium primary redirects complete through recorded guided damage',()=>{
 const h=finishCombat(fire('Piercing',LIB.id));assert.equal(h.s.dice[0].subVolleys.length,2);
 let s=fire('Piercing',MOGRATH_ID);for(let i=0;s.resolution&&i<100;i++){const r=s.resolution,type=r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice';s=executeBattle(s,r.actorId,{type,stage:r.stage,attackId:r.attack.id,...(type==='combat-choice'?{value:r.candidates[0]}:{})},n=>n===10?7:r.stage==='location_roll'?20:r.stage==='primary_roll'?20:1);}assert.equal(s.resolution,null);assert.ok(s.dice[0].subVolleys[0].primaryRoll);assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.command.marked,8);
});
test('a filled capital side track never references an invented side_structure system',()=>{
 const state=initialVorchanDamage(PRIMUS_ID);state.tracks.port_structure.marked=56;
 const hit=applyVorchanStandardVolley({state,damage:10,incoming:'port',locationRoll:12});assert.equal(hit.state.tracks.primary_structure.marked,3);
 const piercing=applyBeamPart({state,damage:{piercing:true},part:{chart:'port',damage:20},location:{locationRoll:12},incoming:'port'});assert.equal(piercing.state.tracks.primary_structure.marked,0);
});
test('saved plasma-stream combat resumes when new beam bookkeeping is absent',()=>{
 let s=fireReady(MOGRATH_ID);s=executeBattle(s,'p1',{type:'fire',fire:{shots:[]}});s=executeBattle(s,'p2',{type:'fire',fire:{shots:[{shipId:'b',targetId:'a',mountId:'plasma_stream',gun:1,role:'offensive',order:1}]}});
 for(let i=0;s.resolution?.stage!=='damage_result'&&i<10;i++){const r=s.resolution;s=executeBattle(s,r.actorId,{type:r.stage.endsWith('_roll')?'combat-roll':'combat-ok',stage:r.stage,attackId:r.attack.id},n=>n===10?4:1);}
 delete s.resolution.beamPlan;delete s.resolution.armourPaid;delete s.resolution.piercingExtras;const result=finishCombat(s);assert.equal(result.s.resolution,null);assert.ok(result.s.dice[0].subVolleys.length>0);
});
