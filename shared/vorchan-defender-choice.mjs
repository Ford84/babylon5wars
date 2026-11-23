// Validate defender-controlled damage allocation independently of the UI.
// Never allow a shooter to choose the defender's hull/system.
import {vorchanHitToken} from './vorchan-damage.mjs';
export function validateVorchanDamageChoice({playerId,ships,attacks,rollJournal,attackId,choice}){
 if(typeof playerId!=='string'||typeof attackId!=='string'||!choice||typeof choice!=='object'||Array.isArray(choice))throw new RangeError('Invalid defender choice');
 const attack=attacks.find(a=>a.id===attackId),target=ships.find(s=>s.id===attack?.targetId);
 if(!attack||!target||target.owner_id!==playerId)throw new RangeError('Only the defender may allocate this attack');
 if(attack.hit!==true||attack.blockers?.length)throw new RangeError('Attack is not a verified hit');
 const rolled=rollJournal.find(r=>r.attackId===attackId);
 if(!rolled)throw new RangeError('Server dice not committed');
 const allowed=new Set(['incoming','sideChoice','systemChoice']);
 if(Object.keys(choice).some(k=>!allowed.has(k)))throw new RangeError('Unknown defender choice');
 if(choice.incoming!==undefined&&!['forward','aft','port','starboard'].includes(choice.incoming))throw new RangeError('Invalid incoming direction');
 if(choice.sideChoice!==undefined&&!['forward','aft'].includes(choice.sideChoice))throw new RangeError('Invalid side hit chart choice');
 const incoming=choice.incoming;
 if(!incoming)throw new RangeError('Defender incoming direction required');
 const hit=vorchanHitToken({incoming,locationRoll:rolled.locationRoll,primaryRoll:rolled.primaryRoll,sideChoice:choice.sideChoice??null});
 if(hit.requiresChoice)return {accepted:true,pending:hit.choiceType,choices:hit.choices||[]};
 if(choice.systemChoice!==undefined&&!hit.candidates.includes(choice.systemChoice))throw new RangeError('System not on hit location chart');
 return {accepted:true,hit,choice:{...choice}};
}
