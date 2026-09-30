"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useState } from "react";
import { bubbleMetric } from "@/lib/engine/present";
import type { AdaptiveWidgetId, Profile } from "@/lib/engine/types";
import { formatEur } from "@/lib/format";
import { Icon } from "../ui";
import { history, RESERVE_RATE } from "../widgets/money";
import { WIDGET_META } from "../widgets/registry";
import { addDays, daysSince, within } from "../widgets/types";
import { SPLITS } from "../widgets/windfall";

/** One colour per life moment, so a glance (or a muted video) tells them apart. */
export const ACCENTS: Record<AdaptiveWidgetId, string> = {
  windfall: "#f5b73b",
  moving: "#ff8a4c",
  homeBuying: "#3ddc97",
  travel: "#38bdf8",
  taxReserve: "#fbbf24",
  investments: "#34d399",
  pension: "#a78bfa",
  budget: "#60a5fa",
  paymentCheck: "#f87171",
  advisor: "#22d3ee",
  transactions: "#94a3b8",
  duplicatePayment: "#fbbf24",
  directDebits: "#60a5fa",
  fxAccounts: "#38bdf8",
  atmMap: "#2dd4bf",
  esim: "#a78bfa",
  appointments: "#3ddc97",
  houseTimeline: "#34d399",
  houseInsurance: "#22d3ee",
  performers: "#34d399",
  dividends: "#a3e635",
  business: "#f472b6",
  celebrate: "#f5b73b",
};

type Visual =
  | { kind: "ring"; value: number }
  | { kind: "bar"; value: number }
  | { kind: "steps"; steps: { label: string; done: boolean }[] }
  | { kind: "spark"; values: number[] }
  | { kind: "split"; parts: { label: string; share: number }[] }
  | { kind: "none" };

interface Hero {
  kicker: string;
  /** A number counts up; a string is shown as is. */
  figure: number | string;
  caption: string;
  visual: Visual;
  cta: string;
}

