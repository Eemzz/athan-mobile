export function hsvToHex(h: number, s: number, v: number): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * v * (1 - s * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, '0');
  };
  return '#' + channel(5) + channel(3) + channel(1);
}

export function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r!, g!, b!),
    min = Math.min(r!, g!, b!),
    delta = max - min;
  const hue = !delta
    ? 0
    : max === r
      ? ((g! - b!) / delta) % 6
      : max === g
        ? (b! - r!) / delta + 2
        : (r! - g!) / delta + 4;
  return [(hue * 60 + 360) % 360, max ? delta / max : 0, max];
}
