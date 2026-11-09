import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { loadQuran } from './quran';

test('offline Quran decompresses without changing any text or notices', async (t) => {
  const original = await readFile('public/quran.json');
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, '/quran.json.gz');
    return new Response(new Uint8Array(gzipSync(original)));
  });
  const quran = await loadQuran();
  assert.deepEqual(quran, JSON.parse(original.toString('utf8')));
  assert.equal(quran.length, 114);
  assert.equal(
    quran.reduce((count, surah) => count + surah.verses.length, 0),
    6236,
  );
});

test('offline Quran rejects missing and corrupt data rather than returning an empty reader', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 404 }));
  await assert.rejects(loadQuran(), /404/);
  fetch.mock.mockImplementation(async () => new Response(null, { status: 200 }));
  await assert.rejects(loadQuran(), /Unable to load offline Quran/);
  fetch.mock.mockImplementation(async () => new Response('not gzip'));
  await assert.rejects(loadQuran());
  fetch.mock.mockImplementation(async () => new Response(new Uint8Array(gzipSync('not JSON'))));
  await assert.rejects(loadQuran(), SyntaxError);
});

test('offline Quran accepts JSON already decompressed by the HTTP layer', async (t) => {
  const original = await readFile('public/quran.json', 'utf8');
  t.mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(original, {
        headers: { 'Content-Encoding': 'gzip' },
      }),
  );
  assert.deepEqual(await loadQuran(), JSON.parse(original));
});

test('Android reads the JSON asset expanded by AAPT without browser decompression', async (t) => {
  const { Capacitor } = await import('@capacitor/core');
  t.mock.method(Capacitor, 'getPlatform', () => 'android');
  const original = await readFile('public/quran.json', 'utf8');
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    assert.equal(url, '/quran.json');
    return new Response(original);
  });
  t.mock.method(globalThis, 'DecompressionStream', () => {
    throw new Error('Android must not need DecompressionStream');
  });
  assert.deepEqual(await loadQuran(), JSON.parse(original));
});

test('unnumbered basmalah is separated from opening ayahs without changing the source', async () => {
  const { displayVerse, findVerses } = await import('./quran');
  const quran = JSON.parse(await readFile('public/quran.json', 'utf8'));
  const opening = quran[0].verses[0].text;
  let separated = 0;
  for (const surah of quran)
    for (const verse of surah.verses) {
      const display = displayVerse(surah, verse);
      if (display.basmalah) {
        separated++;
        assert.equal(verse.id, 1);
        assert.equal(display.basmalah + ' ' + display.text, verse.text);
        assert.ok(!display.text.startsWith(opening));
      } else assert.equal(display.text, verse.text);
    }
  assert.equal(separated, 112);
  assert.equal(displayVerse(quran[0], quran[0].verses[0]).text, opening);
  assert.equal(displayVerse(quran[8], quran[8].verses[0]).basmalah, null);
  assert.equal(displayVerse(quran[26], quran[26].verses[29]).text, quran[26].verses[29].text);
  assert.deepEqual(
    findVerses(quran, opening).map(({ s, v }) => `${s.id}:${v.id}`),
    ['1:1', '27:30'],
  );
});
