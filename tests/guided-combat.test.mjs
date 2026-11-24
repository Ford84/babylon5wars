import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,executeBattle,battleView} from '../shared/automated-battle.mjs';
import {newVorchanTrialState,VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
import {movementOptions,movementOptionGroup} from '../shared/movement-options.mjs';
import {validateFireDeclaration} from '../shared/fire-orders.mjs';
import {readFileSync} from 'node:fs';
function ready(){
 let s=createBattle([{id:'a',owner_id:'p1',label:'Alpha',q:3,r:10,facing:0},{id:'b',owner_id:'p2',label:'Beta',q:6,r:7,facing:3}].map(x=>({...x,private_state:{trial:newVorchanTrialState(x.id,x.owner_id,x.q,x.r,x.facing)}})),[{user_id:'p1'},{user_id:'p2'}]);
 for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'power'});
 s=executeBattle(s,'p1',{type:'initiative'},()=>1);s=executeBattle(s,'p2',{type:'initiative'},()=>20);
 s=executeBattle(s,'p1',{type:'ew',offensive:{b:8}});s=executeBattle(s,'p2',{type:'ew'});
 for(const p of s.moveOrder)s=executeBattle(s,p,{type:'movement-done'});return s;
}
const shot=(shipId='a',targetId='b',mountId='twin_nose_port')=>({shipId,targetId,mountId,gun:1,role:'offensive',order:1,...(mountId==='plasma_forward'?{chargeTurns:3}:{})});
function step(s,type,value,die=()=>1){const r=s.resolution;return executeBattle(s,r.actorId,{type,stage:r.stage,attackId:r.attack.id,...(value?{value}:{})},die);}
test('guided fire assigns attacker dice, defender system choice, persistent results and final acknowledgement',()=>{
 let s=ready();s=executeBattle(s,'p1',{type:'fire',fire:{shots:[shot()]}});s=executeBattle(s,'p2',{type:'fire',fire:{shots:[]}});
 assert.equal(s.resolution.stage,'attack_roll');assert.equal(s.dice[0].roll,undefined);
 assert.throws(()=>executeBattle(s,'p2',{type:'combat-roll',stage:'attack_roll',attackId:s.resolution.attack.id}),/Wait/);
 s=step(s,'combat-roll',null,()=>1);assert.equal(s.resolution.stage,'attack_result');assert.equal(s.resolution.attack.hit,true);assert.equal(s.dice[0].locationRoll,undefined);
 const saved=JSON.parse(JSON.stringify(s));assert.deepEqual(JSON.parse(JSON.stringify(battleView(saved,'p2').resolution)),JSON.parse(JSON.stringify(battleView(s,'p1').resolution)));
 s=step(saved,'combat-ok');assert.equal(s.resolution.stage,'location_roll');assert.equal(s.resolution.actorId,'p1');
 s=step(s,'combat-roll',null,()=>6);assert.equal(s.resolution.stage,'location_result');assert.equal(s.resolution.token,'twin_array');
 s=step(s,'combat-ok');assert.equal(s.resolution.stage,'system_choice');assert.equal(s.resolution.actorId,'p2');assert.deepEqual(s.dice[0].damageDice,[]);
 s=step(s,'combat-choice','twin_nose_starboard');assert.equal(s.resolution.actorId,'p1');assert.equal(s.resolution.stage,'damage_roll');
 s=step(s,'combat-roll',null,()=>8);assert.equal(s.resolution.stage,'damage_result');assert.equal(s.resolution.damage.damage,12);
 assert.equal(battleView(s,'p1').ships[1].public_state.damage.tracks.twin_nose_starboard.marked,6);
 assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.twin_nose_starboard.marked,0); // Eligibility remains frozen until the tier concludes.
 assert.equal(s.phase,'fire_resolution');s=step(s,'combat-ok',null,()=>{throw Error('No further dice due');});
 assert.equal(s.turn,2);assert.equal(s.phase,'power');assert.equal(s.ships[1].private_state.trial.condition.damage.tracks.twin_nose_starboard.marked,6);
});
test('a guided miss requires OK but never requests location or damage dice',()=>{
 let s=ready();s=executeBattle(s,'p1',{type:'fire',fire:{shots:[shot()]}});s=executeBattle(s,'p2',{type:'fire',fire:{shots:[]}});
 s=step(s,'combat-roll',null,()=>20);assert.equal(s.resolution.attack.hit,false);assert.deepEqual(s.dice[0].damageDice,[]);
 s=step(s,'combat-ok',null,()=>{throw Error('Miss cannot consume another die');});assert.equal(s.turn,2);
});
test('guided primary rolls and mutual reactor destruction preserve simultaneous return fire',()=>{
 let s=ready();for(const ship of s.ships)ship.private_state.trial.condition.damage.tracks.reactor.marked=11;
 s=executeBattle(s,'p1',{type:'fire',fire:{shots:[shot('a','b','plasma_forward')]}});s=executeBattle(s,'p2',{type:'fire',fire:{shots:[shot('b','a','plasma_forward')]}});
 let sawPrimary=false,sawReturn=false;
 for(let i=0;s.resolution&&i<40;i++){
  const r=s.resolution;if(r.attack.shipId==='b')sawReturn=true;
  if(r.stage==='primary_roll'){assert.equal(r.actorId,r.attack.shipId==='a'?'p1':'p2');sawPrimary=true;}
  if(r.stage.endsWith('_roll'))s=step(s,'combat-roll',null,()=>r.stage==='attack_roll'?1:r.stage==='location_roll'?19:r.stage==='primary_roll'?18:10);
  else if(r.stage.endsWith('_result'))s=step(s,'combat-ok');else s=step(s,'combat-choice',r.candidates[0]);
 }
 assert.equal(sawPrimary,true);assert.equal(sawReturn,true);assert.equal(s.status,'finished');assert.equal(s.winner,null);
});
test('speed three retains two legal movement hexes after the first automatic move',()=>{
 let s=ready(); // Return a fresh beginning-of-movement fixture with the same authoritative ship state.
 s.phase='movement';s.locks={};s.moveOrder=['p1','p2'];
 const c={type:'move',action:{type:'speed',change:3,purchasedThrust:0,thrusters:{aft_port_thrust:3,aft_starboard_thrust:3}},advanceAfter:1};
 s=executeBattle(s,'p1',c);assert.equal(s.ships[0].private_state.trial.movement.state.remaining,2);
 const normal=movementOptions(s.ships[0],1).filter(o=>movementOptionGroup(o)==='movement');assert.ok(normal.some(o=>o.choices[0].action.hexes===2));
 s=executeBattle(s,'p1',{type:'move',action:{type:'advance',hexes:2}});assert.equal(s.ships[0].private_state.trial.movement.state.remaining,0);
 assert.equal(movementOptions(s.ships[0],1).filter(o=>movementOptionGroup(o)==='movement').length,0);
 assert.ok(movementOptions(s.ships[0],1).some(o=>movementOptionGroup(o)==='manoeuvre'));
});
test('twin-array guns may declare separate targets and each remains a separate shot',()=>{
 const ships=[{id:'a',owner_id:'p1',q:0,r:5,facing:0},{id:'b',owner_id:'p2',q:2,r:3,facing:3},{id:'c',owner_id:'p2',q:3,r:2,facing:3}].map(x=>({...x,public_state:{libraryId:LIB.id}}));
 const fire=validateFireDeclaration({playerId:'p1',ships,turn:1,fire:{shots:[shot('a','b'),{...shot('a','c'),gun:2,order:1}]}});assert.equal(fire.shots.length,2);assert.deepEqual(fire.shots.map(x=>x.targetId),['b','c']);
});
test('the SCS embeds lettering as paths and has no unresolved font or external image dependencies',()=>{
 const svg=readFileSync(new URL('../public/images/vorchan-v3-schematic.svg',import.meta.url),'utf8');assert.ok(svg.includes('scs-letter-'));assert.ok(svg.includes('viewBox="0 0 612 792"'));assert.ok(!/<(?:\w+:)?text[\s>]/.test(svg));assert.ok(!svg.includes('font-family'));
 const hrefs=[...svg.matchAll(/(?:\w+:)?href="([^"]+)"/g)].map(x=>x[1]);assert.ok(hrefs.every(x=>x.startsWith('#')||x.startsWith('data:')));
});
