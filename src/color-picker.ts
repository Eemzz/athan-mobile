import { hexToHsv, hsvToHex } from './color-math';

const swatches = [
  '#ffffff',
  '#263239',
  '#516a58',
  '#e8b9cb',
  '#c7bce6',
  '#a9cddd',
  '#f0d59b',
  '#bf785f',
];

export function mountColorPicker(input: HTMLInputElement) {
  const picker = document.createElement('div');
  picker.className = 'color-picker';
  picker.innerHTML = `<div class="color-swatches">${swatches.map((color) => `<button type="button" aria-label="${color}" data-color="${color}" style="--swatch:${color}"></button>`).join('')}</div><details><summary>Custom color <span class="color-value"></span></summary><div class="color-custom"><div class="color-wheel" role="group" aria-label="Color wheel" aria-describedby="${input.id}-help"><span class="color-wheel-thumb"></span></div><small id="${input.id}-help">Drag to choose a color. Center for softer shades.</small><label>Brightness<input class="color-brightness" type="range" min="0" max="100" aria-label="Brightness"></label><label>Hex color<input class="color-hex" type="text" maxlength="7" spellcheck="false" aria-label="Hex color"></label><div class="color-accessible"><label>Hue<input class="color-hue" type="range" min="0" max="359" aria-label="Hue"></label><label>Saturation<input class="color-saturation" type="range" min="0" max="100" aria-label="Saturation"></label></div></div></details>`;
  input.type = 'hidden';
  input.after(picker);
  const hex = picker.querySelector<HTMLInputElement>('.color-hex')!;
  const wheel = picker.querySelector<HTMLElement>('.color-wheel')!;
  const thumb = picker.querySelector<HTMLElement>('.color-wheel-thumb')!;
  const brightness = picker.querySelector<HTMLInputElement>('.color-brightness')!;
  const hue = picker.querySelector<HTMLInputElement>('.color-hue')!;
  const saturation = picker.querySelector<HTMLInputElement>('.color-saturation')!;
  let [h, s, v] = hexToHsv(input.value);
  function refresh() {
    hex.value = input.value;
    hex.setAttribute('aria-invalid', 'false');
    picker.querySelector('.color-value')!.textContent = input.value.toUpperCase();
    picker.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.color === input.value.toLowerCase()),
      );
    });
    const radians = (h * Math.PI) / 180;
    thumb.style.left = `${50 + Math.cos(radians) * s * 50}%`;
    thumb.style.top = `${50 + Math.sin(radians) * s * 50}%`;
    thumb.style.background = input.value;
    wheel.style.setProperty('--wheel-value', String(1 - v));
    brightness.style.background = `linear-gradient(to right, #000, ${hsvToHex(h, s, 1)})`;
    brightness.value = String(Math.round(v * 100));
    hue.value = String(Math.round(h));
    saturation.value = String(Math.round(s * 100));
  }
  function update(save: boolean) {
    input.value = hsvToHex(h, s, v);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    refresh();
    if (save) input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function choose(value: string) {
    [h, s, v] = hexToHsv(value);
    update(true);
  }
  picker.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((button) => {
    button.onclick = () => choose(button.dataset.color!);
  });
  hex.oninput = () => {
    const valid = /^#?[a-f0-9]{6}$/i.test(hex.value);
    hex.setAttribute('aria-invalid', String(!valid));
    if (valid) choose('#' + hex.value.replace('#', '').toLowerCase());
  };
  function move(event: PointerEvent) {
    const rect = wheel.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    h = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    s = Math.min(1, Math.hypot(x, y));
    update(false);
  }
  wheel.onpointerdown = (event) => {
    if (event.button !== 0) return;
    wheel.setPointerCapture(event.pointerId);
    move(event);
  };
  wheel.onpointermove = (event) => {
    if (wheel.hasPointerCapture(event.pointerId)) move(event);
  };
  wheel.onpointerup = (event) => {
    if (!wheel.hasPointerCapture(event.pointerId)) return;
    move(event);
    wheel.releasePointerCapture(event.pointerId);
    update(true);
  };
  wheel.onpointercancel = () => update(true);
  for (const slider of [brightness, hue, saturation]) {
    slider.oninput = () => {
      h = Number(hue.value);
      s = Number(saturation.value) / 100;
      v = Number(brightness.value) / 100;
      update(false);
    };
    slider.onchange = () => update(true);
  }
  refresh();
}
