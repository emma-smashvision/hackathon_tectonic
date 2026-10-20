import { catalogue, catalogueRoad, stopEvidenceFor } from '@/one/crowd';
import { engineRoad } from '@/one/crowd/catalogue';
import { lessonsFor, type Lesson } from '@/one/learning';
import { lessonEvidence } from '@/one/learning/evidence';

export type Pickup = { kind: 'helped' | 'note' | 'principle'; label: string; share?: number; by?: string };
export type Mission = { id: string; roadId: string; name: string; lesson: Lesson; testDrive: boolean; count: number; drivers?: string };
export const engineRoadId = (roadId: string) => roadId === 'everyday-only' ? 'everyday' : roadId;

/** Only published lesson evidence enters the world. Missing notes remain missing. */
export function pickupsFor(lesson: Lesson): Pickup[] {
  const helped: Pickup[] = lesson.helped.slice(0, 2).map(item => ({ kind: 'helped', ...item }));
  while (helped.length < 2) helped.push({ kind: 'principle', label: helped.length ? lesson.apply.explain : lesson.reveal.detail ?? lesson.reveal.headline });
  return [...helped, lesson.note ? { kind: 'note', label: lesson.note.text, by: lesson.note.by } : { kind: 'principle', label: lesson.reveal.withheld ?? lesson.apply.explain }];
}

function previewLesson(roadId: string): Lesson | undefined {
  const road = engineRoad(roadId);
  const stop = road?.stops.find(s => s.kind === 'bump') ?? road?.stops[0];
  if (!stop || !road) return;
  const evidence = stopEvidenceFor(roadId, stop.id);
  if (!evidence?.available) return;
  const content = lessonEvidence(evidence);
  return {
    id: `preview:${roadId}`, personaId: 'preview', roadId, stopId: `${roadId}:${stop.id}`, order: 1,
    title: stop.title, month: stop.month, ...content, guess: { question: '', choices: [] },
    apply: { question: 'A new situation. How will you prepare?', explain: 'Check the timing and your own needs before you decide.', choices: [
      { id: 'check', label: evidence.helped[0]?.label ?? 'Check the timing and my own needs', correct: true },
      { id: 'assume', label: 'Assume the crowd result will happen to me', correct: false, why: 'A group result cannot predict your own outcome.' },
    ] }, reward: { label: 'Road explored' }, stamp: { icon: '↗', label: road.name }, synthetic: true,
  };
}

export function missionsFor(personaId: string): Mission[] {
  if (!['tom', 'karim', 'sofie', 'lina'].includes(personaId)) return [];
  const all = ['tom', 'karim', 'sofie', 'lina'].flatMap(lessonsFor);
  return catalogue.filter(road => !road.care && road.status === 'live').flatMap(road => {
    const own = lessonsFor(personaId).filter(l => l.roadId === road.id);
    const authored = all.filter(l => l.roadId === road.id);
    const preview = own.length ? own : authored.length ? authored : [previewLesson(road.id)].filter((l): l is Lesson => !!l);
    return preview.map(lesson => ({ id: `${personaId}/${lesson.id}`, roadId: road.id, name: road.name, lesson,
      testDrive: lesson.personaId !== personaId, count: preview.length,
      drivers: road.driverCount.shown && road.driverCount.value !== null ? new Intl.NumberFormat('nl-BE').format(road.driverCount.value) : undefined,
    }));
  });
}
export const roadName = (id: string) => catalogueRoad(id)?.name ?? id;
