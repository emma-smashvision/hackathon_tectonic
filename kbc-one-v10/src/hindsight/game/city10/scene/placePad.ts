// r2-places: shared geometry for the visible pad, parked car and arrival zone.
import type { BlockSpot } from '../engine/streets';
export const placePad = (block: Pick<BlockSpot, 'x' | 'z' | 'door'>) => ({
  x: block.door.x + (block.x - block.door.x) * .4,
  z: block.door.z + (block.z - block.door.z) * .4,
});
