import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bookmarkTarget, restoreBookmarks, toggleBookmark } from './quran-bookmarks';
import type { Surah } from './quran';
const quran: Surah[] = JSON.parse(await readFile('public/quran.json', 'utf8'));

test('surah and verse bookmarks survive storage and reopen the correct reading page', () => {
  const saved = toggleBookmark(toggleBookmark([], '2'), '2:255');
  const restored = restoreBookmarks(JSON.stringify(saved), null, quran);
  assert.deepEqual(restored, ['2:255', '2']);
  assert.equal(bookmarkTarget(restored[0]!, quran)?.page, 8);
  assert.equal(bookmarkTarget(restored[0]!, quran)?.verse, 255);
  assert.equal(bookmarkTarget(restored[1]!, quran)?.page, 0);
  assert.deepEqual(toggleBookmark(restored, '2'), ['2:255']);
});
test('legacy verse bookmarks migrate and invalid or damaged saves are rejected', () => {
  assert.deepEqual(restoreBookmarks(null, '2:255', quran), ['2:255']);
  assert.deepEqual(
    restoreBookmarks('["2:255","2:255","115","1:99",null,"<script>"]', null, quran),
    ['2:255'],
  );
  assert.deepEqual(restoreBookmarks('broken', null, quran), []);
  assert.deepEqual(restoreBookmarks('[]', '2:255', quran), []);
});
