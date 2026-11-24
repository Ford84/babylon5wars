import {hullProfile} from './vorchar.mjs';
// W8: deterministic same-tier Vorchan damage reducer. This is a pure
// adjudicator: no dice generation, no DB writes, and no invented defender
// choices. The server must persist its input and result atomically.
import {initialVorchanDamage,applyVorchanStandardVolley,rollVorchanDamage} from './vorchan-damage.mjs';
import {facingDirections} from './weapon-targeting.mjs';
import {attackId} from './weapon-resolution.mjs';
import {hexDistance} from './phases.mjs';
export function adjudicateVorchanShipTier({ships,attacks,rollJournal,defenderChoices={},initialDamage={}}){
 if(!Array.isArray(ships)||!Array.isArray(attacks)||!Array.isArray(rollJournal))throw new RangeError('Tier inputs required');
 const byId=new Map(ships.map(s=>[s.id,s]));
 const dice=new Map(rollJournal.map(r=>[r.attackId,r]));
 const states=Object.fromEntries(ships.map(s=>[s.id,structuredClone(initialDamage[s.id]||(s.kind==='shuttle'?{shuttleDamage:s.damage,shipDestroyed:s.damage>=10}:initialVorchanDamage(s.public_state?.libraryId)))]));
 const outcomes=[],pending=[];
 const shots=attacks.filter(a=>a.hit===true).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
 for(const shot of shots){
  const shooter=byId.get(shot.shipId),target=byId.get(shot.targetId),rolled=dice.get(shot.id);
  if(!shooter||!target||!rolled)throw new RangeError('Missing immutable tier snapshot or player dice');
  if(states[target.id].shipDestroyed){outcomes.push({attackId:shot.id,alreadyDestroyed:true});continue}
  const direction=facingDirections(shooter,target,{sameHexPrevious:shooter.sameHexPrevious?.[target.id]});
  const choice=defenderChoices[shot.id]||{};
  const incoming=direction.requiresChoice?choice.incoming:direction.direction;
  if(!incoming||direction.requiresChoice&&!direction.choices?.includes(incoming)){
   pending.push({attackId:shot.id,type:'incoming',choices:direction.choices||[]});break;
  }
  const rolledDamage=rollVorchanDamage({libraryId:shooter.private_state?.trial?.libraryId||shooter.public_state?.libraryId,mountId:shot.mountId,chargeTurns:shot.chargeTurns??3,dice:rolled.damageDice,range:hexDistance(shooter,target),mode:shot.mode||'Standard',damageLoss:shooter.private_state?.trial?.condition?.effects?.weapons?.[shot.mountId]?.damageLoss||0});
  if(target.kind==='shuttle'){const marked=Math.min(10,states[target.id].shuttleDamage+rolledDamage.damage);const trace=[{systemId:'shuttle_hull',armour:0,marked:marked-states[target.id].shuttleDamage,destroyed:marked===10}];states[target.id]={shuttleDamage:marked,shipDestroyed:marked===10};outcomes.push({attackId:shot.id,targetId:target.id,damage:rolledDamage.damage,trace,shipDestroyed:marked===10});continue;}
  if(rolledDamage.plasmaStream&&target.kind!=='shuttle'){
   let state=states[target.id];const trace=[];
   if(!Array.isArray(rolled.subVolleys)||rolled.subVolleys.length>Math.ceil(rolledDamage.damage/5))throw new RangeError('Recorded plasma stream sub-volleys required');
   for(let i=0;i<rolled.subVolleys.length&&!state.shipDestroyed;i++){
    const v=rolled.subVolleys[i],result=applyVorchanStandardVolley({state,damage:Math.min(5,rolledDamage.damage-i*5),plasma:true,plasmaStream:true,incoming,locationRoll:v.locationRoll,primaryRoll:v.primaryRoll??null,sideChoice:v.sideChoice,systemChoice:v.systemChoice,eligibleSystemIds:hullProfile(target.public_state?.libraryId)?.hitCharts.primary.find(([min,max])=>v.primaryRoll>=min&&v.primaryRoll<=max)?.[2]==='side_thrust'&&['port','starboard'].includes(incoming)?[incoming==='port'?'port_thrust':'starboard_thrust']:null});
    if(result.requiresChoice)throw new RangeError('Incomplete recorded raking choice');state=result.state;trace.push(...result.trace);
   }
   if(!state.shipDestroyed&&rolled.subVolleys.length!==Math.ceil(rolledDamage.damage/5))throw new RangeError('Incomplete plasma stream journal');
   states[target.id]=state;outcomes.push({attackId:shot.id,targetId:target.id,damage:rolledDamage.damage,trace,shipDestroyed:state.shipDestroyed});continue;
  }
  const side=['port','starboard'].includes(incoming);
  const relative=direction.relative;
  const automaticSide=side&&Math.abs(relative-90)>1e-8&&Math.abs(relative-270)>1e-8?(relative<90||relative>270?'forward':'aft'):null;
  const sideChoice=automaticSide||choice.sideChoice||null;
  const location=rolled.primaryRoll;
  const eligibleSystemIds=side&&hullProfile(target.public_state?.libraryId||target.private_state?.trial?.libraryId)?.hitCharts.primary.find(([min,max])=>location>=min&&location<=max)?.[2]==='side_thrust'?[incoming==='port'?'port_thrust':'starboard_thrust']:null;
  const result=applyVorchanStandardVolley({state:states[target.id],damage:rolledDamage.damage,plasma:rolledDamage.plasma,matter:rolledDamage.matter,plasmaStream:rolledDamage.plasmaStream,incoming,locationRoll:rolled.locationRoll,primaryRoll:rolled.primaryRoll,sideChoice,systemChoice:choice.systemChoice??null,eligibleSystemIds});
  if(result.requiresChoice){pending.push({attackId:shot.id,type:result.choiceType,choices:result.choices||[]});break}
  states[target.id]=result.state;
  outcomes.push({attackId:shot.id,targetId:target.id,damage:rolledDamage.damage,hit:result.hit,trace:result.trace,shipDestroyed:result.state.shipDestroyed});
 }
 return {simultaneousTier:'ship',states,outcomes,pending,complete:pending.length===0&&attacks.every(a=>a.blockers?.length===0),criticalChecksDeferred:true};
}
