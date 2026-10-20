import { makePath, pointAt, type CityNet, type Path, type Vec2 } from './network';
import type { Car } from './driving';
const LANE = 2.65;
const TAU = Math.PI * 2;
export interface TrafficCar {
  id: number; path: Path; ring: boolean; direction: 1 | -1;
  s: number; speed: number; cruise: number; x: number; z: number; heading: number;
  braking: boolean; yieldOffset: number;
}
const mod = (x: number, n: number) => ((x % n) + n) % n;
/** Two-way lane loops. Avenue ends use a small semicircle, never a teleport. */
export function trafficPose(car: Pick<TrafficCar, 'path' | 'ring' | 'direction' | 's' | 'yieldOffset'>): { pos: Vec2; heading: number } {
  const { path, ring, direction, yieldOffset } = car;
  if (ring) {
    const { p, tan } = pointAt(path, mod(car.s * direction, path.length));
    const lane = (LANE + yieldOffset) * direction;
    return { pos: { x: p.x + tan.z * lane, z: p.z - tan.x * lane }, heading: Math.atan2(tan.x * direction, tan.z * direction) };
  }
  const length = path.length, cap = Math.PI * LANE, s = mod(car.s, length * 2 + cap * 2);
  if (s <= length || (s >= length + cap && s <= length * 2 + cap)) {
    const outward = s <= length, at = outward ? s : length * 2 + cap - s;
    const { p, tan } = pointAt(path, at), dir = outward ? 1 : -1, lane = (LANE + yieldOffset) * dir;
    return { pos: { x: p.x + tan.z * lane, z: p.z - tan.x * lane }, heading: Math.atan2(tan.x * dir, tan.z * dir) };
  }
  const end = s < length + cap, angle = (end ? s - length : s - length * 2 - cap) / LANE;
  const { p, tan } = pointAt(path, end ? length : 0), sign = end ? 1 : -1;
  const right = { x: tan.z, z: -tan.x };
  return {
    pos: { x: p.x + sign * LANE * (right.x * Math.cos(angle) + tan.x * Math.sin(angle)), z: p.z + sign * LANE * (right.z * Math.cos(angle) + tan.z * Math.sin(angle)) },
    heading: Math.atan2(sign * (-right.x * Math.sin(angle) + tan.x * Math.cos(angle)), sign * (-right.z * Math.sin(angle) + tan.z * Math.cos(angle))),
  };
}
export function createTraffic(net: CityNet): TrafficCar[] {
  return Array.from({ length: 20 }, (_, i) => {
    const ring = i < 8, av = net.avenues[(i - 8 + net.avenues.length) % net.avenues.length];
    const pts = av.branches ? [...av.trunk.pts, ...av.branches[0].pts.slice(1)] : av.trunk.pts;
    const path = ring ? net.ring : makePath(`traffic:${av.road.id}`, av.road.id, 'trunk', pts, pts.map(() => 0));
    const direction = (i % 2 ? -1 : 1) as 1 | -1;
    const s = ring ? ((Math.floor(i / 2) / 4 + (i % 2 ? .08 : .02)) * path.length) : path.length * (.15 + ((i * .137) % .7));
    const car: TrafficCar = { id: i, path, ring, direction, s, speed: 0, cruise: 12 + (i % 5) * 1.4, x: 0, z: 0, heading: 0, braking: false, yieldOffset: 0 };
    const pose = trafficPose(car); car.x = pose.pos.x; car.z = pose.pos.z; car.heading = pose.heading;
    return car;
  });
}
/** Deterministic, bounded O(20²). Brake distance includes the player's projected
 * position so traffic yields before a crossing, rather than after contact. */
export function stepTraffic(cars: TrafficCar[], player: Car, delta: number): void {
  const dt = Math.max(0, Math.min(delta, .1));
  const targets = cars.map(car => {
    let target = car.cruise, yielding = false;
    const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    const avoid = (x: number, z: number, clearance: number, isPlayer: boolean) => {
      const dx = x - car.x, dz = z - car.z, ahead = dx * fx + dz * fz, lateral = Math.abs(dx * fz - dz * fx);
      if (ahead > -2 && ahead < 9 + car.speed * car.speed / 9 && lateral < clearance) {
        target = Math.min(target, Math.sqrt(Math.max(0, ahead - 7) * 7));
        if (isPlayer) yielding = true;
      }
    };
    avoid(player.x, player.z, 3.5, true);
    avoid(player.x + Math.sin(player.heading) * player.speed * .45, player.z + Math.cos(player.heading) * player.speed * .45, 3, true);
    for (const other of cars) if (other !== car) avoid(other.x, other.z, 2.4, false);
    return { target, yielding };
  });
  cars.forEach((car, i) => {
    const { target, yielding } = targets[i];
    car.braking = target < car.speed - .3 || target < .5;
    car.speed += Math.max(-16 * dt, Math.min(3.5 * dt, target - car.speed));
    car.yieldOffset += ((yielding ? .35 : 0) - car.yieldOffset) * (1 - Math.exp(-3 * dt));
    car.s = mod(car.s + car.speed * dt, car.ring ? car.path.length : car.path.length * 2 + TAU * LANE);
    const pose = trafficPose(car); car.x = pose.pos.x; car.z = pose.pos.z; car.heading = pose.heading;
  });
}
