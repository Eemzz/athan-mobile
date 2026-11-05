// Illumination formulas adapted from SunCalc 1.9.0, Vladimir Agafonkin.
// BSD-2-Clause notice: public/SUNCALC-LICENSE.txt.
function getMoonIllumination(date: Date) {
  const rad = Math.PI / 180,
    d = date.getTime() / 86400000 + 2440587.5 - 2451545;
  const e = rad * 23.4397;
  const ra = (l: number, b: number) =>
    Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = (l: number, b: number) =>
    Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const M = rad * (357.5291 + 0.98560028 * d);
  const L =
    M +
    rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) +
    rad * 102.9372 +
    Math.PI;
  const sr = ra(L, 0),
    sd = dec(L, 0);
  const ml = rad * (218.316 + 13.176396 * d),
    ma = rad * (134.963 + 13.064993 * d),
    mf = rad * (93.272 + 13.22935 * d);
  const l = ml + rad * 6.289 * Math.sin(ma),
    b = rad * 5.128 * Math.sin(mf),
    distance = 385001 - 20905 * Math.cos(ma);
  const mr = ra(l, b),
    md = dec(l, b);
  const separation = Math.acos(
    Math.max(
      -1,
      Math.min(1, Math.sin(sd) * Math.sin(md) + Math.cos(sd) * Math.cos(md) * Math.cos(sr - mr)),
    ),
  );
  const incidence = Math.atan2(
    149598000 * Math.sin(separation),
    distance - 149598000 * Math.cos(separation),
  );
  const angle = Math.atan2(
    Math.cos(sd) * Math.sin(sr - mr),
    Math.sin(sd) * Math.cos(md) - Math.cos(sd) * Math.sin(md) * Math.cos(sr - mr),
  );
  return {
    fraction: (1 + Math.cos(incidence)) / 2,
    phase: 0.5 + (0.5 * incidence * (angle < 0 ? -1 : 1)) / Math.PI,
  };
}

export interface LunarPhase {
  at: number;
  fraction: number;
  waxing: boolean;
  name: string;
}
export const lunarPhaseNames = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
];
export function lunarPhase(date = new Date()): LunarPhase {
  const moon = getMoonIllumination(date);
  return {
    at: date.getTime(),
    fraction: Math.max(0, Math.min(1, moon.fraction)),
    waxing: moon.phase < 0.5,
    name: lunarPhaseNames[Math.round(moon.phase * 8) % 8]!,
  };
}
export function lunarPath(moon: Pick<LunarPhase, 'fraction' | 'waxing'>): string {
  const side = moon.waxing ? 1 : -1,
    points: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 64;
    points.push([50 + side * 46 * Math.cos(a), 50 + 46 * Math.sin(a)]);
  }
  for (let i = 0; i <= 64; i++) {
    const a = Math.PI / 2 - (i * Math.PI) / 64;
    points.push([50 + side * (1 - 2 * moon.fraction) * 46 * Math.cos(a), 50 + 46 * Math.sin(a)]);
  }
  return (
    points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ') + ' Z'
  );
}
export function lunarSvg(moon = lunarPhase()): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor" role="img" aria-label="${moon.name}"><circle cx="50" cy="50" r="46" opacity=".12"/><path d="${lunarPath(moon)}"/></svg>`;
}
/** Six-hour samples keep native widgets accurate offline across the prayer schedule. */
export function lunarSchedule(now = new Date()): LunarPhase[] {
  const start = Math.floor(now.getTime() / 21600000) * 21600000;
  return Array.from({ length: 17 * 4 }, (_, i) => lunarPhase(new Date(start + i * 21600000)));
}
