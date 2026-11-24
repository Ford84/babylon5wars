import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {MOGRATH,MOGRATH_ID,auditMograthIdentification} from '../shared/mograth.mjs';
import {newVorchanTrialState,VORCHAN_LIBRARY_RECORD as VORCHAN} from '../shared/vorchan-trial-library.mjs';
import {createBattle,executeBattle,requiredActors,battleView} from '../shared/automated-battle.mjs';
import {initialVorchanDamage,applyVorchanStandardVolley,rollVorchanDamage} from '../shared/vorchan-damage.mjs';
import {newCondition,effectiveCondition,systemPowerForHull} from '../shared/ship-condition.mjs';
import {movementOptions} from '../shared/movement-options.mjs';import {commitMovement} from '../shared/movement-commit.mjs';
import {weaponReadiness} from '../shared/weapon-readiness.mjs';import {vorchanTargetingPreview} from '../shared/weapon-targeting.mjs';
import {guardianPowerMode,guardianCanProtect} from '../shared/guardian-array.mjs';import {validateDefensiveAssignment} from '../shared/fire-orders.mjs';
import {interceptModifiers} from '../shared/weapon-interception.mjs';
function row(id,owner,mograth,q,r,facing){return {id,owner_id:owner,label:id,q,r,facing,private_state:{trial:{...newVorchanTrialState(id,owner,q,r,facing),...(mograth?{libraryId:MOGRATH_ID,shipDataRevision:1}:{})}}};}
function fresh(){return createBattle([row('m','p1',true,4,10,0),row('v','p2',false,7,7,3)],[{user_id:'p1'},{user_id:'p2'}],'standard',{operations:true});}
function moved(){let s=fresh();for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'power'});for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'initiative'},()=>p==='p1'?2:9);for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'ew'});assert.equal(s.phase,'jump_formation');s=executeBattle(s,'p2',{type:'jump',open:false});return s;}
function fireReady(){let s=moved();while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});return s;}
test('Mograth original SCS has197 boxes,450 points, single structure, six mounts and no jump engine',()=>{
 assert.equal(MOGRATH.combatPoints,450);assert.equal(MOGRATH.class,'medium');assert.equal(MOGRATH.extraPower,0);assert.equal(MOGRATH.agile,true);assert.equal(MOGRATH.initiativeBonus,12);
 assert.equal(MOGRATH.weaponMounts.length,6);assert.equal(auditMograthIdentification().shipDataVerified,true);assert.equal(auditMograthIdentification().damageBoxes,197);
 assert.equal(MOGRATH.scs.systems.find(x=>x.id==='primary_structure').boxes,50);assert.equal(MOGRATH.scs.systems.find(x=>x.id==='sensors').boxes,12);assert.equal(initialVorchanDamage(MOGRATH_ID).tracks.forward_structure,undefined);
 assert.equal(systemPowerForHull(MOGRATH_ID).plasma_stream,7);assert.equal(systemPowerForHull(MOGRATH_ID).guardian,2);assert.equal(systemPowerForHull(MOGRATH_ID).jump_aft_centre,undefined);
 const s=moved();assert.equal(s.ships[0].private_state.trial.initiative.printedBonus,12);assert.equal(s.shuttles.filter(x=>x.carrierId==='m').length,1);assert.equal(battleView(s,'p1').jumpStatus.m.ready,false);
});
test('Mograth coloured GLB preserves the supplied sculpt, has vertex colours, tactical scale and a self-contained SCS',()=>{
 const glb=gunzipSync(readFileSync(new URL('../public/models/mograth/centauri-mograth-rc1.glb.gz',import.meta.url)));assert.equal(glb.readUInt32LE(0),0x46546c67);const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());assert.ok(json.meshes[0].primitives[0].attributes.COLOR_0>=0);assert.ok(json.accessors[0].count>40000);const a=json.accessors[0];assert.ok(Math.max(...a.max.map((v,i)=>v-a.min[i]))<=14.01);
 const svg=readFileSync(new URL('../public/images/mograth-v2-schematic.svg',import.meta.url),'utf8');assert.doesNotMatch(svg,/<text\b|<script\b/);
});
test('matter cannon ignores armour, discards system overkill and retains its two-turn reload',()=>{
 const d=initialVorchanDamage(MOGRATH_ID);const hit=applyVorchanStandardVolley({state:d,damage:22,matter:true,incoming:'forward',locationRoll:4});assert.equal(hit.state.tracks.plasma_stream.marked,9);assert.equal(hit.state.tracks.primary_structure.marked,0);assert.equal(hit.trace[0].armour,0);
 const t=fireReady().ships[0].private_state.trial;t.weaponReadiness.matter_port[1].lastFiredTurn=1;assert.equal(weaponReadiness({trial:t,mountId:'matter_port',turn:2}).ready,false);assert.equal(weaponReadiness({trial:t,mountId:'matter_port',turn:3}).ready,true);
 const damage=rollVorchanDamage({libraryId:MOGRATH_ID,mountId:'matter_port',range:8,dice:[10,10]});assert.equal(damage.damage,22);assert.equal(damage.matter,true);
});
test('plasma stream applies half current armour per sub-volley, erodes immediately and permanently, partial volleys do not erode',()=>{
 let d=initialVorchanDamage(MOGRATH_ID);for(let i=0;i<2;i++)d=applyVorchanStandardVolley({state:d,damage:5,plasma:true,plasmaStream:true,incoming:'forward',locationRoll:12}).state;
 assert.equal(d.armourLoss.primary_structure,2);assert.equal(d.tracks.primary_structure.marked,6);
 const partial=applyVorchanStandardVolley({state:d,damage:2,plasma:true,plasmaStream:true,incoming:'forward',locationRoll:12});assert.equal(partial.trace[0].armour,1);assert.equal(partial.state.armourLoss.primary_structure,2);
 const later=applyVorchanStandardVolley({state:partial.state,damage:10,incoming:'aft',locationRoll:9});assert.equal(later.trace[0].armour,3);assert.equal(later.state.tracks.primary_structure.marked,14);assert.deepEqual(later.state.destroyedSections,[]);
});
test('Mograth has immediate agile pivots and rolls, snap turns, correct side thrusters and one-third turn costs',()=>{
 const s=moved(),ship=s.ships[0];ship.speed=6;Object.assign(ship.private_state.trial.movement.state,{speed:6,remaining:6});
 const opts=movementOptions(ship,1),turn=opts.find(x=>x.name==='Turn Port'),snap=opts.find(x=>x.name==='Snap Turn 120° · Port'),pivot=opts.find(x=>x.name.startsWith('Pivot 120° Clockwise'));
 assert.equal(turn.choices[0].cost,2);assert.equal(snap.choices[0].cost,4);assert.equal(pivot.choices[0].cost,4);
 let r=commitMovement({ship,turn:1,action:pivot.choices[0].action,advanceAfter:0});assert.equal(r.nextShip.facing,2);assert.equal(r.nextPrivateState.trial.movement.state.motionFacing,0);assert.equal(r.nextPrivateState.trial.movement.state.pivotInProgress,false);
 assert.equal(effectiveCondition(r.nextPrivateState.trial,1).fireModifier,-3);assert.equal(effectiveCondition(ship.private_state.trial,1).thrusterRatings.port_thrust,4);
 const roll=opts.find(x=>x.name==='Roll 180° Immediately');r=commitMovement({ship,turn:1,action:roll.choices[0].action,advanceAfter:0});assert.equal(r.nextPrivateState.trial.movement.state.rolled,true);assert.equal(r.nextPrivateState.trial.movement.state.rollInProgress,false);assert.equal(effectiveCondition(r.nextPrivateState.trial,1).fireModifier,-3);
});
test('matter cannon range penalty is one per two hexes and medium fire control is selected',()=>{
 const source={id:'a',libraryId:MOGRATH_ID,hullClass:'medium',q:3,r:10,facing:0},target={id:'b',libraryId:VORCHAN.id,hullClass:'heavy_combat',q:3,r:7,facing:3};
 const p=vorchanTargetingPreview({shooter:source,target,mountId:'matter_port',attackerOffensiveEW:1});assert.equal(p.breakdown.rangePenalty,-2);assert.equal(p.breakdown.fireControl,3);assert.equal(p.breakdown.rangeStepHexes,2);assert.equal(p.breakdown.rangeStepPenalty,-1);
 const reverse=vorchanTargetingPreview({shooter:{...target,libraryId:VORCHAN.id},target:{...source,libraryId:MOGRATH_ID,hullClass:'medium'},mountId:'twin_nose_port',attackerOffensiveEW:1});assert.equal(reverse.breakdown.fireControl,5);
});
test('Guardian mode selection starts immediately, later switching costs one whole inactive turn',()=>{
 assert.deepEqual(guardianPowerMode({},1,'offensive'),{mode:'offensive'});const t={guardianMode:{mode:'defensive'}},swap=guardianPowerMode(t,2,'offensive');assert.equal(swap.mode,'switching');assert.equal(swap.readyTurn,3);assert.deepEqual(guardianPowerMode({guardianMode:swap},3,'offensive'),{mode:'offensive'});
 let s=fresh();s=executeBattle(s,'p1',{type:'power',guardianMode:'offensive'});assert.equal(s.ships[0].private_state.trial.guardianMode.mode,'offensive');
});
test('Guardian intercepts friendly-bound fire only from a closer position in the same target aspect; no passive defence',()=>{
 const mount=MOGRATH.weaponMounts.find(x=>x.id==='guardian'),defender={id:'m',owner_id:'p1',q:4,r:8,facing:0,public_state:{libraryId:MOGRATH_ID}},source={id:'e',owner_id:'p2',q:6,r:6,facing:3},target={id:'a',owner_id:'p1',q:2,r:10,facing:0};
 assert.equal(guardianCanProtect({defender,source,target,mount}),true);assert.equal(guardianCanProtect({defender:{...defender,q:1,r:11},source,target,mount}),false);
 const declarations=[{playerId:'p1',fire:{shots:[{shipId:'m',mountId:'guardian',gun:1,role:'defensive'}]}},{playerId:'p2',fire:{shots:[{shipId:'e',mountId:'twin_nose_port',gun:1,role:'offensive',targetId:'a'}]}}],assignments=[{shipId:'m',mountId:'guardian',gun:1,attackId:'e:twin_nose_port:1'}];
 assert.equal(validateDefensiveAssignment({playerId:'p1',ships:[defender,source,target],declarations,assignments}).assignments.length,1);assert.equal(interceptModifiers({declarations,defences:[{playerId:'p1',defence:{assignments}}]})['e:twin_nose_port:1'].total,-3);
});
test('guided plasma stream rolls damage once, locations per five-point sub-volley, and persists armour loss across the turn',()=>{
 let s=fireReady();s=executeBattle(s,'p1',{type:'fire',fire:{shots:[{shipId:'m',targetId:'v',mountId:'plasma_stream',gun:1,role:'offensive',order:1}]}});s=executeBattle(s,'p2',{type:'fire',fire:{shots:[]}});
 assert.equal(s.resolution.stage,'attack_roll');let damageRolls=0,locationRolls=0,volleyResults=0,stages=[];
 for(let i=0;s.resolution&&i<150;i++){
  const r=s.resolution;stages.push(r.stage);if(r.stage==='damage_roll')damageRolls++;if(r.stage==='location_roll')locationRolls++;if(r.stage==='rake_result')volleyResults++;
  s=executeBattle(s,r.actorId,{type:r.stage.endsWith('_roll')?'combat-roll':r.stage.endsWith('_result')?'combat-ok':'combat-choice',stage:r.stage,attackId:r.attack.id,...(r.candidates.length?{value:r.candidates[0]}:{})},n=>n===10?3:r.stage==='location_roll'?12:1);
 }
 assert.equal(damageRolls,1);assert.equal(locationRolls,2);assert.equal(volleyResults,2);assert.ok(stages.indexOf('damage_roll')<stages.indexOf('location_roll'));
 const v=s.ships.find(x=>x.id==='v');assert.equal(v.private_state.trial.condition.damage.armourLoss.forward_structure,2);assert.equal(v.private_state.trial.condition.damage.tracks.forward_structure.marked,6);assert.equal(s.phase,'hangar');
});
test('agile turn into a halted120-degree pivot uses normal turn cost and aligns travel to facing',()=>{
 const ship=moved().ships[0];ship.speed=6;Object.assign(ship.private_state.trial.movement.state,{speed:6,remaining:6});
 const pivot=movementOptions(ship,1).find(x=>x.name.startsWith('Pivot 120° Clockwise')).choices[0];let r=commitMovement({ship,turn:1,action:pivot.action,advanceAfter:0});const next={...ship,...r.nextShip,private_state:r.nextPrivateState};
 const turn=movementOptions(next,1).find(x=>x.choices[0].action.type==='turn');assert.equal(turn.choices[0].cost,2);r=commitMovement({ship:next,turn:1,action:turn.choices[0].action,advanceAfter:0});assert.equal(r.nextPrivateState.trial.movement.state.motionFacing,2);assert.equal(r.nextPrivateState.trial.movement.state.pivotActive,false);
});
test('Mograth completes two fleet turns, skips nonexistent jump choices and switches Guardian mode for one inactive turn',()=>{
 let s=fresh();for(let turn=1;turn<=2;turn++){
  for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'power',...(p==='p1'&&turn===2?{guardianMode:'offensive'}:{})});
  if(turn===2){const t=s.ships[0].private_state.trial;assert.equal(t.guardianMode.mode,'switching');assert.ok(t.powerAllocation.deactivated.includes('guardian'));assert.equal(weaponReadiness({trial:t,mountId:'guardian',turn}).ready,false);}
  for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'initiative'},()=>p==='p1'?1:9);for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'ew'});assert.equal(s.unitPhaseLocks.m,true);s=executeBattle(s,'p2',{type:'jump',open:false});
  while(s.phase==='movement')s=executeBattle(s,requiredActors(s)[0],{type:'movement-done'});for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'fire',fire:{shots:[]}});assert.equal(s.phase,'hangar');for(const p of ['p1','p2'])s=executeBattle(s,p,{type:'hangar'});assert.equal(s.turn,turn+1);
 }
 s=executeBattle(s,'p1',{type:'power',guardianMode:'offensive'});assert.equal(s.ships[0].private_state.trial.guardianMode.mode,'offensive');assert.equal(weaponReadiness({trial:s.ships[0].private_state.trial,mountId:'guardian',turn:3}).ready,true);
});
test('medium side-hit replay uses the Mograth primary table rather than Vorchan thruster roll ranges',async()=>{
 const {adjudicateVorchanShipTier}=await import('../shared/vorchan-tier-adjudicator.mjs');
 const s=fresh();s.ships[1].q=3;s.ships[1].r=10;const id='v:twin_nose_port:1';
 const result=adjudicateVorchanShipTier({ships:s.ships,attacks:[{id,shipId:'v',targetId:'m',mountId:'twin_nose_port',gun:1,order:1,hit:true,blockers:[]}],rollJournal:[{attackId:id,locationRoll:18,primaryRoll:8,damageDice:[6]}],defenderChoices:{[id]:{incoming:'port'}},initialDamage:Object.fromEntries(s.ships.map(x=>[x.id,x.private_state.trial.condition.damage]))});
 assert.equal(result.states.m.tracks.guardian.marked,4);assert.equal(result.states.m.tracks.primary_structure.marked,1);
});
test('rolling a Mograth swaps its asymmetric port and starboard weapon arcs',async()=>{
 const {checkMountArc}=await import('../shared/weapon-targeting.mjs'),shooter={id:'m',q:3,r:10,facing:0},target={id:'v',q:3,r:9,facing:3};
 const port=MOGRATH.weaponMounts.find(x=>x.id==='matter_port').arc,starboard=MOGRATH.weaponMounts.find(x=>x.id==='matter_starboard').arc;
 assert.equal(checkMountArc({shooter,target,arc:port}).allowed,true);assert.equal(checkMountArc({shooter:{...shooter,public_state:{rolled:true}},target,arc:port}).allowed,false);assert.equal(checkMountArc({shooter:{...shooter,public_state:{rolled:true}},target,arc:starboard}).allowed,true);
});
test('Guardian same-hex protection reconstructs arrival order when the protected ship entered last',()=>{
 const source={id:'e',owner_id:'p2',q:6,r:6,facing:3,sameHexPrevious:{}},defender={id:'m',owner_id:'p1',q:6,r:6,facing:0,public_state:{libraryId:MOGRATH_ID},sameHexPrevious:{}},target={id:'a',owner_id:'p1',q:6,r:6,facing:0};
 source.sameHexPrevious.m={shooter:{q:6,r:6},target:{q:5,r:7}};source.sameHexPrevious.a={shooter:{q:6,r:6},target:{q:4,r:8}};defender.sameHexPrevious.a={shooter:{q:6,r:6},target:{q:4,r:8}};
 assert.equal(guardianCanProtect({source,defender,target,mount:MOGRATH.weaponMounts.find(x=>x.id==='guardian')}),true);
 source.sameHexPrevious.m.target={q:1,r:11};assert.equal(guardianCanProtect({source,defender,target,mount:MOGRATH.weaponMounts.find(x=>x.id==='guardian')}),true);
});
