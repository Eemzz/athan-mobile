import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToHsv, hsvToHex } from './color-math';

test('color wheel maps hue, saturation and brightness to expected colors', () => {
  assert.equal(hsvToHex(0, 1, 1), '#ff0000');
  assert.equal(hsvToHex(120, 1, 1), '#00ff00');
  assert.equal(hsvToHex(240, 1, 1), '#0000ff');
  assert.equal(hsvToHex(270, 0, 1), '#ffffff');
  assert.equal(hsvToHex(30, 1, 0), '#000000');
});

test('saved custom colors round trip through the wheel without changing', () => {
  for (const color of [
    '#000000',
    '#ffffff',
    '#e8b9cb',
    '#263239',
    '#516a58',
    '#a9cddd',
    '#bf785f',
  ]) {
    assert.equal(hsvToHex(...hexToHsv(color)), color);
  }
});
