import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import {VORCHAN_MODELS} from '../shared/vorchan-models.mjs';
import {applyVorchanReferenceUv, getVorchanReferenceMaterial} from './vorchanTexture.js';

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

    const material = getVorchanReferenceMaterial();
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

    new STLLoader().load(
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
        applyVorchanReferenceUv(geometry);
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
  const selected = selectedModelId || localSelected;
  const model = VORCHAN_MODELS.find(item => item.id === selected) || VORCHAN_MODELS[0];
  const setSelected = onSelectedModelChange || setLocalSelected;

  return (
    <section className="panel vorchan-showcase" aria-labelledby="vorchan-showcase-title">
      <div className="sectionhead">
        <h2 id="vorchan-showcase-title">Centauri Vorchan model gallery</h2>
        <span>Public 3D preview</span>
      </div>
      <p>Inspect the Vorchan models in an interactive viewer. Drag to rotate and use the scroll wheel or trackpad to zoom.</p>
      <div className="model-showcase-controls">
        {showSelector && <><label htmlFor="vorchan-model-choice">Model variant</label>
        <select id="vorchan-model-choice" value={model.id} onChange={(event) => setSelected(event.target.value)}>
          {VORCHAN_MODELS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></>}
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {open ? 'Close 3D viewer' : `Preview ${model.label}`}
        </button>
      </div>
      {open && <ModelViewport key={model.url} model={model} />}
      <p className="model-credit">
        Model by Tyrel Lohr. Texture reference: Bob Sternberg’s <a href="https://www.behance.net/gallery/50032227/Vorchan-Cruiser-%28Reimagination-Series-Babylon-5%29" target="_blank" rel="noopener noreferrer">Vorchan Cruiser reimagination</a>. <a href="https://cults3d.com/en/3d-model/game/centauri-vorchan-attack-cruiser" target="_blank" rel="noopener noreferrer">View the original model listing</a>.
      </p>
    </section>
  );
}
