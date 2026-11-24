export const hexWorld=(q,r)=>({x:Math.sqrt(3)*12*(q+r/2),z:18*r});
export function mapCameraTarget(view,ships,columns,rows){
 const ship=ships.find(s=>s.id===view.focusId&&Number.isInteger(s.q)&&Number.isInteger(s.r)&&s.q>=0&&s.q<columns&&s.r>=0&&s.r<rows);
 const p=ship?hexWorld(ship.q,ship.r):hexWorld((columns-1)/2,(rows-1)/2);
 return {x:p.x+view.panX,z:p.z+view.panZ};
}
