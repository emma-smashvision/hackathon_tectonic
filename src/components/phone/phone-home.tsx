"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { type CSSProperties, useState } from "react";
import { CHIP_POOL, PRESENTATION, presentHomepage } from "@/lib/engine/present";
import type {
  AdaptiveSlot,
  AdaptiveWidgetId,
  Decisions,
  HomepageConfig,
  NeedId,
  Profile,
} from "@/lib/engine/types";
import { Button, Icon } from "../ui";
import { BalanceWidget, QuickPayWidget } from "../widgets/core";
import { ADAPTIVE_COMPONENTS, WIDGET_META } from "../widgets/registry";
import { DetailSheet } from "./detail-sheet";
import { KateChat, useKate } from "./kate-chat";
import { WidgetCard } from "./widget-card";

type Overlay =
  | { kind: "widget"; id: AdaptiveWidgetId }
  | { kind: "question"; need: NeedId }
  | { kind: "kate" }
  | null;

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
}) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const reduced = useReducedMotion();
  const home = presentHomepage(profile, config);
  const theme = PRESENTATION[config.density];
  const kate = useKate(profile, decisions, personaKey, signals);
  const coreProps = {
    profile,
    density: config.density,
    variant: "simple" as const,
  };
  const openWidget = (id: AdaptiveWidgetId) => {
    if (!decisions.hidden.includes(id)) setOverlay({ kind: "widget", id });
  };
  const selected = overlay?.kind === "widget" ? overlay.id : null;
  const slot: AdaptiveSlot | undefined = selected
    ? (config.adaptive.find((s) => s.id === selected) ?? {
        id: selected,
        size: "lg",
        variant: config.density === "simple" ? "simple" : "detailed",
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
  const count = home.bubbles.length + home.questions.length;
  const styles = {
    "--t-body": `${theme.font}px`,
    "--home-gap": `${theme.gap}px`,
    "--tap": `${theme.target}px`,
    "--bubble-count": theme.bubbles,
    "--drift-duration": `${theme.drift}s`,
  } as CSSProperties;

  return (
    <div
      className="phone relative flex h-full flex-col bg-[#f5f8fb]"
      data-density={config.density}
      data-tone={config.tone}
      style={styles}
    >
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-navy"
      >
        <span>9:41</span>
        <span className="h-4 w-20 rounded-full bg-neutral-900" />
        <span>5G ▮▮▮</span>
      </div>
      <div className="home-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <header className="flex items-center justify-between py-2">
          <span className="text-xl font-black tracking-tight text-navy">
            KBC<span className="text-azure">.</span>
          </span>
          <span className="t-small text-navy/70">
            {config.density === "simple"
              ? "Simple view"
              : config.density === "detailed"
                ? "Detailed view"
                : "Your home"}
          </span>
        </header>
        <div className="core-zone" data-zone="core">
          <BalanceWidget {...coreProps} />
          <QuickPayWidget {...coreProps} />
        </div>
        <p className="home-narrative t-body text-navy" aria-live="polite">
          {home.narrative}
        </p>
        <LayoutGroup id={personaKey}>
          <section
            className="bubble-cluster"
            data-zone="adaptive"
            data-count={count}
            aria-label="Your overview"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {home.bubbles.map((bubble, index) => (
                <motion.div
                  key={bubble.id}
                  layout
                  className="bubble-position"
                  transition={{ duration: reduced ? 0 : 0.45 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.button
                    type="button"
                    className="need-bubble"
                    data-primary={index === 0}
                    style={
                      { "--diameter": `${bubble.diameter}px` } as CSSProperties
                    }
                    aria-label={`${bubble.label}: ${bubble.value}${bubble.pinned ? ", pinned" : ""}. Open details`}
                    onClick={() => openWidget(bubble.id)}
                    animate={
                      reduced ? { y: 0 } : { y: [0, -theme.amplitude, 0] }
                    }
                    transition={{
                      duration: theme.drift,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.6,
                    }}
                  >
                    <Icon
                      name={WIDGET_META[bubble.id].icon}
                      className="bubble-icon"
                    />
                    <span className="bubble-label">{bubble.label}</span>
                    <span className="bubble-value">{bubble.value}</span>
                    {bubble.pinned && (
                      <Icon
                        name="pin"
                        className="absolute right-3 top-3 size-3"
                      />
                    )}
                  </motion.button>
                </motion.div>
              ))}
              {home.questions.map((q) => (
                <motion.div
                  key={`q-${q.need}`}
                  layout
                  className="bubble-position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3 }}
                >
                  <button
                    type="button"
                    className="need-bubble question-bubble"
                    aria-label={q.question}
                    onClick={() =>
                      setOverlay({ kind: "question", need: q.need })
                    }
                  >
                    <Icon name="sparkle" className="bubble-icon" />
                    <span className="bubble-label">{q.question}</span>
                    <span className="bubble-value">You tell us</span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        </LayoutGroup>
        {count === 0 && (
          <p className="t-body py-5 text-navy/70">
            A little space for you. Ask Kate whenever you need a hand.
          </p>
        )}
        <section className="suggestion-chips" aria-label="Suggestions for Kate">
          {home.chips.map((id) => (
            <button
              type="button"
              key={id}
              className="suggestion-chip t-small"
              onClick={() => {
                setOverlay({ kind: "kate" });
                void kate.ask(CHIP_POOL[id]);
              }}
            >
              <Icon name="sparkle" className="size-4 shrink-0" />
              {CHIP_POOL[id]}
            </button>
          ))}
        </section>
        {(home.more.length > 0 || home.moreQuestions.length > 0) && (
          <details className="mt-3 border-t border-navy/10 pt-2">
            <summary className="tap t-small cursor-pointer content-center text-navy">
              More for you ({home.more.length + home.moreQuestions.length})
            </summary>
            <div className="grid gap-1">
              {home.more.map((s) => (
                <Button
                  key={s.id}
                  tone="ghost"
                  className="justify-start"
                  onClick={() => openWidget(s.id)}
                >
                  <Icon name={WIDGET_META[s.id].icon} />
                  {WIDGET_META[s.id].title}
                </Button>
              ))}
              {home.moreQuestions.map((q) => (
                <Button
                  key={q.need}
                  tone="ghost"
                  onClick={() => setOverlay({ kind: "question", need: q.need })}
                >
                  {q.question}
                </Button>
              ))}
            </div>
          </details>
        )}
        {hiddenCount > 0 && (
          <Button tone="ghost" className="mt-2 w-full" onClick={onUnhideAll}>
            Show {hiddenCount} hidden {hiddenCount === 1 ? "item" : "items"}
          </Button>
        )}
      </div>
      <div className="shrink-0 border-t border-navy/10 bg-white p-3">
        <button
          data-kate-trigger
          type="button"
          className="kate-bar tap t-body flex w-full items-center gap-3 rounded-full bg-azure-50 px-4 text-left text-navy"
          aria-haspopup="dialog"
          onClick={() => setOverlay({ kind: "kate" })}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
            k
          </span>
          <span className="flex-1">Ask Kate…</span>
          <Icon name="sparkle" />
        </button>
      </div>
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
          onClose={() => setOverlay(null)}
        >
          {overlay.kind === "kate" && (
            <KateChat
              messages={kate.messages}
              busy={kate.busy}
              onSend={(message) => {
                void kate.ask(message);
              }}
              onOpen={openWidget}
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
                <p className="mt-2">This is a possibility, not a conclusion.</p>
              </details>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    onAnswer(question.need, true);
                    setOverlay(null);
                  }}
                >
                  Yes
                </Button>
                <Button
                  tone="secondary"
                  onClick={() => {
                    onAnswer(question.need, false);
                    setOverlay(null);
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
                setOverlay(null);
              }}
            >
              <Widget
                profile={profile}
                variant={slot.variant}
                density={config.density}
              />
            </WidgetCard>
          )}
        </DetailSheet>
      )}
    </div>
  );
}
