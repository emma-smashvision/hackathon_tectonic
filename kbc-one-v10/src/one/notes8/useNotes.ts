"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Note8, NoteScopeProps } from "./types";

const CHANGE = "v8-demo-notes-changed";
const memoryTokens = new Map<string, string>();
function tokenFor(personId: string): string {
  const key = `kbc-v8-notes-owner:${personId}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored && /^[a-zA-Z0-9_-]{16,80}$/.test(stored)) return stored;
  } catch { /* Private-mode storage may be unavailable. */ }
  const token = memoryTokens.get(personId) ?? crypto.randomUUID();
  memoryTokens.set(personId, token);
  try { localStorage.setItem(key, token); } catch { /* In-memory ownership still works. */ }
  return token;
}
export function notifyNotesChanged() { window.dispatchEvent(new Event(CHANGE)); }
export async function notesRequest(body: Record<string, unknown>, method: "POST" | "DELETE") {
  const response = await fetch("/api/notes", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not update the note. Please try again.");
  notifyNotesChanged();
  return data;
}

export function useNotes({ roadId, stopId, personId }: NoteScopeProps, includeRoad = false, allStops = false) {
  const [owner, setOwner] = useState<{ personId: string; token: string } | null>(null);
  useEffect(() => { setOwner({ personId, token: tokenFor(personId) }); }, [personId]);
  const token = owner?.personId === personId ? owner.token : null;
  // v11-wa: a whole-road feed lets the world retain lanterns when a sheet closes.
  const query = new URLSearchParams({ road: roadId, ...(!allStops ? { stop: stopId ?? "" } : {}), includeRoad: String(includeRoad) }).toString();
  const scope = `${personId}:${query}`;
  const [state, setState] = useState<{ scope: string; notes: Note8[]; error: string | null; loaded: boolean }>({ scope, notes: [], error: null, loaded: false });
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async (force = false) => {
    if (!token || (inFlight.current && !force)) return;
    inFlight.current?.abort();
    const request = new AbortController();
    inFlight.current = request;
    try {
      const response = await fetch(`/api/notes?${query}`, { cache: "no-store", headers: { "x-notes-owner": token }, signal: request.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load notes.");
      if (mounted.current && inFlight.current === request && !request.signal.aborted) setState({ scope, notes: data.notes, error: null, loaded: true });
    } catch (error) {
      if (mounted.current && inFlight.current === request && !request.signal.aborted) setState((old) => ({ scope, notes: old.scope === scope ? old.notes : [], error: error instanceof Error ? error.message : "Could not load notes.", loaded: true }));
    } finally {
      if (inFlight.current === request) inFlight.current = null;
    }
  }, [query, scope, token]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 1000);
    const onChange = () => { void refresh(true); };
    window.addEventListener(CHANGE, onChange);
    return () => {
      mounted.current = false;
      inFlight.current?.abort();
      inFlight.current = null;
      window.clearInterval(timer);
      window.removeEventListener(CHANGE, onChange);
    };
  }, [refresh]);
  const remember = useCallback((note: Note8) => {
    setState((old) => ({ scope, notes: [note, ...(old.scope === scope ? old.notes.filter((n) => n.id !== note.id) : [])], error: null, loaded: true }));
  }, [scope]);
  const current = state.scope === scope ? state : { notes: [], error: null, loaded: false };
  // v11-wa: feedback is explicit, deduplicated by the server and then refreshed.
  const markUseful = useCallback(async (id: string): Promise<Note8> => {
    if (!token) throw new Error("Notes are still loading. Please try again.");
    const data = await notesRequest({ action: "useful", id, ownerToken: token }, "POST");
    await refresh(true);
    return data.note as Note8;
  }, [token, refresh]);
  return { ...current, token, refresh, remember, markUseful };
}
