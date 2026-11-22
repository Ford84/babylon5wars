// Rules Compendium: Pre-Turn Allocations > Allocation of EW Points.
// An EW point is assigned per enemy unit (per flight for fighters/shuttles).
export function validateEWAllocation({available,defensive=0,offensive={}}){
 if(!Number.isInteger(available)||available<0||!Number.isInteger(defensive)||defensive<0||!offensive||Array.isArray(offensive)||typeof offensive!=='object')throw new RangeError('Invalid EW allocation');
 let spent=defensive;
 for(const [target,points] of Object.entries(offensive)){
  if(!target||!Number.isInteger(points)||points<0)throw new RangeError('Invalid target EW');
  spent+=points;
 }
 if(spent>available)throw new RangeError('EW allocation exceeds available pool');
 return {available,spent,unspent:available-spent,defensive,offensive:{...offensive}};
}
export function ewAttackModifier({attackerOffensive=0,targetDefensive=0,rangePenalty=0}){
 if(![attackerOffensive,targetDefensive,rangePenalty].every(Number.isInteger)||attackerOffensive<0||targetDefensive<0||rangePenalty>0)throw new RangeError('Invalid EW or range penalty');
 const lockedOn=attackerOffensive>0;
 return {lockedOn,offensiveBonus:attackerOffensive,defensivePenalty:-targetDefensive,
  adjustedRangePenalty:rangePenalty*(lockedOn?1:2),
  total:attackerOffensive-targetDefensive+rangePenalty*(lockedOn?1:2)};
}
