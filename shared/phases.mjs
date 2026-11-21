// Phase registry: Kitchen Sink Appendix A, p.286. Specialist steps are placeholders,
// NOT yet automatically resolved. Rules authority: official compendium by default.
export const PHASES = [
  {id:'power',group:'initial',label:'Ship Power',mode:'all',secret:false},
  {id:'initiative',group:'initial',label:'Initiative',mode:'all',secret:false},
  {id:'ew_commit',group:'initial',label:'EW and Ballistic Orders — Secret Commit',mode:'all',secret:true},
  {id:'ew_reveal',group:'initial',label:'EW and Ballistic Orders — Reveal',mode:'automatic',secret:false},
  {id:'jump',group:'initial',label:'Jump Point Formation',mode:'all',secret:false},
  {id:'terrain_pre',group:'movement',label:'Pre-Movement Terrain Effects',mode:'all',secret:false},
  {id:'movement',group:'movement',label:'Movement',mode:'ordered',secret:false},
  {id:'terrain_post',group:'movement',label:'Post-Movement Terrain Effects',mode:'all',secret:false},
  {id:'weapon_movement',group:'movement',label:'Weapon-Based Movement',mode:'all',secret:false},
  {id:'combat_pivot',group:'movement',label:'Combat Pivot',mode:'all',secret:false},
  {id:'recovery',group:'movement',label:'Recovery',mode:'all',secret:false},
  {id:'ccew_commit',group:'movement',label:'Close Combat EW — Secret Commit',mode:'all',secret:true},
  {id:'ccew_reveal',group:'movement',label:'Close Combat EW — Reveal',mode:'automatic',secret:false},
  {id:'ramming',group:'movement',label:'Ramming',mode:'all',secret:false},
  {id:'fire_commit',group:'combat',label:'Fire Determination — Secret Commit',mode:'all',secret:true},
  {id:'fire_reveal',group:'combat',label:'Fire Determination — Reveal',mode:'automatic',secret:false},
  {id:'fire_resolution',group:'combat',label:'Fire Resolution',mode:'all',secret:false},
  {id:'marine',group:'end',label:'Marine Attack',mode:'all',secret:false},
  {id:'criticals',group:'end',label:'Critical Hits',mode:'all',secret:false},
  {id:'vortex',group:'end',label:'Vortex Activation/Closure',mode:'all',secret:false},
  {id:'hangar',group:'end',label:'Hangar Operations',mode:'all',secret:false},
  {id:'links',group:'end',label:'Link/Unlink',mode:'all',secret:false},
  {id:'adjust',group:'end',label:'Adjust Ship Systems',mode:'all',secret:false},
];
export const phaseById = id => PHASES.find(p=>p.id===id);
export function nextPhase(id){const n=PHASES.findIndex(p=>p.id===id);if(n<0)throw Error('Unknown phase');return {phase:PHASES[(n+1)%PHASES.length],newTurn:n===PHASES.length-1};}
export function hexDistance(a,b){const dq=a.q-b.q,dr=a.r-b.r;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;}
export function validateFacing(n){return Number.isInteger(n)&&n>=0&&n<6;}
export function publicOrder(order,phaseId,viewerId){const p=phaseById(phaseId);if(!p)throw Error('Unknown phase');return !p.secret||order.player_id===viewerId?order:null;}