export function heroFor(id: AdaptiveWidgetId, profile: Profile): Hero {
  const c = profile.customer;
  const month = within(profile.transactions, profile.today, 30);
  switch (id) {
    case "windfall": {
      const prize = month.find((t) => t.category === "prize");
      const balanced = SPLITS.find((s) => s.id === "balanced") ?? SPLITS[0];
      return {
        kicker: "You won!",
        figure: prize?.amount ?? 0,
        caption: "Holiday, buffer or investing? You choose the mix.",
        visual: {
          kind: "split",
          parts: [
            { label: "Holiday", share: balanced.shares.holiday },
            { label: "Buffer", share: balanced.shares.buffer },
            { label: "Invest", share: balanced.shares.invest },
          ],
        },
        cta: "Plan my prize",
      };
    }
    case "moving": {
      const recent = within(profile.transactions, profile.today, 60);
      const has = (cat: string) => recent.some((t) => t.category === cat);
      const newRent = recent.find(
        (t) => t.category === "rent" && t.city && t.city !== c.city,
      );
      return {
        kicker: "Your move",
        figure: recent
          .filter((t) => ["furniture", "moving_company"].includes(t.category))
          .reduce((s, t) => s - t.amount, 0),
        caption: newRent
          ? `spent so far · new rent ${formatEur(-newRent.amount)}/month in ${newRent.city}`
          : "spent on the move so far",
        visual: {
          kind: "steps",
          steps: [
            { label: "Furniture", done: has("furniture") },
            { label: "Movers booked", done: has("moving_company") },
            { label: "New rent", done: Boolean(newRent) },
            { label: "Change address", done: false },
          ],
        },
        cta: "Open moving checklist",
      };
    }
    case "homeBuying": {
      const goal = c.savingsGoals.find((g) => g.kind === "house");
      const monthly = -(
        month.find(
          (t) => t.category === "transfer" && t.merchant.startsWith("Savings"),
        )?.amount ?? 0
      );
      const left = goal ? goal.target - goal.saved : 0;
      return {
        kicker: goal?.label ?? "Your home",
        figure: goal?.saved ?? c.savings,
        caption: goal
          ? `of ${formatEur(goal.target)}${monthly > 0 ? ` · about ${Math.ceil(left / monthly)} months to go at ${formatEur(monthly)}/month` : ""}`
          : "saved so far",
        visual: {
          kind: "ring",
          value: goal ? goal.saved / goal.target : 0,
        },
        cta: "Can we afford a house?",
      };
    }
    case "travel": {
      const flight = month.find((t) => t.category === "flight");
      const abroad = month.find((t) => t.category === "foreign_card");
      return {
        kicker: "Trip coming up",
        figure:
          abroad?.city ??
          flight?.merchant.split(" ").slice(-3).join(" ") ??
          "Travel",
        caption: flight
          ? `${flight.merchant} · ${formatEur(-flight.amount)}`
          : "Your travel essentials",
        visual: {
          kind: "steps",
          steps: [
            { label: "Flight booked", done: Boolean(flight) },
            { label: "Card works abroad", done: Boolean(abroad) },
            {
              label: "Travel insurance",
              done: (profile.behaviour.pageViews.travelInsurance ?? 0) > 0,
            },
          ],
        },
        cta: "Get travel ready",
      };
    }
    case "taxReserve": {
      const earned = within(profile.transactions, profile.today, 90)
        .filter((t) => t.category === "freelance_income")
        .reduce((s, t) => s + t.amount, 0);
      const target = earned * RESERVE_RATE;
      return {
        kicker: "Tax reserve",
        figure: Math.round(target * 0.55),
        caption: `set aside of ${formatEur(target)} for this quarter's invoices`,
        visual: { kind: "ring", value: 0.55 },
        cta: "Top up tax reserve",
      };
    }
    case "investments": {
      const series = history(c.portfolioValue);
      const change = (c.portfolioValue - series[0]) / series[0];
      return {
        kicker: "Portfolio",
        figure: c.portfolioValue,
        caption: `${change >= 0 ? "+" : ""}${(change * 100).toFixed(1)}% over 30 days`,
        visual: { kind: "spark", values: series },
        cta: "Open portfolio",
      };
    }
    case "pension": {
      const last = profile.transactions.find(
        (t) => t.category === "pension_income",
      );
      const days = last
        ? daysSince(profile.today, addDays(last.date, 30))
        : null;
      return {
        kicker: "Your pension",
        figure: last?.amount ?? 0,
        caption:
          days === null
            ? "Monthly pension"
            : days <= 0
              ? "arrives today"
              : days === 1
                ? "arrives tomorrow"
                : `arrives in ${days} days`,
        visual: { kind: "none" },
        cta: "See pension",
      };
    }
    case "budget": {
      const spent = month
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s - t.amount, 0);
      return {
        kicker: "This month",
        figure: spent,
        caption: `spent of ${formatEur(c.monthlyNetIncome)} income`,
        visual: {
          kind: "bar",
          value: c.monthlyNetIncome ? spent / c.monthlyNetIncome : 0,
        },
        cta: "See budget",
      };
    }
    case "paymentCheck": {
      const flagged = within(profile.transactions, profile.today, 7).find(
        (t) => t.category === "transfer" && t.newPayee && t.amount <= -1000,
      );
      return {
        kicker: "Check this payment",
        figure: flagged ? -flagged.amount : "All clear",
        caption: flagged
          ? `to a new payee: ${flagged.merchant}`
          : "No unusual payments this week",
        visual: { kind: "none" },
        cta: "Review payment",
      };
    }
    case "advisor":
      return {
        kicker: "Your advisor",
        figure: c.advisorName,
        caption: "A real person, one tap away",
        visual: { kind: "none" },
        cta: `Call ${c.advisorName.split(" ")[0]}`,
      };
    case "transactions": {
      const latest = [...profile.transactions].sort((a, b) =>
        b.date.localeCompare(a.date),
      )[0];
      return {
        kicker: "Activity",
        figure: month.length,
        caption: latest
          ? `payments this month · latest: ${latest.merchant}`
          : "payments this month",
        visual: { kind: "none" },
        cta: "See all",
      };
    }
    default: {
      const metric = bubbleMetric(id, profile);
      return {
        kicker: WIDGET_META[id].title,
        figure: metric.value,
        caption: metric.label,
        visual: { kind: "none" },
        cta: "Open",
      };
    }
  }
}

