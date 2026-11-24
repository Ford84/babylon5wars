import * as THREE from 'three';
import {sampleWeaponEffect,weaponPlaybackDuration} from '../shared/weapon-effects.mjs';
export function createWeaponAnimator(scene,render,xy){
 let frame=0,objects=[];
 const clear=()=>{cancelAnimationFrame(frame);for(const o of objects){scene.remove(o.group);o.group.traverse(x=>{x.geometry?.dispose();x.material?.dispose();});}objects=[];};
 function play(volley){
  clear();if(!volley)return;
  objects=volley.effects.map(effect=>{
   const group=new THREE.Group(),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
   const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:effect.colour,depthTest:false}));
   const head=new THREE.Mesh(new THREE.SphereGeometry(effect.effect==='plasma'?.8:.45,8,6),new THREE.MeshBasicMaterial({color:effect.colour,depthTest:false}));
   const impact=new THREE.Mesh(new THREE.RingGeometry(.7,1.1,24),new THREE.MeshBasicMaterial({color:effect.colour,transparent:true,side:THREE.DoubleSide,depthTest:false}));impact.rotation.x=-Math.PI/2;
   group.add(line,head,impact);group.renderOrder=20;scene.add(group);return {effect,group,line,head,impact};
  });
  const tick=()=>{
   const elapsed=performance.now()-volley.startedAt;
   for(const o of objects){const e=o.effect,s=sampleWeaponEffect(e,elapsed),a=xy(e.from.q,e.from.r),b=xy(e.to.q,e.to.r);o.group.visible=s.visible;if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){s.t=1;s.tail=0;}
    const head={x:a.x+(b.x-a.x)*s.t,z:a.z+(b.z-a.z)*s.t},tailT=e.effect==='beam'?0:s.tail,tail={x:a.x+(b.x-a.x)*tailT,z:a.z+(b.z-a.z)*tailT};
    o.line.geometry.attributes.position.array.set([tail.x,4,tail.z,head.x,4,head.z]);o.line.geometry.attributes.position.needsUpdate=true;o.line.geometry.computeBoundingSphere();o.line.visible=s.t<1;
    o.head.position.set(head.x,4,head.z);o.head.visible=s.t<1;o.impact.position.set(b.x,4,b.z);o.impact.visible=s.impact>0;o.impact.scale.setScalar(1+(1-s.impact)*5);o.impact.material.opacity=s.impact;
   }
   render();if(elapsed<weaponPlaybackDuration(volley.effects))frame=requestAnimationFrame(tick);else{clear();render();}
  };tick();
 }
 return {play,dispose:clear};
}
