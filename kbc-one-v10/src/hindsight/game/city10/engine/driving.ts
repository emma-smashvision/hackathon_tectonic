import { type CityNet, HALF_W, type Nearest, nearest } from "./network";
// Ported from v6: free arcade steering, now with forgiving shoulders, a small
// handbrake slide, and actual building collisions instead of invisible rails.
export interface Car {
  x: number;
  z: number;
  /** radians; forward = (sin h, cos h) */
  heading: number;
  speed: number;
  /** Velocity direction eases behind the body during a handbrake turn. */
  travelHeading?: number;
}
export interface Input { up: boolean; down: boolean; left: boolean; right: boolean; brake: boolean }
export const NO_INPUT: Input = { up: false, down: false, left: false, right: false, brake: false };
export interface Collider { x: number; z: number; w: number; d: number; rot: number }
export interface DriveLimits { maxSpeed: number; throttle: number; boost?: boolean; colliders?: readonly Collider[] }
export interface StepResult { car: Car; near: Nearest; scraped: boolean }
export function wrap(a: number): number { return Math.atan2(Math.sin(a), Math.cos(a)); }
const ACCEL = 24, BRAKE = 45, REVERSE_MAX = 10, DRAG = .65;
/** Push the car's small collision circle out of a rotated building footprint. */
export function collide(x: number, z: number, box: Collider): { x: number; z: number } | null {
  const cos = Math.cos(box.rot), sin = Math.sin(box.rot), dx = x - box.x, dz = z - box.z;
  const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
  const hx = box.w / 2 + 1.25, hz = box.d / 2 + 1.25;
  if (Math.abs(lx) >= hx || Math.abs(lz) >= hz) return null;
  let px = lx, pz = lz;
  if (hx - Math.abs(lx) < hz - Math.abs(lz)) px = (lx < 0 ? -1 : 1) * hx;
  else pz = (lz < 0 ? -1 : 1) * hz;
  return { x: box.x + px * cos + pz * sin, z: box.z - px * sin + pz * cos };
}
export function step(car: Car, input: Input, dt: number, net: CityNet, limits: DriveLimits): StepResult {
  const d = Math.max(0, Math.min(dt, .05));
  let { x, z, heading, speed } = car;
  const before = nearest(net, x, z), onRoad = before.dist <= HALF_W + 2.5;
  const max = limits.maxSpeed * limits.throttle * (onRoad ? 1 : .6);
  if (limits.boost && speed > 0 && !input.brake && !input.down) speed += 20 * d;
  if (input.up) speed += ACCEL * d * (speed < 0 ? 2 : 1);
  if (input.down) speed -= (speed > 0 ? BRAKE : ACCEL * .55) * d;
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const sliding = input.brake && steer !== 0 && Math.abs(speed) > 8;
  if (input.brake) speed -= Math.sign(speed) * Math.min(Math.abs(speed), (sliding ? 16 : BRAKE) * d);
  if (!input.up && !input.down) speed *= Math.exp(-DRAG * d * (onRoad ? 1 : 1.8));
  if (speed > max) speed = Math.max(max, speed - BRAKE * d);
  speed = Math.max(-REVERSE_MAX, speed);
  if (Math.abs(speed) < .05 && !input.up && !input.down) speed = 0;
  const turn = (2.2 - Math.min(.7, Math.abs(speed) / 60)) * (sliding ? 1.4 : 1);
  heading += steer * turn * Math.max(-1, Math.min(1, speed / 6)) * d;
  // A subtle aid on the tarmac; junctions stay a deliberate driver choice.
  if (!steer && onRoad && Math.abs(speed) > 2 && !input.brake) {
    const roadH = Math.atan2(before.tangent.x, before.tangent.z);
    const forward = wrap(roadH - heading), backward = wrap(roadH + Math.PI - heading);
    const correction = Math.abs(forward) < Math.abs(backward) ? forward : backward;
    const junction = net.junctions.some(j => Math.hypot(j.x - x, j.z - z) < 14);
    if (!junction && Math.abs(correction) < .55) heading += correction * (1 - Math.exp(-2.2 * d));
  }
  let travelHeading = car.travelHeading ?? heading;
  travelHeading += wrap(heading - travelHeading) * (1 - Math.exp(-(sliding ? 3.2 : 14) * d));
  x += Math.sin(travelHeading) * speed * d; z += Math.cos(travelHeading) * speed * d;
  let scraped = false;
  for (const box of limits.colliders ?? []) {
    // Cheap broad phase before the oriented rectangle calculation.
    if (Math.abs(x - box.x) > box.w + box.d || Math.abs(z - box.z) > box.w + box.d) continue;
    const pushed = collide(x, z, box);
    if (pushed) { x = pushed.x; z = pushed.z; speed *= Math.exp(-9 * d); scraped = true; }
  }
  const radius = Math.hypot(x, z), boundary = net.radius + 100;
  if (radius > boundary) { x *= boundary / radius; z *= boundary / radius; speed *= Math.exp(-5 * d); scraped = true; }
  return { car: { x, z, heading: wrap(heading), speed, travelHeading: wrap(travelHeading) }, near: nearest(net, x, z), scraped };
}
