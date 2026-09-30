"use client";

import { useId, useState } from "react";
import { maxComfortablePrice, mortgageScenario } from "@/lib/finance";
import { formatEur } from "@/lib/format";
import { Button, Icon, Progress, ProposedBadge } from "../ui";
import { type WidgetProps, within } from "./types";

function Checklist({ items, label }: { items: string[]; label: string }) {
  const [done, setDone] = useState<string[]>([]);
  const toggle = (item: string) =>
    setDone((d) =>
      d.includes(item) ? d.filter((x) => x !== item) : [...d, item],
    );
  return (
    <fieldset className="space-y-1">
      <legend className="t-small mb-1 font-semibold text-navy">
        {label} · {done.length}/{items.length}
      </legend>
      <Progress value={done.length / items.length} label={label} tone="ok" />
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item}>
            <label className="tap t-body flex cursor-pointer items-center gap-3 rounded-lg px-1 hover:bg-navy-50">
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-navy"
                checked={done.includes(item)}
                onChange={() => toggle(item)}
              />
              <span
                className={
                  done.includes(item) ? "text-navy/50 line-through" : ""
                }
              >
                {item}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function HomeBuyingWidget({ profile, variant }: WidgetProps) {
  const { customer } = profile;
  const goal = customer.savingsGoals.find((g) => g.kind === "house");
  const ownFunds = goal?.saved ?? customer.savings;
  const budget =
    Math.floor(
      maxComfortablePrice(ownFunds, customer.monthlyNetIncome) / 5000,
    ) * 5000;
  const [price, setPrice] = useState(Math.min(budget, 600_000));
  const scenario = mortgageScenario(price, ownFunds, customer.monthlyNetIncome);
  const sliderId = useId();

  const verdictStyle = {
    comfortable: { text: "Comfortable", tone: "ok" as const, cls: "text-ok" },
    tight: { text: "Tight", tone: "warn" as const, cls: "text-warn" },
    stretch: { text: "A stretch", tone: "bad" as const, cls: "text-bad" },
  }[scenario.verdict];

  return (
    <div className="space-y-4">
      <div>
        <p className="t-body text-navy/80">
          {customer.household.includes("&") ? "Together you" : "You"} could
          comfortably buy a home up to
        </p>
        <p className="t-figure text-navy">{formatEur(budget)}</p>
      </div>

      {goal && (
        <div className="space-y-1">
          <div className="t-small flex justify-between text-navy/80">
            <span>{goal.label}</span>
            <span>
              {formatEur(goal.saved)} / {formatEur(goal.target)}
            </span>
          </div>
          <Progress value={goal.saved / goal.target} label={goal.label} />
        </div>
      )}

      {variant === "detailed" && (
        <>
          <div className="space-y-2 rounded-2xl bg-navy-50 p-3">
            <label
              htmlFor={sliderId}
              className="t-small flex justify-between font-semibold text-navy"
            >
              <span>Home price</span>
              <span>{formatEur(price)}</span>
            </label>
            <input
              id={sliderId}
              type="range"
              min={150_000}
              max={600_000}
              step={5_000}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full accent-navy"
            />
            <dl className="t-small grid grid-cols-2 gap-x-3 gap-y-1 text-navy/80">
              <dt>Loan needed</dt>
              <dd className="text-right font-medium text-navy">
                {formatEur(scenario.loan)}
              </dd>
              <dt>Monthly (25 y, 3.3%)</dt>
              <dd className="text-right font-medium text-navy">
                {formatEur(scenario.monthly)}
              </dd>
              <dt>Of your net income</dt>
              <dd className={`text-right font-semibold ${verdictStyle.cls}`}>
                {Math.round(scenario.ratio * 100)}% · {verdictStyle.text}
              </dd>
            </dl>
            <Progress
              value={scenario.ratio / 0.5}
              label="Repayment as share of income"
              tone={verdictStyle.tone}
            />
            <p className="text-[0.65rem] text-navy/60">
              Illustration only, incl. ~6% purchase costs. Not a credit offer.
            </p>
          </div>
          <Checklist
            label="Documents for your mortgage"
            items={[
              "Last 3 payslips",
              "ID cards of both buyers",
              "Proof of own funds",
              "Signed sales agreement (compromis)",
            ]}
          />
        </>
      )}

      <Button className="w-full">
        <Icon name="calendar" />
        Book a mortgage advisor
      </Button>
    </div>
  );
}

export function MovingWidget({ profile, variant }: WidgetProps) {
  const moveCosts = within(profile.transactions, profile.today, 60)
    .filter((tx) => ["furniture", "moving_company"].includes(tx.category))
    .reduce((sum, tx) => sum - tx.amount, 0);
  const items =
    variant === "detailed"
      ? [
          "Register your new address at the town hall (within 8 days)",
          "Transfer energy, water and internet",
          "Get tenant fire insurance for the new place",
          "Update your address at KBC",
          "Set up a standing order for rent",
        ]
      : [
          "Register at the town hall",
          "Move energy & internet",
          "Update your address at KBC",
        ];
  return (
    <div className="space-y-4">
      <Checklist label="Your moving checklist" items={items} />
      {variant === "detailed" && moveCosts > 0 && (
        <p className="t-small rounded-xl bg-navy-50 p-3 text-navy">
          Spent on the move so far: <strong>{formatEur(moveCosts)}</strong>
        </p>
      )}
      <Button tone="secondary" className="w-full">
        Update my address
      </Button>
    </div>
  );
}

function CardToggle({ label }: { label: string }) {
  const [on, setOn] = useState(true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className="tap t-body flex w-full items-center justify-between gap-3 rounded-xl px-1 text-left text-navy hover:bg-navy-50"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-ok" : "bg-navy/25"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
        />
      </span>
    </button>
  );
}

export function TravelWidget({ profile, variant }: WidgetProps) {
  const flight = profile.transactions.find((tx) => tx.category === "flight");
  const trip = flight ? flight.merchant : "your trip";
  return (
    <div className="space-y-3">
      <p className="t-body text-navy/80">
        Ready for <strong className="text-navy">{trip}</strong>
      </p>
      <CardToggle label="My card works abroad" />
      <div className="t-body flex items-start gap-3 rounded-xl bg-ok/10 p-3 text-ok">
        <Icon name="shield" className="size-6 shrink-0" />
        <span>Travel assistance is included with your card.</span>
      </div>
      {variant === "detailed" && (
        <>
          <CardToggle label="Online payments" />
          <CardToggle label="Contactless abroad" />
          <ul className="space-y-2">
            <li className="t-small flex items-center justify-between gap-2 rounded-xl border border-navy/10 p-3 text-navy">
              <span>Multi-currency pocket, no FX fees</span>
              <ProposedBadge />
            </li>
            <li className="t-small flex items-center justify-between gap-2 rounded-xl border border-navy/10 p-3 text-navy">
              <span>Travel eSIM with data in 90+ countries</span>
              <ProposedBadge />
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
