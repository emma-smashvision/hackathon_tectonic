"use client";

import { useEffect, useState } from "react";
import { PEOPLE } from "../people";
import { catalogueRoad, confirmRoad, pointersFor, previewRoad, type PersonPointers } from "../crowd";

const storageKey = (id: string) => `kbcone.v8.pointers:${id}`;
/** Restore only valid published identities and explicit stages; never trust stored numeric evidence. */
export function restorePointers(id: string, raw: unknown): PersonPointers {
  let pointers = pointersFor(id);
  if (!raw || typeof raw !== "object" || (raw as PersonPointers).personId !== id) return pointers;
  const saved = raw as PersonPointers;
  try {
    if (saved.confirmed && saved.confirmed.provenance === "told") pointers = confirmRoad(pointers, saved.confirmed.roadId, saved.confirmed.stage);
    for (const preview of Array.isArray(saved.exploring) ? saved.exploring : []) {
      if (!catalogueRoad(preview.roadId) || !preview.stage || typeof preview.stage.label !== "string") continue;
      const month = preview.stage.month;
      if (month !== null && (!Number.isInteger(month) || month < 0 || month > catalogueRoad(preview.roadId)!.months)) continue;
      pointers = previewRoad(pointers, preview.roadId, preview.stage);
    }
  } catch { /* Invalid saved state never changes seed placement. */ }
  return pointers;
}

export function useRoadPointers(personId: string) {
  const [saved, setSaved] = useState<Record<string, PersonPointers>>({});
  useEffect(() => {
    const loaded: Record<string, PersonPointers> = {};
    for (const id of Object.keys(PEOPLE)) {
      try { loaded[id] = restorePointers(id, JSON.parse(localStorage.getItem(storageKey(id)) ?? "null")); } catch { /* optional storage */ }
    }
    setSaved(loaded);
  }, []);
  const id = PEOPLE[personId] ? personId : "tom";
  const pointers = saved[id] ?? pointersFor(id);
  const updatePointers = (next: PersonPointers) => {
    if (next.personId !== id) return;
    setSaved(previous => ({ ...previous, [id]: next }));
    try { localStorage.setItem(storageKey(id), JSON.stringify(next)); } catch { /* state still works in memory */ }
  };
  return { pointers, updatePointers, resetPointers: () => updatePointers(pointersFor(id)) };
}
