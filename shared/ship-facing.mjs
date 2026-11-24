// Facing zero follows axial (+1,-1), through the north-east edge.
export const FACING_NAMES=Object.freeze(['North-East','East','South-East','South-West','West','North-West']);
export const facingLabel=facing=>FACING_NAMES[facing]??'Unknown';
export const facingSVGDegrees=facing=>30+facing*60;
// Three.js positive yaw turns a canonical -Z nose towards -X.
export const facingYawRadians=facing=>-facingSVGDegrees(facing)*Math.PI/180;
