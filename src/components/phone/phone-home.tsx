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
import { formatEur } from "@/lib/format";
import { Button, Icon } from "../ui";
import { ADAPTIVE_COMPONENTS, WIDGET_META } from "../widgets/registry";
import { DetailSheet } from "./detail-sheet";
import { ACCENTS, HeroCard } from "./hero";
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
  const styles = {
    "--t-body": `${theme.font}px`,
    "--home-gap": `${theme.gap}px`,
    "--tap": `${theme.target}px`,
    "--bubble-count": theme.bubbles,
    "--drift-duration": `${theme.drift}s`,
  } as CSSProperties;

  const [hero, ...tiles] = home.bubbles;
  const ask = home.questions[0];
  const c = profile.customer;

  return (
    <div
      className="phone app relative flex h-full flex-col"
      data-density={config.density}
      data-tone={config.tone}
      style={styles}
    >
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-white"
      >
        <span>9:41</span>
        <span className="h-4 w-20 rounded-full bg-black" />
        <span>5G ▮▮▮</span>
      </div>
      <div className="home-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <header className="app-header">
          <div className="min-w-0">
            <p className="app-hello">Hi {c.firstName}</p>
            <p className="app-narrative" aria-live="polite">
              {home.narrative}
            </p>
          </div>
          <span className="app-avatar" aria-hidden="true">
            {c.firstName[0]}
          </span>
        </header>

        <section className="app-balance" data-zone="core" aria-label="Balance">
          <div>
            <p className="t-small text-white/60">Current account</p>
            <p className="t-figure text-white">{formatEur(c.balance, true)}</p>
            <p className="t-small text-white/60">
              Savings{" "}
              <span className="font-semibold text-white">
                {formatEur(c.savings)}
              </span>
            </p>
          </div>
          <div className="app-actions">
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

        <LayoutGroup id={personaKey}>
          <section data-zone="adaptive" aria-label="For you now">
            {(hero || ask) && <p className="app-section">For you now</p>}
            <AnimatePresence mode="popLayout" initial={false}>
              {hero && (
                <HeroCard
                  key={hero.id}
                  id={hero.id}
                  profile={profile}
                  onOpen={() => openWidget(hero.id)}
                />
              )}
            </AnimatePresence>

            {ask && (
              <motion.div
                layout
                className="app-question"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="t-body flex items-start gap-2 font-semibold text-white">
                  <Icon name="sparkle" className="mt-0.5 size-4 shrink-0" />
                  {ask.question}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="app-pill app-pill-primary"
                    onClick={() => onAnswer(ask.need, true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="app-pill"
                    onClick={() => onAnswer(ask.need, false)}
                  >
                    Not relevant
                  </button>
                  <button
                    type="button"
                    className="app-pill app-pill-ghost"
                    onClick={() =>
                      setOverlay({ kind: "question", need: ask.need })
                    }
                  >
                    Why?
                  </button>
                </div>
              </motion.div>
            )}

            {tiles.length > 0 && (
              <div className="app-tiles" data-count={tiles.length}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {tiles.map((tile, index) => (
                    <motion.button
                      key={tile.id}
                      layout
                      type="button"
                      className="app-tile"
                      style={{ "--accent": ACCENTS[tile.id] } as CSSProperties}
                      aria-label={`${tile.label}: ${tile.value}${tile.pinned ? ", pinned" : ""}. Open details`}
                      onClick={() => openWidget(tile.id)}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: reduced ? 0 : 0.35,
                        delay: reduced ? 0 : 0.15 + index * 0.08,
                      }}
                    >
                      <span className="app-tile-icon">
                        <Icon name={WIDGET_META[tile.id].icon} />
                      </span>
                      <span className="app-tile-label">{tile.label}</span>
                      <span className="app-tile-value">{tile.value}</span>
                      {tile.pinned && (
                        <Icon
                          name="pin"
                          className="absolute top-3 right-3 size-3.5 text-white/60"
                        />
                      )}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </LayoutGroup>

        {!hero && !ask && (
          <p className="t-body py-5 text-white/70">
            A little space for you. Ask Kate whenever you need a hand.
          </p>
        )}

        <section className="app-chips" aria-label="Suggestions for Kate">
          {home.chips.map((id) => (
            <button
              type="button"
              key={id}
              className="app-chip t-small"
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
          <details className="app-more">
            <summary className="tap t-small cursor-pointer content-center">
              More for you ({home.more.length + home.moreQuestions.length})
            </summary>
            <div className="grid gap-1">
              {home.more.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="tap t-body flex items-center gap-3 rounded-xl px-2 text-left hover:bg-white/5"
                  onClick={() => openWidget(s.id)}
                >
                  <Icon name={WIDGET_META[s.id].icon} />
                  {WIDGET_META[s.id].title}
                </button>
              ))}
              {home.moreQuestions.map((q) => (
                <button
                  key={q.need}
                  type="button"
                  className="tap t-body rounded-xl px-2 text-left hover:bg-white/5"
                  onClick={() => setOverlay({ kind: "question", need: q.need })}
                >
                  {q.question}
                </button>
              ))}
            </div>
          </details>
        )}
        {hiddenCount > 0 && (
          <button
            type="button"
            className="tap t-small mt-2 w-full rounded-xl text-white/70 hover:bg-white/5"
            onClick={onUnhideAll}
          >
            Show {hiddenCount} hidden {hiddenCount === 1 ? "item" : "items"}
          </button>
        )}
      </div>
      <div className="app-dock shrink-0 p-3">
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
