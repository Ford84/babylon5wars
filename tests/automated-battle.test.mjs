import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,executeBattle,battleView,PLAY_PHASES} from '../shared/automated-battle.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';
import {newVorchanTrialState} from '../shared/vorchan-trial-library.mjs';
import {newCondition,effectiveCondition,finishShipTurn,projectTrial} from '../shared/ship-condition.mjs';
const players=[{user_id:'p1'},{user_id:'p2'}];
function fresh(){return createBattle([{id:'a',owner_id:'p1',label:'Alpha',q:3,r:10,facing:0},{id:'b',owner_id:'p2',label:'Beta',q:6,r:7,facing:3}].map(x=>({...x,private_state:{trial:newVorchanTrialState(x.id,x.owner_id,x.q,x.r,x.facing)}})),players);}
const command=(s,p,c,die=()=>5)=>executeBattle(s,p,c,die);
function readyForFire(die=()=>5){let s=fresh();for(const p of ['p1','p2'])s=command(s,p,{type:'power'});for(const p of ['p1','p2'])s=command(s,p,{type:'initiative'},die);for(const p of ['p1','p2'])s=command(s,p,{type:'ew',defensive:0,offensive:{[p==='p1'?'b':'a']:8}});for(const p of s.moveOrder)s=command(s,p,{type:'movement-done'});return s;}
// A distinct pair of dice is essential for the opposing tie; deterministic RNG never silently sorts IDs.
function sequence(values,tail=5){let i=0;return()=>values[i++]??tail;}
test('initiative orders movement by actual ship dice and resolves opposing ties',()=>{
 let s=fresh();for(const p of ['p1','p2'])s=command(s,p,{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>19);s=command(s,'p2',{type:'initiative'},()=>2);
 assert.deepEqual(s.moveOrder,['p2','p1']);
 s=fresh();for(const p of ['p1','p2'])s=command(s,p,{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>8);s=command(s,'p2',{type:'initiative'},sequence([8,1,20]));
 assert.deepEqual(s.moveOrder,['p1','p2']);assert.equal(s.journal.some(e=>e.type==='initiative_rolloff'),true);
});
test('a complete six-phase turn needs only tracked orders and automatically resolves end-of-turn',()=>{
 let s=readyForFire(sequence([3,1,20]));
 assert.equal(s.phase,'fire_commit');
 s=command(s,'p1',{type:'fire',fire:{shots:[]}});s=command(s,'p2',{type:'fire',fire:{shots:[]}});
 assert.equal(s.journal.some(e=>e.type==='defence_automatic'),true);
 assert.equal(s.phase,'power');assert.equal(s.turn,2);assert.equal(PLAY_PHASES.length,6);
 assert.equal(s.journal.some(e=>e.type==='critical_checks'),true);
 assert.throws(()=>command(s,'p1',{type:'manual-result',damage:100}),/not available/);
});
test('fire and EW commitments stay secret until the simultaneous barrier',()=>{
 let s=fresh();for(const p of ['p1','p2'])s=command(s,p,{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>3);s=command(s,'p2',{type:'initiative'},()=>7);
 s=command(s,'p1',{type:'ew',offensive:{b:8}});
 assert.equal(battleView(s,'p2').ships[0].private_state,undefined);
 assert.equal(battleView(s,'p2').ships[0].public_state.ew,undefined);
 s=command(s,'p2',{type:'ew',defensive:8});
 assert.equal(battleView(s,'p2').ships[0].public_state.ew.offensive.b,8);
});
test('simultaneous damage commits once, preserves opposing shots and immediately disables destroyed mounts',()=>{
 let s=readyForFire(sequence([2,7]));
 const shot=(shipId,targetId)=>({shipId,targetId,mountId:'plasma_forward',gun:1,role:'offensive',chargeTurns:3,order:1});
 s=command(s,'p1',{type:'fire',fire:{shots:[shot('a','b')]}});// Both attack rolls first, then location=4 (plasma), primary=1 and four d10=10 for each hit.
 s=command(s,'p2',{type:'fire',fire:{shots:[shot('b','a')]}},sequence([1,1,4,1,10,10,10,10,4,1,10,10,10,10]));
 assert.equal(s.turn,2);
 for(const x of s.ships){assert.equal(x.private_state.trial.condition.damage.tracks.plasma_forward.marked,10);assert.ok(effectiveCondition(x.private_state.trial,2).destroyedSystems.includes('plasma_forward'));}
 assert.equal(s.journal.find(e=>e.type==='damage_resolved').outcomes.length,2);
 assert.throws(()=>command(s,'p1',{type:'damage-choice',attackId:'a:plasma_forward:1',value:'engine'}),/not available/);
});
test('only defender may choose among surviving eligible systems; choices persist without rerolling',()=>{
 let s=readyForFire(sequence([2,7]));
 s=command(s,'p1',{type:'fire',fire:{shots:[{shipId:'a',targetId:'b',mountId:'twin_nose_port',gun:1,role:'offensive',order:1}]}});
 s=command(s,'p2',{type:'fire',fire:{shots:[]}},sequence([1,6,1,8]));
 assert.equal(s.pending[0].type,'system');const dice=structuredClone(s.dice);
 delete s.damageRolled; // Simulate an already-rolled pending battle saved by the previous build.
 assert.throws(()=>command(s,'p1',{type:'damage-choice',attackId:s.pending[0].attackId,value:'twin_nose_port'}),/Wait/);
 s=command(s,'p2',{type:'damage-choice',attackId:s.pending[0].attackId,value:'twin_nose_starboard'},()=>{throw Error('No reroll should occur for a destroyed mount');});
 assert.equal(s.turn,2);assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.twin_nose_starboard.marked,6);
 assert.equal(dice[0].roll,1);
});
test('canonical damage drives power, engine, sensors, weapons and command restrictions',()=>{
 const s=fresh(),t=s.ships[0].private_state.trial;
 t.condition.damage.tracks.engine.marked=11;t.condition.damage.tracks.sensors.marked=20;t.condition.damage.tracks.command.marked=12;
 const p=projectTrial(t,1),e=effectiveCondition(p,1);
 assert.equal(e.freeThrust,0);assert.equal(e.sensorStrength,0);assert.equal(e.commandDisabled,true);
 assert.ok(p.destroyedSystems.includes('engine'));
 assert.throws(()=>command(s,'p1',{type:'power',purchasedThrust:1}),/cannot purchase/);
});
test('ordinary damage and overthrust criticals are independent, apply once, and include printed marked boxes',()=>{
 const t=fresh().ships[0].private_state.trial;t.condition.damage.tracks.port_thrust.marked=2;t.condition.damage.criticalCandidates=['port_thrust'];
 t.movement={turn:1,thrusterLedger:{port_thrust:{rating:5,used:6}}};
 const r=finishShipTurn(t,1,sequence([13,17]));assert.equal(r.results.length,2);
 assert.deepEqual(r.results.map(x=>x.total),[15,20]);
 assert.equal(r.trial.condition.effects.thrusters.port_thrust.outletFailures,1);
 assert.equal(r.trial.condition.effects.thrusters.port_thrust.efficiencyLosses,1);
 assert.deepEqual(finishShipTurn(r.trial,1).results,[]);
});
test('system criticals change following turn limits and weapon 13 clarification is deterministic',()=>{
 const t=fresh().ships[0].private_state.trial;
 for(const id of ['sensors','engine','reactor','command','plasma_forward'])t.condition.damage.tracks[id].marked=1;
 t.condition.damage.criticalCandidates=['sensors','engine','reactor','command','plasma_forward'];
 const r=finishShipTurn(t,1,sequence([14,14,10,11,12]));const e=effectiveCondition(r.trial,2);
 assert.equal(e.sensorStrength,7);assert.equal(e.freeThrust,8);assert.equal(e.reactorLoss,2);assert.equal(e.fireModifier,-1);
 assert.match(r.results.at(-1).clarification,/omits 13/);
});
test('section loss removes attached systems after simultaneous combat and reactor loss ends battle',()=>{
 const s=fresh(),t=s.ships[0].private_state.trial;t.condition.damage.tracks.forward_structure.marked=48;t.condition.damage.destroyedSections=['forward'];
 const r=finishShipTurn(t,1,()=>1);assert.equal(r.trial.condition.damage.tracks.forward_port_thrust.marked,10);
 assert.equal(r.trial.condition.damage.tracks.plasma_forward.marked,10);
 assert.deepEqual(r.trial.condition.damage.sectionsLost,['forward']);
 t.condition.damage.tracks.reactor.marked=12;assert.equal(effectiveCondition(t,1).shipDestroyed,true);
});

test('disabled command and reactor shutdown skip empty decisions but preserve inertial movement',()=>{
 let s=fresh();s.ships[0].private_state.trial.condition.damage.tracks.command.marked=12;
 s.ships[0].speed=1;
 // A destroyed powered component must not be listed as a shutdown power saving.
 s.ships[0].private_state.trial.condition.damage.tracks.twin_nose_port.marked=6;
 s=command(s,'p1',{type:'power',shutdown:true});s=command(s,'p2',{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>1);s=command(s,'p2',{type:'initiative'},()=>20);
 assert.equal(s.locks.p1,true); // No sensors: EW automatically locked.
 s=command(s,'p2',{type:'ew',defensive:8});assert.equal(s.phase,'movement');
 assert.throws(()=>command(s,'p1',{type:'move',action:{type:'roll-start',thrusters:{port_thrust:1}}}),/inertial/);
 s=command(s,'p1',{type:'move',action:{type:'advance',hexes:1}});
 assert.equal(s.locks.p1,true); // No further legal manoeuvre: automatically done.
 s=command(s,'p2',{type:'movement-done'});assert.equal(s.phase,'fire_commit');assert.equal(s.locks.p1,true);
 s=command(s,'p2',{type:'fire',fire:{shots:[]}});assert.equal(s.turn,2);
});
test('reactor breach offers real shutdown protection; a failed containment roll destroys the ship',()=>{
 let s=fresh();s.ships[0].private_state.trial.condition.effects.containmentBreach=true;s.ships[0].private_state.trial.condition.damage.tracks.reactor.marked=5;
 let n=command(s,'p1',{type:'power',shutdown:true},()=>{throw Error('Shutdown must not roll containment');});
 assert.equal(n.status,'active');assert.equal(effectiveCondition(n.ships[0].private_state.trial,1).powerOff,true);
 n=command(s,'p1',{type:'power'},()=>5);assert.equal(n.status,'finished');assert.equal(n.winner,'p2');
 n=command(s,'p1',{type:'power'},()=>6);assert.equal(n.status,'active');
});
test('reserved interception is a real choice, remains private, and consumes the selected gun',()=>{
 let s=readyForFire(sequence([2,7]));
 s=command(s,'p1',{type:'fire',fire:{shots:[{shipId:'a',targetId:'b',mountId:'plasma_forward',gun:1,role:'offensive',chargeTurns:3,order:1}]}});
 s=command(s,'p2',{type:'fire',fire:{shots:[{shipId:'b',mountId:'twin_nose_port',gun:1,role:'defensive'}]}});
 assert.equal(s.phase,'fire_resolution');assert.equal(!!s.combatStarted,false);assert.deepEqual(battleView(s,'p2').required,['p2']);
 s=command(s,'p2',{type:'defence',assignments:[{shipId:'b',mountId:'twin_nose_port',gun:1,attackId:'a:plasma_forward:1'}]},sequence([20,1,1,1,1,1,1]));
 assert.equal(s.turn,2);assert.equal(s.ships[1].private_state.trial.weaponReadiness.twin_nose_port[1].lastFiredTurn,1);
 assert.equal(s.journal.find(x=>x.type==='damage_resolved').attacks[0].hit,false);
});
test('reactivated weapons must recharge and engine shorts change the next movement phase',()=>{
 let s=fresh();s.ships[0].private_state.trial.condition.effects.engineShort={turn:1,mode:'runaway'};
 for(const p of ['p1','p2'])s=command(s,p,{type:'power',...(p==='p1'?{deactivated:['plasma_forward']}: {})});
 s=command(s,'p1',{type:'initiative'},()=>1);s=command(s,'p2',{type:'initiative'},()=>20);
 for(const p of ['p1','p2'])s=command(s,p,{type:'ew',defensive:8});
 assert.equal(s.ships[0].speed,5);assert.equal(s.ships[0].private_state.trial.movement.engineThrustSpent,10);
 s=command(s,'p1',{type:'move',action:{type:'advance',hexes:5}});
 for(const p of s.moveOrder)if(!s.locks[p])s=command(s,p,{type:'movement-done'});
 while(s.phase==='fire_commit')s=command(s,battleView(s,'p1').required[0],{type:'fire',fire:{shots:[]}});
 assert.equal(s.turn,2);s=command(s,'p1',{type:'power'});
 const h=s.ships[0].private_state.trial.weaponReadiness.plasma_forward[1];assert.equal(h.lastActivatedTurn,2);
 assert.equal(weaponReadiness({trial:s.ships[0].private_state.trial,mountId:'plasma_forward',turn:2,chargeTurns:3}).ready,false);
 assert.equal(weaponReadiness({trial:s.ships[0].private_state.trial,mountId:'plasma_forward',turn:2,chargeTurns:1}).ready,true);
});
test('crossing the configured map edge resolves withdrawal as a tracked battle result',()=>{
 let s=fresh();s.ships[0].q=19;s.ships[0].r=10;s.ships[0].facing=0;
 for(const p of ['p1','p2'])s=command(s,p,{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>1);s=command(s,'p2',{type:'initiative'},()=>20);
 for(const p of ['p1','p2'])s=command(s,p,{type:'ew',defensive:8});
 s=command(s,'p1',{type:'move',action:{type:'speed',change:1,purchasedThrust:0,thrusters:{aft_port_thrust:1,aft_starboard_thrust:1}}});
 s=command(s,'p1',{type:'move',action:{type:'advance',hexes:1}});
 assert.equal(s.status,'finished');assert.equal(s.ships[0].withdrawn,true);assert.equal(s.winner,'p2');
});

test('to-hit rolls precede damage and misses receive no damage or location dice',()=>{
 let s=readyForFire(sequence([2,7]));
 s=command(s,'p1',{type:'fire',fire:{shots:[{shipId:'a',targetId:'b',mountId:'twin_nose_port',gun:1,role:'offensive',order:1},{shipId:'a',targetId:'b',mountId:'plasma_forward',gun:1,role:'offensive',chargeTurns:3,order:2}]}});
 const values=[20,1,4,1,10,10,10,10],sides=[];
 s=command(s,'p2',{type:'fire',fire:{shots:[]}},n=>{sides.push(n);const next=values.shift();if(next===undefined)throw Error('Unexpected die');return next;});
 assert.equal(s.turn,2);assert.deepEqual(sides,[20,20,20,20,10,10,10,10]);
 const dice=s.journal.find(e=>e.type==='combat_dice').rolls;
 assert.equal(dice[0].hit,false);assert.deepEqual(dice[0].damageDice,[]);assert.equal(dice[0].locationRoll,undefined);
 const attacks=s.journal.find(e=>e.type==='weapons_fired').attacks;
 assert.equal(attacks[0].damage,null);assert.equal(attacks[1].damageDice.length,4);assert.equal(attacks[1].mode,'Standard');
 assert.deepEqual(attacks[1].from,{q:3,r:10});assert.deepEqual(attacks[1].to,{q:6,r:7});
});
test('reactors destroyed in the same ship-fire step do not cancel mutual return fire',()=>{
 let s=readyForFire(sequence([2,7]));
 for(const ship of s.ships)ship.private_state.trial.condition.damage.tracks.reactor.marked=11;
 const shot=(shipId,targetId)=>({shipId,targetId,mountId:'plasma_forward',gun:1,role:'offensive',chargeTurns:3,order:1});
 s=command(s,'p1',{type:'fire',fire:{shots:[shot('a','b')]}});
 s=command(s,'p2',{type:'fire',fire:{shots:[shot('b','a')]}},sequence([1,1,19,18,10,10,10,10,19,18,10,10,10,10]));
 assert.equal(s.status,'finished');assert.equal(s.winner,null);
 assert.equal(s.journal.find(e=>e.type==='damage_resolved').outcomes.length,2);
 assert.ok(s.ships.every(ship=>ship.private_state.trial.condition.damage.tracks.reactor.marked===12));
});
test('committed acceleration and automatic travel update the hex in one atomic action',()=>{
 let s=fresh();for(const p of ['p1','p2'])s=command(s,p,{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>1);s=command(s,'p2',{type:'initiative'},()=>20);
 for(const p of ['p1','p2'])s=command(s,p,{type:'ew',defensive:8});
 const c={type:'move',action:{type:'speed',change:3,purchasedThrust:0,thrusters:{aft_port_thrust:3,aft_starboard_thrust:3}},advanceAfter:2};
 assert.throws(()=>command(s,'p1',{...c,advanceAfter:4}),/movement segment/);
 assert.equal(s.ships[0].speed,0);assert.equal(s.ships[0].q,3);
 s=command(s,'p1',c);assert.equal(s.ships[0].q,5);assert.equal(s.ships[0].r,8);assert.equal(s.ships[0].speed,3);
 assert.equal(s.ships[0].private_state.trial.movement.state.remaining,1);
 assert.equal(s.ships[0].private_state.trial.movement.engineThrustSpent,6);
 assert.equal(s.journal.find(e=>e.type==='ship_moved').advanceAfter,2);
});

test('an extended-turn thrust commitment also executes its legal first travel segment',async()=>{
 const {movementOptions}=await import('../shared/movement-options.mjs');let s=fresh();s.ships[0].speed=6;
 for(const p of ['p1','p2'])s=command(s,p,{type:'power'});
 s=command(s,'p1',{type:'initiative'},()=>1);s=command(s,'p2',{type:'initiative'},()=>20);
 for(const p of ['p1','p2'])s=command(s,p,{type:'ew',defensive:8});
 const option=movementOptions(s.ships[0],1).find(o=>o.name.startsWith('Begin Extended Turn Port'));
 assert.ok(option);s=command(s,'p1',{type:'move',action:option.choices[0].action,advanceAfter:1});
 const movement=s.ships[0].private_state.trial.movement.state;assert.equal(movement.remaining,5);assert.ok(movement.extendedTurn);assert.notDeepEqual([s.ships[0].q,s.ships[0].r],[3,10]);
});

test('passive test opponent automatically makes a deterministic eligible damage choice',()=>{
 let s=createBattle([{id:'a',owner_id:'p1',label:'Alpha',q:3,r:10,facing:0},{id:'b',owner_id:'bot',label:'Passive',q:6,r:7,facing:3}].map(x=>({...x,private_state:{trial:newVorchanTrialState(x.id,x.owner_id,x.q,x.r,x.facing)}})),[{user_id:'p1',role:'host'},{user_id:'bot',role:'passive'}],'standard',{passivePlayerId:'bot'});
 assert.equal(s.locks.bot,true);assert.throws(()=>command(s,'bot',{type:'power'}),/controlled/);
 s=command(s,'p1',{type:'power'});s=command(s,'p1',{type:'initiative'},sequence([2,1,20]));s=command(s,'p1',{type:'ew',offensive:{b:8}});
 if(s.phase==='movement')s=command(s,'p1',{type:'movement-done'});
 s=command(s,'p1',{type:'fire',fire:{shots:[{shipId:'a',targetId:'b',mountId:'twin_nose_port',gun:1,role:'offensive',order:1}]}},sequence([1,6,1,8]));
 assert.equal(s.turn,2);assert.equal(s.phase,'power');assert.equal(s.locks.bot,true);
 assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.twin_nose_port.marked,6);
 assert.equal(s.journal.some(e=>e.type==='defender_choice'),true);
});

test('passive opponent also chooses boundary aspects before the server rolls attacks',()=>{
 let s=createBattle([{id:'a',owner_id:'p1',label:'Alpha',q:3,r:10,facing:1},{id:'b',owner_id:'bot',label:'Passive',q:6,r:13,facing:2}].map(x=>({...x,private_state:{trial:newVorchanTrialState(x.id,x.owner_id,x.q,x.r,x.facing)}})),[{user_id:'p1',role:'host'},{user_id:'bot',role:'passive'}],'standard',{passivePlayerId:'bot'});
 s=command(s,'p1',{type:'power'});s=command(s,'p1',{type:'initiative'},()=>1);s=command(s,'p1',{type:'ew',offensive:{b:8}});s=command(s,'p1',{type:'movement-done'});
 s=command(s,'p1',{type:'fire',fire:{shots:[{shipId:'a',targetId:'b',mountId:'plasma_forward',gun:1,chargeTurns:3,role:'offensive',order:1}]}},sequence([1,10,1,3,3,3,3]));
 assert.equal(s.turn,2);assert.equal(s.phase,'power');assert.ok(s.journal.some(e=>e.type==='passive_action_completed'&&e.action==='defence'));
});
