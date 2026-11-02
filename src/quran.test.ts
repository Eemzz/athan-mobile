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
