import { lunarSchedule } from './lunar-phase';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Prayer, Settings } from './prayers';
import { notificationRows } from './prayers';
import { recordingFor } from './recordings';
export const PrayerWidget = registerPlugin<{
  update(options: { schedule: string }): Promise<void>;
  scheduleAlerts(options: { schedule: string }): Promise<void>;
}>('PrayerWidget');
export async function syncWidgets(rows: Prayer[], settings: Settings): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await PrayerWidget.update({
    schedule: JSON.stringify({
      location: settings.location?.label ?? '',
      timezone: settings.location?.timezone ?? 'UTC',
      marker: settings.marker,
      landscape: settings.landscape,
      moons: lunarSchedule(),
      prayers: rows.map((p) => ({ name: p.name, at: p.at.getTime() })),
    }),
  });
}
export async function syncAlerts(
  rows: Prayer[],
  settings: Settings,
  ask = false,
): Promise<{ message: string }> {
  if (!Capacitor.isNativePlatform())
    return {
      message: settings.alerts ? 'Alerts work in the installed Android or iOS app.' : 'Alerts off.',
    };
  if (!settings.alerts) {
    if (Capacitor.getPlatform() === 'android')
      await PrayerWidget.scheduleAlerts({ schedule: JSON.stringify({ prayers: [] }) });
    const old = await LocalNotifications.getPending();
    if (old.notifications.length) await LocalNotifications.cancel(old);
    return { message: 'Alerts off.' };
  }
  const permission = ask
    ? await LocalNotifications.requestPermissions()
    : await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted')
    throw new Error('Notifications are not allowed. Enable them in your phone settings.');
  let warning = '';
  const recording = recordingFor(settings.recording);
  if (Capacitor.getPlatform() === 'android') {
    const exact = await LocalNotifications.checkExactNotificationSetting();
    if (exact.exact_alarm !== 'granted')
      warning = ' Allow “Alarms & reminders” for precise timing.';
  }
  const selected = notificationRows(rows, settings);
  const old = await LocalNotifications.getPending();
  if (old.notifications.length) await LocalNotifications.cancel(old);
  if (Capacitor.getPlatform() === 'android') {
    await PrayerWidget.scheduleAlerts({
      schedule: JSON.stringify({
        sound: settings.sound,
        location: settings.location?.label ?? '',
        prayers: selected.map((p) => ({ name: p.name, at: p.at.getTime() })),
      }),
    });
  } else
    await LocalNotifications.schedule({
      notifications: selected.map((p, i) => ({
        id: 1000 + i,
        title: `It's ${p.name} time`,
        body: '',
        schedule: { at: p.at, allowWhileIdle: true },
        sound: settings.sound ? recording.iosSound : 'default',
        extra: { prayer: p.name },
      })),
    });
  const last = selected.at(-1)?.at;
  return {
    message: last
      ? `Reminders scheduled through ${last.toLocaleDateString(undefined, { timeZone: settings.location!.timezone })}. Open the app regularly to refresh them.${warning}`
      : 'No upcoming reminders to schedule.',
  };
}
