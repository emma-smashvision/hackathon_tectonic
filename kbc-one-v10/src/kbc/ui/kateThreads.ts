import type { Placed } from "../types";
import type { ChatMsg } from "./Screens";

export type KateThread = {
  id: string;
  title: string;
  messages: ChatMsg[];
  context: Placed | null;
};
export type KateChats = Record<string, {
  activeId: string;
  threads: KateThread[];
}>;

export const CHAT_KEY = "kbc-kate-chats-v2";
export const LEGACY_CHAT_KEY = "kbc-kate-chats-v1";

export function threadTitle(messages: ChatMsg[]): string {
  const first = messages.find((m) => m.role === "user")?.text.trim().replace(/\s+/g, " ");
  return first ? first.length > 32 ? `${first.slice(0, 31)}…` : first : "Empty chat";
}

export function activeThread(chats: KateChats, persona: string): KateThread | undefined {
  const saved = chats[persona];
  return saved?.threads.find((thread) => thread.id === saved.activeId) ?? saved?.threads[0];
}

export function addThread(chats: KateChats, persona: string, thread: KateThread): KateChats {
  return {
    ...chats,
    [persona]: { activeId: thread.id, threads: [...(chats[persona]?.threads ?? []), thread] },
  };
}

export function updateThread(
  chats: KateChats,
  persona: string,
  id: string,
  update: (thread: KateThread) => KateThread,
): KateChats {
  const saved = chats[persona];
  if (!saved) return chats;
  return {
    ...chats,
    [persona]: { ...saved, threads: saved.threads.map((thread) => thread.id === id ? update(thread) : thread) },
  };
}

/** Read old single conversations as one thread, without dropping saved messages. */
export function restoreChats(raw: string | null): KateChats {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    const chats: KateChats = {};
    for (const [persona, value] of Object.entries(parsed)) {
      const saved = value as KateChats[string];
      const threads: KateThread[] = Array.isArray(value)
        ? value.length ? [{ id: `legacy-${persona}`, title: threadTitle(value), messages: value, context: null }] : []
        : saved.threads;
      if (!Array.isArray(threads)) continue;
      const restored = threads.filter((thread) => thread.id && Array.isArray(thread.messages)).map((thread) => ({
        ...thread,
        context: thread.context ?? null,
        messages: thread.messages.map((message) => ({ ...message, streaming: false })),
      }));
      chats[persona] = {
        activeId: restored.find((thread) => thread.id === saved.activeId)?.id ?? restored[0]?.id ?? "",
        threads: restored,
      };
    }
    return chats;
  } catch {
    return {};
  }
}
