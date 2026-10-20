"use client";

import { useEffect } from "react";
import type { Note8 } from "@/one/notes8/types";
import { useNotes } from "@/one/notes8/useNotes";

/** One subscription per public road, shared by all of its area plots. */
export function NotesFeed({ roadId, personaId, onNotes }: { roadId: string; personaId: string; onNotes: (roadId: string, notes: Note8[]) => void }) {
  const { notes, loaded } = useNotes({ roadId, personId: personaId }, false, true);
  useEffect(() => { if (loaded) onNotes(roadId, notes); }, [roadId, notes, loaded, onNotes]);
  return null;
}
