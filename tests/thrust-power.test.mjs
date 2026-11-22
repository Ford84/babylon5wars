import test from 'node:test';import assert from 'node:assert/strict';import {extraThrustPowerCost} from '../shared/thrust-power.mjs';
test('G Quan 3/1 ratio requires 9 power for three extra thrust',()=>{assert.equal(extraThrustPowerCost(3,3).requiredPower,9);});
test('different ships have different power costs',()=>{assert.equal(extraThrustPowerCost(4,2).requiredPower,8);assert.equal(extraThrustPowerCost(4,3).requiredPower,12);});
test('fractional ratios round required power upwards',()=>{assert.equal(extraThrustPowerCost(3,{numerator:3,denominator:2}).requiredPower,5);});
test('invalid values rejected',()=>{assert.throws(()=>extraThrustPowerCost(-1,2));assert.throws(()=>extraThrustPowerCost(3,0));});
