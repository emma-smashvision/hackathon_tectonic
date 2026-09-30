"use client";

import { useState } from "react";
import { formatEur } from "@/lib/format";
import { Button, Icon } from "../ui";
import { Checklist } from "./life-events";
import type { WidgetProps } from "./types";

function prizeAmount(profile: WidgetProps["profile"]): number {
  return (
    profile.transactions.find((t) => t.category === "prize")?.amount ?? 10_000
  );
}

export function BusinessWidget({ variant }: WidgetProps) {
  return (
    <div className="space-y-3">
      <p className="t-body text-navy/80">
        Turn the idea into a company, with a business account from day one.
      </p>
      <Checklist
        label="Startup starter kit"
        items={
          variant === "detailed"
            ? [
                "Open a KBC business account",
                "Register the company (KBO)",
                "Join the KBC Start it programme",
                "Meet an accountant",
              ]
            : ["Open a business account", "Register the company"]
        }
      />
      <Button tone="secondary" className="w-full">
        Start a business account
      </Button>
    </div>
  );
}

const TRIPS = [
  { place: "Lisbon, 3 nights", price: 1_600 },
  { place: "Ardennes cabin weekend", price: 900 },
  { place: "Tokyo team trip", price: 6_200 },
];

export function CelebrateWidget({ profile, variant }: WidgetProps) {
  const total = prizeAmount(profile);
  const team = profile.customer.teamSize ?? 1;
  const [split, setSplit] = useState(false);
  const names = profile.customer.household
    .replace(/\s*\(.*\)/, "")
    .split(/\s*&\s*/);
  return (
    <div className="space-y-3">
      {team > 1 && (
        <>
          <ul className="grid grid-cols-2 gap-2" aria-label="Split the prize">
            {names.slice(0, team).map((name) => (
              <li
                key={name}
                className="t-small flex items-center justify-between rounded-xl bg-azure-50 px-3 py-2 text-navy"
              >
                <span className="font-semibold">{name}</span>
                <span>{formatEur(total / team)}</span>
              </li>
            ))}
          </ul>
          {split ? (
            <p className="t-small flex items-center gap-2 font-medium text-ok">
              <Icon name="check" className="size-4" />
              Split previewed: {formatEur(total / team)} each. No money moved.
            </p>
          ) : (
            <Button className="w-full" onClick={() => setSplit(true)}>
              Split with team
            </Button>
          )}
        </>
      )}
      <p className="t-body text-navy/80">
        You earned it. Ideas to celebrate, with a budget.
      </p>
      <ul className="space-y-2">
        {(variant === "detailed" ? TRIPS : TRIPS.slice(0, 2)).map((t) => (
          <li
            key={t.place}
            className="t-body flex items-center justify-between gap-2 rounded-xl border border-navy/10 px-3 py-2 text-navy"
          >
            <span className="flex items-center gap-2">
              <Icon name="plane" className="size-5 text-azure-ink" />
              {t.place}
            </span>
            <span className="t-small font-semibold">~{formatEur(t.price)}</span>
          </li>
        ))}
      </ul>
      <p className="t-small text-navy/65">
        Travel insurance is included with your KBC card.
      </p>
    </div>
  );
}
