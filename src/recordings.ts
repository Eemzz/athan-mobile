export type RecordingId = 'beautiful' | 'prophets-mosque';
export const recordings = {
  beautiful: { label: 'Beautiful Adhan', file: 'athan_beautiful.mp3', iosSound: 'athan_beautiful_short.wav', channel: 'athan-beautiful-v1' },
  'prophets-mosque': { label: 'Prophet’s Mosque', file: 'athan.mp3', iosSound: 'athan_short.wav', channel: 'athan-sound-v1' },
} as const;
export function recordingFor(value: unknown) {
  return value === 'prophets-mosque' ? recordings['prophets-mosque'] : recordings.beautiful;
}
