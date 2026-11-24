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
 const states=Object.fromEntries(ships.map(s=>[s.id,structuredClone(initialDamage[s.id]||initialVorchanDamage())]));
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
  const rolledDamage=rollVorchanDamage({mountId:shot.mountId,chargeTurns:shot.chargeTurns??3,dice:rolled.damageDice,range:hexDistance(shooter,target),mode:shot.mode||'Standard',damageLoss:shooter.private_state?.trial?.condition?.effects?.weapons?.[shot.mountId]?.damageLoss||0});
  const side=['port','starboard'].includes(incoming);
  const relative=direction.relative;
  const automaticSide=side&&Math.abs(relative-90)>1e-8&&Math.abs(relative-270)>1e-8?(relative<90||relative>270?'forward':'aft'):null;
  const sideChoice=automaticSide||choice.sideChoice||null;
  const location=rolled.primaryRoll;
  const eligibleSystemIds=side&&location>=8&&location<=10?[incoming==='port'?'port_thrust':'starboard_thrust']:null;
  const result=applyVorchanStandardVolley({state:states[target.id],damage:rolledDamage.damage,plasma:rolledDamage.plasma,incoming,locationRoll:rolled.locationRoll,primaryRoll:rolled.primaryRoll,sideChoice,systemChoice:choice.systemChoice??null,eligibleSystemIds});
  if(result.requiresChoice){pending.push({attackId:shot.id,type:result.choiceType,choices:result.choices||[]});break}
  states[target.id]=result.state;
  outcomes.push({attackId:shot.id,targetId:target.id,damage:rolledDamage.damage,hit:result.hit,trace:result.trace,shipDestroyed:result.state.shipDestroyed});
 }
 return {simultaneousTier:'ship',states,outcomes,pending,complete:pending.length===0&&attacks.every(a=>a.blockers?.length===0),criticalChecksDeferred:true};
}
