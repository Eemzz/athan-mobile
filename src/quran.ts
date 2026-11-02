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
        `${s.id} ${s.name} ${s.transliteration} ${s.translation} ${v.text} ${v.translation}`,
      ).includes(term);
    });
}
