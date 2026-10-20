"use client";

import type { Proposal } from "../kate";
import type { ActionSheet, HomeModel, Snapshot } from "../types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

const post = <T>(url: string, body: unknown) =>
  call<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export type KateDone = {
  reply: string;
  proposal: Proposal | null;
  notes: string[];
  source: "claude" | "rules";
  ms: number;
};

export const api = {
  home: (persona: string, mode: "cached" | "compose") =>
    call<{ home: HomeModel; snapshot: Snapshot }>(
      `/api/kbc/home?persona=${encodeURIComponent(persona)}&mode=${mode}`,
    ),
  command: (persona: string, body: Record<string, unknown>) =>
    post<{ message: string; snapshot: Snapshot }>("/api/kbc/command", {
      persona,
      ...body,
    }),
  preview: (
    persona: string,
    id: string,
    params: Record<string, number> = {},
    to?: string,
  ) =>
    post<{ sheet: ActionSheet }>("/api/kbc/command", {
      persona,
      type: "preview_action",
      id,
      params,
      to,
    }),
  /** Streams Kate's answer: calls onDelta while she types, resolves with the checked result. */
  kate: async (
    persona: string,
    message: string,
    history: { role: "user" | "kate"; text: string }[],
    contextId: string | undefined,
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<KateDone> => {
    const res = await fetch("/api/kbc/kate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ persona, message, history, contextId }),
      signal,
    });
    if (!res.ok || !res.body) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Kate is unavailable (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let done: KateDone | null = null;
    const handle = (line: string) => {
      if (!line.trim()) return;
      const ev = JSON.parse(line) as
        | { t: "delta"; text: string }
        | ({ t: "done" } & KateDone);
      if (ev.t === "delta") onDelta(ev.text);
      else if (ev.t === "done") done = ev;
    };
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      buf += decoder.decode(value, { stream: true });
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        handle(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
      }
    }
    handle(buf);
    if (!done) throw new Error("Kate stopped before finishing. Try again.");
    return done;
  },
};
