// Verified from the original Vorchan Version 3: 2E/SF control-sheet diagram.
// One printed small square equals one damage box. Circled numbers give armour;
// numbers INSIDE the device icon give weapon/hangar/special values, not armour.
// Weapon mounts are counted from individual ship diagram symbols, not weapon datacards or power diamonds.
export const VORCHAN_SCS_IDENTIFICATION=Object.freeze({
 source:{publication:'Centauri Vorchan Warship',revision:'Version 3: 2E/SF',page:'1',basis:'original printed diagram'},
 sections:['forward','primary','aft','port','starboard'],
 systems:[
  {id:'retro',kind:'thruster',section:'forward',armour:4,boxes:5,rows:[5],iconValue:null,verified:true},
  {id:'forward_port_thrust',kind:'thruster',section:'forward',armour:null,boxes:null,rows:[],iconValue:2,verified:false},
  {id:'twin_nose_port',kind:'weapon',section:'forward',armour:3,boxes:6,rows:[3,3],weaponCardId:'twin-array',mountNumber:2,verified:true},
  {id:'forward_starboard_thrust',kind:'thruster',section:'forward',armour:null,boxes:null,rows:[],iconValue:3,verified:false},
  {id:'twin_nose_starboard',kind:'weapon',section:'forward',armour:3,boxes:6,rows:[3,3],weaponCardId:'twin-array',mountNumber:3,verified:true},
  {id:'plasma_forward',kind:'weapon',section:'forward',armour:4,boxes:8,rows:[4,4],weaponCardId:'plasma-accelerator',mountNumber:1,verified:true},
  {id:'forward_structure',kind:'structure',section:'forward',armour:5,boxes:48,rows:[2,2,2,4,4,6,6,8,8,4,2],verified:true},
  {id:'jump_forward_port',kind:'jump-engine',section:'forward',armour:5,boxes:10,rows:[5,5],verified:true},
  {id:'jump_forward_starboard',kind:'jump-engine',section:'forward',armour:5,boxes:10,rows:[5,5],verified:true},
  {id:'hangar',kind:'hangar',section:'primary',armour:6,boxes:2,rows:[2],iconValue:2,verified:true},
  {id:'engine',kind:'engine',section:'primary',armour:7,boxes:11,rows:[3,5,3],iconValue:10,verified:true},
  {id:'reactor',kind:'reactor',section:'primary',armour:6,boxes:20,rows:[4,4,4,4,4],iconValue:4,verified:true},
  {id:'sensors',kind:'sensor',section:'primary',armour:7,boxes:12,rows:[2,5,5],verified:true},
  {id:'command',kind:'command',section:'primary',armour:6,boxes:12,rows:[1,5,5,1],verified:true},
  {id:'primary_structure',kind:'structure',section:'primary',armour:6,boxes:28,rows:[5,5,5,5,5,3],verified:true},
  {id:'port_thrust',kind:'thruster',section:'port',armour:5,boxes:12,rows:[2,2,2,2,2,2],iconValue:5,verified:true},
  {id:'starboard_thrust',kind:'thruster',section:'starboard',armour:5,boxes:12,rows:[2,2,2,2,2,2],iconValue:5,verified:true},
  {id:'aft_structure',kind:'structure',section:'aft',armour:4,boxes:44,rows:[44],verified:true},
  {id:'aft_port_thrust',kind:'thruster',section:'aft',armour:4,boxes:8,rows:[4,4],iconValue:5,verified:true},
  {id:'aft_starboard_thrust',kind:'thruster',section:'aft',armour:4,boxes:8,rows:[4,4],iconValue:5,verified:true},
  {id:'jump_aft_centre',kind:'jump-engine',section:'aft',armour:6,boxes:16,rows:[4,4,4,4],verified:true}
 ],
 weapons:[{id:'plasma-accelerator',printedMounts:1},{id:'twin-array',printedMounts:2}],
 completeness:{allSystemsLocated:false,allArmourIdentified:false,allDamageBoxesCounted:false,allWeaponArcsIdentified:false,sensorStrengthVerified:false,freeThrustVerified:true}
});
export function auditVorchanIdentification(){
 const s=VORCHAN_SCS_IDENTIFICATION.systems;
 const issues=[];
 if(s.some(x=>!x.verified))issues.push('SCS contains unverified system identification; do not enable automatic combat');
 for(const sys of s){
  if(sys.verified&&(!Number.isInteger(sys.boxes)||sys.rows.reduce((a,b)=>a+b,0)!==sys.boxes))issues.push(sys.id+': damage box mismatch');
  if(sys.verified&&!Number.isInteger(sys.armour))issues.push(sys.id+': armour missing');
 }
 if(!VORCHAN_SCS_IDENTIFICATION.completeness.allSystemsLocated)issues.push('Not all SCS systems have been independently located');
 if(!VORCHAN_SCS_IDENTIFICATION.completeness.allArmourIdentified)issues.push('Armour verification is incomplete');
 if(!VORCHAN_SCS_IDENTIFICATION.completeness.allDamageBoxesCounted)issues.push('Damage-box verification is incomplete');
 if(!VORCHAN_SCS_IDENTIFICATION.completeness.allWeaponArcsIdentified)issues.push('Weapon-arc verification is incomplete');
 return {systems:s.length,verifiedTracks:s.filter(x=>x.verified).length,unverifiedTracks:s.filter(x=>!x.verified).map(x=>x.id),issues,readyForCombat:issues.length===0&&s.every(x=>x.verified)&&VORCHAN_SCS_IDENTIFICATION.completeness.allWeaponArcsIdentified};
}
