"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import "@/blocks/blocks.css";
import { BLOCK_GROUPS } from "@/blocks/registry";
import type { BlockSize } from "@/blocks/types";
import type { ComposeResult, Composition } from "@/lib/compose/compose";
import type { Decisions } from "@/lib/engine/types";
import { Icon } from "../ui";

const BLOCKS = new Map(
  BLOCK_GROUPS.flatMap((g) => g.blocks).map((b) => [b.id, b]),
);

export type ComposeState =
  | { status: "off" }
  | { status: "loading" }
  | { status: "ready"; composition: Composition }
  | { status: "fallback" };

/** Layouts already fetched this session, per demo state. */
const cache = new Map<string, Composition>();

/**
 * Ask the server for Claude's layout of this customer's home. Any failure
 * (no key, timeout, rejected output, static hosting) falls back to rules.
 */
export function useComposition(
  enabled: boolean,
  personaId: string,
  signals: string[],
  decisions: Decisions,
): ComposeState {
  const key = JSON.stringify({ personaId, signals, decisions });
  const [state, setState] = useState<ComposeState>({ status: "off" });
  useEffect(() => {
    if (!enabled) {
      setState({ status: "off" });
      return;
    }
    const cached = cache.get(key);
    if (cached) {
      setState({ status: "ready", composition: cached });
      return;
    }
    setState({ status: "loading" });
    const request = new AbortController();
    fetch("/api/compose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(35_000)]),
    })
      .then((r) => (r.ok ? (r.json() as Promise<ComposeResult>) : null))
      .then((result) => {
        if (request.signal.aborted) return;
        if (result?.source === "claude" && Array.isArray(result.blocks)) {
          cache.set(key, result);
          setState({ status: "ready", composition: result });
        } else setState({ status: "fallback" });
      })
      .catch(() => {
        if (!request.signal.aborted) setState({ status: "fallback" });
      });
    return () => request.abort();
  }, [enabled, key]);
  return state;
}

const GAP = 14;

/**
 * Blocks are designed at gallery sizes (some wider than the phone). Scale
 * each one to its slot: full width, or half width for "sm". CSS zoom also
 * shrinks the layout box, so the grid stays tight.
 */
function FitBlock({
  size,
  children,
}: {
  size: BlockSize;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    const grid = box?.parentElement?.parentElement;
    if (!box || !grid) return;
    const fit = () => {
      box.style.zoom = "1";
      const natural = (
        box.firstElementChild as HTMLElement | null
      )?.getBoundingClientRect().width;
      const slot =
        size === "sm" ? (grid.clientWidth - GAP) / 2 : grid.clientWidth;
      if (natural) box.style.zoom = String(Math.min(1, (slot - 0.5) / natural));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [size]);
  return <div ref={ref}>{children}</div>;
}

/** Claude's layout: its blocks in order, why each is there, and Kate prompts. */
export function ComposedHome({
  state,
  firstName,
  onAsk,
}: {
  state: ComposeState;
  firstName: string;
  onAsk: (question: string) => void;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  if (state.status === "loading")
    return (
      <section className="composed" aria-busy="true" aria-live="polite">
        <p className="composed-tag">
          <Icon name="sparkle" className="size-3.5" /> Claude is composing{" "}
          {firstName}'s home…
        </p>
        <div className="composed-skeleton" aria-hidden="true">
          <span data-size="lg" />
          <span data-size="sm" />
          <span data-size="sm" />
          <span data-size="md" />
        </div>
      </section>
    );
  if (state.status !== "ready") return null;
  const { composition } = state;
  return (
    <section
      className="composed"
      aria-label={`Composed by Claude for ${firstName}`}
    >
      <p className="composed-tag">
        <Icon name="sparkle" className="size-3.5" /> Composed by Claude for{" "}
        {firstName}
      </p>
      <div
        className="blocks-root composed-grid"
        data-large-text={composition.largeText}
      >
        {composition.blocks.map((b, i) => {
          const block = BLOCKS.get(b.id);
          if (!block) return null;
          return (
            <motion.div
              key={b.id}
              data-size={b.size}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
            >
              <FitBlock size={b.size}>
                {block.render({
                  size: b.size,
                  tier: b.tier,
                  largeText: composition.largeText,
                })}
              </FitBlock>
            </motion.div>
          );
        })}
      </div>

      <button
        type="button"
        className="composed-why tap t-small"
        aria-expanded={whyOpen}
        onClick={() => setWhyOpen((v) => !v)}
      >
        <Icon name="info" className="size-4" /> Why this home?
      </button>
      <AnimatePresence>
        {whyOpen && (
          <motion.ol
            className="composed-reasons t-small"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {composition.blocks.map((b) => (
              <li key={b.id}>
                <strong>{BLOCKS.get(b.id)?.title}</strong>
                <span>{b.reason}</span>
              </li>
            ))}
            <li className="composed-note">
              Chosen by Claude from KBC's building blocks, using only your
              account data. You can switch back to the standard home at any
              time.
            </li>
          </motion.ol>
        )}
      </AnimatePresence>

      {composition.suggestions.length > 0 && (
        <section className="suggestion-grid" aria-label="Suggestions for Kate">
          {composition.suggestions.map((q, i) => (
            <motion.button
              type="button"
              key={q}
              className="suggestion-pill t-small"
              data-wide={
                i === composition.suggestions.length - 1 && i % 2 === 0
              }
              whileTap={{ scale: 0.95 }}
              onClick={() => onAsk(q)}
            >
              {q}
            </motion.button>
          ))}
        </section>
      )}
    </section>
  );
}
