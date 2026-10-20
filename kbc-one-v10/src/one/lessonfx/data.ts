import { forkEvidenceFor, stopEvidenceFor, type CrowdNumber, type StopEvidence } from '@/one/crowd';
import type { Lesson } from '@/one/learning';

export type CrowdBar = { id: string; label: string; lower?: number; upper?: number; share?: number; count?: number };
export type CrowdLane = { id: string; label: string; share?: number };
export type ForkColumn = { id: string; label: string; horizon: number; buffer?: number; admin?: number };
export type LessonFxData = {
  bars: CrowdBar[]; median?: number; rate?: number; ratio?: number;
  lanes: CrowdLane[]; forks: ForkColumn[]; headline: string; withheld?: string;
};
export const money = (n: number) => new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const number = (n?: CrowdNumber) => n?.shown && n.value !== null && Number.isFinite(n.value) ? n.value : undefined;
export function ratioFor(rate: number | undefined): number | undefined {
  if (rate === undefined || rate <= 0 || rate > 1) return;
  const n = Math.round(1 / rate);
  return n >= 2 && n <= 20 && Math.abs(1 / n - rate) <= .01 ? n : undefined;
}
/** Exact calendar dates only; UTC prevents a date shifting with the viewer's timezone. */
export function formatLessonDate(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (raw, y, m, d) => {
    const date = new Date(Date.UTC(+y, +m - 1, +d));
    return date.getUTCFullYear() === +y && date.getUTCMonth() === +m - 1 && date.getUTCDate() === +d
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : raw;
  });
}
/** Public gates are checked for every cell, not just for the whole stop. No raw simulation access. */
export function dataFromEvidence(lesson: Lesson, evidence: StopEvidence | null): LessonFxData {
  const available = evidence?.available ? evidence : null;
  const median = number(available?.surprised.median), rate = number(available?.surprised.share);
  const bars = available?.surprised.range.map(bin => {
    const lower = number(bin.lower), upper = number(bin.upper), share = number(bin.share), count = number(bin.count);
    // A closed bin with a suppressed upper edge must not become an invented open-ended band.
    const open = bin.upper.reason === 'Open-ended amount band.';
    const published = lower !== undefined && (upper !== undefined || open) && count !== undefined && share !== undefined;
    return published ? { id: bin.id, lower, upper, share, count, label: upper === undefined ? `${money(lower)}+` : `${money(lower)}–${money(upper)}` }
      : { id: bin.id, label: 'Band not published' };
  }) ?? [];
  const ratio = ratioFor(rate);
  const who = lesson.roadId === 'moving-house' ? 'movers' : 'households';
  const event = lesson.stopId.endsWith('setting-up') ? 'setup costs' : lesson.stopId.endsWith('december') ? 'December spending' : lesson.stopId.endsWith('energy-year') ? 'their yearly bill' : 'their first bill';
  const headline = rate === undefined ? evidence ? available?.kind === 'boost' && median !== undefined ? `Typical amount received: ${money(median)}.` : 'The outcome is not published for this group.' : lesson.reveal.headline : `${ratio ? `1 in ${ratio}` : `${Math.round(rate * 100)}% of`} ${who} couldn't cover ${event} from their buffer.`;
  const helped = available ? available.helped.map(h => { const outcome = number(h.outcome); return { label: h.label, share: outcome === undefined ? undefined : Math.round(outcome * 100) }; }) : evidence ? [] : lesson.helped;
  return { bars, median, rate, ratio, headline: formatLessonDate(headline), withheld: lesson.reveal.withheld,
    lanes: helped.slice(0, 3).map((h, i) => ({ id: `helped-${i}`, label: formatLessonDate(h.label), ...(h.share !== undefined && Number.isFinite(h.share) && h.share >= 0 && h.share <= 100 ? { share: h.share } : {}) })), forks: [] };
}
export function lessonFxData(lesson: Lesson): LessonFxData {
  const stopId = lesson.stopId.startsWith(`${lesson.roadId}:`) ? lesson.stopId.slice(lesson.roadId.length + 1) : lesson.stopId;
  const evidence = stopEvidenceFor(lesson.roadId, stopId);
  const data = dataFromEvidence(lesson, evidence);
  if (!evidence && lesson.reveal.table) {
    const fork = forkEvidenceFor(lesson.roadId);
    if (fork?.id === lesson.stopId) data.forks = fork.comparisons.flatMap(c => c.branches.map(b => ({
      id: `${c.horizon}-${b.id}`, label: b.id === 'sole' ? 'Sole trader' : b.label, horizon: c.horizon,
      buffer: number(b.metrics.find(m => m.key === 'buffer')?.value),
      admin: number(b.metrics.find(m => m.key === 'admin')?.value),
    })));
  }
  return data;
}
