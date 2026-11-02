import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarkerAppearance, defaultMarkerAppearance } from './widget-appearance';
import { restoreSettings } from './settings';
test('old installations receive transparent automatic marker defaults', () => {
  assert.deepEqual(restoreSettings(null).marker, defaultMarkerAppearance);
  assert.deepEqual(restoreSettings('{}').marker, defaultMarkerAppearance);
});
test('marker appearance preserves custom text and background colors', () => {
  const marker = {
    textMode: 'custom' as const,
    textColor: '#123abc',
    backgroundColor: '#ABCDEF',
    transparency: 65,
  };
  assert.deepEqual(normalizeMarkerAppearance(marker), marker);
  assert.deepEqual(restoreSettings(JSON.stringify({ marker })).marker, marker);
});
test('marker colors and transparency reject malformed settings', () => {
  assert.equal(normalizeMarkerAppearance({ textColor: 'red' }).textColor, '#516a58');
  assert.equal(
    normalizeMarkerAppearance({ backgroundColor: '<script>', textMode: 'unknown' }).textMode,
    'automatic',
  );
  assert.equal(normalizeMarkerAppearance({ transparency: 200 }).transparency, 100);
  assert.equal(normalizeMarkerAppearance({ transparency: -20 }).transparency, 0);
  assert.equal(normalizeMarkerAppearance({ transparency: NaN }).transparency, 100);
});
