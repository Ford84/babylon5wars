import React from 'react';
import {labelSystem} from '../shared/ship-condition.mjs';
export default function RuleTable({title,rows,locations=false,selected=null,note,unmodified=false}){
 if(!rows.length)return null;
 return <details className="rule-table"><summary>{title}</summary>{note&&<p>{note}</p>}<table><thead><tr><th>{locations||unmodified?'d20':'Modified Total'}</th><th>Possible Result</th></tr></thead><tbody>{rows.map(([lo,hi,result])=><tr key={lo} className={selected!==null&&selected>=lo&&(hi===null||selected<=hi)?'rolled-table-row':''}><td>{hi===null?lo+'+':lo===hi?lo:lo+'–'+hi}</td><td>{locations?labelSystem(result):result}</td></tr>)}</tbody></table></details>;
}
