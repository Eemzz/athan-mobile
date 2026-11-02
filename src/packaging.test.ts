import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { build } from 'vite';
import { recordings } from './recordings';

test('production bundle preserves offline assets without duplicate native clips and stays below 2 MiB', async (t) => {
  const outDir = await mkdtemp(join(tmpdir(), 'athan-packaging-'));
  t.after(() => rm(outDir, { recursive: true, force: true }));
  await build({ logLevel: 'silent', build: { outDir } });

  const files = await readdir(outDir, { recursive: true });
  assert(!files.includes('quran.json'));
  assert(!files.includes('athan.mp3'));
  assert(!files.includes('athan_short.wav'));
  assert.deepEqual(
    gunzipSync(await readFile(join(outDir, 'quran.json.gz'))),
    await readFile('public/quran.json'),
  );
  for (const recording of Object.values(recordings)) {
    assert(!files.includes(recording.iosSound));
    assert.deepEqual(
      await readFile(join(outDir, recording.file)),
      await readFile(join('public', recording.file)),
    );
    assert((await stat(join('public', recording.iosSound))).size > 0);
  }
  for (const file of ['ATTRIBUTION.txt', 'QURAN-LICENSE.txt']) {
    assert.deepEqual(await readFile(join(outDir, file)), await readFile(join('public', file)));
  }
  assert.deepEqual(
    JSON.parse(await readFile(join(outDir, 'quran-sources.json'), 'utf8')),
    JSON.parse(await readFile('public/quran-sources.json', 'utf8')),
  );
  let bytes = 0;
  for (const file of files) {
    const entry = await stat(join(outDir, file));
    if (entry.isFile()) bytes += entry.size;
  }
  assert(bytes < 2 * 1024 * 1024, `Web bundle is ${bytes} bytes; expected less than 2 MiB.`);
});
