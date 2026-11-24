import {hullProfile} from './vorchar.mjs';
import {SHUTTLE} from './vorchan-operations.mjs';
// B5W 2E Compendium, Weapons Fire: direction, arcs, LOS, EW and range.
// Pure preview only. Missing SCS arc/LOS facts fail closed, never silently approve fire.
import {hexDistance} from './phases.mjs';
import {ewAttackModifier} from './ew-combat.mjs';
import {VORCHAN_LIBRARY_RECORD as VORCHAN} from './vorchan-trial-library.mjs';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const int=n=>Number.isInteger(n);
const RAD=Math.PI/180;
const xy=p=>({x:Math.sqrt(3)*(p.q+p.r/2),y:1.5*p.r});
const directionAngle=(a,b)=>{const p=xy(a),t=xy(b);return Math.atan2(t.y-p.y,t.x-p.x)*180/Math.PI};
const norm=a=>((a%360)+360)%360;
const delta=(a,b)=>((a-b+540)%360)-180;
// Facing follows movement-rules.mjs: 0 NE (+q,-r), 1 E (+q), 
// 2 SE (+r), 3 SW (-q,+r), 4 W (-q), 5 NW (-r).
export function bearingDegrees(shooter,target,{sameHexPrevious=null}={}){
 if(![shooter?.q,shooter?.r,target?.q,target?.r].every(int))throw new RangeError('Invalid hex coordinates');
 if(shooter.q===target.q&&shooter.r===target.r){
  sameHexPrevious=sameHexPrevious||shooter.sameHexPrevious?.[target.id];
  if(!sameHexPrevious||![sameHexPrevious.shooter?.q,sameHexPrevious.shooter?.r,sameHexPrevious.target?.q,sameHexPrevious.target?.r].every(int))return {requiresChoice:true,reason:'Same-hex fire needs the positions immediately before the last entry'};
  return bearingDegrees(sameHexPrevious.shooter,sameHexPrevious.target);
 }
 return {angle:norm(directionAngle(shooter,target)),requiresChoice:false};
}
export function facingDirections(shooter,target,options={}){
 if(!int(target?.facing)||target.facing<0||target.facing>5)throw new RangeError('Invalid target facing');
 const prev=options.sameHexPrevious||shooter.sameHexPrevious?.[target.id];
 const bearing=bearingDegrees(target,shooter,prev?{sameHexPrevious:{shooter:prev.target,target:prev.shooter}}:{});
 if(bearing.requiresChoice)return bearing;
 const raw=norm(bearing.angle-(-60+target.facing*60));
 const relative=target.private_state?.trial?.movement?.state?.rolled||target.public_state?.rolled?norm(-raw):raw;
 // Forward 60°, port/starboard 120° each, aft 60°.
 const sector=relative<30||relative>330?'forward':relative<150?'starboard':relative<210?'aft':'port';
 const boundary=[30,150,210,330].find(n=>Math.abs(relative-n)<1e-8);
 const choices=boundary===30?['forward','starboard']:boundary===150?['starboard','aft']:boundary===210?['aft','port']:boundary===330?['port','forward']:null;
 if(choices)return {requiresChoice:true,choices,reason:'Defender chooses a boundary direction for all shots from this shooter in this turn',relative};
 return {requiresChoice:false,direction:sector,relative};
}
export function checkMountArc({shooter,target,arc,sameHexPrevious=null}){
 if(!int(shooter?.facing)||shooter.facing<0||shooter.facing>5)throw new RangeError('Invalid shooter facing');
 if(arc?.verified&&arc.coverageDegrees===360)return {allowed:true,verified:true,relative:0,reason:null};
 if(!arc||arc.verified!==true||!finite(arc.start)||!finite(arc.end))return {allowed:false,verified:false,reason:'Original SCS mount firing arc has not been verified'};
 const bearing=bearingDegrees(shooter,target,{sameHexPrevious});
 if(bearing.requiresChoice)return {allowed:false,verified:true,...bearing};
 const raw=norm(bearing.angle-(-60+shooter.facing*60)),relative=shooter.private_state?.trial?.movement?.state?.rolled||shooter.public_state?.rolled?norm(-raw):raw;
 const start=norm(arc.start),end=norm(arc.end);
 const allowed=start<=end?relative>=start-1e-8&&relative<=end+1e-8:relative>=start-1e-8||relative<=end+1e-8;
 return {allowed,verified:true,relative,reason:allowed?null:'Target outside physical weapon arc'};
}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const intersects=(a,b,c,d)=>{const e=1e-9;const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);return ((ab1>=-e&&ab2<=e||ab1<=e&&ab2>=-e)&&(cd1>=-e&&cd2<=e||cd1<=e&&cd2>=-e));};
export function lineOfSight({shooter,target,blockingHexes=[]}){
 if(!Array.isArray(blockingHexes))throw new RangeError('Invalid terrain');
 const a=xy(shooter),b=xy(target);
 for(const h of blockingHexes){
  if(!int(h.q)||!int(h.r))throw new RangeError('Invalid terrain hex');
  if(h.q===shooter.q&&h.r===shooter.r||h.q===target.q&&h.r===target.r)continue;
  const p=xy(h),vertices=Array.from({length:6},(_,i)=>({x:p.x+Math.cos((60*i+90)*RAD),y:p.y+Math.sin((60*i+90)*RAD)}));
  if(vertices.some((v,i)=>intersects(a,b,v,vertices[(i+1)%6])))return {clear:false,blockedBy:{q:h.q,r:h.r}};
 }
 return {clear:true};
}
export function weaponRangePenalty({range,penaltyPerStep,hexesPerStep=1}){
 if(!int(range)||range<0||!int(penaltyPerStep)||penaltyPerStep>0||!int(hexesPerStep)||hexesPerStep<1)throw new RangeError('Invalid range penalty');
 return Math.ceil(range/hexesPerStep)*penaltyPerStep;
}
export function targetFireControlIndex(hullClass){
 if(['capital','heavy_combat','base'].includes(hullClass))return 0;
 if(['medium','light_combat'].includes(hullClass))return 1;
 if(['fighter','shuttle'].includes(hullClass))return 2;
 throw new RangeError('Unverified target hull class');
}
export function vorchanTargetingPreview({shooter,target,mountId,arc,blockingHexes=[],sameHexPrevious=null,defenderDirection=null,attackerOffensiveEW=0,targetDefensiveEW=0,otherModifiers=[],verifiedTerrain=true,rangePenaltyAdjustment=0,elintOffensive=0,elintDefensive=0,disruptedEW=0}){
 if(!shooter||!target||shooter.id===target.id)throw new RangeError('Distinct ships required');
 const shooterHull=hullProfile(shooter.libraryId),targetHull=hullProfile(target.libraryId);
 if(!shooterHull||shooter.hullClass!==shooterHull.class)throw new RangeError('Shooter SCS weapon profile is not verified');
 const mount=shooterHull.weaponMounts.find(m=>m.id===mountId);
 if(!mount)throw new RangeError('Unknown Vorchan mount');
 const weapon=shooterHull.weapons.find(w=>w.id===mount.weaponId);
 const distance=hexDistance(shooter,target);
 const attackArc=checkMountArc({shooter,target,arc:arc??mount.arc,sameHexPrevious});
 const incoming=facingDirections(shooter,target,{sameHexPrevious});
 const direction=incoming.requiresChoice?(incoming.choices?.includes(defenderDirection)?defenderDirection:null):incoming.direction;
 const los=verifiedTerrain?lineOfSight({shooter,target,blockingHexes}):{clear:false,reason:'Terrain and LOS not verified'};
 if(!(target.libraryId===SHUTTLE.id&&target.hullClass==='shuttle')&&(!targetHull||target.hullClass!==targetHull.class))throw new RangeError('Target SCS defence and hull class are not verified');
 const defence=direction?(target.hullClass==='shuttle'?SHUTTLE.defence:targetHull.defence)[direction]:null;
 const fireControl=weapon.fireControl[targetFireControlIndex(target.hullClass)];
 const rangePenalty=weaponRangePenalty({range:distance,penaltyPerStep:weapon.rangePenaltyPerHex-rangePenaltyAdjustment,hexesPerStep:weapon.rangeHexesPerStep||1});
 const ew=ewAttackModifier({attackerOffensive:attackerOffensiveEW,targetDefensive:targetDefensiveEW,rangePenalty});
 if(!Array.isArray(otherModifiers)||otherModifiers.some(x=>!x||!int(x.value)||x.verified!==true||typeof x.reason!=='string'))throw new RangeError('Unverified additional modifier');
 const extra=otherModifiers.reduce((n,m)=>n+m.value,0);
 const total=defence===null?null:defence+fireControl+ew.total+extra+elintOffensive-elintDefensive;
 const blockers=[];
 if(fireControl===null)blockers.push('This weapon can only attack fighters or shuttles');
 if(!attackArc.allowed)blockers.push(attackArc.reason||'Arc decision pending');
 if(!los.clear)blockers.push(los.reason||'Line of sight blocked');
 if(!direction)blockers.push('Defender must choose incoming boundary direction');
 return {readyForHitRoll:blockers.length===0,blockers,mountId,weaponId:weapon.id,distance,attackArc,incoming,chosenDirection:direction,los,breakdown:{baseDefence:defence,rangeStepHexes:weapon.rangeHexesPerStep||1,rangeStepPenalty:(weapon.rangePenaltyPerHex-rangePenaltyAdjustment)*(ew.lockedOn?1:2),elintOffensive,elintDefensive,disruptedEW,distance,rangePerHex:distance?ew.adjustedRangePenalty/distance:weapon.rangePenaltyPerHex-rangePenaltyAdjustment,lockedOn:ew.lockedOn,offensiveEW:ew.offensiveBonus,defensiveEW:ew.defensivePenalty,fireControl,rangePenalty:ew.adjustedRangePenalty,extra,total},hitOnD20AtOrBelow:total};
}
export function resolveToHit(preview,roll){if(!preview?.readyForHitRoll)throw new RangeError('Targeting preview not validated');if(!int(roll)||roll<1||roll>20)throw new RangeError('d20 must be 1–20');return {roll,hit:roll<=preview.hitOnD20AtOrBelow,targetNumber:preview.hitOnD20AtOrBelow,breakdown:preview.breakdown};}
