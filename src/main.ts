import { mountSettingsTabs, type SettingsTab } from './settings-tabs';
import { mountMarkerSettings } from './widget-settings';
import { appTemplate } from './app-template';
import { findVerses, loadQuran, type Surah } from './quran';
import { restoreSettings } from './settings';
import './design.css';
import './mobile.css';
import {
  createIcons,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  MapPin,
  Wind,
  BookOpen,
  Settings2,
  ChevronRight,
  Search,
  Volume2,
  ArrowLeft,
  Bookmark,
} from 'lucide';
import { Preferences } from '@capacitor/preferences';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  defaults,
  schedule,
  nextPrayer,
  normalize,
  validLocation,
  prayerNames,
  type Settings,
  type Prayer,
  type Location,
  type Method,
} from './prayers';
import { themes } from './themes';
import { syncAlerts, syncWidgets } from './native';
import { recordingFor } from './recordings';

const app = document.querySelector<HTMLDivElement>('#app')!;
const icons = {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  MapPin,
  Wind,
  BookOpen,
  Settings2,
  ChevronRight,
  Search,
  Volume2,
  ArrowLeft,
  Bookmark,
};
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  app.querySelector<T>(selector)!;
let settings: Settings = { ...defaults },
  rows: Prayer[] = [],
  next: Prayer | undefined,
  lastTheme = '',
  screen = 'today';
let quran: Surah[] | null = null,
  selectedSurah = 0,
  query = '',
  page = 0,
  syncing = false,
  syncAgain = false;
const audio = new Audio('/athan_beautiful.mp3');
audio.preload = 'none';
const stored = await Preferences.get({ key: 'settings' });
settings = restoreSettings(stored.value);
if (stored.value && stored.value !== JSON.stringify(settings)) {
  await Preferences.set({ key: 'settings', value: JSON.stringify(settings) });
}
audio.src = '/' + recordingFor(settings.recording).file;
const time = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: settings.location?.timezone,
  }).format(date);
const dateKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: settings.location?.timezone,
  }).format(date);
