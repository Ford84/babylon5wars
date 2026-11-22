// Phase registry: Kitchen Sink Appendix A, p.286. Specialist steps are placeholders,
// NOT yet automatically resolved. Rules authority: official compendium by default.
// Appendix A of the Kitchen Sink lists the complete tactical turn segments.
// This is a procedural checklist, NOT a claim that specialist rules auto-resolve.
export const PHASE_PROCEDURES = Object.freeze({
  "power": [
    "Resolve reactor shortages and system deactivation",
    "Allocate extra power, recharge and special system adjustments",
    "Announce inactive systems and shields"
  ],
  "initiative": [
    "Complete hangar reloading preparations",
    "Roll initiative for each unit and resolve opposing ties"
  ],
  "ew_commit": [
    "Secretly allocate electronic warfare and ballistic launches",
    "Declare fighter missions, defensive modes and special sensor functions"
  ],
  "ew_reveal": [
    "Reveal committed EW, ballistic launch targets and fighter missions after all players lock"
  ],
  "jump": [
    "Declare jump point formation and phasing-drive activation"
  ],
  "terrain_pre": [
    "Apply hyperspace currents and other pre-movement terrain effects"
  ],
  "movement": [
    "Apply roll/pivot starting changes and derelict motion",
    "Move each eligible unit in individual initiative order",
    "Resolve movement-triggered effects and interactions"
  ],
  "terrain_post": [
    "Apply post-movement terrain effects"
  ],
  "weapon_movement": [
    "Resolve weapon-induced movement and turning"
  ],
  "combat_pivot": [
    "Perform fighter combat pivots and base rotation"
  ],
  "recovery": [
    "Recover escape pods and derelict fighters; attach breaching pods"
  ],
  "ccew_commit": [
    "Secretly assign close-combat EW targets"
  ],
  "ccew_reveal": [
    "Reveal close-combat EW allocations after all players commit"
  ],
  "ramming": [
    "Resolve ramming attempts and transverse-drive activation"
  ],
  "fire_commit": [
    "Secretly determine fire, targets, attack order and reserve defensive guns"
  ],
  "fire_reveal": [
    "Reveal simultaneous fire declarations after all players commit; assign defensive guns afterwards"
  ],
  "fire_resolution": [
    "Reveal fire and assign reserved defensive guns before any rolls; resolve ballistic impacts",
    "Resolve ship weapon fire",
    "Resolve fighter-versus-fighter fire and drop-out",
    "Resolve fighter-versus-ship and remaining weapon fire"
  ],
  "marine": [
    "Determine and resolve marine attacks"
  ],
  "criticals": [
    "Determine critical hits and associated effects",
    "Apply destroyed-structure effects and armour degradation"
  ],
  "vortex": [
    "Activate or close jump points and resolve expiring field effects"
  ],
  "hangar": [
    "Resolve fighter and shuttle launch, landing and recovery",
    "Complete remaining hangar operations"
  ],
  "links": [
    "Resolve tractor-beam, cargo and pod attachment or release"
  ],
  "adjust": [
    "Adjust ship systems for damage, repairs and power",
    "Resolve remaining end-of-turn system effects"
  ]
});
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
].map(phase => Object.freeze({...phase, procedures: Object.freeze(PHASE_PROCEDURES[phase.id] || []), adjudication: phase.mode === 'automatic' ? 'barrier' : 'manual-until-rule-verified'}));
export const phaseById = id => PHASES.find(p=>p.id===id);
export function nextPhase(id){const n=PHASES.findIndex(p=>p.id===id);if(n<0)throw Error('Unknown phase');return {phase:PHASES[(n+1)%PHASES.length],newTurn:n===PHASES.length-1};}
export function hexDistance(a,b){const dq=a.q-b.q,dr=a.r-b.r;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;}
export function validateFacing(n){return Number.isInteger(n)&&n>=0&&n<6;}
export function publicOrder(order,phaseId,viewerId){const p=phaseById(phaseId);if(!p)throw Error('Unknown phase');return !p.secret||order.player_id===viewerId?order:null;}