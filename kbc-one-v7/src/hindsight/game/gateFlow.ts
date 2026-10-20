import type { MapGate } from './mapNetwork';
import type { Vec2 } from './network';

export const GATE_COOLDOWN_MS = 3000;
/** Only approach from the road's start. Already-passed gates never pull the car back. */
export function crossedForward(pathId: string, beforePathId: string, before: number, after: number, gatePathId: string, at: number) {
  return pathId === gatePathId && beforePathId === pathId && after > before && before < at && after >= at - 3;
}

/** One solid gate and one distant preview, with a clear space around the chase camera. */
export function visibleGates(gates: MapGate[], pathId: string | undefined, s: number, camera: Vec2): MapGate[] {
  return gates.filter(g => g.pathId === pathId && g.s >= s - 2 && g.s < s + 110 && Math.hypot(camera.x - g.pos.x, camera.z - g.pos.z) >= 8)
    .sort((a, b) => a.s - b.s).slice(0, 2);
}

/** A fork board must not cover the car as the chase camera passes it. */
export function roadSignVisible(sign: Vec2, camera: Vec2, car: Vec2) {
  if (Math.hypot(sign.x-camera.x, sign.z-camera.z) < 18) return false;
  const dx=car.x-camera.x, dz=car.z-camera.z, length2=dx*dx+dz*dz;
  const t=length2 ? ((sign.x-camera.x)*dx+(sign.z-camera.z)*dz)/length2 : -1;
  return t<0 || t>1 || Math.hypot(sign.x-camera.x-t*dx, sign.z-camera.z-t*dz)>10;
}
