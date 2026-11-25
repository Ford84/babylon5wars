import {hullProfile} from '../shared/vorchar.mjs';
import {facingYawRadians} from '../shared/ship-facing.mjs';
import MapNavigation,{useMapNavigation} from './MapNavigation.jsx';
import {hexWorld,mapCameraTarget} from '../shared/map-camera.mjs';
import {createWeaponAnimator} from './weapon-effects-3d.js';
import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {DEFAULT_VORCHAN_MODEL_ID,vorchanModelById} from '../shared/vorchan-models.mjs';
import {applyVorchanColourScheme,getVorchanMaterial} from './vorchanMaterial.js';
const MODEL=vorchanModelById(DEFAULT_VORCHAN_MODEL_ID).url;
const FALLBACK_MODEL='/models/vorchan.glb';
const TYREL_CACHE='b5w-tyrel-vorchan-model';
const publicModelGeometry=new Map();
function cachedPublicGeometry(url=MODEL){if(!publicModelGeometry.has(url))publicModelGeometry.set(url,new STLLoader().loadAsync(url).catch(error=>{publicModelGeometry.delete(url);throw error;}));return publicModelGeometry.get(url);}
const colouredAssets=new Map();
function loadColouredShip(url){if(!colouredAssets.has(url))colouredAssets.set(url,(async()=>{const response=await fetch(url);if(!response.ok)throw new Error('Ship model unavailable');const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return (await new GLTFLoader().parseAsync(bytes,'')).scene;})().catch(error=>{colouredAssets.delete(url);throw error;}));return colouredAssets.get(url);}
let larisiAsset;
function loadLarisi(){return larisiAsset??=(async()=>{const response=await fetch('/models/shuttle/centauri-larisi-rc1.glb.gz');if(!response.ok)throw new Error('Shuttle model unavailable');const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();return (await new GLTFLoader().parseAsync(bytes,'')).scene;})();}
function modelStore(){return new Promise((resolve,reject)=>{const request=indexedDB.open(TYREL_CACHE,1);request.onupgradeneeded=()=>request.result.createObjectStore('models');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function storedTyrelModel(value){const db=await modelStore();return new Promise((resolve,reject)=>{const tx=db.transaction('models',value===undefined?'readonly':'readwrite');const request=value===undefined?tx.objectStore('models').get('default'):value===null?tx.objectStore('models').delete('default'):tx.objectStore('models').put(value,'default');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();});}
export async function saveLocalVorchanModel(file){if(!file||file.size>30*1024*1024)throw new RangeError('STL must be smaller than 30 MB');const data=await file.arrayBuffer();await storedTyrelModel(data);return file.name;}
export async function clearLocalVorchanModel(){await storedTyrelModel(null);}
export async function hasLocalVorchanModel(){return !!(await storedTyrelModel());}

const hexPoint=hexWorld;
function makeVorchan(){
 const g=new THREE.Group(),purple=getVorchanMaterial(),hull=purple,trim=purple,dark=new THREE.MeshStandardMaterial({color:0x302638,metalness:.12,roughness:.8}),engine=new THREE.MeshBasicMaterial({color:0x69c7ff});
 const poly=(pts,material,height=.6)=>{const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(p=>s.lineTo(...p));s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelSize:.12,bevelThickness:.08,bevelSegments:1});geo.rotateX(-Math.PI/2);const m=new THREE.Mesh(geo,material);g.add(m);return m;};
 poly([[0,-8],[-1.4,-4],[-2,-1],[-5.7,3],[-4.8,5],[-1.3,3.4],[0,7],[1.3,3.4],[4.8,5],[5.7,3],[2,-1],[1.4,-4]],purple,1);
 poly([[0,-7],[-.55,-3.3],[-1.1,1],[0,4.2],[1.1,1],[.55,-3.3]],hull,1.2);
 for(const sign of [-1,1]){poly([[sign*1.6,-1],[sign*5,3],[sign*4.6,3.6],[sign*1.2,1.5]],trim,.35);const e=new THREE.Mesh(new THREE.CylinderGeometry(.5,.7,1.2,10),dark);e.rotation.x=Math.PI/2;e.position.set(sign*1.4,.5,4.7);g.add(e);const glow=new THREE.Mesh(new THREE.CircleGeometry(.45,12),engine);glow.rotation.x=-Math.PI/2;glow.position.set(sign*1.4,.65,5.36);g.add(glow);}
 g.scale.setScalar(.72);return g;
}
function makePrimusToken(){const g=new THREE.Group(),shape=new THREE.Shape();const points=[[-3,-10],[-1,-10],[-1,-3],[1,-3],[1,-10],[3,-10],[4,-2],[10,4],[9,7],[3,5],[2,11],[-2,11],[-3,5],[-9,7],[-10,4],[-4,-2]];points.forEach(([x,y],i)=>i?shape.lineTo(x,-y):shape.moveTo(x,-y));shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:0x805ba4,metalness:.35,roughness:.6}));mesh.rotation.x=-Math.PI/2;g.add(mesh);return g;}

