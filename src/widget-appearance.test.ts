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
    fontFamily: 'sans-serif' as const,
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

test('older widgets keep serif and unsupported font values fall back safely', () => {
  assert.equal(normalizeMarkerAppearance({}).fontFamily, 'serif');
  assert.equal(normalizeMarkerAppearance({ fontFamily: 'invalid' }).fontFamily, 'serif');
});

test('landscape widgets restore independent font and opacity preferences', () => {
  const settings = restoreSettings(
    JSON.stringify({
      landscape: {
        small: { fontFamily: 'sans-serif', opacity: 0 },
        large: { fontFamily: 'serif', opacity: 65 },
      },
    }),
  );
  assert.deepEqual(settings.landscape.small, { fontFamily: 'sans-serif', opacity: 0 });
  assert.deepEqual(settings.landscape.large, { fontFamily: 'serif', opacity: 65 });
  assert.deepEqual(restoreSettings('{}').landscape.small, { fontFamily: 'serif', opacity: 100 });
  const damaged = restoreSettings(
    JSON.stringify({ landscape: { small: { opacity: 250, fontFamily: 'invalid' } } }),
  );
  assert.deepEqual(damaged.landscape.small, { fontFamily: 'serif', opacity: 100 });
});
