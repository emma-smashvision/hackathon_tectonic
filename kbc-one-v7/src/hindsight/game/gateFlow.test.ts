import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PEOPLE } from '../../one/people';
import { lifeOf } from '../../one/road';
import { roadmapFor, majorStops, monthBundles } from '../../one/roadmap/model';
import { buildMapNetwork } from './mapNetwork';
import { crossedForward, visibleGates, GATE_COOLDOWN_MS } from './gateFlow';
for (const id of ['tom', 'karim', 'sofie', 'lina']) test(`${id}: only major stops become arches; minor bills have one monthly sign`, () => {
  const map = roadmapFor(PEOPLE[id], {...lifeOf(PEOPLE[id]), plan: []}), world = buildMapNetwork(map);
  assert.deepEqual(world.majorGates.map(g => g.stop.id).sort(), map.tracks.flatMap(t => majorStops(t).map(s => s.id)).sort());
  assert.deepEqual(world.bundles.map(b => b.bundle.id).sort(), map.tracks.flatMap(t => monthBundles(t).map(b => b.id)).sort());
  assert.ok(world.majorGates.every(g => g.stop.weight === 'major' && g.stop.id !== 'today'));
  for (const sign of world.bundles) { assert.ok(sign.bundle.stops.every(s => s.weight === 'minor')); assert.ok(sign.title.endsWith(`bills · ${sign.bundle.count}`)); }
  if (id === 'tom') { assert.equal(world.bundles.find(b => b.bundle.month === '2026-10')!.title, 'October bills · 4'); assert.ok(!world.majorGates.some(g => /engie/i.test(g.stop.title))); }
});
test('gate approach ignores reverse, passed gates, stationary cars and other roads', () => {
  assert.equal(GATE_COOLDOWN_MS, 3000);
  assert.equal(crossedForward('a', 'a', 18, 20, 'a', 22), true);
  assert.equal(crossedForward('a', 'a', 18, 50, 'a', 22), true);
  assert.equal(crossedForward('a', 'a', 24, 20, 'a', 22), false);
  assert.equal(crossedForward('a', 'a', 23, 24, 'a', 22), false);
  assert.equal(crossedForward('a', 'a', 20, 20, 'a', 22), false);
  assert.equal(crossedForward('b', 'a', 18, 20, 'a', 22), false);
});
test('at most two arches and none inside the camera clearance', () => {
  const map = roadmapFor(PEOPLE.tom, {...lifeOf(PEOPLE.tom), plan: []}), world = buildMapNetwork(map);
  const gates = world.majorGates.filter(g => g.stop.trackId === 'everyday'), first = gates[0];
  const view = visibleGates(gates, first.pathId, first.s, {x: -1000, z: -1000});
  assert.ok(view.length <= 2); assert.equal(view[0].stop.id, first.stop.id);
  assert.ok(!visibleGates(gates, first.pathId, first.s, first.pos).includes(first));
  assert.ok(!visibleGates(gates, first.pathId, first.s + 3, {x:-1000,z:-1000}).includes(first));
  assert.deepEqual(visibleGates(gates, 'home', 0, {x:0,z:0}), []);
});

test('fork boards leave a clear view between the chase camera and car', async () => {
  const { roadSignVisible } = await import('./gateFlow');
  const camera={x:0,z:0}, car={x:0,z:30};
  assert.equal(roadSignVisible({x:4,z:24},camera,car),false);
  assert.equal(roadSignVisible({x:0,z:40},camera,car),true);
  assert.equal(roadSignVisible({x:20,z:24},camera,car),true);
  assert.equal(roadSignVisible({x:0,z:-5},camera,car),false);
});
