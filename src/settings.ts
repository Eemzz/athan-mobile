import { defaults, prayerNames, validLocation, type Settings } from './prayers';

/** Restore saved preferences, falling back safely when storage is damaged. */
export function restoreSettings(value: string | null): Settings {
  try {
    const saved = JSON.parse(value ?? 'null');
    if (!saved) return { ...defaults };
    const settings: Settings = { ...defaults, ...saved };
    if (
      !['NorthAmerica', 'MuslimWorldLeague', 'UmmAlQura', 'Egyptian', 'Karachi'].includes(
        settings.method,
      )
    )
      settings.method = 'NorthAmerica';
    if (settings.location && !validLocation(settings.location)) settings.location = null;
    settings.muted = Array.isArray(settings.muted)
      ? settings.muted.filter((name) => prayerNames.includes(name))
      : [];
    settings.recording = 'beautiful';
    return settings;
  } catch {
    return { ...defaults };
  }
}
