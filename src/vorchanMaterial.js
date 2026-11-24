import * as THREE from 'three';

const HULL = new THREE.Color('#643779');
const PLUM = new THREE.Color('#302039');
const LAVENDER = new THREE.Color('#9271a5');
const BRASS = new THREE.Color('#99815b');
const clamp = THREE.MathUtils.clamp;
const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);

// The STL has no UVs. Weld positions for curvature analysis only: retain the
// original vertices and flat normals so no physical component is reshaped.
export function applyVorchanColourScheme(geometry) {
  const p=geometry.getAttribute('position');
  if(!p)return geometry;
  if(geometry.userData.vorchanDetailPaint===1&&geometry.getAttribute('color')?.count===p.count)return geometry;
  geometry.computeBoundingBox();
  const centre=geometry.boundingBox.getCenter(new THREE.Vector3());
  const halfWidth=Math.max(geometry.boundingBox.max.x-centre.x,1e-6);
  const vertices=[],byPosition=new Map(),ids=new Uint32Array(p.count);
  const precision=halfWidth*1e-5;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    const key=[x,y,z].map(n=>Math.round(n/precision)).join(',');
    let id=byPosition.get(key);
    if(id===undefined){id=vertices.length;byPosition.set(key,id);vertices.push({x,y,z,nx:0,ny:0,nz:0,dx:0,dy:0,dz:0,distance:0});}
    ids[i]=id;
  }
  const indices=geometry.index?.array,total=indices?.length??p.count;
  for(let i=0;i+2<total;i+=3){
    const triangle=[0,1,2].map(j=>vertices[ids[indices?.[i+j]??i+j]]);
    const [a,b,c]=triangle,ux=b.x-a.x,uy=b.y-a.y,uz=b.z-a.z,vx=c.x-a.x,vy=c.y-a.y,vz=c.z-a.z;
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    for(let j=0;j<3;j++){
      const v=triangle[j];v.nx+=nx;v.ny+=ny;v.nz+=nz;
      for(const other of [triangle[(j+1)%3],triangle[(j+2)%3]]){
        const dx=other.x-v.x,dy=other.y-v.y,dz=other.z-v.z;
        v.dx+=dx;v.dy+=dy;v.dz+=dz;v.distance+=Math.hypot(dx,dy,dz);
      }
    }
  }
  for(const v of vertices){
    const x=(v.x-centre.x)/halfWidth,y=(v.y-centre.y)/halfWidth,z=(v.z-centre.z)/halfWidth;
    const ax=Math.abs(x),az=Math.abs(z),length=Math.hypot(v.nx,v.ny,v.nz)||1;
    const curvature=(v.dx*v.nx+v.dy*v.ny+v.dz*v.nz)/(length*Math.max(v.distance,1e-9));
    // Concave joints go plum; convex armour rims receive a light lavender dry-brush.
    const recess=smooth(.025,.22,curvature),edge=smooth(.035,.24,-curvature);
    const machinery=(1-smooth(.16,.21,ax))*smooth(-.43,-.36,y)*(1-smooth(.11,.17,y))*(1-smooth(.105,.15,az));
    const engineVent=smooth(.045,.06,ax)*(1-smooth(.17,.19,ax))*smooth(.08,.105,y)*(1-smooth(.13,.15,y))*(1-smooth(.15,.19,az));
    const colour=HULL.clone().lerp(PLUM,clamp(recess*.68+machinery*.3+engineVent*.55,0,.78));
    colour.lerp(LAVENDER,edge*.32);
    // Thin collars on the paired raised engine pods and circular weapon fittings.
    // Coordinates use the centred STL's half-width and are mirrored on both faces.
    const engineCollar=ax>.055&&ax<.18&&y>.137&&y<.151&&az>.075&&az<.17;
    const weaponRadius=Math.hypot(ax-.242,y+.033);
    const weaponCollar=weaponRadius>.024&&weaponRadius<.031&&az>.035&&az<.06;
    if(engineCollar||weaponCollar)colour.lerp(BRASS,.86);
    // Broad, low-amplitude variation: no speckles or triangle-sized camouflage.
    colour.multiplyScalar(1+.016*Math.sin(ax*7+y*3)*Math.sin(y*6-az*2));
    v.colour=colour;
  }
  const colours=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++){const c=vertices[ids[i]].colour;colours[i*3]=c.r;colours[i*3+1]=c.g;colours[i*3+2]=c.b;}
  geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));
  geometry.userData.vorchanDetailPaint=1;
  return geometry;
}

export function getVorchanMaterial({detailed=false}={}) {
  return new THREE.MeshStandardMaterial({
    color:detailed?'#ffffff':HULL,
    vertexColors:detailed,
    metalness:0.16,
    roughness:0.68,
    side:THREE.DoubleSide,
  });
}