const fighterGeometry=new THREE.BufferGeometry();
fighterGeometry.setAttribute('position',new THREE.Float32BufferAttribute([
 0,0,-2, -2.4,0,-1, -1.5,0,1.3,
 0,0,-2, -1.5,0,1.3, 0,0,2,
 0,0,-2, 2.4,0,-1, 1.5,0,1.3,
 0,0,-2, 1.5,0,1.3, 0,0,2,
 0,.65,-.8, -1.5,0,1.3, 0,0,2,
 0,.65,-.8, 0,0,2, 1.5,0,1.3
],3));fighterGeometry.computeVertexNormals();
const fighterMaterial=new THREE.MeshStandardMaterial({color:0x8062b0,metalness:.45,roughness:.48,side:THREE.DoubleSide});
function makeFighterFormation(flight){
 const group=new THREE.Group();
 const positions=[[-3,-5],[3,-5],[-5,0],[5,0],[-3,5],[3,5]];
 for(const f of flight.fighters||[]){
  if(f.destroyed||f.droppedOut)continue;
  const p=positions[f.slot-1];if(!p)continue;
  const mesh=new THREE.Mesh(fighterGeometry,fighterMaterial);
  mesh.position.set(p[0],1,p[1]);group.add(mesh);
 }
 return group;
}

