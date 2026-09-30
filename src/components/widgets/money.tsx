"use client";

import { useState } from "react";
import { formatDate, formatEur } from "@/lib/format";
import { Button, Icon, Progress } from "../ui";
import { addDays, daysSince, type WidgetProps, within } from "./types";

/** Deterministic synthetic price history, so renders are stable. */
export function history(value: number, points = 30): number[] {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const wave = Math.sin(i * 0.9) * 0.012 + Math.sin(i * 0.31) * 0.02;
    return value * (0.955 + t * 0.045 + wave);
  });
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 28 - ((v - min) / (max - min || 1)) * 26;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="h-12 w-full text-azure-ink"
      role="img"
      aria-label="Portfolio value over the last 30 days, trending up"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const ALLOCATION = [
  { label: "Equity funds", share: 0.58 },
  { label: "Bonds", share: 0.24 },
  { label: "Real estate funds", share: 0.1 },
  { label: "Cash", share: 0.08 },
];

export function InvestmentsWidget({ profile, variant }: WidgetProps) {
  const value = profile.customer.portfolioValue;
  const series = history(value);
  const monthChange = value - series[0];
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <p className="t-figure text-navy">{formatEur(value)}</p>
        <p className="t-small font-semibold text-ok">
          +{formatEur(monthChange)} this month
        </p>
      </div>
      <Sparkline values={series} />
      {variant === "detailed" && (
        <ul className="space-y-2" aria-label="Asset allocation">
          {ALLOCATION.map((a) => (
            <li key={a.label} className="space-y-1">
              <div className="t-small flex justify-between text-navy/80">
                <span>{a.label}</span>
                <span className="font-medium text-navy">
                  {Math.round(a.share * 100)}% · {formatEur(value * a.share)}
                </span>
              </div>
              <Progress value={a.share} label={a.label} tone="azure" />
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button tone="secondary">Portfolio</Button>
        <Button>Invest</Button>
      </div>
    </div>
  );
}

/** Belgian advance tax payment deadlines (month is 1-based). */
const PREPAYMENT_DEADLINES: [number, number][] = [
  [4, 10],
  [7, 10],
  [10, 10],
  [12, 20],
];

function nextDeadline(today: string): string {
  const year = Number(today.slice(0, 4));
  for (const [m, d] of PREPAYMENT_DEADLINES) {
    const iso = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (iso >= today) return iso;
  }
  return `${year + 1}-04-10`;
}

export const RESERVE_RATE = 0.4;

export function TaxReserveWidget({ profile, variant }: WidgetProps) {
  const income = within(profile.transactions, profile.today, 90).filter(
    (tx) => tx.category === "freelance_income",
  );
  const earned = income.reduce((s, tx) => s + tx.amount, 0);
  const target = earned * RESERVE_RATE;
  const [reserved, setReserved] = useState(() => Math.round(target * 0.55));
  const missing = Math.max(0, target - reserved);
  const deadline = nextDeadline(profile.today);
  const days = daysSince(profile.today, deadline);
  return (
    <div className="space-y-3">
      <p className="t-body text-navy/80">Set aside for taxes this quarter</p>
      <div className="flex items-end justify-between">
        <p className="t-figure text-navy">{formatEur(reserved)}</p>
        <p className="t-small text-navy/70">of {formatEur(target)}</p>
      </div>
      <Progress
        value={target ? reserved / target : 1}
        label="Tax reserve progress"
        tone={missing > 0 ? "warn" : "ok"}
      />
      <p className="t-small text-navy/80">
        Next advance payment: <strong>{formatDate(deadline)}</strong> ({days}{" "}
        days)
      </p>
      {variant === "detailed" && (
        <ul className="t-small divide-y divide-navy/10 rounded-xl border border-navy/10">
          {income.map((tx) => (
            <li key={tx.id} className="flex justify-between gap-2 px-3 py-2">
              <span className="truncate text-navy/80">{tx.merchant}</span>
              <span className="shrink-0 font-medium text-navy">
                {formatEur(tx.amount)} → {formatEur(tx.amount * RESERVE_RATE)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Button
        className="w-full"
        disabled={missing === 0}
        onClick={() => setReserved(Math.round(target))}
      >
        {missing > 0
          ? `Move ${formatEur(missing)} to tax pocket`
          : "Fully reserved"}
      </Button>
    </div>
  );
}

const FIXED = ["rent", "utilities", "insurance", "subscription"];

export function BudgetWidget({ profile, variant }: WidgetProps) {
  const month = within(profile.transactions, profile.today, 30);
  const fixed = month.filter((tx) => FIXED.includes(tx.category));
  const fixedTotal = fixed.reduce((s, tx) => s - tx.amount, 0);
  const spent = month
    .filter((tx) => tx.amount < 0)
    .reduce((s, tx) => s - tx.amount, 0);
  const newCosts = fixed.filter(
    (tx) =>
      !profile.transactions.some(
        (o) =>
          o.merchant === tx.merchant && daysSince(o.date, profile.today) > 30,
      ),
  );
  const income = profile.customer.monthlyNetIncome;
  const ratio = income ? fixedTotal / income : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="t-small text-navy/70">Spent this month</p>
          <p className="t-figure text-navy">{formatEur(spent)}</p>
        </div>
        <p className="t-small text-right text-navy/70">
          Fixed costs
          <br />
          <strong className="text-navy">{formatEur(fixedTotal)}</strong>
        </p>
      </div>
      <Progress
        value={ratio}
        label="Fixed costs as share of income"
        tone={ratio > 0.5 ? "warn" : "navy"}
      />
      <p className="t-small text-navy/80">
        Fixed costs take {Math.round(ratio * 100)}% of your income.
      </p>
      {newCosts.length > 0 && (
        <ul className="space-y-1" aria-label="New fixed costs">
          {newCosts.map((tx) => (
            <li
              key={tx.id}
              className="t-small flex justify-between gap-2 rounded-xl bg-azure-50 px-3 py-2 text-navy"
            >
              <span className="flex items-center gap-2">
                <Icon name="sparkle" className="size-4 text-azure-ink" />
                New: {tx.merchant}
              </span>
              <span className="font-semibold">{formatEur(-tx.amount)}/m</span>
            </li>
          ))}
        </ul>
      )}
      {variant === "detailed" && (
        <Button tone="secondary" className="w-full">
          Set a monthly budget
        </Button>
      )}
    </div>
  );
}

export function PensionWidget({ profile, variant }: WidgetProps) {
  const last = profile.transactions.find(
    (tx) => tx.category === "pension_income",
  );
  if (!last) {
    return (
      <div className="space-y-3">
        <p className="t-body text-navy/80">
          See what your statutory and supplementary pension will look like.
        </p>
        <Button tone="secondary" className="w-full">
          Open pension overview
        </Button>
      </div>
    );
  }
  const next = addDays(last.date, 30);
  return (
    <div className="space-y-3">
      <p className="t-body text-navy/80">Your next pension payment</p>
      <p className="t-figure text-navy">{formatEur(last.amount, true)}</p>
      <p className="t-body flex items-center gap-2 text-navy">
        <Icon name="calendar" />
        Expected on <strong>{formatDate(next)}</strong>
      </p>
      {variant === "detailed" && (
        <dl className="t-small grid grid-cols-2 gap-y-1 text-navy/80">
          <dt>This year so far</dt>
          <dd className="text-right font-medium text-navy">
            {formatEur(last.amount * 9)}
          </dd>
          <dt>Paid by</dt>
          <dd className="text-right font-medium text-navy">{last.merchant}</dd>
        </dl>
      )}
    </div>
  );
}
