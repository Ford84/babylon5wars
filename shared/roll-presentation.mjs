// Present saved server results without recalculating hit or damage outcomes.
const signed=n=>n<0?'−'+Math.abs(n):'+'+n;
const term=n=>(n<0?'− ':'+ ')+Math.abs(n);
export function attackCalculation(attack){
 const b=attack.breakdown;if(!b||!Number.isFinite(b.baseDefence))return [];
 let total=b.baseDefence;
 const steps=[`Defence (${total})`];
 const add=(label,value)=>{total+=value;steps.push(`${label} (${total})`);};
 const rangeLabel=b.rangeStepHexes>1?`${signed(b.rangeStepPenalty)} Per ${b.rangeStepHexes} Hexes × ${Math.ceil(b.distance/b.rangeStepHexes)}${b.lockedOn===false?' · No Lock-On':''}`:Number.isFinite(b.rangePerHex)?`${signed(b.rangePerHex)} Per Hex × ${b.distance}${b.lockedOn===false?' · No Lock-On':''}`:`Range ${signed(b.rangePenalty)}`;
 add(rangeLabel,b.rangePenalty);
 add(`OEW ${signed(b.offensiveEW)}${b.disruptedEW?` · ${b.disruptedEW} Disrupted`:``}`,b.offensiveEW);
 if(b.elintOffensive)add(`ELINT OEW ${signed(b.elintOffensive)}`,b.elintOffensive);
 add(`DEW ${signed(b.defensiveEW)}`,b.defensiveEW);
 if(b.elintDefensive)add(`ELINT DEW ${signed(-b.elintDefensive)}`,-b.elintDefensive);
 add(`Fire Control ${signed(b.fireControl)}`,b.fireControl);
 if(b.extra)add(`Condition / Other ${signed(b.extra)}`,b.extra);
 if(attack.intercept?.total)add(`Interception ${signed(attack.intercept.total)}`,attack.intercept.total);
 return steps;
}
export function damageCalculation(result){
 if(!result)return null;
 const {dice,formula:f,range,damage}=result;
 if(!f)return {formula:'Damage Dice',arithmetic:`${dice.join(' + ')} · Total ${damage}`};
 const rangeLoss=range*f.perHex;
 const formula=`${f.count}d${f.sides}${f.bonus?' '+term(f.bonus):''}${f.perHex?' '+term(rangeLoss)+' Range':''}`;
 const adjusted=dice.map(n=>Math.max(1,n-f.damageLoss));
 const arithmetic=`${adjusted.join(' + ')}${f.bonus?' '+term(f.bonus):''}${rangeLoss?' '+term(rangeLoss):''} = ${damage}${result.raw+rangeLoss<0?' (Minimum 0)':''}`;
 return {formula,arithmetic,penalty:f.damageLoss?`Critical Damage: −${f.damageLoss} Per Die, Minimum 1 · Adjusted Dice: ${adjusted.join(', ')}`:null};
}
