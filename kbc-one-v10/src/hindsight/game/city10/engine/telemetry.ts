import type { DrivingTelemetry } from '../api';
import type { Car, Input } from './driving';
export function drivingTelemetry(car: Car, input: Input, boosting: boolean, paused = false): DrivingTelemetry {
  const speed = paused ? 0 : car.speed;
  const angle = car.heading - (car.travelHeading ?? car.heading);
  const slip = Math.min(1, Math.abs(Math.sin(angle)) * Math.min(1, Math.abs(speed) / 12) * 1.8);
  return { speed, rpm: Math.min(1, .12 + Math.abs(speed) / 58 * .76 + (!paused && input.up ? .1 : 0)), slip,
    boosting: boosting && !paused, throttle: paused ? 0 : input.up ? 1 : 0, braking: !paused && (input.down || input.brake) };
}
