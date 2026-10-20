// v8-channels: a thin display adapter; the crowd model owns every road/stop and claim.
import type { PersonRoad } from "../people";
import { PEOPLE } from "../people";
import { catalogueRoad, homeCardFor, type RoadViewOptions } from "../crowd";

export type RoadFocus = { roadId: string; stopId?: string };
export type ChannelCard = RoadFocus & { title: string; body: string; cta: string; care: boolean };
export function channelCardFor(person: PersonRoad | string, options: RoadViewOptions = {}): ChannelCard | null {
  const p = typeof person === "string" ? PEOPLE[person] : person;
  if (!p) return null;
  const card = homeCardFor(p, options);
  return card ? { roadId: card.roadId, stopId: card.stopId, title: card.title, body: card.line,
    cta: `${card.button}${card.source === "care" ? "" : " →"}`, care: !!catalogueRoad(card.roadId)?.care } : null;
}
