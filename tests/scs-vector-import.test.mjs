import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVectorExtraction,importVerifiedVectorSCS} from '../shared/scs-vector-import.mjs';
import {validateSCS} from '../shared/scs.mjs';

const fixture=()=>({
 extractionVersion:1,verification:{status:'verified'},
 identity:{faction:'Centauri Republic',name:'SYNTHETIC TEST HULL',model:'Fixture',class:'capital'},
 source:{publication:'TEST ONLY',sheetRevision:'1',page:'1',pdfSha256:'synthetic'},
 stats:{combatPoints:0,initiativeBonus:0,extraPower:0,engineEfficiency:0,turnCost:0,turnDelay:0},
 sections:[{id:'forward'}],
 systems:[
  {id:'hull',kind:'structure',section:'forward',armour:0,armourSource:'circled',sourceReference:'test:1',damageBoxes:[{id:'hull:1',x:10,y:20},{id:'hull:2',x:12,y:20}]},
  {id:'gun',kind:'weapon',section:'forward',armour:0,armourSource:'legend',sourceReference:'test:2',weaponCardId:'gun-card',power:0,damageBoxes:[{id:'gun:1',x:25,y:30}]}
 ],
 weaponCards:[{id:'gun-card',name:'Synthetic weapon',power:0}],
 hitLocations:{forward:[[1,20,'structure']]},notes:{}
});

test('converts verified vector geometry into unchanged SCS v1 definition',()=>{
 const result=importVerifiedVectorSCS(fixture());
 assert.equal(validateSCS(result.definition).valid,true);
 assert.equal(result.definition.systems[0].boxes,2);
 assert.deepEqual(result.definition.systems[0].damageBoxes,['hull:1','hull:2']);
 assert.equal(result.geometry.systems[0].damageBoxes[0].x,10);
 assert.equal(result.definition.schemaVersion,1);
});
test('rejects unverified source and duplicate box IDs',()=>{
 const a=fixture();a.verification.status='unverified';
 assert.equal(validateVectorExtraction(a).valid,false);
 assert.throws(()=>importVerifiedVectorSCS(a));
 const b=fixture();b.systems[1].damageBoxes[0].id='hull:1';
 assert.equal(validateVectorExtraction(b).valid,false);
});
test('rejects missing required official stats and source armour provenance',()=>{
 const a=fixture();delete a.stats.combatPoints;
 assert.throws(()=>importVerifiedVectorSCS(a),/invalid stats.combatPoints/);
 const b=fixture();delete b.systems[0].armourSource;
 assert.throws(()=>importVerifiedVectorSCS(b),/armour/);
});
