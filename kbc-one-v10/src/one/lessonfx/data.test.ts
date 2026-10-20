import { expect, test } from 'bun:test';
import { lessonsFor } from '@/one/learning';
import { stopEvidenceFor } from '@/one/crowd';
import { dataFromEvidence, formatLessonDate, lessonFxData, ratioFor } from './data';
test('lesson cinema reads published cells and cannot leak hidden histogram edges or measurements', () => {
  const lesson = lessonsFor('tom')[0], evidence = structuredClone(stopEvidenceFor('moving-house', 'energy-new-address')!);
  const hidden = { shown: false, value: 987654, reason: 'Withheld' };
  evidence.surprised.median = hidden; evidence.surprised.share = hidden;
  evidence.surprised.range[0] = { id: 'hidden', lower: hidden, upper: hidden, count: hidden, share: hidden };
  const data = dataFromEvidence(lesson, evidence);
  expect(data.median).toBeUndefined(); expect(data.rate).toBeUndefined(); expect(data.ratio).toBeUndefined();
  expect(data.bars[0]).toEqual({ id: 'hidden', label: 'Band not published' });
  expect(JSON.stringify(data)).not.toContain('987654');
  expect(data.headline).toBe('The outcome is not published for this group.');
  evidence.helped[0].outcome = hidden;
  expect(dataFromEvidence(lesson, evidence).lanes[0].share).toBeUndefined();
  evidence.available = false;
  expect(dataFromEvidence(lesson, evidence).bars).toEqual([]);
  expect(dataFromEvidence(lesson, evidence).lanes).toEqual([]);
});
test('a one-in-N scene is only used within one percentage point of the gated rate', () => {
  expect(ratioFor(1 / 7)).toBe(7); expect(ratioFor(.141)).toBe(7);
  expect(ratioFor(.42)).toBeUndefined(); expect(ratioFor(0)).toBeUndefined(); expect(ratioFor(undefined)).toBeUndefined();
  for (const id of ['tom', 'sofie', 'lina']) for (const lesson of lessonsFor(id)) {
    const data = lessonFxData(lesson); if (data.ratio) expect(Math.abs(1 / data.ratio - data.rate!)).toBeLessThanOrEqual(.01);
  }
});
test('Karim keeps both published horizons and no invented helped rates or source note', () => {
  const lesson = lessonsFor('karim')[0], data = lessonFxData(lesson);
  expect(data.forks).toHaveLength(4); expect(data.forks.map(f => f.horizon)).toEqual([1, 1, 3, 3]);
  expect(data.bars).toHaveLength(0); expect(data.rate).toBeUndefined();
  expect(data.lanes.every(l => l.share === undefined)).toBe(true); expect(lesson.note).toBeUndefined();
});
test('calendar dates use human text without timezone shifts or invented dates', () => {
  expect(formatLessonDate('Due 2027-01-01.')).toBe('Due 1 Jan 2027.');
  expect(formatLessonDate('— a mover, 2025')).toBe('— a mover, 2025');
  expect(formatLessonDate('2027-02-30')).toBe('2027-02-30');
});
