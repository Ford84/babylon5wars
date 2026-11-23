import * as THREE from 'three';

const TEXTURE_URL = '/textures/vorchan-reference-texture.webp';
let sharedTexture;
let sharedMaterial;

export function getVorchanReferenceTexture() {
  if (!sharedTexture) {
    sharedTexture = new THREE.TextureLoader().load(TEXTURE_URL);
    sharedTexture.colorSpace = THREE.SRGBColorSpace;
    sharedTexture.wrapS = THREE.ClampToEdgeWrapping;
    sharedTexture.wrapT = THREE.ClampToEdgeWrapping;
    sharedTexture.anisotropy = 8;
  }
  return sharedTexture;
}

/**
 * The STL files have no UVs. The reference-facing view uses local Y along the
 * central hull and local Z across the crescent. This planar projection keeps
 * the high-detail image aligned
 * with that profile for every supplied Vorchan variant and local STL override.
 */
export function applyVorchanReferenceUv(geometry) {
  const positions = geometry.getAttribute('position');
  if (!positions) return geometry;

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const ySpan = Math.max(bounds.max.y - bounds.min.y, 1e-6);
  const zSpan = Math.max(bounds.max.z - bounds.min.z, 1e-6);
  const uv = new Float32Array(positions.count * 2);
  const normals = geometry.getAttribute('normal');

  // STLLoader returns unindexed triangles, allowing the far side to mirror the
  // one-sided reference without introducing a seam through shared vertices.
  for (let i = 0; i < positions.count; i += 3) {
    const farSide = normals && (normals.getX(i) + normals.getX(i + 1) + normals.getX(i + 2)) < 0;
    for (let corner = 0; corner < 3 && i + corner < positions.count; corner += 1) {
      const vertex = i + corner;
      const y = (positions.getY(vertex) - bounds.min.y) / ySpan;
      const z = (positions.getZ(vertex) - bounds.min.z) / zSpan;
      uv[vertex * 2] = farSide ? 1 - y : y;
      uv[vertex * 2 + 1] = z;
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

export function getVorchanReferenceMaterial() {
  if (!sharedMaterial) {
    sharedMaterial = new THREE.MeshStandardMaterial({
      map: getVorchanReferenceTexture(),
      color: 0xffffff,
      metalness: 0.12,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
  }
  return sharedMaterial;
}
