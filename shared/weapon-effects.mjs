// Presentation only. Server hit/damage outcomes never depend on animation timing.
export function weaponEffects(event){
 return (event?.public?.attacks||event?.attacks||[]).filter(a=>a.from&&a.to&&[a.from.q,a.from.r,a.to.q,a.to.r].every(Number.isFinite)).map((a,i)=>({...a,delay:i*140,duration:620,colour:a.effect==='plasma'?'#9eff78':['beam','laser'].includes(a.effect)?'#ff846f':'#8ce8ff'}));
}
export function sampleWeaponEffect(effect,elapsed){
 const age=elapsed-effect.delay,t=Math.max(0,Math.min(1,age/effect.duration));
 return {visible:age>=0&&age<effect.duration+420,t,tail:Math.max(0,t-.2),impact:effect.hit&&age>=effect.duration?Math.max(0,1-(age-effect.duration)/420):0};
}
export const weaponPlaybackDuration=effects=>Math.max(0,...effects.map(e=>e.delay+e.duration+420));
