import { Capacitor } from '@capacitor/core';
import { normalize } from './prayers';

export interface Verse {
  id: number;
  text: string;
  translation: string;
}
export interface Surah {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  verses: Verse[];
}

export async function loadQuran(): Promise<Surah[]> {
  // AAPT expands .gz assets and strips the suffix when packaging Android apps.
  const android = Capacitor.getPlatform() === 'android';
  const response = await fetch(android ? '/quran.json' : '/quran.json.gz');
  if (!response.ok || !response.body) {
    throw new Error(`Unable to load offline Quran (${response.status}).`);
  }
  // HTTP servers may already have asked the browser to decompress the file.
  if (android || response.headers.get('Content-Encoding')?.toLowerCase() === 'gzip')
    return response.json();
  const text = response.body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(text).json();
}

/** Separate only the unnumbered opening prefix; preserve source text and ayah IDs. */
export function displayVerse(
  surah: Surah,
  verse: Verse,
): { basmalah: string | null; text: string } {
  const basmalah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  const opening = [basmalah, basmalah.replace('بِ', 'بِّ')].find((text) =>
    verse.text.startsWith(text + ' '),
  );
  if (surah.id !== 1 && surah.id !== 9 && verse.id === 1 && opening) {
    return { basmalah: opening, text: verse.text.slice(opening.length + 1) };
  }
  return { basmalah: null, text: verse.text };
}

/** Search references, Arabic, English, and surah names using the same normalization. */
export function findVerses(quran: Surah[], query: string, selectedSurah = 0) {
  const term = normalize(query.trim());
  const reference = query.trim().match(/^(\d{1,3})\s*[:.]\s*(\d{1,3})$/);
  return quran
    .flatMap((s) => s.verses.map((v) => ({ s, v })))
    .filter(({ s, v }) => {
      if (reference) return s.id === Number(reference[1]) && v.id === Number(reference[2]);
      if (selectedSurah && !term) return s.id === selectedSurah;
      return normalize(
        `${s.id} ${s.name} ${s.transliteration} ${s.translation} ${displayVerse(s, v).text} ${v.translation}`,
      ).includes(term);
    });
}
