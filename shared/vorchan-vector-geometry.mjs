// Transcribed from the vector rectangles in vorchan_source.pdf (Version 3: 2E/SF).
// PDF page size 612 x 792 pt. Each box has a 6.75 x 6.75 pt bounding rectangle.
// Source contained 602 drawing paths for 301 distinct rectangles (fill + outline).
// 20 rectangles belong to the separate shuttle/hangar reference panel.
const run=(x,y,n,step=6.75)=>Array.from({length:n},(_,i)=>[Math.round((x+i*step)*100)/100,y]);
const rows=(data)=>data.flatMap(([y,...groups])=>groups.flatMap(([x,n])=>run(x,y,n)));
export const VORCHAN_VECTOR_BOXES=Object.freeze({
 hangar_reference:rows([[208,[405,10]],[217,[405,10]]]),
 retro:rows([[250.75,[294.25,5]],[257.5,[294.25,5]]]),
 plasma_port:rows([[291.25,[274.5,3]],[298,[274.5,3]]]),
 plasma_starboard:rows([[291.25,[326.25,3]],[298,[326.25,3]]]),
 forward_structure:rows([[313.75,[303.75,2]],[320.5,[303.75,2]],[327.25,[303.75,2]],[334,[297,4]],[340.75,[297,4]],[347.5,[290.25,6]],[354.25,[290.25,6]],[361,[283.5,8]],[367.75,[283.5,8]],[374.5,[283.5,2],[324,2]],[381.25,[283.5,1],[330.75,1]]]),
 twin_forward_port:rows([[410.5,[219.25,5]],[417.25,[219.25,5]]]),
 twin_forward_starboard:rows([[410.5,[367.75,5]],[417.25,[367.75,5]]]),
 unassigned_hangar_region:rows([[455.5,[297,4]],[462.25,[297,4]],[469,[297,4]],[475.75,[297,4]],[482.5,[297,4]]]),
 engine:rows([[492.25,[238.5,3]],[499,[231.75,5]],[505.75,[238.5,3]]]),
 sensors:rows([[494.87,[363.25,2]],[501.37,[353.25,5]],[508.12,[353.25,5]]]),
 unassigned_reactor_region:rows([[505,[293.5,5]],[511.75,[293.5,5]],[518.5,[293.5,5]],[525.25,[293.5,5]],[532,[293.5,5]],[538.75,[300.25,3]]]),
 primary_structure_port:rows([[536.5,[246.5,1]],[543.25,[233,5]],[550,[233,5]],[556.75,[246.5,1]]]),
 command:rows([[543.25,[364.5,2]]]),
 port_thrust:rows([[547.91,[121.5,3]],[554.66,[121.5,3]],[561.41,[121.5,3]],[568.16,[121.5,3]],[574.91,[121.5,3]]]),
 starboard_thrust:rows([[550.66,[474.75,3]],[557.41,[474.75,3]],[564.16,[474.75,3]],[570.91,[474.75,3]],[577.66,[474.75,3]]]),
 aft_structure:rows([[604,[162,44]]]),
 aft_port_thrust:rows([[644.5,[209.75,4]],[651.25,[209.75,4]]]),
 aft_starboard_thrust:rows([[644.5,[383,4]],[651.25,[383,4]]]),
 jump_drive:rows([[635.5,[297.12,4,6.753333]],[642.25,[297.12,4,6.753333]],[649,[297.12,4,6.753333]],[655.75,[297.12,4,6.753333]]])
});
export const VORCHAN_VECTOR_AUDIT=Object.freeze({
 source:'vorchan_source.pdf',page:1,pageWidth:612,pageHeight:792,
 rectSize:6.75,drawnPaths:602,uniqueRectangles:301,
 excludedReferenceRectangles:20,
 // Some tracks differ from earlier hand-transcribed counts. Never silently
 // replace the rules library until verified against the printed diagram.
 status:'geometry transcribed; hangar and reactor region boxes quarantined pending correct individual mapping'
});
export function auditVorchanVectorBoxes(){
 const all=Object.values(VORCHAN_VECTOR_BOXES).flat();
 const unique=new Set(all.map(([x,y])=>x+':'+y));
 return {count:all.length,unique:unique.size,reference:VORCHAN_VECTOR_BOXES.hangar_reference.length,ship:all.length-VORCHAN_VECTOR_BOXES.hangar_reference.length,valid:all.length===301&&unique.size===301};
}
