import { formatCountdown } from './countdown';
import { mountColorPicker } from './color-picker';
import { mountLandscapePreview } from './widget-preview';
import type { Prayer, Settings } from './prayers';
import type { MarkerAppearance } from './widget-appearance';

export function mountMarkerSettings(
  settings: Settings,
  save: () => Promise<void>,
  next: () => Prayer | undefined,
) {
  const landscapePreviews: (() => void)[] = [];
  const host = document.querySelector<HTMLElement>('#settings-panel-widgets')!;
  const chooser = document.createElement('div');
  chooser.className = 'widget-chooser';
  chooser.setAttribute('role', 'group');
  chooser.setAttribute('aria-label', 'Widget design');
  chooser.innerHTML = `<button type="button" data-widget="small" aria-pressed="true" aria-controls="widget-settings-small">Small</button><button type="button" data-widget="large" aria-pressed="false" aria-controls="widget-settings-large">Large</button><button type="button" data-widget="marker" aria-pressed="false" aria-controls="widget-settings-marker">Time marker</button>`;
  host.append(chooser);
  function selectWidget(name: string) {
    chooser.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
      const active = button.dataset.widget === name;
      button.setAttribute('aria-pressed', String(active));
      host.querySelector<HTMLElement>('#' + button.getAttribute('aria-controls'))!.hidden = !active;
    });
  }
  chooser.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.onclick = () => selectWidget(button.dataset.widget!);
  });
  for (const size of ['small', 'large'] as const) {
    const panel = document.createElement('section');
    panel.className = 'marker-settings';
    panel.classList.add('widget-design-panel');
    panel.id = 'widget-settings-' + size;
    panel.innerHTML = `<h3>${size === 'small' ? 'Small' : 'Large'} widget</h3><label class="setting-field">Font<select><option value="serif">Serif</option><option value="sans-serif">Sans serif</option></select></label><label class="setting-field">Background opacity <output></output><input type="range" min="0" max="100" step="1"></label>`;
    const font = panel.querySelector('select')!;
    const opacity = panel.querySelector('input')!;
    const output = panel.querySelector('output')!;
    const refreshPreview = mountLandscapePreview(panel, size, settings, next);
    landscapePreviews.push(refreshPreview);
    font.value = settings.landscape[size].fontFamily;
    opacity.value = String(settings.landscape[size].opacity);
    output.value = `${opacity.value}%`;
    font.onchange = () => {
      settings.landscape[size] = {
        ...settings.landscape[size],
        fontFamily: font.value === 'sans-serif' ? 'sans-serif' : 'serif',
      };
      void save();
      refreshPreview();
    };
    opacity.oninput = () => {
      settings.landscape[size] = { ...settings.landscape[size], opacity: Number(opacity.value) };
      output.value = `${opacity.value}%`;
      refreshPreview();
    };
    opacity.onchange = () => {
      void save();
    };
    document.querySelector('#settings-panel-widgets')!.append(panel);
  }
  const section = document.createElement('section');
  section.className = 'marker-settings';
  section.classList.add('widget-design-panel');
  section.id = 'widget-settings-marker';
  section.innerHTML = `<h3>Time marker widget</h3>
  <div class="marker-preview"><div class="marker-card"><div class="marker-top"><div><small>NEXT ATHAN</small><div class="marker-title"><strong></strong></div></div><div class="marker-clock"><span class="marker-time"></span><small class="marker-remaining"></small></div></div><div class="marker-rail"><span></span><b></b></div><div class="marker-caption">Add “Athan — Time marker” from your widget picker.</div></div></div>
  <label class="setting-field">Font<select id="marker-font"><option value="serif">Serif</option><option value="sans-serif">Sans serif</option></select></label>
  <label class="setting-field">Text color<select id="marker-mode"><option value="automatic">Automatic (phone theme)</option><option value="light">Light</option><option value="dark">Dark</option><option value="custom">Custom</option></select></label>
  <div class="setting-field" id="marker-text-field" role="group" aria-label="Custom text color">Custom text color<input id="marker-text-color" type="color"></div>
  <div class="setting-field" role="group" aria-label="Background color">Background color<input id="marker-background" type="color"></div>
  <label class="setting-field">Background opacity <output id="marker-transparency-label"></output><input id="marker-transparency" type="range" min="0" max="100" step="1"></label>
  <p class="settings-note">Opacity changes only the background. 0% is transparent; 100% is solid.</p>`;
  document.querySelector('#settings-panel-widgets')!.append(section);
  const get = <T extends HTMLElement>(selector: string) => section.querySelector<T>(selector)!;
  function render() {
    landscapePreviews.forEach((refresh) => refresh());
    const a = settings.marker,
      prayer = next();
    get<HTMLSelectElement>('#marker-mode').value = a.textMode;
    get<HTMLInputElement>('#marker-text-color').value = a.textColor;
    get<HTMLElement>('#marker-text-field').hidden = a.textMode !== 'custom';
    get<HTMLInputElement>('#marker-background').value = a.backgroundColor;
    get<HTMLInputElement>('#marker-transparency').value = String(100 - a.transparency);
    get<HTMLOutputElement>('#marker-transparency-label').value = `${100 - a.transparency}%`;
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const ink =
      a.textMode === 'custom'
        ? a.textColor
        : a.textMode === 'light' || (a.textMode === 'automatic' && dark)
          ? '#f4f5f7'
          : '#263239';
    const card = get<HTMLElement>('.marker-card');
    card.style.color = ink;
    card.style.setProperty(
      '--marker-name-font',
      a.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif',
    );
    get<HTMLSelectElement>('#marker-font').value = a.fontFamily;
    card.style.backgroundColor =
      a.backgroundColor +
      Math.round((1 - a.transparency / 100) * 255)
        .toString(16)
        .padStart(2, '0');
    get<HTMLElement>('.marker-title strong').textContent = prayer?.name ?? 'Asr';
    get<HTMLElement>('.marker-time').textContent = prayer
      ? new Intl.DateTimeFormat(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: settings.location?.timezone,
        }).format(prayer.at)
      : '3:47 PM';
    get<HTMLElement>('.marker-remaining').textContent = formatCountdown(
      prayer?.at ?? new Date(Date.now() + 6420000),
      new Date(),
      settings.location?.timezone,
    );
  }
  const bindings: [string, keyof MarkerAppearance][] = [
    ['#marker-mode', 'textMode'],
    ['#marker-font', 'fontFamily'],
    ['#marker-text-color', 'textColor'],
    ['#marker-background', 'backgroundColor'],
    ['#marker-transparency', 'transparency'],
  ];
  for (const [selector, key] of bindings) {
    const input = get<HTMLInputElement>(selector);
    input.oninput = () => {
      settings.marker = {
        ...settings.marker,
        [key]: key === 'transparency' ? 100 - Number(input.value) : input.value,
      };
      render();
    };
    input.onchange = () => {
      void save();
    };
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);
  render();
  mountColorPicker(get<HTMLInputElement>('#marker-text-color'));
  mountColorPicker(get<HTMLInputElement>('#marker-background'));
  const iconCredit = document.createElement('p');
  iconCredit.className = 'settings-note feature-credit';
  iconCredit.innerHTML =
    'Interface icons by <a href="https://lucide.dev/license" target="_blank" rel="noopener">Lucide</a> (ISC). Moon calculations adapted from <a href="/SUNCALC-LICENSE.txt" target="_blank" rel="noopener">SunCalc</a> (BSD-2-Clause).';
  host.append(iconCredit);
  selectWidget('small');
  return render;
}
