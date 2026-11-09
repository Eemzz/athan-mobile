import { bookmarkTarget, restoreBookmarks, toggleBookmark } from './quran-bookmarks';
import { formatCountdown } from './countdown';
import { mountSettingsTabs, type SettingsTab } from './settings-tabs';
import { mountMarkerSettings } from './widget-settings';
import { renderPrayerReminder } from './prayer-reminders';
import { lunarSvg } from './lunar-phase';
import { appTemplate } from './app-template';
import { findVerses, loadQuran, displayVerse, type Surah, type Verse } from './quran';
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
const icon = (name: string) =>
  name === 'moon' ? lunarSvg() : `<i data-lucide="${name}" aria-hidden="true"></i>`;
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
let bookmarks: string[] = [];
let quranTab: 'surahs' | 'bookmarks' = 'surahs';
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
function positionHomeMoon() {
  const orb = $<HTMLElement>('.sun-orb');
  if (app.dataset.theme !== 'Isha') {
    orb.hidden = false;
    for (const property of ['top', 'width', 'height', 'mask-image', '-webkit-mask-image'])
      orb.style.removeProperty(property);
    return;
  }
  const mask =
    'url("data:image/svg+xml,' +
    encodeURIComponent(lunarSvg().replace('currentColor', 'black')) +
    '")';
  orb.style.maskImage = mask;
  orb.style.webkitMaskImage = mask;
  const scene = $('.hero').getBoundingClientRect();
  const start = $('.home-time-marker').getBoundingClientRect().bottom + 4;
  const end = $('.reminder-arabic').getBoundingClientRect().top - 4;
  const size = Math.min(43, end - start);
  orb.hidden = size < 16;
  if (!orb.hidden) {
    orb.style.width = orb.style.height = `${size}px`;
    orb.style.top = `${start - scene.top + (end - start - size) / 2}px`;
  }
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
  renderPrayerReminder(app, name);
  requestAnimationFrame(positionHomeMoon);
  lastTheme = name;
}
app.innerHTML = appTemplate(icon);
const moonLayoutObserver = new ResizeObserver(positionHomeMoon);
moonLayoutObserver.observe($('.hero'));
moonLayoutObserver.observe($('.reminder-arabic'));
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
  const previous =
    rows.filter((row) => row.at <= now).at(-1) ??
    schedule(settings, new Date(now.getTime() - 86400000), 3)
      .filter((row) => row.at <= now)
      .at(-1);
  const progress = previous
    ? Math.max(
        0,
        Math.min(
          1,
          (now.getTime() - previous.at.getTime()) /
            Math.max(1, p.at.getTime() - previous.at.getTime()),
        ),
      )
    : 0;
  const rail = $('.home-time-rail');
  rail.style.setProperty('--prayer-progress', `${progress * 100}%`);
  rail.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  rail.setAttribute(
    'aria-valuetext',
    previous ? `${previous.name} to ${p.name}` : `Next: ${p.name}`,
  );
  $('.previous-prayer-time').textContent = previous
    ? `${previous.name} · ${time(previous.at)}`
    : '';
  $('.next-prayer-time').textContent = `${p.name} · ${time(p.at)}`;
  $('.count-text').textContent = formatCountdown(p.at, now, settings.location?.timezone);
  if (lastTheme !== p.name) applyTheme(p.name);
  positionHomeMoon();
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
$('#audio-credit').append(beautifulCredit);
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
    const loaded = await loadQuran();
    const saved = await Preferences.get({ key: 'quran-bookmarks' });
    const legacy =
      saved.value === null ? await Preferences.get({ key: 'bookmark' }) : { value: null };
    bookmarks = restoreBookmarks(saved.value, legacy.value, loaded);
    quran = loaded;
    renderQuran();
  } catch {
    $('.quran-results').textContent = 'Unable to open the offline Quran. Please reopen the app.';
  }
}
function bookmarkButton(reference: string, label: string) {
  const saved = bookmarks.includes(reference);
  return `<button class="bookmark${saved ? ' is-bookmarked' : ''}" data-bookmark="${reference}" aria-pressed="${saved}" aria-label="${saved ? 'Remove bookmark for' : 'Bookmark'} ${esc(label)}">${icon('bookmark')}</button>`;
}
function openBookmark(reference: string) {
  if (!quran) return;
  const saved = bookmarkTarget(reference, quran);
  if (!saved) return;
  clearTimeout(searchTimer);
  quranTab = 'surahs';
  query = '';
  selectedSurah = saved.surah.id;
  page = saved.page;
  $<HTMLInputElement>('#quran-search').value = '';
  renderQuran();
  requestAnimationFrame(() => {
    const target = saved.verse
      ? app.querySelector<HTMLElement>(`[data-verse="${reference}"]`)
      : $('.reader-navigation');
    target?.scrollIntoView({ block: 'start' });
  });
}
function renderBookmarks() {
  const host = $('.quran-bookmarks');
  const label = (reference: string) => {
    const target = bookmarkTarget(reference, quran!)!;
    return target.surah.transliteration + (target.verse ? ' · ' + reference : ' · Surah');
  };
  host.innerHTML = bookmarks.length
    ? bookmarks
        .map(
          (ref) =>
            `<div class="saved-bookmark"><button data-open-bookmark="${ref}">${esc(label(ref))}</button>${bookmarkButton(ref, label(ref))}</div>`,
        )
        .join('')
    : '<p class="subtle">No bookmarks yet. Tap the bookmark icon beside a surah or verse to save it here.</p>';
  host
    .querySelectorAll<HTMLButtonElement>('[data-open-bookmark]')
    .forEach((button) => (button.onclick = () => openBookmark(button.dataset.openBookmark!)));
}
function renderVerse(surah: Surah, verse: Verse) {
  const display = displayVerse(surah, verse);
  const reference = `${surah.id}:${verse.id}`;
  const opening = display.basmalah
    ? `<p class="basmalah" lang="ar" dir="rtl">${esc(display.basmalah)}</p>`
    : '';
  return (
    opening +
    `<article class="verse" data-verse="${reference}"><div class="verse-label">${esc(surah.transliteration)} · ${reference}${bookmarkButton(reference, `verse ${reference}`)}</div><p class="arabic" lang="ar" dir="rtl">${esc(display.text)}</p><p class="translation">${esc(verse.translation)}</p></article>`
  );
}
function renderQuran() {
  if (!quran) return;
  renderBookmarks();
  const target = $('.quran-results');
  const showingBookmarks = quranTab === 'bookmarks';
  target.hidden = showingBookmarks;
  $('.quran-bookmarks').hidden = !showingBookmarks;
  $('.quran-screen .search').hidden = showingBookmarks;
  app.querySelectorAll<HTMLButtonElement>('[data-quran-tab]').forEach((button) => {
    const selected = button.dataset.quranTab === quranTab;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const term = normalize(query.trim());
  if (showingBookmarks) {
    target.innerHTML = '';
  } else if (!term && !selectedSurah) {
    target.innerHTML = quran
      .map(
        (s) =>
          `<div class="surah-item"><button class="surah-row" data-surah="${s.id}"><span class="surah-number">${s.id}</span><span>${esc(s.transliteration)}<small>${esc(s.translation)} · ${s.verses.length} verses</small></span><span lang="ar" dir="rtl">${esc(s.name)}</span></button>${bookmarkButton(String(s.id), s.transliteration)}</div>`,
      )
      .join('');
  } else {
    const matches = findVerses(quran, query, selectedSurah);
    const shown = matches.slice(page * 30, (page + 1) * 30);
    target.innerHTML =
      `<div class="reader-navigation"><button class="back-surahs secondary">${icon('arrow-left')}All surahs</button><div class="reader-title"><p class="subtle reader-context">${!term && selectedSurah ? esc(quran.find((s) => s.id === selectedSurah)!.transliteration) + ' · ' : ''}${matches.length} ${matches.length === 1 ? 'verse' : 'verses'}</p>${!term && selectedSurah ? bookmarkButton(String(selectedSurah), quran.find((s) => s.id === selectedSurah)!.transliteration) : ''}</div></div>` +
      shown.map(({ s, v }) => renderVerse(s, v)).join('') +
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
  }
  target.querySelectorAll<HTMLButtonElement>('[data-surah]').forEach(
    (b) =>
      (b.onclick = () => {
        selectedSurah = Number(b.dataset.surah);
        page = 0;
        renderQuran();
      }),
  );
  app.querySelectorAll<HTMLButtonElement>('[data-bookmark]').forEach(
    (button) =>
      (button.onclick = async () => {
        const reference = button.dataset.bookmark!;
        const updated = toggleBookmark(bookmarks, reference);
        try {
          await Preferences.set({ key: 'quran-bookmarks', value: JSON.stringify(updated) });
          const added = updated.includes(reference);
          bookmarks = updated;
          renderQuran();
          message(
            added ? 'Bookmark saved. Open the Bookmarks tab to return.' : 'Bookmark removed.',
          );
        } catch {
          message('Could not save your bookmark. Please try again.', true);
        }
      }),
  );
  drawIcons();
}
app.querySelectorAll<HTMLButtonElement>('[data-quran-tab]').forEach((button) => {
  button.onclick = () => {
    quranTab = button.dataset.quranTab as 'surahs' | 'bookmarks';
    if (quranTab === 'surahs') {
      query = '';
      selectedSurah = 0;
      page = 0;
      $<HTMLInputElement>('#quran-search').value = '';
      clearTimeout(searchTimer);
    }
    renderQuran();
  };
  button.onkeydown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const name =
      event.key === 'Home'
        ? 'surahs'
        : event.key === 'End'
          ? 'bookmarks'
          : button.dataset.quranTab === 'surahs'
            ? 'bookmarks'
            : 'surahs';
    const next = $<HTMLButtonElement>(`[data-quran-tab="${name}"]`);
    next.click();
    next.focus();
  };
});
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
