import { createIcons, Sun, Sunrise, Sunset, Moon } from 'lucide';
import type { Prayer, Settings } from './prayers';
import type { MarkerAppearance } from './widget-appearance';

export function mountMarkerSettings(
  settings: Settings,
  save: () => Promise<void>,
  next: () => Prayer | undefined,
) {
  const section = document.createElement('section');
  section.className = 'marker-settings';
  section.innerHTML = `<h3>Time marker widget</h3>
  <div class="marker-preview"><div class="marker-card"><div class="marker-top"><div><small>NEXT PRAYER</small><div class="marker-title"><strong></strong><span class="marker-icon"></span></div></div><div class="marker-clock"></div></div><div class="marker-rail"><span></span><b></b></div><div class="marker-caption">Add “Athan — Time marker” from your widget picker.</div></div></div>
  <label class="setting-field">Text color<select id="marker-mode"><option value="automatic">Automatic (phone theme)</option><option value="light">Light</option><option value="dark">Dark</option><option value="custom">Custom</option></select></label>
  <label class="setting-field" id="marker-text-field">Custom text color<input id="marker-text-color" type="color"></label>
  <label class="setting-field">Background color<input id="marker-background" type="color"></label>
  <label class="setting-field">Transparency <output id="marker-transparency-label"></output><input id="marker-transparency" type="range" min="0" max="100" step="1"></label>
  <p class="settings-note">100% transparency hides the background. These settings apply to all Time marker widgets. Automatic text follows your phone’s light/dark theme. iOS may apply its own background or tint.</p>`;
  document.querySelector('#settings-panel-widgets')!.append(section);
  const get = <T extends HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
  function render() {
    const a = settings.marker,
      prayer = next();
    get<HTMLSelectElement>('#marker-mode').value = a.textMode;
    get<HTMLInputElement>('#marker-text-color').value = a.textColor;
    get<HTMLElement>('#marker-text-field').hidden = a.textMode !== 'custom';
    get<HTMLInputElement>('#marker-background').value = a.backgroundColor;
    get<HTMLInputElement>('#marker-transparency').value = String(a.transparency);
    get<HTMLOutputElement>('#marker-transparency-label').value = `${a.transparency}%`;
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const ink =
      a.textMode === 'custom'
        ? a.textColor
        : a.textMode === 'light' || (a.textMode === 'automatic' && dark)
          ? '#f4f5f7'
          : '#263239';
    const card = get<HTMLElement>('.marker-card');
    card.style.color = ink;
    card.style.backgroundColor =
      a.backgroundColor +
      Math.round((1 - a.transparency / 100) * 255)
        .toString(16)
        .padStart(2, '0');
    get<HTMLElement>('.marker-title strong').textContent = prayer?.name ?? 'Asr';
    get<HTMLElement>('.marker-clock').textContent = prayer
      ? new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: settings.location?.timezone,
        }).format(prayer.at)
      : '3:47 PM';
    const icon =
      prayer?.name === 'Fajr'
        ? 'sunrise'
        : prayer?.name === 'Maghrib'
          ? 'sunset'
          : prayer?.name === 'Isha'
            ? 'moon'
            : 'sun';
    get<HTMLElement>('.marker-icon').innerHTML = `<i data-lucide="${icon}"></i>`;
    createIcons({
      icons: { Sun, Sunrise, Sunset, Moon },
      attrs: { width: 20, height: 20, 'stroke-width': 1.6 },
    });
  }
  const bindings: [string, keyof MarkerAppearance][] = [
    ['#marker-mode', 'textMode'],
    ['#marker-text-color', 'textColor'],
    ['#marker-background', 'backgroundColor'],
    ['#marker-transparency', 'transparency'],
  ];
  for (const [selector, key] of bindings) {
    const input = get<HTMLInputElement>(selector);
    input.oninput = () => {
      settings.marker = {
        ...settings.marker,
        [key]: key === 'transparency' ? Number(input.value) : input.value,
      };
      render();
    };
    input.onchange = () => {
      void save();
    };
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
  return render;
}
