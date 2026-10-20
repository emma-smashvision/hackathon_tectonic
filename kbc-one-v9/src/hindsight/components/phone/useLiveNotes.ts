"use client";

import { useEffect, useState } from "react";

export interface LiveNote {
  id: string;
  roadId: string;
  stopId: string | null;
  text: string;
  createdAt: number;
}

/** Approved notes from other drivers, from the notes API. Polls while mounted. */
export function useLiveNotes(roadId: string, every = 5000): LiveNote[] {
  const [notes, setNotes] = useState<LiveNote[]>([]);
  useEffect(() => {
    let stop = false;
    if (!roadId) {
      setNotes([]);
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/notes?road=${encodeURIComponent(roadId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { notes: LiveNote[] };
        if (!stop) setNotes(data.notes);
      } catch {
        /* offline: curated notes still show */
      }
    };
    load();
    const t = window.setInterval(load, every);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [roadId, every]);
  return notes;
}
