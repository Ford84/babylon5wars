import * as THREE from 'three';

// The supplied STL has no UVs or material groups. Colour each flat triangle
// from its real mesh position so the restrained scheme follows the ship's
// central hull, outer wing armour and shaded underside without projecting art.
const PALETTE = Object.freeze({
  hull: new THREE.Color('#9b998f'),
  wing: new THREE.Color('#74636d'),
  side: new THREE.Color('#62615f'),
  underside: new THREE.Color('#34383a'),
});

export function applyVorchanColourScheme(geometry) {
  const positions = geometry.getAttribute('position');
  if (!positions) return geometry;

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const zCentre = (bounds.min.z + bounds.max.z) / 2;
  const zHalf = Math.max((bounds.max.z - bounds.min.z) / 2, 1e-6);
  const colours = new Float32Array(positions.count * 3);
  const normals = geometry.getAttribute('normal');

  // STLLoader creates an unindexed triangle list, so all three vertices of
  // each triangle receive one material colour and panel edges stay crisp.
  for (let i = 0; i < positions.count; i += 3) {
    let nx = 0, ny = 0, nz = 0;
    for (let corner = 0; corner < 3 && i + corner < positions.count; corner += 1) {
      const v = i + corner;
      nx += normals?.getX(v) ?? 0;
      ny += normals?.getY(v) ?? 0;
      nz += normals?.getZ(v) ?? 0;
    }
    const span = Math.abs(((positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3 - zCentre) / zHalf);
    const colour = ny < -0.8
      ? PALETTE.underside
      : ny < 0.35
        ? PALETTE.side
        : span > 0.38
          ? PALETTE.wing
          : PALETTE.hull;
    for (let corner = 0; corner < 3 && i + corner < positions.count; corner += 1) {
      colours[(i + corner) * 3] = colour.r;
      colours[(i + corner) * 3 + 1] = colour.g;
      colours[(i + corner) * 3 + 2] = colour.b;
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

export function getVorchanMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.16,
    roughness: 0.66,
    side: THREE.DoubleSide,
  });
}
