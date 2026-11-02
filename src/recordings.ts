export type RecordingId = 'beautiful';
export const recordings = {
  beautiful: { label: 'Beautiful Adhan', file: 'athan_beautiful.mp3', iosSound: 'athan_beautiful_short.wav', channel: 'athan-beautiful-v1' },
} as const;
export function recordingFor(_value: unknown) { return recordings.beautiful; }
