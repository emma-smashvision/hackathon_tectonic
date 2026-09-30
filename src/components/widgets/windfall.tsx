"use client";

import { useState } from "react";
import { formatEur } from "@/lib/format";
import { Button, Icon, type IconName, Progress, ProposedBadge } from "../ui";
import { type WidgetProps, within } from "./types";

type Pot = "holiday" | "buffer" | "invest";

const POTS: Record<Pot, { label: string; icon: IconName; hint: string }> = {
  holiday: {
    label: "Holiday pot",
    icon: "plane",
    hint: "Set it apart for a trip together",
  },
  buffer: {
    label: "Rainy-day buffer",
    icon: "shield",
    hint: "Top up your safety net first",
  },
  invest: {
    label: "Start investing",
    icon: "chart",
    hint: "Explore a plan with your advisor",
  },
};

/** Illustrative splits the customer picks from; never a recommendation. */
export const SPLITS: {
  id: string;
  label: string;
  shares: Record<Pot, number>;
}[] = [
  {
    id: "enjoy",
    label: "More fun",
    shares: { holiday: 0.5, buffer: 0.3, invest: 0.2 },
  },
  {
    id: "balanced",
    label: "Balanced",
    shares: { holiday: 0.3, buffer: 0.3, invest: 0.4 },
  },
  {
    id: "future",
    label: "More future",
    shares: { holiday: 0.15, buffer: 0.3, invest: 0.55 },
  },
];

export function WindfallWidget({ profile, variant }: WidgetProps) {
  const { customer } = profile;
  const prize = within(profile.transactions, profile.today, 30).find(
    (tx) => tx.category === "prize",
  );
  const amount = prize?.amount ?? 0;
  const [splitId, setSplitId] = useState("balanced");
  const split = SPLITS.find((s) => s.id === splitId) ?? SPLITS[1];
  const buffer = customer.savingsGoals.find((g) => g.kind === "emergency");

  return (
    <div className="space-y-4">
      <div>
        <p className="t-body text-navy/80">
          {prize ? prize.merchant : "A one-off sum"}
        </p>
        <p className="t-figure text-navy">{formatEur(amount)}</p>
        <p className="t-small mt-1 text-navy/70">
          It&apos;s yours to decide. Here are a few ideas, no rush.
        </p>
      </div>

      <fieldset>
        <legend className="t-small mb-2 font-semibold text-navy">
          How would you like to split it?
        </legend>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-navy-50 p-1">
          {SPLITS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === splitId}
              onClick={() => setSplitId(s.id)}
              className={`tap t-small rounded-xl px-2 font-semibold transition-colors ${
                s.id === splitId
                  ? "bg-white text-navy shadow-sm"
                  : "text-navy/70 hover:text-navy"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <ul className="space-y-2">
        {(Object.keys(POTS) as Pot[]).map((pot) => {
          const share = split.shares[pot];
          const part = Math.round((amount * share) / 50) * 50;
          return (
            <li
              key={pot}
              className="space-y-2 rounded-2xl border border-navy/10 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-azure-50 text-navy">
                  <Icon name={POTS[pot].icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="t-body font-semibold text-navy">
                    {POTS[pot].label}
                  </p>
                  {variant === "detailed" && (
                    <p className="t-small text-navy/70">{POTS[pot].hint}</p>
                  )}
                </div>
                <p className="t-body font-semibold text-navy tabular-nums">
                  {formatEur(part)}
                </p>
              </div>
              <Progress
                value={share}
                label={`${POTS[pot].label}: ${Math.round(share * 100)}%`}
                tone="azure"
              />
              {pot === "buffer" && buffer && (
                <p className="t-small text-navy/70">
                  {buffer.label}: {formatEur(buffer.saved)} →{" "}
                  {formatEur(Math.min(buffer.target, buffer.saved + part))} of{" "}
                  {formatEur(buffer.target)}
                </p>
              )}
              {pot === "holiday" && (
                <p className="t-small flex items-center justify-between gap-2 text-navy/70">
                  <span>Separate holiday pocket</span>
                  <ProposedBadge />
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-2">
        <Button>
          <Icon name="check" />
          Set up this split
        </Button>
        <Button tone="secondary">
          <Icon name="phone" />
          Talk investing with {customer.advisorName.split(" ")[0]}
        </Button>
      </div>
      <p className="t-small text-navy/60">
        Ideas, not advice. Investing carries risk and the value can go down;
        your advisor can explain the options. Nothing is moved until you
        confirm.
      </p>
    </div>
  );
}
