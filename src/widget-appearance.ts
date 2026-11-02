export interface MarkerAppearance {
  textMode: 'automatic' | 'light' | 'dark' | 'custom';
  textColor: string;
  backgroundColor: string;
  transparency: number;
}
export const defaultMarkerAppearance: MarkerAppearance = {
  textMode: 'automatic',
  textColor: '#516a58',
  backgroundColor: '#ffffff',
  transparency: 100,
};
export function normalizeMarkerAppearance(value: unknown): MarkerAppearance {
  const input = (value && typeof value === 'object' ? value : {}) as Partial<MarkerAppearance>;
  const hex = (value: unknown, fallback: string) =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  return {
    textMode: ['automatic', 'light', 'dark', 'custom'].includes(input.textMode ?? '')
      ? input.textMode!
      : 'automatic',
    textColor: hex(input.textColor, defaultMarkerAppearance.textColor),
    backgroundColor: hex(input.backgroundColor, defaultMarkerAppearance.backgroundColor),
    transparency:
      typeof input.transparency === 'number' && Number.isFinite(input.transparency)
        ? Math.max(0, Math.min(100, input.transparency))
        : 100,
  };
}
