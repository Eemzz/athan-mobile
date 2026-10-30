import { Coordinates, CalculationMethod, Madhab, PrayerTimes } from 'adhan';
import type { RecordingId } from './recordings';
export const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = typeof prayerNames[number];
export type Method = 'NorthAmerica' | 'MuslimWorldLeague' | 'UmmAlQura' | 'Egyptian' | 'Karachi';
export interface Location { label: string; latitude: number; longitude: number; timezone: string }
export interface Settings { location: Location | null; method: Method; hanafi: boolean; alerts: boolean; sound: boolean; recording: RecordingId; muted: PrayerName[] }
export interface Prayer { name: PrayerName; at: Date }
export const defaults: Settings = { location: null, method: 'NorthAmerica', hanafi: false, alerts: false, sound: true, recording: 'beautiful', muted: [] };
export function dateInZone(now: Date, timezone: string, offset = 0): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:timezone,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
  const p = (type: string) => Number(parts.find(x=>x.type===type)!.value);
  return new Date(p('year'),p('month')-1,p('day')+offset,12);
}
export function schedule(settings: Settings, now = new Date(), days = 14): Prayer[] {
  if (!settings.location) return [];
  const { latitude, longitude, timezone } = settings.location;
  const params = CalculationMethod[settings.method](); params.madhab = settings.hanafi ? Madhab.Hanafi : Madhab.Shafi;
  const coordinates = new Coordinates(latitude,longitude);
  return Array.from({length:days},(_,offset)=>{
    const p = new PrayerTimes(coordinates,dateInZone(now,timezone,offset),params);
    return prayerNames.map(name=>({name,at:p[name.toLowerCase() as 'fajr'|'dhuhr'|'asr'|'maghrib'|'isha']}));
  }).flat().filter(p=>Number.isFinite(p.at.getTime())).sort((a,b)=>a.at.getTime()-b.at.getTime());
}
export function nextPrayer(rows: Prayer[], now = new Date()): Prayer | undefined { return rows.find(p=>p.at.getTime()>now.getTime()); }
export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'').replace(/[’'\-]/g,'');
}
export function validLocation(value: Location): boolean {
  try { new Intl.DateTimeFormat('en',{timeZone:value.timezone}).format(); } catch { return false; }
  return !!value.label.trim() && Number.isFinite(value.latitude) && Math.abs(value.latitude)<=90 && Number.isFinite(value.longitude) && Math.abs(value.longitude)<=180;
}
export function notificationRows(rows: Prayer[], settings: Settings, now = new Date()): Prayer[] {
  return settings.alerts ? rows.filter(p=>p.at>now&&!settings.muted.includes(p.name)).slice(0,60) : [];
}
