import test from 'node:test';import assert from 'node:assert/strict';
import {VORCHAR_ID} from '../shared/vorchar.mjs';
import {elintBudget,validateElint,elintAttackEffects,disruptionQueue,selectDisruption,ewPositionSnapshot,fixedEWForUnits} from '../shared/elint.mjs';
import {VORCHAN_LIBRARY_RECORD as LIB} from '../shared/vorchan-trial-library.mjs';
const unit=(id,owner,q=0,ew={},scout=false)=>({id,owner_id:owner,q,r:0,public_state:{libraryId:scout?VORCHAR_ID:LIB.id},ewAllocation:{defensive:0,offensive:{},...ew}});
function fleet(){return [unit('a','p',0,{offensive:{b:2}}),unit('b','q',3),unit('s','p',1,{offensive:{a:1,b:7}},true)];}
const effect=(units,more={})=>elintAttackEffects({shooter:units[0],target:units[1],units,baseDefence:12,...more});
test('offensive ELINT halves each scout enemy allocation, keeps own OEW and never stacks scouts',()=>{
 const u=fleet();assert.equal(effect(u).offensive,3);assert.equal(effect(u).ownOffensive,2);
 u.push(unit('s2','p',2,{offensive:{a:1,b:8}},true));assert.equal(effect(u).offensive,4);
 assert.equal(elintAttackEffects({shooter:u[2],target:u[1],units:u,baseDefence:12}).ownOffensive,7);
 u[0].ewAllocation.offensive.b=1;assert.equal(effect(u).offensive,0);
 u[0].ewAllocation.offensive.b=2;u[2].ewAllocation.offensive.a=0;u[3].ewAllocation.offensive.a=0;assert.equal(effect(u).offensive,0);
});
test('offensive ELINT enforces both 30-hex links at allocation and fire, but ignores intermediate movement',()=>{
 const u=fleet(),initial=ewPositionSnapshot(u);u[2].q=34;assert.equal(effect(u,{initial}).offensive,0);
 u[2].q=1;initial[2].q=34;assert.equal(effect(u,{initial}).offensive,0);
 initial[2].q=1;assert.equal(effect(u,{initial}).offensive,3);
 u[1].q=32;assert.equal(effect(u).offensive,0);
});
test('defensive loans add across scouts, cannot defend the lending scout, and cap at zero profile',()=>{
 const u=fleet();u.push(unit('d','q',2,{elint:{defensive:{b:9}}},true),unit('d2','q',3,{elint:{defensive:{b:4}}},true));
 assert.equal(effect(u).defensive,6);u[1].ewAllocation.defensive=10;assert.equal(effect(u).defensive,2);
 u[1].ewAllocation.defensive=14;assert.equal(effect(u).defensive,0);
 u[1].ewAllocation.defensive=0;u[3].q=54;assert.equal(effect(u).defensive,2);
 u[3].q=2;const initial=ewPositionSnapshot(u);initial[3].q=54;assert.equal(effect(u,{initial}).defensive,2);
 u[1].public_state.libraryId=VORCHAR_ID;u[1].ewAllocation.elint={defensive:{b:8}};u.splice(3);assert.equal(effect(u).defensive,0);
});
test('blanket uses best scout, current 20-hex range only, and combines with loaned DEW',()=>{
 const u=fleet();u.push(unit('d','q',2,{elint:{blanket:8}},true),unit('d2','q',3,{elint:{blanket:12}},true),unit('d3','q',4,{elint:{defensive:{b:4}}},true));
 const initial=ewPositionSnapshot(u);initial[3].q=80;initial[4].q=90;assert.equal(effect(u,{initial}).defensive,5);
 u[4].q=24;assert.equal(effect(u,{initial}).defensive,4);
 assert.equal(elintAttackEffects({shooter:u[0],target:u[3],units:u,baseDefence:12}).blanket,2);
});
test('disruption belongs to the strongest scout; ties use recorded random selection; full defensive targets skip prompts',()=>{
 const u=fleet();u.push(unit('d','q',2,{elint:{disruption:{a:3}}},true),unit('d2','q',3,{elint:{disruption:{a:6,b:9}}},true));
 let r=disruptionQueue(u,()=>{throw Error('no tie');});assert.equal(r.queue.length,1);assert.equal(r.queue[0].scoutId,'d2');assert.equal(r.queue[0].capacity,2);
 u[3].ewAllocation.elint.disruption.a=6;r=disruptionQueue(u,()=>2);assert.equal(r.queue[0].scoutId,'d2');assert.equal(r.journal[0].roll,2);
 assert.throws(()=>selectDisruption(r.queue[0],{b:1}),/exactly/);assert.throws(()=>selectDisruption(r.queue[0],{bogus:2}),/exactly/);assert.deepEqual(selectDisruption(r.queue[0],{b:2}),{b:2});
});
test('disrupting receiver or scout locks cancels offensive loans; lost final range restores normal OEW',()=>{
 const u=fleet();u.push(unit('d','q',2,{elint:{disruption:{a:3,s:3}}},true));const initial=ewPositionSnapshot(u);
 let disruptions=[{scoutId:'d',targetId:'a',removed:{b:1}}];let e=effect(u,{initial,disruptions});assert.equal(e.ownOffensive,1);assert.equal(e.offensive,0);assert.equal(e.disrupted,1);
 disruptions=[{scoutId:'d',targetId:'s',removed:{a:1}}];assert.equal(effect(u,{initial,disruptions}).offensive,0);
 disruptions=[{scoutId:'d',targetId:'s',removed:{b:1}}];assert.equal(effect(u,{initial,disruptions}).offensive,3);
 u[3].q=40;assert.equal(effect(u,{initial,disruptions}).offensive,3);
 u[3].q=2;u[2].ewAllocation.offensive.b=2;assert.equal(effect(u,{initial,disruptions}).offensive,0);
});
test('ELINT validation shares sensor pool, restricts eligible targets and blanket combinations',()=>{
 const units=fleet(),ship=units[2];const valid=elint=>validateElint({ship,units,offensive:{b:2},elint});
 assert.equal(elintBudget(valid({defensive:{a:2},disruption:{b:3}})),5);
 for(const bad of [{blanket:3},{defensive:{a:1}},{disruption:{b:2}},{defensive:{b:2}},{disruption:{a:3}},{blanket:4,defensive:{a:2}},{mystery:1},{blanket:-4}])assert.throws(()=>valid(bad));
 assert.throws(()=>validateElint({ship:units[0],units,offensive:{s:1},elint:{}}),/Only an ELINT/);
 assert.throws(()=>validateElint({ship,units,offensive:{a:1},elint:{blanket:4}}),/Blanket/);
 units[0].q=52;assert.throws(()=>valid({defensive:{a:2}}),/50/);
 units[0].q=0;assert.equal(valid({blanket:8}).blanket,8);
});
test('fixed EW retains full ELINT allocations, allows wasted remnants, and releases lost targets into self defence',()=>{
 const units=fleet();const locked={defensive:1,offensive:{b:2,gone:2},elint:{defensive:{a:3},disruption:{gone:3},blanket:0}};
 const n=fixedEWForUnits(locked,units);assert.equal(n.defensive,6);assert.equal(n.elint.defensive.a,3);assert.deepEqual(n.elint.disruption,{});assert.equal(locked.defensive,1);
 assert.equal(validateElint({ship:units[2],units,offensive:{},elint:{defensive:{a:1}},fixed:true}).defensive.a,1);
});
