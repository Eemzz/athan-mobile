import type { Prayer, Settings } from './prayers';
import { lunarPath, lunarPhase } from './lunar-phase';

/** Match the Android landscape artwork in its small and large launcher proportions. */
export function mountLandscapePreview(
  panel: HTMLElement,
  size: 'small' | 'large',
  settings: Settings,
  next: () => Prayer | undefined,
  date: () => Date = () => new Date(),
) {
  const wrapper = document.createElement('div');
  wrapper.className = 'landscape-preview';
  const canvas = document.createElement('canvas');
  canvas.className = `landscape-preview-${size}`;
  canvas.setAttribute('role', 'img');
  wrapper.append(canvas);
  panel.querySelector('h3')!.after(wrapper);
  const small = size === 'small',
    w = small ? 78 : 180,
    h = 90;
  canvas.width = w * 3;
  canvas.height = h * 3;
  return () => {
    const prayer = next(),
      name = prayer?.name ?? 'Asr';
    const clock = prayer
      ? new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: settings.location?.timezone,
        }).format(prayer.at)
      : '3:47 PM';
    const appearance = settings.landscape[size];
    const theme = {
      Fajr: ['#DCE6F0', '#F9DFC9', '#BDC8C4', '#FFF3D5', 120, 75],
      Dhuhr: ['#F7EDC8', '#EFDAA0', '#D5C390', '#FFF8D3', 137, 20],
      Asr: ['#E4EADB', '#C9D5B7', '#A7BB95', '#F8F0C9', 150, 47],
      Maghrib: ['#EBC9BC', '#E8A48C', '#BB8585', '#FFDBAD', 162, 76],
      Isha: ['#223350', '#34466B', '#1C2B44', '#E6ECF7', 140, 30],
    }[name as Prayer['name']]!;
    const [start, end, hill, orb, x, y] = theme as [string, string, string, string, number, number];
    const c = canvas.getContext('2d')!;
    c.setTransform(3, 0, 0, 3, 0, 0);
    c.clearRect(0, 0, w, h);
    c.save();
    c.beginPath();
    c.roundRect(0, 0, w, h, h * 0.16);
    c.clip();
    // Composite the scenery as one layer so overlapping shapes retain the chosen opacity.
    const art = document.createElement('canvas');
    art.width = canvas.width;
    art.height = canvas.height;
    const bg = art.getContext('2d')!;
    bg.scale(3, 3);
    const d = 1 / (w * w) + 1 / (h * h),
      gradient = bg.createLinearGradient(0, 0, 2 / w / d, 2 / h / d);
    gradient.addColorStop(0, start);
    gradient.addColorStop(1, end);
    bg.fillStyle = gradient;
    bg.fillRect(0, 0, w, h);
    let radius = small ? Math.min(16, w * 0.18) : 16;
    let cx = (x / 180) * w,
      cy = (y / 90) * h;
    bg.fillStyle = orb;
    if (name === 'Isha') {
      radius *= 11 / 16;
      if (small) {
        cy = 12;
        radius = Math.min(radius, 8);
      }

      bg.save();
      bg.translate(cx - radius, cy - radius);
      bg.scale(radius / 50, radius / 50);
      bg.globalAlpha = 0.12;
      bg.beginPath();
      bg.arc(50, 50, 46, 0, Math.PI * 2);
      bg.fill();
      bg.globalAlpha = 1;
      bg.fill(new Path2D(lunarPath(lunarPhase(date()))));
      bg.restore();
      bg.fillStyle = '#B4C9ED';
      for (const [sx, sy, dotRadius, opacity] of [
        [18, 12, 0.45, 0.45],
        [45, 8, 0.65, 0.7],
        [76, 15, 1, 1],
        [108, 9, 0.45, 0.45],
        [159, 10, 0.65, 0.7],
        [167, 29, 0.45, 0.45],
        [24, 32, 0.65, 0.7],
        [57, 27, 0.45, 0.45],
        [93, 34, 0.8, 0.9],
        [115, 46, 0.45, 0.45],
        [158, 51, 0.8, 0.9],
        [17, 56, 0.45, 0.45],
        [46, 49, 1.05, 1],
        [76, 60, 0.45, 0.45],
        [101, 62, 0.65, 0.7],
        [169, 61, 0.45, 0.45],
      ]) {
        const starX = (sx! / 180) * w,
          r = Math.max(1 / 3, (h / 90) * dotRadius!);
        if (Math.hypot(starX - cx, sy! - cy) < radius + r + 2) continue;
        bg.globalAlpha = opacity!;
        bg.beginPath();
        bg.arc(starX, sy!, r, 0, Math.PI * 2);
        bg.fill();
      }
      bg.globalAlpha = 1;
    } else {
      bg.beginPath();
      bg.arc(cx, cy, radius, 0, Math.PI * 2);
      bg.fill();
    }
    bg.beginPath();
    bg.moveTo(0, 78);
    for (const [px, py] of [
      [28, 77],
      [51, 81],
      [89, 76],
      [117, 67],
      [142, 72],
      [180, 61],
      [180, 90],
      [0, 90],
    ])
      bg.lineTo((px! / 180) * w, py!);
    bg.closePath();
    bg.fillStyle = hill;
    bg.fill();
    c.globalAlpha = appearance.opacity / 100;
    c.drawImage(art, 0, 0, w, h);
    c.globalAlpha = 1;
    const family = appearance.fontFamily === 'sans-serif' ? 'Arial, sans-serif' : 'Georgia, serif';
    c.fillStyle = name === 'Isha' ? '#EEF2FA' : '#394338';
    const left = small ? w / 2 : 20,
      available = !small && name === 'Isha' ? cx - radius - 8 - left : w - (small ? 16 : 28);
    c.textAlign = small ? 'center' : 'left';
    c.textBaseline = 'middle';
    const draw = (text: string, maximum: number, y: number, bold = false, textFamily = family) => {
      c.font = `${bold ? 'bold ' : ''}${maximum}px ${textFamily}`;
      const font = maximum * Math.min(1, available / Math.max(1, c.measureText(text).width));
      c.font = `${bold ? 'bold ' : ''}${font}px ${textFamily}`;
      c.fillText(text, left, y);
    };
    draw('NEXT ATHAN', 8, small ? 24 : 22, false, 'Arial, sans-serif');
    draw(name, small ? 24 : 28, 45, true);
    draw(clock, small ? 12 : 13, small ? 69 : 70);
    c.restore();
    canvas.setAttribute(
      'aria-label',
      `${size === 'small' ? 'Small' : 'Large'} widget preview: ${name}, ${clock}. ${appearance.fontFamily} font, ${appearance.opacity}% background opacity.`,
    );
  };
}
