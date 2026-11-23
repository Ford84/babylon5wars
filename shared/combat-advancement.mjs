// Combat-phase advancement guard. A declaration is not a resolved attack.
// This guard is intentionally conservative until the authoritative W4 roll
// journal, W5 SCS mutation and verified interception are integrated.
export function combatAdvancementGuard({declarations=[],resolution=null}={}){
 if(!Array.isArray(declarations))throw new TypeError('Fire declarations must be an array');
 const shots=declarations.flatMap(d=>{
  if(!Array.isArray(d?.fire?.shots))throw new TypeError('Missing committed fire shots');
  return d.fire.shots.filter(s=>s.role==='offensive');
 });
 if(shots.length===0)return {allowed:true,reason:null,offensiveShots:0};
 // A caller cannot mark an attack resolved by supplying arbitrary client data.
 // Only a future server-side, durable and verified combat journal can unlock this.
 return {allowed:false,reason:'Combat resolution pending: offensive attacks require saved player rolls, interception and persisted SCS damage before advancing.',offensiveShots:shots.length};
}