function makeShuttleToken(){const group=new THREE.Group(),body=new THREE.Mesh(new THREE.ConeGeometry(3,9,3),new THREE.MeshStandardMaterial({color:0xffd98a}));body.rotation.x=-Math.PI/2;body.position.y=2;group.add(body);return group;}
function makeJumpToken(p){const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(12,1,8,40),new THREE.MeshBasicMaterial({color:p.status==='forming'?0x8863bf:0xd08bff,transparent:true,opacity:p.status==='forming'?.5:1}));ring.rotation.x=Math.PI/2;g.add(ring);const entry=new THREE.Mesh(new THREE.ConeGeometry(2,6,3),new THREE.MeshBasicMaterial({color:0xffd98a}));entry.rotation.x=-Math.PI/2;entry.position.set(0,0,-16);g.add(entry);return g;}
export default function Map3D({ships,selected,setSelected,preset='standard',modelId=DEFAULT_VORCHAN_MODEL_ID,volley}){
 const modelUrl=vorchanModelById(modelId).url;
 const volleyRef=useRef(volley);volleyRef.current=volley;
 const mount=useRef(null),engine=useRef(null),[localModel,setLocalModel]=useState(null),[modelStatus,setModelStatus]=useState('Loading model');
 useEffect(()=>{let alive=true;storedTyrelModel().then(data=>{if(alive&&data){setLocalModel(data);setModelStatus('Tyrel Lohr Vorchan — saved default model');}}).catch(()=>{});return()=>{alive=false}},[]);
 const dims={standard:[20,32],outer:[40,64],inner:[80,128]}[preset]||[20,32];
 const navigation=useMapNavigation(selected,dims[1]),viewRef=useRef(navigation.view);viewRef.current=navigation.view;
 useEffect(()=>{
  const host=mount.current;if(!host)return;
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{setModelStatus('WebGL unavailable');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(host.clientWidth,Math.max(360,host.clientHeight));renderer.setClearColor(0x071328);host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-150,150,90,-90,.1,2000);
  scene.add(new THREE.AmbientLight(0xb2c4ff,2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(50,120,40);scene.add(light);
  const [cols,rows]=dims;const base=Math.max(190,rows*19);
  const geometry=new THREE.BufferGeometry(),points=[];
  for(let q=0;q<cols;q++)for(let r=0;r<rows;r++){const p=hexPoint(q,r);for(let k=0;k<6;k++){const a=(60*k-30)*Math.PI/180,b=(60*(k+1)-30)*Math.PI/180;points.push(p.x+12*Math.cos(a),0,p.z+12*Math.sin(a),p.x+12*Math.cos(b),0,p.z+12*Math.sin(b));}}
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));scene.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x3b5b7c,transparent:true,opacity:.55})));
  let shuttleFactory=makeShuttleToken;const hullFactories=new Map();
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),pick=[],models=[];
  const updateCamera=()=>{const aspect=host.clientWidth/Math.max(360,host.clientHeight),view=viewRef.current,centre=mapCameraTarget(view,ships,cols,rows),scale=Math.max(base,Math.sqrt(3)*12*(cols+rows/2)/aspect*1.1)/view.zoom;camera.left=-scale*aspect/2;camera.right=scale*aspect/2;camera.top=scale/2;camera.bottom=-scale/2;camera.position.set(centre.x+scale*.12,scale*.8,centre.z+scale*.9);camera.lookAt(centre.x,0,centre.z);camera.far=scale*4+1000;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,Math.max(360,host.clientHeight));renderer.render(scene,camera);};
  const redraw=(modelFactory)=>{for(const item of models)scene.remove(item);models.length=0;pick.length=0;ships.forEach((s,i)=>{if(!Number.isInteger(s.q)||!Number.isInteger(s.r)||s.q<0||s.r<0||s.q>=cols||s.r>=rows)return;const p=hexPoint(s.q,s.r),model=s.kind==='jump-point'?makeJumpToken(s):s.kind==='fighter-flight'?makeFighterFormation(s):s.kind==='shuttle'?shuttleFactory():hullProfile(s.public_state?.libraryId)?.mapToken==='primus'?makePrimusToken():(hullFactories.get(s.public_state?.libraryId)?.()||modelFactory());model.position.set(p.x,1,p.z);model.rotation.y=facingYawRadians(s.facing||0);scene.add(model);models.push(model);model.traverse(o=>{if(o.isMesh){o.userData.shipId=s.id??i;pick.push(o);}});const ring=new THREE.Mesh(new THREE.RingGeometry(8,9,32),new THREE.MeshBasicMaterial({color:selected===(s.id??i)?0x8bdcff:0x446c9c,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,.1,p.z);scene.add(ring);models.push(ring);});updateCamera();};
  let factory=()=>makeVorchan(),alive=true;redraw(factory);
  for(const id of new Set(ships.map(x=>x.public_state?.libraryId))){const hull=hullProfile(id);if(hull?.modelUrl)loadColouredShip(hull.modelUrl).then(source=>{if(alive){hullFactories.set(id,()=>source.clone(true));setModelStatus('Ship Models Loaded');redraw(factory);}}).catch(()=>{if(alive)setModelStatus(hull.name+' Model Unavailable');});}
  loadLarisi().then(source=>{if(alive){shuttleFactory=()=>source.clone(true);redraw(factory);}}).catch(()=>{if(alive)setModelStatus('Shuttle Model Unavailable · Using Map Token');});
  const useGeometry=(geometry,label)=>{geometry.computeVertexNormals();geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new THREE.Vector3());const centre=geometry.boundingBox.getCenter(new THREE.Vector3());geometry.translate(-centre.x,-centre.y,-centre.z);applyVorchanColourScheme(geometry);const scale=14/Math.max(size.x,size.y,size.z,1);const material=getVorchanMaterial({detailed:true});factory=()=>{const group=new THREE.Group();const mesh=new THREE.Mesh(geometry,material);mesh.scale.setScalar(scale);mesh.rotation.set(-Math.PI/2,0,Math.PI);group.add(mesh);return group;};setModelStatus(hullFactories.size?'Ship Models Loaded':label);redraw(factory);};
  if(localModel){try{useGeometry(new STLLoader().parse(localModel),'Tyrel Lohr STL · this browser');}catch(e){setModelStatus('Unable to read STL: '+e.message);}}
  else {
  cachedPublicGeometry(modelUrl).then(geometry=>{if(alive)useGeometry(geometry,'Tyrel Lohr Vorchan · public model');}).catch(()=>{if(!alive)return;new GLTFLoader().load(FALLBACK_MODEL,gltf=>{if(!alive)return;const source=gltf.scene;source.traverse(o=>{if(o.isMesh){applyVorchanColourScheme(o.geometry);o.material=getVorchanMaterial({detailed:true});}});source.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(source),sz=box.getSize(new THREE.Vector3());const factor=14/Math.max(sz.x,sz.y,sz.z,1);factory=()=>{const obj=source.clone(true);obj.scale.setScalar(factor);return obj;};setModelStatus('Coloured Vorchan preview · public model unavailable');redraw(factory);},undefined,()=>{if(alive)setModelStatus('3D Vorchan preview unavailable');});});}

  const onClick=e=>{const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(pick,false);if(hits.length)setSelected(hits[0].object.userData.shipId);};
  const onWheel=e=>{e.preventDefault();navigation.zoomBy(e.deltaY<0?1.15:1/1.15);};
  renderer.domElement.addEventListener('click',onClick);renderer.domElement.addEventListener('wheel',onWheel,{passive:false});const weaponAnimator=createWeaponAnimator(scene,()=>renderer.render(scene,camera),hexPoint);engine.current={updateCamera,playWeapons:weaponAnimator.play};weaponAnimator.play(volleyRef.current);
  const resize=new ResizeObserver(updateCamera);resize.observe(host);updateCamera();
  return()=>{alive=false;weaponAnimator.dispose();resize.disconnect();renderer.domElement.removeEventListener('click',onClick);renderer.domElement.removeEventListener('wheel',onWheel);renderer.dispose();host.removeChild(renderer.domElement);engine.current=null;};
 },[preset,ships,selected,setSelected,localModel,modelUrl]);
 useEffect(()=>engine.current?.updateCamera(),[navigation.view]);
 useEffect(()=>engine.current?.playWeapons(volley),[volley]);
 return <div><MapNavigation navigation={navigation} ships={ships} setSelected={setSelected}/><div ref={mount} className="map3d-viewport" aria-label="Interactive 3D tactical hex battlefield"/><p className="hint">{modelStatus}</p></div>;
}
