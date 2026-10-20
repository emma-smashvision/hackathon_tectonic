import { type CityNet, HALF_W, JUNCTION_R, type Nearest, nearest } from "./network";

// Arcade driving: the car moves freely but stays on the road network
// (no getting lost between buildings), with gentle lane assist on curves.

export interface Car {
  x: number;
  z: number;
  /** radians; forward = (sin h, cos h) */
  heading: number;
  speed: number;
}

export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
}

export const NO_INPUT: Input = { up: false, down: false, left: false, right: false, brake: false };

export interface DriveLimits {
  maxSpeed: number;
  /** extra slow-down factor 0..1 (1 = none), e.g. while a panel is open */
  throttle: number;
}

const ACCEL = 22;
const BRAKE = 46;
const REVERSE_MAX = 9;
const DRAG = 0.55;
const TURN = 2.1;
const ASSIST = 1.6;

function wrap(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export interface StepResult {
  car: Car;
  near: Nearest;
  scraped: boolean;
}

export function step(car: Car, input: Input, dt: number, net: CityNet, limits: DriveLimits): StepResult {
  const d = Math.min(dt, 0.05);
  let { x, z, heading, speed } = car;
  const max = limits.maxSpeed * limits.throttle;

  if (input.brake) speed -= Math.sign(speed) * Math.min(Math.abs(speed), BRAKE * d);
  if (input.up) speed += ACCEL * d * (speed < 0 ? 2 : 1);
  if (input.down) speed -= (speed > 0 ? BRAKE : ACCEL * 0.6) * d;
  if (!input.up && !input.down) speed -= speed * DRAG * d;
  if (speed > max) speed = Math.max(max, speed - BRAKE * d);
  if (speed < -REVERSE_MAX) speed = -REVERSE_MAX;
  if (Math.abs(speed) < 0.05 && !input.up && !input.down) speed = 0;

  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const grip = Math.max(-1, Math.min(1, speed / 7));
  heading += steer * TURN * grip * d;

  const before = nearest(net, x, z);
  // lane assist: with no steering, ease the heading toward the road direction
  if (steer === 0 && Math.abs(speed) > 1) {
    const roadH = Math.atan2(before.tangent.x, before.tangent.z);
    const forward = wrap(roadH - heading);
    const backward = wrap(roadH + Math.PI - heading);
    const target = Math.abs(forward) < Math.abs(backward) ? forward : backward;
    if (Math.abs(target) < 1.2) heading += Math.sign(target) * Math.min(Math.abs(target), ASSIST * d);
  }

  x += Math.sin(heading) * speed * d;
  z += Math.cos(heading) * speed * d;

  let near = nearest(net, x, z);
  let scraped = false;
  let limit = HALF_W - 0.9;
  // corners where an avenue meets the ring are wider, like a small square
  for (const j of net.junctions) {
    const dj = Math.hypot(x - j.x, z - j.z);
    if (dj < JUNCTION_R) {
      limit = Math.max(limit, JUNCTION_R - dj + HALF_W - 0.9);
    }
  }
  if (near.dist > limit) {
    // push back onto the road and scrub some speed
    const k = limit / near.dist;
    x = near.point.x + (x - near.point.x) * k;
    z = near.point.z + (z - near.point.z) * k;
    speed *= 1 - Math.min(0.9, 2.5 * d);
    scraped = true;
    near = nearest(net, x, z);
  }
  return { car: { x, z, heading: wrap(heading), speed }, near, scraped };
}
