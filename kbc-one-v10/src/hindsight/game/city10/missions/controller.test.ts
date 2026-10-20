import { describe, expect, test } from 'bun:test';
import type { CityApi, Vec2, Zone } from '../api';
import { MissionController, route } from './controller';
import { missionsFor, pickupsFor } from './catalogue';
import { lessonsFor } from '@/one/learning';

function setup(personaId = 'tom') {
  let position = { x: 0, z: 0 }; let frozen = false; let waypoint: Vec2 | null = null; let autopilot: Vec2 | null = null; let now = 100;
  const zones: { zone: Zone; cb: () => void }[] = [];
  const api: CityApi = {
    car: () => ({ pos: position, speed: 10, heading: Math.PI / 2 }), districts: () => [], roadPath: () => [{ x: 0, z: 0 }, { x: 300, z: 0 }],
    pointOn: (_, t) => ({ pos: { x: t * 300, z: 0 }, heading: Math.PI / 2 }), home: () => ({ x: 0, z: 0 }),
    setWaypoint: p => { waypoint = p; }, teleport: p => { position = { ...p }; }, setAutopilot: p => { autopilot = p; }, freeze: on => { frozen = on; },
    onEnter: (zone, cb) => { const item = { zone, cb }; zones.push(item); return () => { zones.splice(zones.indexOf(item), 1); }; }, cinematic: async () => {},
  };
  const controller = new MissionController(api, personaId);
  const move = (t: number, ms = 100) => { position = api.pointOn('moving-house', t).pos; now += ms; controller.tick(now); };
  const mission = controller.missions.find(m => !m.testDrive)!;
  return { controller, api, move, mission, zones, frozen: () => frozen, waypoint: () => waypoint, autopilot: () => autopilot };
}
async function reachPreparation(t: ReturnType<typeof setup>) {
  await t.controller.start(t.mission);
  for (let i = 0; i < 8; i++) t.move(route.convoy);
  for (const p of route.pickups) t.move(p, 2000);
  t.move(route.preparation, 2000);
  expect(t.controller.snapshot().phase).toBe('prepare');
}
describe('driving missions', () => {
  test('requires driving the convoy, all 3 pickups and the bump before passing', async () => {
    const t = setup(); await t.controller.start(t.mission);
    t.controller.choose('dated'); expect(t.controller.snapshot().phase).toBe('convoy');
    t.move(route.bump); expect(t.controller.snapshot().phase).toBe('convoy');
    for (let i = 0; i < 8; i++) t.move(route.convoy); expect(t.controller.snapshot().phase).toBe('collect');
    t.move(route.preparation); expect(t.controller.snapshot().phase).toBe('collect');
    route.pickups.forEach(p => t.move(p)); t.move(route.preparation);
    expect(t.frozen()).toBe(true); t.controller.choose('dated');
    expect(t.controller.snapshot().phase).toBe('cross'); expect(t.frozen()).toBe(false);
    t.move(route.bump); expect(t.controller.snapshot().phase).toBe('pave');
    t.move(route.bump, 1900); expect(t.controller.snapshot().phase).toBe('pave');
    t.move(route.finish); expect(t.controller.snapshot().phase).toBe('passed'); expect(t.frozen()).toBe(true);
  });
  test('a GPS mission is not replaced by another road beam on the way there', async () => {
    const t = setup('karim'); const detach = t.controller.attach(); t.controller.navigate(t.mission);
    t.zones.find(z => z.zone.id === 'mission:everyday-only')!.cb();
    expect(t.controller.snapshot().phase).toBe('roam');
    t.zones.find(z => z.zone.id === 'mission:freelance')!.cb();
    expect(t.controller.snapshot().mission?.lesson.id).toBe('karim:company');
    await Promise.resolve(); expect(t.controller.snapshot().phase).toBe('convoy'); detach();
  });
  test('assisted convoy keeps moving beyond the meeting point for Karim', async () => {
    const t = setup('karim'); await t.controller.start(t.mission); t.controller.driveForMe();
    const meeting = t.api.pointOn('freelance', route.convoy).pos;
    expect(t.autopilot()!.x).toBeGreaterThan(meeting.x);
    // Reaching the old stopping point does not end the assistance route.
    t.move(route.convoy); expect(t.controller.snapshot().phase).toBe('convoy');
    for (let i = 0; i < 8; i++) t.move(route.convoy + i * .008);
    expect(t.controller.snapshot().phase).toBe('collect');
  });
  test('autopilot crosses beyond the bump and targets missing out-of-order pickups', async () => {
    const t = setup(); await t.controller.start(t.mission);
    for (let i = 0; i < 8; i++) t.move(route.convoy);
    t.move(route.pickups[2]); t.move(route.pickups[0]); t.controller.driveForMe();
    expect(t.autopilot()).toEqual(t.api.pointOn('moving-house', route.pickups[1]).pos);
    t.move(route.pickups[1]); t.move(route.preparation); t.controller.choose('dated'); t.controller.driveForMe();
    expect(t.autopilot()).toEqual(t.api.pointOn('moving-house', route.finish).pos);
  });
  test('wrong preparation jolts; rewind keeps hindsight and never passes early', async () => {
    const t = setup(); await reachPreparation(t); t.controller.choose('half');
    t.move(route.bump, 2000); expect(t.controller.snapshot().phase).toBe('rewind');
    const before = t.api.car().pos; t.controller.rewind();
    expect(t.controller.snapshot().collected).toEqual([0, 1, 2]); expect(t.controller.snapshot().rewinds).toBe(1);
    expect(t.api.car().pos.x).toBeLessThan(before.x); expect(t.controller.snapshot().phase).toBe('collect');
    t.move(route.preparation); t.controller.choose('dated'); t.move(route.bump); t.move(route.finish, 1900);
    expect(t.controller.snapshot().phase).toBe('passed');
  });
  test('pause stops pickup rules and preserves frozen choice state', async () => {
    const t = setup(); await t.controller.start(t.mission); for (let i = 0; i < 8; i++) t.move(route.convoy); t.controller.pause();
    t.move(route.pickups[0]); expect(t.controller.snapshot().collected).toEqual([]);
    t.controller.pause(); t.controller.tick(2000, true); expect(t.controller.snapshot().collected).toEqual([]); route.pickups.forEach(p => t.move(p)); t.move(route.preparation);
    t.controller.pause(); t.controller.choose('dated'); expect(t.controller.snapshot().phase).toBe('prepare');
    t.controller.pause(); expect(t.frozen()).toBe(true);
  });
  test('zone starts mission, cleanup releases zones and ignores pending cinematic', async () => {
    const t = setup(); const detach = t.controller.attach(); expect(t.zones.length).toBeGreaterThan(4);
    t.zones.find(z => z.zone.id === 'mission:moving-house')!.cb(); expect(t.controller.snapshot().phase).toBe('intro');
    detach(); await Promise.resolve(); expect(t.zones).toHaveLength(0); expect(t.frozen()).toBe(false);
  });
  test('next marker advances through all own lessons; explicit replay selects exact lesson', () => {
    const t = setup(); t.controller.setDone([t.mission.lesson.id]);
    expect(t.controller.markers().find(m => m.roadId === 'moving-house')!.lesson.order).toBe(2);
    t.controller.navigate(t.mission); expect(t.controller.markers().find(m => m.roadId === 'moving-house')!.lesson.order).toBe(1);
    expect(t.waypoint()).toEqual(t.api.pointOn('moving-house', route.marker).pos);
  });
  test('Karim can test-drive Tom without gaining Karim rewards; all playable lessons exist', () => {
    const karim = missionsFor('karim'); expect(karim.find(m => m.lesson.id === 'tom:energy-new-address')?.testDrive).toBe(true);
    expect(karim.find(m => m.lesson.id === 'karim:company')?.testDrive).toBe(false);
    for (const id of ['tom', 'karim', 'sofie', 'lina']) for (const l of lessonsFor(id)) expect(missionsFor(id).some(m => !m.testDrive && m.lesson.id === l.id)).toBe(true);
    expect(missionsFor('margaret')).toEqual([]); expect(missionsFor('nadia')).toEqual([]);
  });
  test('pickups copy gated shares and notes, never invent a note or a rate', () => {
    for (const person of ['tom', 'karim', 'sofie', 'lina']) for (const lesson of lessonsFor(person)) {
      const pickups = pickupsFor(lesson); expect(pickups).toHaveLength(3);
      pickups.filter(p => p.share !== undefined).forEach(p => expect(lesson.helped.some(h => h.share === p.share && h.label === p.label)).toBe(true));
      expect(pickups.filter(p => p.kind === 'note').length).toBe(lesson.note ? 1 : 0);
    }
  });
});