function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setShown,
    });
    return () => controls.stop();
  }, [value, reduced]);
  return <>{formatEur(Math.round(shown))}</>;
}

function Ring({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="hero-ring">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="27" className="hero-ring-track" />
        <motion.circle
          cx="32"
          cy="32"
          r="27"
          className="hero-ring-fill"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <span className="hero-ring-label">{Math.round(pct * 100)}%</span>
    </div>
  );
}

function VisualView({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case "bar":
      return (
        <div className="hero-bar" aria-hidden="true">
          <motion.span
            className="hero-bar-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(1, visual.value) * 100}%` }}
            transition={{ duration: 1.2, delay: 0.2 }}
          />
        </div>
      );
    case "steps":
      return (
        <ul className="hero-steps">
          {visual.steps.map((step, i) => (
            <motion.li
              key={step.label}
              data-done={step.done}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.18 }}
            >
              <span className="hero-step-dot">
                {step.done && <Icon name="check" className="size-3" />}
              </span>
              {step.label}
            </motion.li>
          ))}
        </ul>
      );
    case "spark": {
      const min = Math.min(...visual.values);
      const max = Math.max(...visual.values);
      const d = visual.values
        .map((v, i) => {
          const x = (i / (visual.values.length - 1)) * 100;
          const y = 30 - ((v - min) / (max - min || 1)) * 28;
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return (
        <svg
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          className="hero-spark"
          role="img"
          aria-label="Value over the last 30 days"
        >
          <defs>
            <clipPath id="hero-spark-reveal">
              <motion.rect
                x="0"
                y="-4"
                height="40"
                initial={{ width: 0 }}
                animate={{ width: 100 }}
                transition={{ duration: 1.6, ease: "easeInOut" }}
              />
            </clipPath>
          </defs>
          <path d={d} clipPath="url(#hero-spark-reveal)" />
        </svg>
      );
    }
    case "split":
      return (
        <div className="hero-split">
          {visual.parts.map((p, i) => (
            <motion.div
              key={p.label}
              style={{ flexGrow: p.share }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.3 + i * 0.2, duration: 0.5 }}
            >
              <span className="hero-split-bar" data-part={i} />
              <span className="hero-split-label">
                {p.label} {Math.round(p.share * 100)}%
              </span>
            </motion.div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

/** The single most important thing for this customer, told visually. */
export function HeroCard({
  id,
  profile,
  onOpen,
}: {
  id: AdaptiveWidgetId;
  profile: Profile;
  onOpen: () => void;
}) {
  const hero = heroFor(id, profile);
  const ring = hero.visual.kind === "ring";
  return (
    <motion.button
      type="button"
      className="hero-card"
      style={{ "--accent": ACCENTS[id] } as CSSProperties}
      onClick={onOpen}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
    >
      <span className="hero-kicker">
        <Icon name={WIDGET_META[id].icon} className="size-4" />
        {hero.kicker}
      </span>
      <span className="hero-main">
        <span className="min-w-0">
          <span className="hero-figure">
            {typeof hero.figure === "number" ? (
              <CountUp value={hero.figure} />
            ) : (
              hero.figure
            )}
          </span>
          <span className="hero-caption">{hero.caption}</span>
        </span>
        {ring && hero.visual.kind === "ring" && (
          <Ring value={hero.visual.value} />
        )}
      </span>
      {!ring && <VisualView visual={hero.visual} />}
      <span className="hero-cta">
        {hero.cta}
        <Icon name="arrow-up-right" className="size-4" />
      </span>
    </motion.button>
  );
}
