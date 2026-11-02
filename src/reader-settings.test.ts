import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restoreSettings } from './settings';
import { findVerses, type Surah } from './quran';

const quran: Surah[] = [
  {
    id: 1,
    name: 'الفاتحة',
    transliteration: 'Al-Fatihah',
    translation: 'The Opening',
    verses: [
      { id: 1, text: 'بِسْمِ اللَّهِ', translation: 'In the name of Allah' },
      { id: 2, text: 'الْحَمْدُ لِلَّهِ', translation: 'Praise be to Allah' },
    ],
  },
  {
    id: 2,
    name: 'البقرة',
    transliteration: 'Al-Baqarah',
    translation: 'The Cow',
    verses: [{ id: 1, text: 'الم', translation: 'Alif. Lam. Mim.' }],
  },
];

test('Quran reference search selects the exact surah and verse', () => {
  assert.deepEqual(
    findVerses(quran, '1:2').map(({ s, v }) => [s.id, v.id]),
    [[1, 2]],
  );
  assert.equal(findVerses(quran, '99:1').length, 0);
});
test('Quran text search handles Arabic diacritics, English, and surah names', () => {
  assert.equal(findVerses(quran, 'بسم الله').length, 1);
  assert.equal(findVerses(quran, 'PRAISE').length, 1);
  assert.equal(findVerses(quran, 'AlFatihah').length, 2);
});
test('surah selection applies only when there is no active search', () => {
  assert.equal(findVerses(quran, '', 1).length, 2);
  assert.equal(findVerses(quran, 'Mim', 1)[0].s.id, 2);
});
test('stored settings retain valid preferences while migrating removed audio', () => {
  const settings = restoreSettings(
    JSON.stringify({
      recording: 'prophets-mosque',
      method: 'Karachi',
      sound: false,
      muted: ['Fajr', 'invalid'],
    }),
  );
  assert.equal(settings.recording, 'beautiful');
  assert.equal(settings.method, 'Karachi');
  assert.equal(settings.sound, false);
  assert.deepEqual(settings.muted, ['Fajr']);
});
test('damaged settings and invalid locations restore safely', () => {
  assert.equal(restoreSettings('{broken').location, null);
  assert.equal(
    restoreSettings(JSON.stringify({ method: 'invalid', location: {} })).method,
    'NorthAmerica',
  );
});
