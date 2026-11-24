import React from 'react';
import {attackCalculation,damageCalculation} from '../shared/roll-presentation.mjs';
export function AttackRollResult({attack:a}){
 const steps=attackCalculation(a);
 return <div className="server-dice"><p><strong>d20 {a.roll} · Needs {a.targetNumber} Or Less · {a.hit?'Hit':'Miss'}</strong></p>{steps.length>0&&<p className="roll-calculation" aria-label="To-Hit Calculation">{steps.join(' · ')}</p>}</div>;
}
export function DamageRollResult({result}){
 const d=damageCalculation(result);if(!d)return null;
 return <div className="server-dice"><p><strong>Damage Dice: {d.formula}</strong></p>{d.penalty&&<p>{d.penalty}</p>}<p>{d.arithmetic} · <strong>{result.damage} Before Armour</strong></p></div>;
}
