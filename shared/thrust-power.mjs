// Source: 2E Rules Compendium, Engines > Power and Thrust.
// The engine efficiency ratio is power per purchased point of thrust.
export function extraThrustPowerCost(points,efficiency){
 if(!Number.isInteger(points)||points<0)throw new RangeError('Invalid purchased thrust');
 const ratio=Number.isInteger(efficiency)?{numerator:efficiency,denominator:1}:efficiency;
 if(!ratio||!Number.isInteger(ratio.numerator)||!Number.isInteger(ratio.denominator)||ratio.numerator<1||ratio.denominator<1)throw new RangeError('Invalid SCS engine efficiency');
 return {purchasedThrust:points,requiredPower:Math.ceil(points*ratio.numerator/ratio.denominator),ratio};
}
