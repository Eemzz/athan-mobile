import type { Surah } from './quran';

/** Resolve saved references against the bundled text before rendering or navigating. */
export function bookmarkTarget(reference: string, quran: Surah[]) {
  const match = reference.match(/^([1-9]\d{0,2})(?::([1-9]\d{0,2}))?$/);
  if (!match) return null;
  const surah = quran.find((s) => s.id === Number(match[1]));
  if (!surah) return null;
  const verse = match[2] ? Number(match[2]) : undefined;
  const index = verse === undefined ? 0 : surah.verses.findIndex((v) => v.id === verse);
  if (index < 0) return null;
  return { surah, verse, page: Math.floor(index / 30) };
}

export function restoreBookmarks(
  value: string | null,
  legacy: string | null,
  quran: Surah[],
): string[] {
  try {
    const saved: unknown = value === null ? (legacy ? [legacy] : []) : JSON.parse(value);
    if (!Array.isArray(saved)) return [];
    return [
      ...new Set(
        saved.filter(
          (ref): ref is string => typeof ref === 'string' && !!bookmarkTarget(ref, quran),
        ),
      ),
    ];
  } catch {
    return [];
  }
}

export function toggleBookmark(saved: string[], reference: string): string[] {
  return saved.includes(reference)
    ? saved.filter((ref) => ref !== reference)
    : [reference, ...saved];
}
