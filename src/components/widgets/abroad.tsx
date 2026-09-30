"use client";

import { useId, useState } from "react";
import { formatEur } from "@/lib/format";
import { Button, Icon, ProposedBadge } from "../ui";
import type { WidgetProps } from "./types";

const FEE = 0.005;

function money(amount: number, code: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: code,
    maximumFractionDigits: code === "JPY" ? 0 : 2,
  }).format(amount);
}

export function FxAccountsWidget({ profile, variant }: WidgetProps) {
  const pockets = profile.customer.currencies ?? [];
  const [code, setCode] = useState(pockets.at(-1)?.code ?? "JPY");
  const [amount, setAmount] = useState(200);
  const [done, setDone] = useState(false);
  const pocket = pockets.find((p) => p.code === code);
  const rate = pocket?.rate ?? 162;
  const fee = Math.round(amount * FEE * 100) / 100;
  const inputId = useId();
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-3 gap-2" aria-label="Your currencies">
        <li className="rounded-2xl bg-navy-50 p-3">
          <p className="t-small text-navy/70">EUR</p>
          <p className="t-body font-bold text-navy">
            {formatEur(profile.customer.balance)}
          </p>
        </li>
        {pockets.map((p) => (
          <li key={p.code} className="rounded-2xl bg-navy-50 p-3">
            <p className="t-small text-navy/70">{p.code}</p>
            <p className="t-body font-bold text-navy">
              {money(p.amount, p.code)}
            </p>
          </li>
        ))}
      </ul>
      <fieldset className="space-y-2 rounded-2xl border border-navy/10 p-3">
        <legend className="t-small px-1 font-semibold text-navy">
          Exchange
        </legend>
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Amount in euro
          </label>
          <input
            id={inputId}
            type="number"
            min={10}
            step={10}
            value={amount}
            onChange={(e) => {
              setAmount(Math.max(0, Number(e.target.value)));
              setDone(false);
            }}
            className="tap t-body w-full min-w-0 rounded-xl border border-navy/20 px-3 text-navy"
          />
          <select
            aria-label="Currency"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="tap t-body rounded-xl border border-navy/20 px-2 text-navy"
          >
            {pockets.map((p) => (
              <option key={p.code}>{p.code}</option>
            ))}
          </select>
        </div>
        <dl className="t-small grid grid-cols-2 gap-y-1 text-navy/80">
          <dt>Rate (mocked)</dt>
          <dd className="text-right font-medium text-navy">
            1 EUR = {rate} {code}
          </dd>
          <dt>Fee</dt>
          <dd className="text-right font-medium text-navy">
            {formatEur(fee, true)}
          </dd>
          <dt>You get</dt>
          <dd className="text-right font-bold text-navy">
            {money(amount * rate, code)}
          </dd>
        </dl>
        {done ? (
          <p className="t-small flex items-center gap-2 font-medium text-ok">
            <Icon name="check" className="size-4" />
            Exchange previewed. No money was moved in this demo.
          </p>
        ) : (
          <Button className="w-full" onClick={() => setDone(true)}>
            Exchange to {code}
          </Button>
        )}
      </fieldset>
      {variant === "detailed" && (
        <p className="t-small flex items-center justify-between gap-2 text-navy/80">
          Open another currency pocket
          <ProposedBadge />
        </p>
      )}
    </div>
  );
}

const PINS = [
  { x: 28, y: 38, free: true, name: "Seven Bank, 120 m" },
  { x: 64, y: 30, free: true, name: "Japan Post, 350 m" },
  { x: 72, y: 70, free: false, name: "Travelex, 400 m (fee ¥220)" },
  { x: 40, y: 72, free: true, name: "Aeon Bank, 600 m" },
];

export function AtmMapWidget({ variant }: WidgetProps) {
  return (
    <div className="space-y-3">
      <svg
        viewBox="0 0 100 80"
        className="w-full rounded-2xl bg-[#e8f1f8]"
        role="img"
        aria-label="Mock map with four ATMs near you, three of them fee-free"
      >
        <path
          d="M0 50 L100 42 M20 0 L34 80 M58 0 L70 80 M0 18 L100 24"
          stroke="#fff"
          strokeWidth="5"
        />
        <circle cx="50" cy="48" r="3" fill="#003665" />
        <circle
          cx="50"
          cy="48"
          r="7"
          fill="none"
          stroke="#003665"
          opacity="0.3"
        />
        {PINS.map((p) => (
          <g key={p.name}>
            <circle
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill={p.free ? "#137a45" : "#9a5b00"}
            />
            <text
              x={p.x}
              y={p.y + 1.6}
              fontSize="4.5"
              textAnchor="middle"
              fill="#fff"
              fontWeight="700"
            >
              ¥
            </text>
          </g>
        ))}
      </svg>
      <ul className="space-y-1.5">
        {(variant === "detailed" ? PINS : PINS.slice(0, 2)).map((p) => (
          <li
            key={p.name}
            className="t-small flex items-center justify-between gap-2 text-navy"
          >
            <span>{p.name}</span>
            <span
              className={`font-semibold ${p.free ? "text-ok" : "text-warn"}`}
            >
              {p.free ? "Fee-free" : "Fee"}
            </span>
          </li>
        ))}
      </ul>
      <p className="t-small text-navy/60">Mock map. Locations are made up.</p>
    </div>
  );
}

const PLANS = [
  { data: "5 GB", days: 7, price: 9 },
  { data: "10 GB", days: 15, price: 15 },
  { data: "Unlimited", days: 30, price: 29 },
];

export function EsimWidget({ profile, variant }: WidgetProps) {
  const city = profile.transactions.find(
    (t) => t.country && t.country !== "BE" && t.city,
  )?.city;
  const [chosen, setChosen] = useState<string | null>(null);
  const plans = variant === "detailed" ? PLANS : PLANS.slice(0, 2);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="t-body text-navy/80">
          Data {city ? `in ${city} and ` : ""}outside the EU without roaming
          costs.
        </p>
        <ProposedBadge />
      </div>
      <ul className="grid gap-2">
        {plans.map((p) => (
          <li key={p.data}>
            <button
              type="button"
              aria-pressed={chosen === p.data}
              onClick={() => setChosen(p.data)}
              className={`tap t-body flex w-full items-center justify-between rounded-xl px-3 text-left text-navy ring-1 ${chosen === p.data ? "bg-azure-50 ring-azure" : "ring-navy/15 hover:bg-navy-50"}`}
            >
              <span>
                <strong>{p.data}</strong> · {p.days} days
              </span>
              <span className="font-semibold">{formatEur(p.price)}</span>
            </button>
          </li>
        ))}
      </ul>
      {chosen && (
        <p className="t-small flex items-center gap-2 font-medium text-ok">
          <Icon name="check" className="size-4" />
          {chosen} plan previewed. Proposed service, nothing was bought.
        </p>
      )}
    </div>
  );
}
