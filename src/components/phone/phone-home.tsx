"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type {
  AdaptiveWidgetId,
  HomepageConfig,
  NeedId,
  Profile,
  Tone,
} from "@/lib/engine/types";
import { Button, Icon } from "../ui";
import { BalanceWidget, QuickPayWidget } from "../widgets/core";
import { ADAPTIVE_COMPONENTS } from "../widgets/registry";
import { WidgetCard } from "./widget-card";

const GREETINGS: Record<
  Tone,
  (name: string) => { title: string; sub: string }
> = {
  reassuring: (name) => ({
    title: `Hello ${name}`,
    sub: "Everything is in order. Here is what matters today.",
  }),
  friendly: (name) => ({
    title: `Hi ${name}`,
    sub: "Your home, tuned to what's going on in your life.",
  }),
  expert: (name) => ({
    title: `Good afternoon, ${name}`,
    sub: "Markets are open. Your full overview is below.",
  }),
};

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

function useFreshIds(ids: string[], resetKey: string): Set<string> {
  const previous = useRef<{ key: string; ids: Set<string> } | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const joined = ids.join(",");

  useEffect(() => {
    const current = new Set(joined ? joined.split(",") : []);
    const prev = previous.current;
    previous.current = { key: resetKey, ids: current };
    if (!prev || prev.key !== resetKey) {
      setFresh(new Set());
      return;
    }
    const added = [...current].filter((id) => !prev.ids.has(id));
    if (added.length === 0) return;
    setFresh(new Set(added));
    const timer = setTimeout(() => setFresh(new Set()), 4000);
    return () => clearTimeout(timer);
  }, [joined, resetKey]);

  return fresh;
}

export function PhoneHome({
  profile,
  config,
  personaKey,
  onTogglePin,
  onHide,
  onUnhideAll,
  hiddenCount,
  onAnswer,
}: {
  profile: Profile;
  config: HomepageConfig;
  personaKey: string;
  onTogglePin: (id: AdaptiveWidgetId) => void;
  onHide: (id: AdaptiveWidgetId) => void;
  onUnhideAll: () => void;
  hiddenCount: number;
  onAnswer: (need: NeedId, relevant: boolean) => void;
}) {
  const { density } = config;
  const greeting = GREETINGS[config.tone](profile.customer.firstName);
  const question = config.questions[0];
  const fresh = useFreshIds(
    config.adaptive.map((s) => s.id),
    personaKey,
  );
  const coreProps = { profile, density, variant: "simple" as const };

  return (
    <div
      className="phone flex h-full flex-col bg-[#f5f8fb]"
      data-density={density}
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold text-navy"
      >
        <span>9:41</span>
        <span className="h-5 w-24 rounded-full bg-neutral-900" />
        <span>5G ▮▮▮</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        <header className="flex items-center justify-between py-3">
          <span className="text-xl font-black tracking-tight text-navy">
            KBC<span className="text-azure">.</span>
          </span>
          <span className="t-small rounded-full bg-white px-3 py-1 font-medium text-navy ring-1 ring-navy/10">
            {density === "simple"
              ? "Simple view"
              : density === "detailed"
                ? "Detailed view"
                : "Your home"}
          </span>
        </header>

        <div className="mb-4">
          <h2
            className="t-title text-navy"
            style={{ fontSize: "calc(var(--t-title) * 1.35)" }}
          >
            {greeting.title}
          </h2>
          <p className="t-body text-navy/70">{greeting.sub}</p>
        </div>

        {/* Core zone: fixed, never reordered by the engine. */}
        <div className="space-y-3" data-zone="core">
          <BalanceWidget {...coreProps} />
          <QuickPayWidget {...coreProps} />
        </div>

        <LayoutGroup>
          <div key={personaKey} className="mt-5 space-y-3" data-zone="adaptive">
            <AnimatePresence mode="popLayout" initial={false}>
              {question && (
                <motion.section
                  key={`q-${question.need}`}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={SPRING}
                  aria-label="Question from your bank"
                  className="rounded-3xl border border-azure/50 bg-azure-50 p-4"
                >
                  <p className="t-small flex items-center gap-1 font-semibold text-azure-ink">
                    <Icon name="sparkle" className="size-4" />
                    Quick question
                  </p>
                  <p className="t-title mt-1 text-navy">{question.question}</p>
                  <p className="t-small mt-1 text-navy/70">
                    We noticed: {question.reasons[0]}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button onClick={() => onAnswer(question.need, true)}>
                      Yes
                    </Button>
                    <Button
                      tone="secondary"
                      onClick={() => onAnswer(question.need, false)}
                    >
                      Not relevant
                    </Button>
                  </div>
                </motion.section>
              )}

              {config.adaptive.map((slot) => {
                const Widget = ADAPTIVE_COMPONENTS[slot.id];
                return (
                  <motion.div
                    key={slot.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={SPRING}
                  >
                    <WidgetCard
                      slot={slot}
                      isNew={fresh.has(slot.id)}
                      onTogglePin={() => onTogglePin(slot.id)}
                      onHide={() => onHide(slot.id)}
                    >
                      <Widget
                        profile={profile}
                        variant={slot.variant}
                        density={density}
                      />
                    </WidgetCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {hiddenCount > 0 && (
              <motion.div layout className="text-center">
                <Button tone="ghost" onClick={onUnhideAll}>
                  {hiddenCount} hidden card{hiddenCount > 1 ? "s" : ""} · Show
                  again
                </Button>
              </motion.div>
            )}
          </div>
        </LayoutGroup>
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-4 border-t border-navy/10 bg-white px-2 pt-2 pb-5 text-center text-[0.65rem] font-medium text-navy/60"
      >
        {(["Home", "Pay", "Products", "Advisor"] as const).map((label, i) => (
          <span key={label} className={i === 0 ? "text-navy" : ""}>
            <span
              className={`mx-auto mb-1 block h-1 w-6 rounded-full ${i === 0 ? "bg-azure" : "bg-transparent"}`}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
