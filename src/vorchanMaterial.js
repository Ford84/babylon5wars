import * as THREE from 'three';

// The STL has no UVs. A single satin-purple paint avoids inventing panel
// boundaries from triangle positions or baking lighting into the hull colour.
const HULL_PURPLE = '#643779';

export function applyVorchanColourScheme(geometry) {
  // Remove any earlier per-face paint, including on cached/local STL geometry.
  geometry.deleteAttribute('color');
  return geometry;
}

export function getVorchanMaterial() {
  return new THREE.MeshStandardMaterial({
    color: HULL_PURPLE,
    vertexColors: false,
    metalness: 0.12,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
}
