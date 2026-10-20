import { describe, expect, test } from "bun:test";
import { activeThread, addThread, restoreChats, threadTitle, updateThread, type KateChats, type KateThread } from "./kateThreads";

const thread = (id: string, text: string): KateThread => ({
  id,
  title: text,
  context: null,
  messages: [{ id: 1, role: "user", text }],
});

describe("Kate chat threads", () => {
  test("new chats preserve previous messages and isolate personas", () => {
    let chats = addThread({}, "marc", thread("first", "My balance"));
    chats = addThread(chats, "tom", thread("tom", "My savings"));
    chats = addThread(chats, "marc", { ...thread("second", "New chat"), messages: [] });
    expect(activeThread(chats, "marc")?.messages).toEqual([]);
    expect(chats.marc.threads[0].messages[0].text).toBe("My balance");
    expect(activeThread(chats, "tom")?.messages[0].text).toBe("My savings");
    chats = { ...chats, marc: { ...chats.marc, activeId: "first" } };
    expect(activeThread(chats, "marc")?.messages[0].text).toBe("My balance");
  });

  test("an answer updates its original thread after a tab or persona switch", () => {
    let chats = addThread({}, "marc", thread("first", "My balance"));
    chats = addThread(chats, "marc", thread("second", "My spending"));
    chats = addThread(chats, "tom", thread("tom", "My savings"));
    chats = updateThread(chats, "marc", "first", (saved) => ({
      ...saved, messages: [...saved.messages, { id: 2, role: "kate", text: "Your balance" }],
    }));
    expect(chats.marc.threads[0].messages).toHaveLength(2);
    expect(activeThread(chats, "marc")?.id).toBe("second");
    expect(activeThread(chats, "marc")?.messages).toHaveLength(1);
    expect(activeThread(chats, "tom")?.messages).toHaveLength(1);
  });

  test("reload retains threads and selection and finishes interrupted streams", () => {
    const chats: KateChats = { marc: { activeId: "second", threads: [
      thread("first", "My balance"),
      { ...thread("second", "My spending"), messages: [{ id: 2, role: "kate", text: "Part of an answer", streaming: true }] },
    ] } };
    const restored = restoreChats(JSON.stringify(chats));
    expect(restored.marc.threads).toHaveLength(2);
    expect(activeThread(restored, "marc")?.id).toBe("second");
    expect(activeThread(restored, "marc")?.messages[0].streaming).toBe(false);
  });

  test("legacy conversations migrate per persona without losing messages", () => {
    const restored = restoreChats(JSON.stringify({
      marc: [{ id: 1, role: "user", text: "How much can I spend?" }, { id: 2, role: "kate", text: "An answer", streaming: true }],
      tom: [{ id: 3, role: "user", text: "My savings" }],
    }));
    expect(activeThread(restored, "marc")?.title).toBe("How much can I spend?");
    expect(activeThread(restored, "marc")?.messages).toHaveLength(2);
    expect(activeThread(restored, "tom")?.messages[0].text).toBe("My savings");
    expect(restoreChats("invalid")).toEqual({});
  });

  test("titles use the first user message with a short, single-line label", () => {
    expect(threadTitle([])).toBe("Empty chat");
    expect(threadTitle([{ id: 1, role: "kate", text: "Welcome" }, { id: 2, role: "user", text: "  My\n monthly   spending " }])).toBe("My monthly spending");
    expect(threadTitle([{ id: 1, role: "user", text: "A".repeat(50) }])).toBe(`${"A".repeat(31)}…`);
  });
});
