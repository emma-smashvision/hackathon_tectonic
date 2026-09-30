"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Entry = Tables<"entries">;

export function WordList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const loadEntries = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const query = createClient()
        .from("entries")
        .select("id, word, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (signal) query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw error;
      if (!signal?.aborted) setEntries(data);
    } catch {
      if (!signal?.aborted) {
        setError("Couldn’t load the list. Please try refreshing it.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadEntries(controller.signal);
    return () => controller.abort();
  }, [loadEntries]);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = word.trim();
    if (pending || loading || !value) return;
    setPending("add");
    setError(null);
    setNotice("");
    try {
      const { data, error } = await createClient()
        .from("entries")
        .insert({ word: value })
        .select("id, word, created_at")
        .single();
      if (error) throw error;
      setEntries((current) => [data, ...current]);
      setWord("");
      setNotice(`Added ${data.word}.`);
      input.current?.focus();
    } catch {
      setError("Couldn’t add your word. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function removeEntry(entry: Entry) {
    if (pending || loading) return;
    setPending(entry.id);
    setError(null);
    setNotice("");
    try {
      const { error } = await createClient()
        .from("entries")
        .delete()
        .eq("id", entry.id)
        .select("id")
        .single();
      if (error) throw error;
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setNotice(`Removed ${entry.word}.`);
    } catch {
      setError("Couldn’t remove this word. Refresh the list and try again.");
    } finally {
      setPending(null);
    }
  }

  const busy = loading || pending !== null;

  return (
    <section
      aria-labelledby="word-list-title"
      className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 id="word-list-title" className="text-xl font-semibold">
            Our word list
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Add a word. Refresh the page. It’ll still be here.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void loadEntries()}
          className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      <form onSubmit={addEntry} className="mb-6">
        <label htmlFor="word" className="mb-2 block text-sm font-medium">
          Your word
        </label>
        <div className="flex gap-2">
          <input
            ref={input}
            id="word"
            name="word"
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="e.g. banana"
            required
            maxLength={80}
            readOnly={pending === "add"}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
          <button
            type="submit"
            disabled={busy || !word.trim()}
            className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending === "add" ? "Adding…" : "Add word"}
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <p role="status" className="sr-only">
        {notice}
      </p>

      {loading ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          Loading words…
        </p>
      ) : entries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-500">
          {error
            ? "The list is unavailable right now."
            : "No words yet. Add the first one!"}
        </p>
      ) : (
        <ul aria-label="Words" className="divide-y divide-neutral-100">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <span className="min-w-0 break-words">{entry.word}</span>
              <button
                type="button"
                aria-label={`Remove ${entry.word}`}
                disabled={busy}
                onClick={() => void removeEntry(entry)}
                className="shrink-0 rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
              >
                {pending === entry.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 border-t border-neutral-100 pt-4 text-xs text-neutral-500">
        This is a shared list. Anyone visiting can add or remove words.
      </p>
    </section>
  );
}
