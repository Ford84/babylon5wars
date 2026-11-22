import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
const MODEL='/models/vorchan.glb';
const TYREL_CACHE='b5w-tyrel-vorchan-model';
function modelStore(){return new Promise((resolve,reject)=>{const request=indexedDB.open(TYREL_CACHE,1);request.onupgradeneeded=()=>request.result.createObjectStore('models');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function storedTyrelModel(value){const db=await modelStore();return new Promise((resolve,reject)=>{const tx=db.transaction('models',value===undefined?'readonly':'readwrite');const request=value===undefined?tx.objectStore('models').get('default'):value===null?tx.objectStore('models').delete('default'):tx.objectStore('models').put(value,'default');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});}

const hexPoint=(q,r)=>({x:Math.sqrt(3)*12*(q+r/2),z:18*r});
function makeVorchan(){
 const g=new THREE.Group(),purple=new THREE.MeshStandardMaterial({color:0x69316f,metalness:.45,roughness:.42}),gold=new THREE.MeshStandardMaterial({color:0xc6a66c,metalness:.6,roughness:.3}),dark=new THREE.MeshStandardMaterial({color:0x292039,metalness:.5}),engine=new THREE.MeshBasicMaterial({color:0x69c7ff});
 const poly=(pts,material,height=.6)=>{const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>s.lineTo(...p));s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelSize:.12,bevelThickness:.08,bevelSegments:1});geo.rotateX(-Math.PI/2);const m=new THREE.Mesh(geo,material);g.add(m);return m;};
 poly([[0,-8],[-1.4,-4],[-2,-1],[-5.7,3],[-4.8,5],[-1.3,3.4],[0,7],[1.3,3.4],[4.8,5],[5.7,3],[2,-1],[1.4,-4]],purple,1);
 poly([[0,-7],[-.55,-3.3],[-1.1,1],[0,4.2],[1.1,1],[.55,-3.3]],gold,1.2);
 for(const sign of [-1,1]){poly([[sign*1.6,-1],[sign*5,3],[sign*4.6,3.6],[sign*1.2,1.5]],gold,.35);const e=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,1.2,10),dark);e.rotation.x=Math.PI/2;e.position.set(sign*1.4,.5,4.7);g.add(e);const glow=new THREE.Mesh(new THREE.CircleGeometry(.45,12),engine);glow.rotation.x=-Math.PI/2;glow.position.set(sign*1.4,.65,5.36);g.add(glow);}
 g.scale.setScalar(.72);return g;
}
export default function Map3D({ships,selected,setSelected,preset='standard'}){
 const mount=useRef(null),engine=useRef(null),[zoom,setZoom]=useState(1),[localModel,setLocalModel]=useState(null),[modelStatus,setModelStatus]=useState('Loading model');
 useEffect(()=>{let alive=true;storedTyrelModel().then(data=>{if(alive&&data){setLocalModel(data);setModelStatus('Tyrel Lohr Vorchan — saved default model');}}).catch(()=>{});return()=>{alive=false}},[]);
 const dims={standard:[20,32],outer:[40,64],inner:[80,128]}[preset]||[20,32];
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{setModelStatus('WebGL unavailable');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(host.clientWidth,Math.max(360,host.clientHeight));renderer.setClearColor(0x071328);host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-150,150,90,-90,.1,2000);
  scene.add(new THREE.AmbientLight(0xb2c4ff,2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(50,120,40);scene.add(light);
  const [cols,rows]=dims,centre=hexPoint((cols-1)/2,(rows-1)/2);const base=Math.max(190,rows*19);
  const geometry=new THREE.BufferGeometry(),points=[];
  for(let q=0;q<cols;q++)for(let r=0;r<rows;r++){const p=hexPoint(q,r);for(let k=0;k<6;k++){const a=(60*k-30)*Math.PI/180,b=(60*(k+1)-30)*Math.PI/180;points.push(p.x+12*Math.cos(a),0,p.z+12*Math.sin(a),p.x+12*Math.cos(b),0,p.z+12*Math.sin(b));}}
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));scene.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x3b5b7c,transparent:true,opacity:.55})));
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),pick=[],models=[];
  const updateCamera=()=>{const aspect=host.clientWidth/Math.max(360,host.clientHeight),scale=base/zoom;camera.left=-scale*aspect/2;camera.right=scale*aspect/2;camera.top=scale/2;camera.bottom=-scale/2;camera.position.set(centre.x+scale*.12,scale*.8,centre.z+scale*.9);camera.lookAt(centre.x,0,centre.z);camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,Math.max(360,host.clientHeight));renderer.render(scene,camera);};
  const redraw=(modelFactory)=>{for(const item of models)scene.remove(item);models.length=0;pick.length=0;ships.forEach((s,i)=>{if(!Number.isInteger(s.q)||!Number.isInteger(s.r)||s.q<0||s.r<0||s.q>=cols||s.r>=rows)return;const p=hexPoint(s.q,s.r),model=modelFactory();model.position.set(p.x,1,p.z);model.rotation.y=(s.facing||0)*Math.PI/3;scene.add(model);models.push(model);model.traverse(o=>{if(o.isMesh){o.userData.shipId=s.id??i;pick.push(o);}});const ring=new THREE.Mesh(new THREE.RingGeometry(8,9,32),new THREE.MeshBasicMaterial({color:selected===(s.id??i)?0x8bdcff:0x446c9c,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.1,p.z);scene.add(ring);models.push(ring);});updateCamera();};
  let factory=()=>makeVorchan(),alive=true;redraw(factory);
  const useGeometry=(geometry)=>{geometry.computeVertexNormals();geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3());const centre=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(-centre.x,-centre.y,-centre.z);const scale=14/Math.max(size.x,size.y,size.z,1);factory=()=>{const group=new THREE.Group();const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x77346f,metalness:.48,roughness:.38,side:THREE.DoubleSide}));mesh.scale.setScalar(scale);mesh.rotation.x=-Math.PI/2;group.add(mesh);return group;};setModelStatus('Tyrel Lohr Vorchan STL · locally loaded · purple material preview');redraw(factory);};
  if(localModel){try{useGeometry(new STLLoader().parse(localModel));}catch(e){setModelStatus('Unable to read STL: '+e.message);}}
  else {
  new GLTFLoader().load(MODEL,gltf=>{if(!alive)return;const source=gltf.scene;source.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(source),sz=box.getSize(new THREE.Vector3());const factor=14/Math.max(sz.x,sz.y,sz.z,1);factory=()=>{const obj=source.clone(true);obj.scale.setScalar(factor);return obj;};setModelStatus('Vorchan GLB');redraw(factory);},undefined,()=>{if(alive)setModelStatus('Coloured 3D Vorchan preview · load Tyrel Lohr STL below');});}

  const onClick=e=>{const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(pick,false);if(hits.length)setSelected(hits[0].object.userData.shipId);};
  const onWheel=e=>{e.preventDefault();setZoom(z=>Math.min(12,Math.max(.4,z*(e.deltaY<0?1.15:1/1.15))));};
  renderer.domElement.addEventListener('click',onClick);renderer.domElement.addEventListener('wheel',onWheel,{passive:false});engine.current={updateCamera};
  const resize=new ResizeObserver(updateCamera);resize.observe(host);updateCamera();
  return()=>{alive=false;resize.disconnect();renderer.domElement.removeEventListener('click',onClick);renderer.domElement.removeEventListener('wheel',onWheel);renderer.dispose();host.removeChild(renderer.domElement);engine.current=null;};
 },[preset,ships,selected,setSelected,localModel]);
 useEffect(()=>engine.current?.updateCamera(),[zoom]);
 return <div><div className="map3d-controls"><button type="button" onClick={()=>setZoom(z=>Math.max(.4,z/1.3))}>− Zoom out</button><button type="button" onClick={()=>setZoom(z=>Math.min(12,z*1.3))}>+ Zoom in</button><button type="button" onClick={()=>setZoom(1)}>Reset camera</button><span>{modelStatus}</span></div><div className="map3d-import"><label>Tyrel Lohr Vorchan STL (save as default on this browser) <input type="file" accept=".stl" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>30*1024*1024){setModelStatus('STL exceeds 30 MB local preview limit');return;}const data=await file.arrayBuffer();setLocalModel(data);storedTyrelModel(data).catch(()=>setModelStatus('Model loaded for this session; browser storage unavailable'));}}/></label><a href="https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser" target="_blank" rel="noopener noreferrer">Get Tyrel Lohr's Vorchan model</a><button type="button" onClick={()=>{setLocalModel(null);storedTyrelModel(null).catch(()=>{});}}>Use built-in model</button><small>After one import, this browser automatically uses the Tyrel Lohr model by default on subsequent visits. The STL stays on this device; it is not uploaded or redistributed. Colour is a preview material, not the author's texture.</small></div><div ref={mount} className="map3d-viewport" aria-label="Interactive 3D tactical hex battlefield"/></div>;
}
