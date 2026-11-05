import assert from 'node:assert/strict';
import test from 'node:test';
import { lunarPhase, lunarPath, lunarSchedule } from './lunar-phase';
test('known new and full moons have the expected illumination', () => {
  assert.ok(lunarPhase(new Date('2024-04-08T18:21:00Z')).fraction < 0.01);
  assert.ok(lunarPhase(new Date('2024-03-25T07:00:00Z')).fraction > 0.99);
  assert.equal(lunarPhase(new Date('2024-04-15T19:13:00Z')).waxing, true);
  assert.equal(lunarPhase(new Date('2024-04-02T03:15:00Z')).waxing, false);
});
test('offline phase samples span the prayer schedule and paths remain bounded', () => {
  const now = new Date('2026-11-05T20:00:00Z'),
    samples = lunarSchedule(now);
  assert.equal(samples.length, 68);
  assert.ok(samples[0]!.at <= now.getTime());
  assert.ok(samples.at(-1)!.at > now.getTime() + 16 * 86400000);
  for (const phase of samples) {
    assert.ok(phase.fraction >= 0 && phase.fraction <= 1);
    assert.match(lunarPath(phase), /^M.* Z$/);
  }
});
