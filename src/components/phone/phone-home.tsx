"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { CHIP_POOL, PRESENTATION, presentHomepage } from "@/lib/engine/present";
import type {
  AdaptiveSlot,
  AdaptiveWidgetId,
  Decisions,
  HomepageConfig,
  NeedId,
  Profile,
} from "@/lib/engine/types";
import { formatEur } from "@/lib/format";
import { Button, Icon } from "../ui";
import { ADAPTIVE_COMPONENTS } from "../widgets/registry";
import { TransactionsWidget } from "../widgets/support";
import { AmbientBackground, Confetti, CountUp } from "./ambient";
import {
  BubbleField,
  BubbleStrip,
  type FieldBubble,
  fieldBubbles,
  morphId,
} from "./bubble-field";
import { ComposedHome, useComposition } from "./composed-home";
import { DetailSheet } from "./detail-sheet";
import { HeroCard } from "./hero";
import { KateChat, useKate } from "./kate-chat";
import { WidgetCard } from "./widget-card";

type Overlay =
  | { kind: "widget"; id: AdaptiveWidgetId; morph?: string }
  | { kind: "question"; need: NeedId; morph?: string }
  | { kind: "kate" }
  | null;

/** How long a tapped bubble stays highlighted before its sheet opens. */
const FOCUS_MS = 220;

