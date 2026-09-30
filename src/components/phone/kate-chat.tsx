"use client";

import { useEffect, useRef, useState } from "react";
import type { AdaptiveWidgetId, Decisions, Profile } from "@/lib/engine/types";
import {
  buildKateContext,
  fallbackReply,
  type KateReply,
  MAX_HISTORY,
  MAX_MESSAGE,
  MAX_REPLY,
} from "@/lib/kate/context";
import { Button, Icon } from "../ui";
import { WIDGET_META } from "../widgets/registry";

interface Message {
  id: number;
  role: "user" | "kate";
  text: string;
  open?: AdaptiveWidgetId;
  source?: KateReply["source"];
}
export function useKate(
  profile: Profile,
  decisions: Decisions,
  personaId: string,
  signals: string[],
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    // Context changes invalidate any in-flight answer, including a persona reset.
    void profile;
    void decisions;
    controller.current?.abort();
    setBusy(false);
    return () => controller.current?.abort();
  }, [profile, decisions]);
  const ask = async (raw: string) => {
    const message = raw.trim().slice(0, MAX_MESSAGE);
    if (!message) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const context = buildKateContext(profile, decisions);
    const history = messages
      .slice(-MAX_HISTORY)
      .map(({ role, text }) => ({ role, text }));
    setMessages((old) => [
      ...old.slice(-19),
      { id: ++seq.current, role: "user", text: message },
    ]);
    setBusy(true);
    let reply = fallbackReply(message, context);
    try {
      const response = await fetch("/api/kate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          personaId,
          signals,
          decisions,
          history,
        }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(17_000)]),
      });
      if (response.ok) {
        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "text" in data &&
          typeof data.text === "string" &&
          data.text.length <= MAX_REPLY
        ) {
          reply = {
            text: data.text,
            source:
              "source" in data && data.source === "claude"
                ? "claude"
                : "offline",
            ...("open" in data &&
            isWidgetId(data.open) &&
            !decisions.hidden.includes(data.open)
              ? { open: data.open }
              : {}),
          };
        }
      }
    } catch {
      /* Offline and timeouts use the same deterministic responder. */
    }
    if (request.signal.aborted) return;
    setMessages((old) => [
      ...old,
      { id: ++seq.current, role: "kate", ...reply },
    ]);
    setBusy(false);
  };
  return { messages, busy, ask };
}

export function KateChat({
  messages,
  busy,
  onSend,
  onOpen,
}: {
  messages: Message[];
  busy: boolean;
  onSend: (message: string) => void;
  onOpen: (id: AdaptiveWidgetId) => void;
}) {
  const [input, setInput] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    void lastId;
    end.current?.scrollIntoView({ block: "nearest" });
  }, [lastId]);
  return (
    <div className="flex min-h-80 flex-col gap-3">
      <p className="t-small text-navy/70">
        Your money, explained. Synthetic demo · no payments or bookings.
      </p>
      <div
        role="log"
        aria-label="Conversation with Kate"
        aria-live="polite"
        className="max-h-[380px] space-y-3 overflow-y-auto"
      >
        {messages.length === 0 && (
          <p className="t-body rounded-2xl bg-azure-50 p-3 text-navy">
            Hello, I’m Kate. Ask about your balance, your plans or what changed
            this month.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`t-body rounded-2xl p-3 ${message.role === "user" ? "ml-8 bg-navy text-white" : "mr-3 bg-azure-50 text-navy"}`}
          >
            <p className="t-small mb-1 font-semibold">
              {message.role === "user" ? "You" : "Kate"}
              {message.source === "offline" ? " · Demo answer" : ""}
            </p>
            <p>{message.text}</p>
            {message.open && (
              <Button
                tone="secondary"
                className="mt-3 w-full"
                onClick={() => onOpen(message.open as AdaptiveWidgetId)}
              >
                Open {WIDGET_META[message.open].title}
              </Button>
            )}
          </div>
        ))}
        {busy && (
          <p className="t-small text-navy/70" role="status">
            Kate is looking at your overview…
          </p>
        )}
        <div ref={end} />
      </div>
      <form
        className="sticky bottom-0 mt-auto bg-white pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && !busy) {
            onSend(input);
            setInput("");
          }
        }}
      >
        <label htmlFor="kate-message" className="t-small font-medium text-navy">
          Ask Kate
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="kate-message"
            value={input}
            maxLength={MAX_MESSAGE}
            onChange={(e) => setInput(e.target.value)}
            className="tap t-body min-w-0 flex-1 rounded-xl border border-navy/25 px-3 text-navy"
            placeholder="Ask about your money…"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
          >
            <Icon name="send" />
          </Button>
        </div>
      </form>
    </div>
  );
}
