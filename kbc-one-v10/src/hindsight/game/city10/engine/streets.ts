import type { Village, Plot } from "../../../../one/village/types";
import { type CityNet, pointAt, type Vec2 } from "./network";
// v6's street-side layout, adapted to the amount-free villageFor model.
export interface BlockSpot {
  id: string; plot: Plot; x: number; z: number; width: number; depth: number; door: Vec2;
}
export function layoutBlock(net: CityNet, village: Village): BlockSpot[] {
  const street = net.streets[0];
  if (!street) return [];
  return village.plots.map((plot, i) => {
    const { p, tan } = pointAt(street, street.length * .5 + (i - (village.plots.length - 1) / 2) * 24);
    return { id: plot.id, plot, x: p.x - tan.z * 19, z: p.z + tan.x * 19, width: 16, depth: 16, door: p };
  });
}
export function homePoint(net: CityNet): Vec2 {
  return pointAt(net.streets[0] ?? net.ring, (net.streets[0] ?? net.ring).length / 2).p;
}
