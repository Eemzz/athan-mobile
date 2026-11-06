export function formatCountdown(at: Date, now = new Date(), timezone?: string): string {
  const minutes = Math.max(1, Math.ceil((at.getTime() - now.getTime()) / 60000));
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `In ${minutes >= 60 ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60}m${day.format(at) !== day.format(now) ? ' · Tomorrow' : ''}`;
}
