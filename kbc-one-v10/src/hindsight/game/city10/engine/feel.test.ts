import { describe, expect, test } from 'bun:test';
import { buildCity, nearest } from './network';
import { createTraffic, stepTraffic, trafficPose } from './traffic';
import { drivingTelemetry } from './telemetry';
import { createEngine } from './runtime';
import { villageFor } from '../../../../one/village/model';
import { NO_INPUT, step } from './driving';
const net = buildCity(undefined, { streets: true });
describe('ambient traffic', () => {
  test('twenty cars populate both lanes and avenues, with continuous turnaround', () => {
    const cars = createTraffic(net);
    expect(cars.length).toBe(20); expect(cars.filter(c => c.ring).length).toBe(8);
    expect(new Set(cars.filter(c => c.ring).map(c => c.direction)).size).toBe(2);
    for (let frame = 0; frame < 240; frame++) stepTraffic(cars, { x: 0, z: 0, heading: 0, speed: 0 }, 1 / 60);
    for (const car of cars) { expect(car.speed).toBeGreaterThan(0); expect(nearest(net, car.x, car.z).dist).toBeLessThan(3.5); }
    const car = cars[8];
    const before = trafficPose({ ...car, s: car.path.length - .01 });
    const after = trafficPose({ ...car, s: car.path.length + .01 });
    expect(Math.hypot(after.pos.x - before.pos.x, after.pos.z - before.pos.z)).toBeLessThan(.03);
  });
  test('traffic brakes before a stationary player and resumes when clear', () => {
    const car = createTraffic(net)[8]; car.s = 30; car.speed = 13;
    const pose = trafficPose(car); Object.assign(car, { x: pose.pos.x, z: pose.pos.z, heading: pose.heading });
    const ahead = trafficPose({ ...car, s: car.s + 19 });
    const player = { ...ahead.pos, heading: ahead.heading, speed: 0 };
    let closest = Infinity;
    for (let i = 0; i < 360; i++) { stepTraffic([car], player, 1/60); closest = Math.min(closest, Math.hypot(car.x - player.x, car.z - player.z)); }
    expect(closest).toBeGreaterThan(5); expect(car.speed).toBeLessThan(.1); expect(car.braking).toBe(true);
    for (let i = 0; i < 120; i++) stepTraffic([car], { x: 0, z: 0, heading: 0, speed: 0 }, 1/60);
    expect(car.speed).toBeGreaterThan(5);
  });
});
describe('driving feedback API', () => {
  test('slip and RPM are bounded and paused telemetry is silent', () => {
    const c = { x: 0, z: 0, heading: .7, travelHeading: 0, speed: 30 };
    const t = drivingTelemetry(c, { ...NO_INPUT, up: true }, true);
    expect(t.slip).toBeGreaterThan(.5); expect(t.rpm).toBeLessThanOrEqual(1); expect(t.boosting).toBe(true);
    expect(drivingTelemetry(c, NO_INPUT, true, true)).toEqual({ speed: 0, rpm: .12, slip: 0, boosting: false, throttle: 0, braking: false });
  });
  test('boost is bounded, reversible, and adds acceleration', () => {
    const engine = createEngine(villageFor('tom')); engine.rt.current.car.speed = 20;
    engine.api.boost!(900); expect(engine.rt.current.boostMs).toBe(900); expect(engine.rt.current.car.speed).toBe(26);
    engine.api.boost!(10000); expect(engine.rt.current.boostMs).toBe(2500);
    engine.api.boost!(NaN); expect(engine.rt.current.boostMs).toBe(0);
    const c = { ...engine.api.home(), heading: -Math.PI / 2, speed: 20 };
    const normal = step(c, { ...NO_INPUT, up: true }, .05, net, { maxSpeed: 42, throttle: 1 });
    const boost = step(c, { ...NO_INPUT, up: true }, .05, net, { maxSpeed: 54, throttle: 1, boost: true });
    expect(boost.car.speed).toBeGreaterThan(normal.car.speed);
  });
  test('telemetry unsubscribe and replacement-marker cleanup are safe', () => {
    const { api, rt } = createEngine(villageFor('tom')); let calls = 0;
    const off = api.onSpeed!(() => calls++); expect(calls).toBe(1); expect(rt.current.speedListeners.size).toBe(1); off(); expect(rt.current.speedListeners.size).toBe(0);
    const first = api.spawnMarker!({ id: 'test', at: { x: 0, z: 0 } });
    const second = api.spawnMarker!({ id: 'test', at: { x: 5, z: 5 }, label: 'Replacement' });
    first(); expect(rt.current.spawnedMarkers.get('test')?.at.x).toBe(5);
    second(); expect(rt.current.spawnedMarkers.size).toBe(0);
  });
});
