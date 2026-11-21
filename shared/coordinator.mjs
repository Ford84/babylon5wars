import {PHASES,phaseById,nextPhase} from './phases.mjs';
export const requiredPlayers=(phase,members,completed=[])=>{
 if(phase.mode==='automatic')return [];
 const ordered=[...members].sort((a,b)=>(a.initiative_rank??999)-(b.initiative_rank??999)||a.user_id.localeCompare(b.user_id));
 if(phase.mode==='ordered')return ordered.filter(m=>!completed.includes(m.user_id)).slice(0,1).map(m=>m.user_id);
 return members.filter(m=>!completed.includes(m.user_id)).map(m=>m.user_id);
};
export const phaseProgress=(phase,members,completed=[])=>({required:requiredPlayers(phase,members,completed),complete:members.length>0&&members.every(m=>completed.includes(m.user_id))});
export function followingPhase(id,turn){let p=nextPhase(id),steps=0;while(p.phase.mode==='automatic'&&steps++<PHASES.length){const next=nextPhase(p.phase.id);p={phase:next.phase,newTurn:p.newTurn||next.newTurn};}return {phase:p.phase,turn:turn+(p.newTurn?1:0)};}
export function canSubmit(phase,members,completed,playerId){return !completed.includes(playerId)&&requiredPlayers(phase,members,completed).includes(playerId);}
export function safeShip(ship,viewerId){const {private_state_json,...publicFields}=ship;return {...publicFields,public_state:JSON.parse(ship.public_state_json||'{}'),private_state:ship.owner_id===viewerId?JSON.parse(private_state_json||'{}'):undefined,public_state_json:undefined};}