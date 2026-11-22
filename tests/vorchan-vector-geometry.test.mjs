import test from 'node:test';
import assert from 'node:assert/strict';
import {VORCHAN_VECTOR_BOXES,VORCHAN_VECTOR_AUDIT,auditVorchanVectorBoxes} from '../shared/vorchan-vector-geometry.mjs';
test('source PDF rectangle audit covers all 301 unique objects',()=>{
 const a=auditVorchanVectorBoxes();
 assert.deepEqual(a,{count:301,unique:301,reference:20,ship:281,valid:true});
 assert.equal(VORCHAN_VECTOR_AUDIT.pageWidth,612);
 assert.equal(VORCHAN_VECTOR_AUDIT.pageHeight,792);
});
test('reference panel boxes remain separate from ship structure',()=>{
 assert.equal(VORCHAN_VECTOR_BOXES.hangar_reference.length,20);
 assert.equal(VORCHAN_VECTOR_BOXES.aft_structure.length,44);
 assert.equal(VORCHAN_VECTOR_BOXES.forward_structure.length,48);
 assert.equal(VORCHAN_VECTOR_BOXES.hangar.length,20);
 assert.equal(VORCHAN_VECTOR_BOXES.reactor.length,28);
});
test('every extracted box is on the source PDF page',()=>{
 for(const [name,boxes] of Object.entries(VORCHAN_VECTOR_BOXES)){
  for(const [x,y] of boxes){
   assert.ok(x>=0&&x+6.75<=612,name+' x');
   assert.ok(y>=0&&y+6.75<=792,name+' y');
  }
 }
});
