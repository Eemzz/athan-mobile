import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
await mkdir('public', { recursive: true });
const base = 'https://quran-json.risanb.com';
const get = async (path) => {
  const r = await fetch(base + path);
  if (!r.ok) throw Error(`Dataset request failed: ${path} (${r.status})`);
  return r.json();
};
const [chapters, arabic, english, sources] = await Promise.all([
  get('/chapters.json'),
  get('/text/uthmani/quran.json'),
  get('/translations/en-pickthall/quran.json'),
  get('/meta/sources.json'),
]);
const data = chapters.map((s) => ({
  ...s,
  notice: arabic.find((a) => a.id === s.id).notice,
  verses: arabic
    .find((a) => a.id === s.id)
    .verses.map((v) => ({
      ...v,
      translation: english.find((e) => e.id === s.id).verses.find((e) => e.id === v.id).translation,
    })),
}));
if (data.length !== 114 || data.reduce((n, s) => n + s.verses.length, 0) !== 6236)
  throw Error('Incomplete Quran dataset');
await writeFile('public/quran.json', JSON.stringify(data));
await writeFile(
  'public/QURAN-LICENSE.txt',
  data[0].notice +
    '\n\nEnglish: Marmaduke Pickthall (1930), public domain.\nSource and licensing: https://quran-json.risanb.com/meta/sources.json\n',
);
await writeFile('public/quran-sources.json', JSON.stringify(sources, null, 2));
console.log('Bundled 114 surahs and 6,236 verses with English translation.');
await writeFile(
  'public/ATTRIBUTION.txt',
  `Quran: Quran JSON dataset https://quran-json.risanb.com/ Arabic text from Tanzil (CC BY 3.0; verbatim copying only); English: Marmaduke Pickthall, 1930, public domain. Arabic text preserved verbatim, including its copyright notice per surah. https://tanzil.net/docs/text_license\n\nPrayer calculations: Adhan by Batoul Apps, MIT. https://github.com/batoulapps/adhan-js\nIcons: Lucide, ISC. https://lucide.dev/license\n`,
);
await writeFile(
  'public/ATTRIBUTION.txt',
  (await readFile('public/ATTRIBUTION.txt', 'utf8')) +
    '\nQuran JSON packaging/metadata: Risan Bagja Pradana, CC BY-SA 4.0. https://github.com/risan/quran-json https://creativecommons.org/licenses/by-sa/4.0/\n',
);
console.log('Bundled full athan and a 28-second iOS notification excerpt.');
await import('./prepare-audio.mjs');
