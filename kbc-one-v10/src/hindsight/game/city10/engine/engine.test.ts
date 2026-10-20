import { describe, expect, test } from 'bun:test';
import { buildCity, nearest, pointAt, RING_R } from './network';
import { buildGraph, routeTo, distance, approachRoad } from './routing';
import { NO_INPUT, step, collide } from './driving';
import { homePoint, layoutBlock } from './streets';
import { villageFor } from '../../../../one/village/model';
import { ROADS } from '../../../engine/roads';
const net = buildCity(undefined, { streets: true }), graph = buildGraph(net);
describe('v10 connected driving city', () => {
  test('every catalogue road has an avenue and the home block sits inside the ring', () => {
    expect(net.avenues.map(a => a.road.id).sort()).toEqual(ROADS.map(r => r.id).sort());
    expect(Math.hypot(homePoint(net).x, homePoint(net).z)).toBeLessThan(RING_R);
    expect(layoutBlock(net, villageFor('karim')).map(b => b.plot.kind)).toContain('business');
  });
  test('GPS can reach every avenue and fork from the centre without crossing buildings', () => {
    for (const path of net.paths) {
      const target = pointAt(path, path.length * .9).p;
      const route = routeTo(net, graph, homePoint(net), target);
      expect(route.length).toBeGreaterThan(1);
      expect(distance(route.at(-1)!, target)).toBeLessThan(.1);
      for (let i = 1; i < route.length; i++) {
        const mid = { x: (route[i].x + route[i-1].x) / 2, z: (route[i].z + route[i-1].z) / 2 };
        expect(nearest(net, mid.x, mid.z).dist).toBeLessThan(1);
      }
    }
  });
  test('throttle accelerates, brakes stop, steering changes course and collisions stay finite', () => {
    let car = { ...homePoint(net), heading: -Math.PI / 2, speed: 0 };
    for (let i = 0; i < 60; i++) car = step(car, { ...NO_INPUT, up: true }, 1/60, net, { maxSpeed: 42, throttle: 1 }).car;
    expect(car.speed).toBeGreaterThan(15);
    const oldHeading = car.heading;
    for (let i = 0; i < 10; i++) car = step(car, { ...NO_INPUT, up: true, left: true }, 1/60, net, { maxSpeed: 42, throttle: 1 }).car;
    expect(car.heading).not.toBe(oldHeading);
    for (let i = 0; i < 120; i++) car = step(car, { ...NO_INPUT, brake: true }, 1/60, net, { maxSpeed: 42, throttle: 1 }).car;
    expect(Math.abs(car.speed)).toBeLessThan(.1);
    expect(Number.isFinite(car.x + car.z + car.heading)).toBe(true);
  });
});


test('off-road freedom is not clamped to a life road', () => {
  const car = { x: 0, z: 0, heading: 0, speed: 20 };
  const result = step(car, { ...NO_INPUT, up: true }, .05, net, { maxSpeed: 42, throttle: 1 });
  expect(result.car.x).toBeCloseTo(0);
  expect(result.car.z).toBeGreaterThan(.9);
  expect(result.car.z).toBeLessThan(2);
  expect(result.near.dist).toBeGreaterThan(10);
});

test('building contacts push outward and scrub speed without trapping the car', () => {
  const box = { x: 0, z: 0, w: 10, d: 10, rot: Math.PI / 4 };
  expect(collide(100, 100, box)).toBeNull();
  const pushed = collide(0, 0, box)!;
  expect(Math.hypot(pushed.x, pushed.z)).toBeCloseTo(6.25);
  expect(collide(pushed.x * 1.001, pushed.z * 1.001, box)).toBeNull();
  const result = step({ x: 0, z: -6.4, heading: 0, speed: 20 }, NO_INPUT, .05, net, { maxSpeed: 42, throttle: 1, colliders: [{ ...box, rot: 0 }] });
  expect(result.scraped).toBe(true);
  expect(result.car.z).toBeLessThanOrEqual(-6.25);
  expect(result.car.speed).toBeLessThan(15);
});


test('autopilot routes around a building when returning from off-road', () => {
  const box = { x: 0, z: 0, w: 10, d: 10, rot: 0 };
  const route = approachRoad({ x: -15, z: 0 }, { x: 15, z: 0 }, [box]);
  expect(route.length).toBeGreaterThan(2);
  for (let i = 1; i < route.length; i++) for (let t = 0; t <= 1; t += .1) {
    const x = route[i - 1].x + (route[i].x - route[i - 1].x) * t, z = route[i - 1].z + (route[i].z - route[i - 1].z) * t;
    expect(Math.abs(x) > 6 || Math.abs(z) > 6).toBe(true);
  }
});
