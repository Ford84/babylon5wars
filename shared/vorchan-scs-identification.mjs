// Verified from the original Vorchan Version 3: 2E/SF control-sheet diagram.
// One printed small square equals one damage box. Circled numbers give armour;
// numbers INSIDE the device icon give weapon/hangar/special values, not armour.
// Complex structure tracks are retained as uncounted until verified box-by-box.
export const VORCHAN_SCS_IDENTIFICATION=Object.freeze({
 source:{publication:'Centauri Vorchan Warship',revision:'Version 3: 2E/SF',page:'1',basis:'original printed diagram'},
 sections:['forward','primary','aft','port','starboard'],
 systems:[
  {id:'retro',kind:'thruster',section:'forward',armour:4,boxes:10,rows:[5,5],iconValue:null,verified:true},
  {id:'plasma_port',kind:'weapon',section:'forward',armour:3,boxes:6,rows:[3,3],weaponCardId:'plasma_accelerator',verified:true},
  {id:'plasma_starboard',kind:'weapon',section:'forward',armour:3,boxes:6,rows:[3,3],weaponCardId:'plasma_accelerator',verified:true},
  {id:'forward_structure',kind:'structure',section:'forward',armour:5,boxes:48,rows:null,verified:false},
  {id:'twin_forward_port',kind:'weapon',section:'forward',armour:5,boxes:10,rows:[5,5],weaponCardId:'twin_array',iconValue:3,verified:true},
  {id:'twin_forward_starboard',kind:'weapon',section:'forward',armour:5,boxes:10,rows:[5,5],weaponCardId:'twin_array',iconValue:3,verified:true},
  {id:'hangar',kind:'hangar',section:'primary',armour:6,boxes:2,rows:[2],iconValue:2,verified:true},
  {id:'engine',kind:'engine',section:'primary',armour:7,boxes:11,rows:[3,5,3],iconValue:10,verified:true},
  {id:'reactor',kind:'reactor',section:'primary',armour:6,boxes:12,rows:[1,5,5,1],verified:true},
  {id:'sensors',kind:'sensor',section:'primary',armour:7,boxes:12,rows:[2,5,5],verified:true},
  {id:'command',kind:'command',section:'primary',armour:6,boxes:2,rows:[2],iconValue:2,verified:true},
  {id:'primary_structure',kind:'structure',section:'primary',armour:6,boxes:28,rows:null,verified:false},
  {id:'port_thrust',kind:'thruster',section:'port',armour:5,boxes:15,rows:[3,3,3,3,3],iconValue:5,verified:true},
  {id:'starboard_thrust',kind:'thruster',section:'starboard',armour:5,boxes:12,rows:[2,2,2,2,2,2],iconValue:5,verified:true},
  {id:'aft_structure',kind:'structure',section:'aft',armour:4,boxes:44,rows:null,verified:false},
  {id:'aft_port_thrust',kind:'thruster',section:'aft',armour:4,boxes:8,rows:[4,4],iconValue:5,verified:true},
  {id:'aft_starboard_thrust',kind:'thruster',section:'aft',armour:4,boxes:8,rows:[4,4],iconValue:5,verified:true},
  {id:'jump_drive',kind:'other',section:'aft',armour:6,boxes:16,rows:[4,4,4,4],verified:true}
 ],
 weapons:[{id:'plasma_accelerator',printedMounts:2},{id:'twin_array',printedMounts:2}],
 completeness:{allSystemsLocated:true,allArmourIdentified:true,allDamageBoxesCounted:false,allWeaponArcsIdentified:false,sensorStrengthVerified:false,freeThrustVerified:false}
});
export function auditVorchanIdentification(){
 const s=VORCHAN_SCS_IDENTIFICATION.systems;
 const issues=[];
 for(const sys of s){
  if(sys.verified&&(!Number.isInteger(sys.boxes)||sys.rows.reduce((a,b)=>a+b,0)!==sys.boxes))issues.push(sys.id+': damage box mismatch');
  if(!Number.isInteger(sys.armour))issues.push(sys.id+': armour missing');
 }
 return {systems:s.length,verifiedTracks:s.filter(x=>x.verified).length,unverifiedTracks:s.filter(x=>!x.verified).map(x=>x.id),issues,readyForCombat:issues.length===0&&s.every(x=>x.verified)&&VORCHAN_SCS_IDENTIFICATION.completeness.allWeaponArcsIdentified};
}