export function PhoneHome({
  profile,
  config,
  personaKey,
  decisions,
  signals,
  onTogglePin,
  onHide,
  onUnhideAll,
  hiddenCount,
  onAnswer,
  composer = "rules",
}: {
  profile: Profile;
  config: HomepageConfig;
  personaKey: string;
  decisions: Decisions;
  signals: string[];
  onTogglePin: (id: AdaptiveWidgetId) => void;
  onHide: (id: AdaptiveWidgetId) => void;
  onUnhideAll: () => void;
  hiddenCount: number;
  onAnswer: (need: NeedId, relevant: boolean) => void;
  /** Who decides the home below the fixed core: the rules engine or Claude. */
  composer?: "rules" | "claude";
}) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduced = useReducedMotion();
  const home = presentHomepage(profile, config);
  const theme = PRESENTATION[config.density];
  const kate = useKate(profile, decisions, personaKey, signals);
  const composed = useComposition(
    composer === "claude",
    personaKey,
    signals,
    decisions,
  );
  const claudeHome =
    composed.status === "loading" || composed.status === "ready";
  const bubbles = fieldBubbles(home, config.density);
  const c = profile.customer;
  const simple = config.density === "simple";
  const prize = profile.transactions.find((t) => t.category === "prize");
  const celebrating = home.mood === "celebratory";

  // Confetti when a live prize signal lands (skipped with reduced motion).
  const [confetti, setConfetti] = useState(false);
  const livePrize = prize?.id.startsWith("live-") ? prize.id : null;
  useEffect(() => {
    if (livePrize) setConfetti(true);
  }, [livePrize]);
  useEffect(() => () => clearTimeout(focusTimer.current), []);

  const openWidget = (id: AdaptiveWidgetId, morph?: string) => {
    if (!decisions.hidden.includes(id))
      setOverlay({ kind: "widget", id, morph });
  };
  const close = () => {
    setOverlay(null);
    setFocus(null);
  };
  /** Highlight the tapped bubble, dim the rest, then morph it into its sheet. */
  const tapBubble = (bubble: FieldBubble) => {
    clearTimeout(focusTimer.current);
    setFocus(bubble.key);
    const open = () => {
      if (bubble.kind === "widget" && bubble.id)
        openWidget(bubble.id, bubble.key);
      else if (bubble.need)
        setOverlay({ kind: "question", need: bubble.need, morph: bubble.key });
    };
    if (reduced) open();
    else focusTimer.current = setTimeout(open, FOCUS_MS);
  };

  const selected = overlay?.kind === "widget" ? overlay.id : null;
  const slot: AdaptiveSlot | undefined = selected
    ? (config.adaptive.find((s) => s.id === selected) ?? {
        id: selected,
        size: "lg",
        variant: simple ? "simple" : "detailed",
        score: config.scores.find((s) => s.id === selected)?.score ?? 0,
        pinned: decisions.pinned.includes(selected),
        reasons: ["You opened this with Kate"],
      })
    : undefined;
  const Widget = selected ? ADAPTIVE_COMPONENTS[selected] : null;
  const question =
    overlay?.kind === "question"
      ? config.questions.find((q) => q.need === overlay.need)
      : undefined;
  const morph =
    overlay && overlay.kind !== "kate" ? (overlay.morph ?? null) : null;
  const [lead, ...rest] = config.adaptive;
  const feed = rest.filter((s) => s.id !== "transactions").slice(0, 4);
  const styles = {
    "--t-body": `${theme.font}px`,
    "--tap": `${theme.target}px`,
  } as CSSProperties;

  return (
    <div
      className="phone app relative flex h-full flex-col"
      data-density={config.density}
      data-tone={config.tone}
      data-mood={home.mood}
      style={styles}
    >
      <AmbientBackground mood={home.mood} />
      <div
        aria-hidden="true"
        className="relative z-[2] flex shrink-0 items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-white"
      >
        <span>9:41</span>
        <span className="h-4 w-20 rounded-full bg-black" />
        <span>5G ▮▮▮</span>
      </div>

      <LayoutGroup id={personaKey}>
        <div className="home-scroll relative z-[1] min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <header className="flex items-center justify-between pt-2">
            <span className="greeting-tag">Hi, {c.firstName}</span>
            <span className="app-avatar" aria-hidden="true">
              {c.firstName[0]}
            </span>
          </header>

          <AnimatePresence>
            {celebrating && prize && (
              <motion.p
                key="celebrate"
                className="celebrate-pill t-small"
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                🎉 {formatEur(prize.amount)} from your prize just arrived
              </motion.p>
            )}
          </AnimatePresence>

          <section
            className="center-hero"
            data-zone="core"
            aria-label="Balance"
          >
            <p className="center-value">
              <CountUp value={c.balance} format={(n) => formatEur(n, true)} />
            </p>
            <p className="center-label">
              Current account · savings {formatEur(c.savings)}
            </p>
            <p className="ai-message" aria-live="polite">
              {composed.status === "ready"
                ? composed.composition.message
                : home.narrative}
            </p>
            <div className="app-actions center-actions">
              <button type="button" className="app-action">
                <span>
                  <Icon name="send" />
                </span>
                Transfer
              </button>
              <button type="button" className="app-action">
                <span>
                  <Icon name="qr" />
                </span>
                Pay
              </button>
            </div>
          </section>

          {claudeHome ? (
            <ComposedHome
              state={composed}
              firstName={c.firstName}
              onAsk={(question) => {
                setOverlay({ kind: "kate" });
                void kate.ask(question);
              }}
            />
          ) : (
            <>
              {composed.status === "fallback" && (
                <p className="composed-fallback t-small" role="status">
                  Claude isn't available right now, so this is the standard
                  home.
                </p>
              )}
              <BubbleField
                bubbles={bubbles}
                density={config.density}
                focus={focus}
                hideFocused={morph !== null}
                onTap={tapBubble}
              />

              <section
                className="suggestion-grid"
                aria-label="Suggestions for Kate"
              >
                {home.chips.map((id, i) => (
                  <motion.button
                    type="button"
                    key={id}
                    className="suggestion-pill t-small"
                    data-wide={i === home.chips.length - 1 && i % 2 === 0}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setOverlay({ kind: "kate" });
                      void kate.ask(CHIP_POOL[id]);
                    }}
                  >
                    {CHIP_POOL[id]}
                  </motion.button>
                ))}
              </section>

              <div className="glass-feed">
                {lead && (
                  <>
                    <p className="app-section">In focus</p>
                    <HeroCard
                      id={lead.id}
                      profile={profile}
                      onOpen={() => openWidget(lead.id)}
                    />
                  </>
                )}
                {feed.length > 0 && (
                  <>
                    <p className="app-section">More for you</p>
                    <div className="grid gap-3">
                      {feed.map((s) => {
                        const Section = ADAPTIVE_COMPONENTS[s.id];
                        return (
                          <motion.div
                            key={s.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <WidgetCard
                              slot={s}
                              isNew={false}
                              onTogglePin={() => onTogglePin(s.id)}
                              onHide={() => onHide(s.id)}
                            >
                              <Section
                                profile={profile}
                                variant={s.variant}
                                density={config.density}
                              />
                            </WidgetCard>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
                {home.moreQuestions.map((q) => (
                  <button
                    key={q.need}
                    type="button"
                    className="tap t-body mt-3 w-full rounded-2xl border border-dashed border-white/30 px-4 text-left text-white/85 hover:bg-white/5"
                    onClick={() =>
                      setOverlay({ kind: "question", need: q.need })
                    }
                  >
                    {q.question}
                  </button>
                ))}
                <p className="app-section">Recent activity</p>
                <div className="glass-panel">
                  <TransactionsWidget
                    profile={profile}
                    density={config.density}
                    variant={
                      config.density === "detailed" ? "detailed" : "simple"
                    }
                  />
                </div>
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    className="tap t-small mt-2 w-full rounded-xl text-white/70 hover:bg-white/5"
                    onClick={onUnhideAll}
                  >
                    Show {hiddenCount} hidden{" "}
                    {hiddenCount === 1 ? "item" : "items"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="app-dock relative z-[2] shrink-0 p-3">
          <button
            data-kate-trigger
            type="button"
            className="app-kate tap t-body"
            aria-haspopup="dialog"
            onClick={() => setOverlay({ kind: "kate" })}
          >
            <span className="app-kate-orb" aria-hidden="true" />
            <span className="flex-1">Ask Kate anything…</span>
            <Icon name="sparkle" />
          </button>
        </div>

        {confetti && <Confetti onDone={() => setConfetti(false)} />}

        {overlay && (
          <DetailSheet
            key={overlay.kind}
            title={
              overlay.kind === "kate"
                ? "Kate"
                : overlay.kind === "question"
                  ? "A quick question"
                  : "Your overview"
            }
            onClose={close}
            strip={
              overlay.kind !== "kate" && bubbles.length > 1 ? (
                <BubbleStrip
                  bubbles={bubbles}
                  active={morph}
                  onTap={(b) => {
                    setFocus(b.key);
                    if (b.kind === "widget" && b.id) openWidget(b.id, b.key);
                    else if (b.need)
                      setOverlay({
                        kind: "question",
                        need: b.need,
                        morph: b.key,
                      });
                  }}
                />
              ) : undefined
            }
          >
            <motion.div
              layoutId={morph ? morphId(morph) : undefined}
              className="sheet-morph"
              style={{ borderRadius: 24 }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            >
              {overlay.kind === "kate" && (
                <KateChat
                  messages={kate.messages}
                  busy={kate.busy}
                  onSend={(message) => {
                    void kate.ask(message);
                  }}
                  onOpen={(id) => openWidget(id)}
                />
              )}
              {question && (
                <div className="space-y-4 p-2">
                  <h3 className="t-title text-navy">{question.question}</h3>
                  <details className="t-small text-navy/80">
                    <summary className="tap cursor-pointer content-center">
                      Why am I seeing this?
                    </summary>
                    <ul className="list-disc space-y-2 pl-4">
                      {question.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      This is a possibility, not a conclusion.
                    </p>
                  </details>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        onAnswer(question.need, true);
                        close();
                      }}
                    >
                      Yes
                    </Button>
                    <Button
                      tone="secondary"
                      onClick={() => {
                        onAnswer(question.need, false);
                        close();
                      }}
                    >
                      Not relevant
                    </Button>
                  </div>
                </div>
              )}
              {slot && Widget && (
                <WidgetCard
                  key={slot.id}
                  slot={slot}
                  isNew={false}
                  onTogglePin={() => onTogglePin(slot.id)}
                  onHide={() => {
                    onHide(slot.id);
                    close();
                  }}
                >
                  <Widget
                    profile={profile}
                    variant={slot.variant}
                    density={config.density}
                  />
                </WidgetCard>
              )}
            </motion.div>
          </DetailSheet>
        )}
      </LayoutGroup>
    </div>
  );
}
