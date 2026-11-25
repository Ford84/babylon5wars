import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import {VORCHAN_MODELS} from '../shared/vorchan-models.mjs';
import {applyVorchanColourScheme, getVorchanMaterial} from './vorchanMaterial.js';

import {MOGRATH} from '../shared/mograth.mjs';
import {MOGRATTI} from '../shared/mogratti.mjs';
export const SHOWCASE_MODELS=[
 ...VORCHAN_MODELS.map(m=>({...m,label:'Vorchan Attack Cruiser',format:'stl'})),
 {id:'vorchar',label:'Vorchar Warscout (Shared Hull)',url:VORCHAN_MODELS[0].url,format:'stl'},
 ...[MOGRATH,MOGRATTI].map(h=>({id:h.id,label:h.name,url:h.modelUrl,format:'glb-gzip'})),
 {id:'primus',label:'Primus Battlecruiser (Tactical Token)',format:'token'},
 {id:'larisi',label:'Larisi Shuttle',url:'/models/shuttle/centauri-larisi-rc1.glb.gz',format:'glb-gzip'},
 {id:'sentri',label:'Sentri Medium Fighter',url:'/models/fighters/centauri-sentri-rc3.stl',format:'stl'},
 {id:'razik',label:'Razik Light Fighter (Tactical Token)',format:'token'}
];
function ModelViewport({ model }) {
  const mount = useRef(null);
  const [status, setStatus] = useState('Loading model…');

  useEffect(() => {
    const host = mount.current;
    if (!host) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      setStatus('3D preview is unavailable in this browser.');
      return undefined;
    }

    let alive = true;
    let frame = 0;
    let geometry = null;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071328);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 1000);
    camera.position.set(34, 25, 42);
    scene.add(new THREE.HemisphereLight(0xd8e7ff, 0x25213b, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(24, 40, 28);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x60bce4, 1.6);
    rim.position.set(-30, 12, -20);
    scene.add(rim);
    const grid = new THREE.GridHelper(80, 20, 0x426484, 0x203b58);
    grid.position.y = -12;
    scene.add(grid);

    const material = getVorchanMaterial({detailed:true});
    const group = new THREE.Group();
    scene.add(group);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 15;
    controls.maxDistance = 140;
    controls.target.set(0, 0, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.replaceChildren(renderer.domElement);

    const resize = () => {
      if (!alive) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    const animate = () => {
      if (!alive) return;
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    resize();
    animate();

    if(model.format==='token'){
      const shape=new THREE.Shape();const points=model.id==='primus'?[[-3,-10],[-1,-10],[-1,-3],[1,-3],[1,-10],[3,-10],[4,-2],[10,4],[9,7],[3,5],[2,11],[-2,11],[-3,5],[-9,7],[-10,4],[-4,-2]]:[[0,-2],[-2.4,-1],[-1.5,1.3],[0,2],[1.5,1.3],[2.4,-1]];points.forEach(([x,y],i)=>i?shape.lineTo(x,-y):shape.moveTo(x,-y));shape.closePath();geometry=new THREE.ExtrudeGeometry(shape,{depth:model.id==='primus'?1:.3,bevelEnabled:false});const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x805ba4,metalness:.35,roughness:.6}));mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(model.id==='primus'?1.25:5);group.add(mesh);setStatus(model.label+' · placeholder geometry');
    }else if(model.format==='glb-gzip'){
      (async()=>{const response=await fetch(model.url);if(!response.ok)throw Error('Model unavailable');const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const object=(await new GLTFLoader().parseAsync(bytes,'')).scene;if(!alive)return;const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());const scale=28/Math.max(size.x,size.y,size.z,1);object.position.copy(centre.multiplyScalar(-scale));object.scale.setScalar(scale);group.add(object);setStatus(model.label+' · drag to rotate · scroll to zoom');})().catch(()=>{if(alive)setStatus('Model asset unavailable: '+model.label);});
    }else new STLLoader().load(
      model.url,
      (loaded) => {
        if (!alive) {
          loaded.dispose();
          return;
        }
        geometry = loaded;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox;
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        geometry.translate(-centre.x, -centre.y, -centre.z);
        if(model.id==='sentri'){const p=geometry.attributes.position,colors=[];for(let i=0;i<p.count;i++){const z=p.getZ(i),x=p.getX(i),shade=.83+.17*Math.cos(z*.12+x*.08)**2;const col=new THREE.Color().setRGB(.46*shade,.33*shade,.65*shade,THREE.SRGBColorSpace);colors.push(col.r,col.g,col.b);}geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}else applyVorchanColourScheme(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.scale.setScalar(28 / Math.max(size.x, size.y, size.z, 1));
        group.add(mesh);
        setStatus(`${model.label} · drag to rotate · scroll to zoom`);
      },
      undefined,
      () => {
        if (alive) setStatus('Could not load this model. Please try another variant.');
      },
    );

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      geometry?.dispose();
      material.dispose();
      grid.geometry.dispose();
      if (Array.isArray(grid.material)) grid.material.forEach((item) => item.dispose());
      else grid.material.dispose();
      renderer.dispose();
      host.replaceChildren();
    };
  }, [model]);

  return (
    <div className="model-viewer-wrap">
      <div className="model-viewer-status" aria-live="polite">{status}</div>
      <div ref={mount} className="model-showcase-canvas" aria-label={`${model.label} interactive 3D preview`} />
    </div>
  );
}

export {VORCHAN_MODELS};

export default function VorchanShowcase({selectedModelId, onSelectedModelChange, showSelector = true} = {}) {
  const [localSelected, setLocalSelected] = useState(VORCHAN_MODELS[0].id);
  const [open, setOpen] = useState(false);
  const model = SHOWCASE_MODELS.find(item => item.id === localSelected) || SHOWCASE_MODELS[0];
  const setSelected = setLocalSelected;

  return (
    <section className="panel vorchan-showcase" aria-labelledby="vorchan-showcase-title">
      <div className="sectionhead">
        <h2 id="vorchan-showcase-title">Centauri 3D Model Viewer</h2>
        <span>Public 3D preview</span>
      </div>
      <p>Inspect the available Centauri ships, fighters and shuttles in the interactive viewer. Drag to rotate and use the scroll wheel or trackpad to zoom.</p>
      <div className="model-showcase-controls">
        {showSelector && SHOWCASE_MODELS.length > 1 && <><label htmlFor="vorchan-model-choice">Select model</label>
        <select id="vorchan-model-choice" value={model.id} onChange={(event) => setSelected(event.target.value)}>
          {SHOWCASE_MODELS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></>}
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Close 3D viewer' : `Preview ${model.label}`}
        </button>
      </div>
      {open && <ModelViewport key={model.id} model={model} />}
      <p className="model-credit">
        Vorchan model by Tyrel Lohr. Tactical tokens are labelled where dedicated models are unavailable. <a href="https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser" target="_blank" rel="noopener noreferrer">View the original model listing</a>.
      </p>
    </section>
  );
}