function message(text: string, error = false) {
  const toast = $('#message');
  toast.textContent = text;
  toast.hidden = false;
  toast.setAttribute('role', error ? 'alert' : 'status');
}
function drawIcons() {
  createIcons({ icons, attrs: { width: 18, height: 18, 'stroke-width': 1.6 } });
}
function applyTheme(name: keyof typeof themes) {
  const t = themes[name];
  app.dataset.theme = name;
  Object.entries({
    '--sky': t.sky,
    '--hero-ink': t.ink,
    '--orb': t.orb,
    '--glow': t.glow,
    '--hill': t.hill,
    '--paper': t.paper,
    '--ink': t.text,
    '--muted-ink': t.muted,
    '--wash': t.wash,
    '--accent-ink': t.accent,
    '--line': t.line,
    '--frame': t.frame,
  }).forEach(([k, v]) => app.style.setProperty(k, v));
  document.body.style.background = t.paper;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.paper);
  $('.mood').textContent = t.mood;
  lastTheme = name;
}
app.innerHTML = appTemplate(icon);
const selectSettingsTab = mountSettingsTabs(app);
function show(name: string, tab?: SettingsTab) {
  if (name === 'settings' && tab) selectSettingsTab(tab);
  screen = name;
  for (const s of ['today', 'quran', 'settings']) $('.' + s + '-screen').hidden = s !== name;
  app.querySelectorAll<HTMLButtonElement>('nav button').forEach((b) => {
    const active = b.dataset.screen === name;
    b.classList.toggle('active', active);
    b.setAttribute('aria-current', active ? 'page' : 'false');
  });
  if (name === 'quran') void openQuran();
  window.scrollTo({ top: 0 });
}
let refreshMarkerPreview = () => {};
function refresh() {
  rows = schedule(settings, new Date(), 30);
  next = nextPrayer(rows);
  refreshMarkerPreview();
  applyTheme(next?.name ?? 'Fajr');
  $('.location span').textContent = settings.location?.label ?? 'Set location';
  $('.date-label').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: settings.location?.timezone,
  }).format(new Date());
  $('.onboarding').hidden = !!settings.location;
  $('.prayer-content').hidden = !settings.location;
  if (!next && settings.location) {
    $('.prayer-content').hidden = true;
    message(
      'Prayer times could not be calculated for this location. Check your coordinates and calculation method.',
      true,
    );
  }
  if (next) {
    $('.next-name').textContent = next.name;
    $('.hero-time').textContent = time(next.at);
    const today = dateKey(new Date());
    $('.prayers').innerHTML = rows
      .filter((p) => dateKey(p.at) === today)
      .map(
        (p) =>
          `<div class="prayer-row ${p.at.getTime() === next!.at.getTime() ? 'active' : ''}">${icon(themes[p.name].icon)}<span>${p.name}</span>${p.at.getTime() === next!.at.getTime() ? '<span class="next-badge">Next</span>' : ''}<span class="prayer-clock">${esc(time(p.at))}</span></div>`,
      )
      .join('');
    $('.method-label').textContent = settings.method === 'NorthAmerica' ? 'ISNA' : settings.method;
    $('.timezone-label').textContent = settings.location!.timezone;
  }
  $('.alert-state').textContent = settings.alerts ? 'On' : 'Off';
  tick();
  drawIcons();
}
function tick() {
  const now = new Date();
  const p = nextPrayer(rows, now);
  if (p && p.at.getTime() !== next?.at.getTime()) {
    refresh();
    void sync(false);
    return;
  }
  if (!p) return;
  const min = Math.max(1, Math.ceil((p.at.getTime() - now.getTime()) / 60000));
  $('.count-text').textContent =
    `In ${min >= 60 ? `${Math.floor(min / 60)}h ` : ''}${min % 60}m${dateKey(p.at) !== dateKey(now) ? ' · Tomorrow' : ''}`;
  if (lastTheme !== p.name) applyTheme(p.name);
}
async function sync(ask: boolean) {
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  try {
    await syncWidgets(rows, settings);
    const result = await syncAlerts(rows, settings, ask);
    $('#schedule-status').textContent = result.message;
  } catch (e) {
    message(e instanceof Error ? e.message : 'Unable to update reminders.', true);
  } finally {
    syncing = false;
    if (syncAgain) {
      syncAgain = false;
      await sync(false);
    }
  }
}
async function save() {
  await Preferences.set({ key: 'settings', value: JSON.stringify(settings) });
  refresh();
  await sync(false);
}
function fillLocation() {
  const l = settings.location;
  $('#location-name').setAttribute('value', l?.label ?? '');
  $<HTMLInputElement>('#latitude').value = l ? String(l.latitude) : '';
  $<HTMLInputElement>('#longitude').value = l ? String(l.longitude) : '';
  $<HTMLInputElement>('#timezone').value =
    l?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
const cities: Record<string, Location> = {
  sf: {
    label: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
  },
  ny: { label: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
  london: { label: 'London', latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London' },
  makkah: { label: 'Makkah', latitude: 21.4225, longitude: 39.8262, timezone: 'Asia/Riyadh' },
};
async function locate() {
  try {
    if (Capacitor.isNativePlatform()) await Geolocation.requestPermissions();
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
    settings.location = {
      label: 'Current location',
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    fillLocation();
    await save();
    message('Location updated. Times use your phone’s time zone.');
    show('today');
  } catch {
    message('Location unavailable. Choose a city or enter coordinates in Settings.', true);
    show('settings', 'location');
  }
}
app
  .querySelectorAll<HTMLButtonElement>('nav button')
  .forEach((b) => (b.onclick = () => show(b.dataset.screen!)));
$('.location').onclick = () => show('settings', 'location');
$('.choose-location').onclick = () => show('settings', 'location');
$('.alert-button').onclick = () => show('settings', 'alerts');
app
  .querySelectorAll<HTMLButtonElement>('.locate')
  .forEach((b) => (b.onclick = () => void locate()));
$<HTMLSelectElement>('#city').onchange = () => {
  const city = cities[$<HTMLSelectElement>('#city').value];
  if (city) {
    $<HTMLInputElement>('#location-name').value = city.label;
    $<HTMLInputElement>('#latitude').value = String(city.latitude);
    $<HTMLInputElement>('#longitude').value = String(city.longitude);
    $<HTMLInputElement>('#timezone').value = city.timezone;
  }
};
$('#location-form').onsubmit = (e) => {
  e.preventDefault();
  const location = {
    label: $<HTMLInputElement>('#location-name').value.trim(),
    latitude: Number($<HTMLInputElement>('#latitude').value),
    longitude: Number($<HTMLInputElement>('#longitude').value),
    timezone: $<HTMLInputElement>('#timezone').value.trim(),
  };
  if (!validLocation(location)) {
    message('Enter valid coordinates and a time zone such as America/Los_Angeles.', true);
    return;
  }
  settings.location = location;
  void save().then(() => {
    show('today');
    message('Location saved.');
  });
};
$<HTMLSelectElement>('#method').value = settings.method;
$<HTMLSelectElement>('#madhab').value = settings.hanafi ? 'hanafi' : 'standard';
$<HTMLSelectElement>('#method').onchange = () => {
  settings.method = $<HTMLSelectElement>('#method').value as Method;
  void save();
};
$<HTMLSelectElement>('#madhab').onchange = () => {
  settings.hanafi = $<HTMLSelectElement>('#madhab').value === 'hanafi';
  void save();
};
$<HTMLInputElement>('#alerts').checked = settings.alerts;
$<HTMLInputElement>('#sound').checked = settings.sound;
$<HTMLInputElement>('#alerts').onchange = async () => {
  const enabled = $<HTMLInputElement>('#alerts').checked;
  if (enabled && !settings.location) {
    $<HTMLInputElement>('#alerts').checked = false;
    message('Set a location before enabling reminders.', true);
    return;
  }
  if (enabled && !Capacitor.isNativePlatform()) {
    $<HTMLInputElement>('#alerts').checked = false;
    message('Install the Android or iOS app to enable scheduled reminders.');
    return;
  }
  settings.alerts = enabled;
  try {
    const result = await syncAlerts(rows, settings, true);
    $('#schedule-status').textContent = result.message;
    await Preferences.set({ key: 'settings', value: JSON.stringify(settings) });
    refresh();
  } catch (e) {
    settings.alerts = false;
    $<HTMLInputElement>('#alerts').checked = false;
    message(e instanceof Error ? e.message : 'Unable to enable notifications.', true);
  }
};
$<HTMLInputElement>('#sound').onchange = () => {
  settings.sound = $<HTMLInputElement>('#sound').checked;
  void save();
};
const beautifulCredit = document.createElement('p');
beautifulCredit.className = 'settings-note';
beautifulCredit.innerHTML =
  'Beautiful Adhan by Adam-synagda (2022), <a href="https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg" target="_blank" rel="noopener">Wikimedia Commons</a>, <a href="https://creativecommons.org/publicdomain/zero/1.0/" target="_blank" rel="noopener">CC0 1.0</a>. Converted to mono MP3; the iOS notification excerpt is trimmed to 28 seconds.';
$('.settings-screen details').append(beautifulCredit);
$('#preview-audio').onclick = async () => {
  try {
    if (audio.paused) {
      await audio.play();
      $('#preview-audio').textContent = 'Stop athan';
    } else {
      audio.pause();
      audio.currentTime = 0;
      $('#preview-audio').textContent = 'Listen to athan';
    }
  } catch {
    message('The athan recording could not be played.', true);
  }
};
audio.onended = () => {
  $('#preview-audio').textContent = 'Listen to athan';
};
$('#exact-alarm').hidden = Capacitor.getPlatform() !== 'android';
$('#exact-alarm').onclick = () => void LocalNotifications.changeExactNotificationSetting();
$('.prayer-toggles').innerHTML = prayerNames
  .map(
    (n) =>
      `<label class="prayer-toggle"><input type="checkbox" data-prayer="${n}" ${settings.muted.includes(n) ? '' : 'checked'}>${n}</label>`,
  )
  .join('');
app.querySelectorAll<HTMLInputElement>('[data-prayer]').forEach(
  (b) =>
    (b.onchange = () => {
      settings.muted = prayerNames.filter(
        (n) => !$<HTMLInputElement>(`[data-prayer="${n}"]`).checked,
      );
      void save();
    }),
);
async function openQuran() {
  if (quran) {
    renderQuran();
    return;
  }
  $('.quran-results').textContent = 'Opening Quran…';
  try {
    quran = await loadQuran();
    renderQuran();
  } catch {
    $('.quran-results').textContent = 'Unable to open the offline Quran. Please reopen the app.';
  }
}
function renderQuran() {
  if (!quran) return;
  const target = $('.quran-results');
  const term = normalize(query.trim());
  if (!term && !selectedSurah) {
    target.innerHTML = quran
      .map(
        (s) =>
          `<button class="surah-row" data-surah="${s.id}"><span class="surah-number">${s.id}</span><span>${esc(s.transliteration)}<small>${esc(s.translation)} · ${s.verses.length} verses</small></span><span lang="ar" dir="rtl">${esc(s.name)}</span></button>`,
      )
      .join('');
  } else {
    const matches = findVerses(quran, query, selectedSurah);
    const shown = matches.slice(page * 30, (page + 1) * 30);
    target.innerHTML =
      `<button class="back-surahs secondary">${icon('arrow-left')}All surahs</button><p class="subtle">${matches.length} ${matches.length === 1 ? 'verse' : 'verses'}${!term && selectedSurah ? ' · ' + esc(quran.find((s) => s.id === selectedSurah)!.transliteration) : ''}</p>` +
      shown
        .map(
          ({ s, v }) =>
            `<article class="verse"><div class="verse-label">${esc(s.transliteration)} · ${s.id}:${v.id}<button class="bookmark" data-bookmark="${s.id}:${v.id}" aria-label="Bookmark verse ${s.id}:${v.id}">${icon('bookmark')}</button></div><p class="arabic" lang="ar" dir="rtl">${esc(v.text)}</p><p class="translation">${esc(v.translation)}</p></article>`,
        )
        .join('') +
      (matches.length > 30
        ? `<div class="pagination"><button class="secondary previous" ${page === 0 ? 'disabled' : ''}>Previous</button><span>${page + 1} / ${Math.ceil(matches.length / 30)}</span><button class="secondary next" ${(page + 1) * 30 >= matches.length ? 'disabled' : ''}>Next</button></div>`
        : '');
    target.querySelector<HTMLButtonElement>('.back-surahs')!.onclick = () => {
      query = '';
      selectedSurah = 0;
      page = 0;
      $<HTMLInputElement>('#quran-search').value = '';
      renderQuran();
    };
    target.querySelector<HTMLButtonElement>('.previous')?.addEventListener('click', () => {
      page--;
      renderQuran();
      window.scrollTo({ top: 0 });
    });
    target.querySelector<HTMLButtonElement>('.next')?.addEventListener('click', () => {
      page++;
      renderQuran();
      window.scrollTo({ top: 0 });
    });
    target.querySelectorAll<HTMLButtonElement>('[data-bookmark]').forEach(
      (b) =>
        (b.onclick = async () => {
          await Preferences.set({ key: 'bookmark', value: b.dataset.bookmark! });
          message(`Saved ${b.dataset.bookmark}. Search that reference to return.`);
        }),
    );
  }
  target.querySelectorAll<HTMLButtonElement>('[data-surah]').forEach(
    (b) =>
      (b.onclick = () => {
        selectedSurah = Number(b.dataset.surah);
        page = 0;
        renderQuran();
      }),
  );
  drawIcons();
}
let searchTimer: ReturnType<typeof setTimeout>;
$<HTMLInputElement>('#quran-search').oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    query = $<HTMLInputElement>('#quran-search').value;
    selectedSurah = 0;
    page = 0;
    renderQuran();
  }, 150);
};
refreshMarkerPreview = mountMarkerSettings(
  settings,
  async () => {
    await Preferences.set({ key: 'settings', value: JSON.stringify(settings) });
    await syncWidgets(rows, settings);
  },
  () => next,
);
fillLocation();
refresh();
void sync(false);
setInterval(tick, 15000);
if (Capacitor.isNativePlatform()) {
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      refresh();
      void sync(false);
    }
  });
  void LocalNotifications.addListener('localNotificationActionPerformed', () => {
    show('today');
    message('It is prayer time. Use “Listen to athan” in Settings to play the full recording.');
  });
  void App.addListener('backButton', () => {
    if (screen !== 'today') show('today');
    else void App.minimizeApp();
  });
}
