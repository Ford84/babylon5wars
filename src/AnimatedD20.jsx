import React from 'react';
import AnimatedDice from './AnimatedDice.jsx';
export default function AnimatedD20({value,...props}){return <AnimatedDice values={[value]} sides={20} {...props}/>;}
