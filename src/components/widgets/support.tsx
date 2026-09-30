"use client";

import { useState } from "react";
import { formatDate, formatEur } from "@/lib/format";
import { Button, Icon } from "../ui";
import { type WidgetProps, within } from "./types";

export function PaymentCheckWidget({ profile, variant }: WidgetProps) {
  const flagged = within(profile.transactions, profile.today, 7).find(
    (tx) => tx.category === "transfer" && tx.newPayee && tx.amount <= -1000,
  );
  const [answer, setAnswer] = useState<"mine" | "blocked" | null>(null);

  if (flagged && answer === null) {
    return (
      <div className="space-y-3">
        <div className="t-body rounded-xl bg-warn/10 p-3 text-navy">
          <p className="font-semibold text-warn">Did you make this payment?</p>
          <p className="mt-1">
            {formatEur(-flagged.amount)} to <strong>{flagged.merchant}</strong>,
            a payee you have never paid before.
          </p>
        </div>
        {variant === "detailed" && (
          <p className="t-small text-navy/80">
            KBC will never ask you by phone, SMS or email to confirm a payment
            or share your codes.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button tone="secondary" onClick={() => setAnswer("mine")}>
            Yes, it&apos;s me
          </Button>
          <Button onClick={() => setAnswer("blocked")}>No, stop it</Button>
        </div>
      </div>
    );
  }

  if (answer === "blocked") {
    return (
      <p className="t-body flex items-start gap-3 rounded-xl bg-ok/10 p-3 text-ok">
        <Icon name="shield" className="size-6 shrink-0" />
        Payment stopped. An advisor will call you within 15 minutes.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="t-body text-navy/80">
        Got a payment request that feels off? We check the payee and the IBAN
        for known fraud before you pay.
      </p>
      {answer === "mine" && (
        <p className="t-small flex items-center gap-2 text-ok">
          <Icon name="check" className="size-4" />
          Thanks — payment confirmed.
        </p>
      )}
      <Button className="w-full">
        <Icon name="shield" />
        Check a payment
      </Button>
    </div>
  );
}

export function AdvisorWidget({ profile, variant }: WidgetProps) {
  const name = profile.customer.advisorName;
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="t-title flex size-12 shrink-0 items-center justify-center rounded-full bg-azure-50 text-navy"
        >
          {initials}
        </span>
        <div>
          <p className="t-title text-navy">{name}</p>
          <p className="t-small text-navy/70">Your personal advisor</p>
        </div>
      </div>
      <div
        className={
          variant === "detailed" ? "grid grid-cols-2 gap-2" : "grid gap-2"
        }
      >
        <Button>
          <Icon name="phone" />
          Call {name.split(" ")[0]}
        </Button>
        <Button tone="secondary">
          <Icon name="calendar" />
          Book a meeting
        </Button>
      </div>
    </div>
  );
}

export function TransactionsWidget({ profile, variant, density }: WidgetProps) {
  const count = density === "simple" ? 3 : variant === "detailed" ? 6 : 4;
  const txs = [...profile.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count);
  return (
    <ul className="divide-y divide-navy/10">
      {txs.map((tx) => (
        <li
          key={tx.id}
          className="flex items-center justify-between gap-3 py-2"
        >
          <div className="min-w-0">
            <p className="t-body truncate font-medium text-navy">
              {tx.merchant}
            </p>
            <p className="t-small text-navy/70">{formatDate(tx.date)}</p>
          </div>
          <p
            className={`t-body shrink-0 font-semibold tabular-nums ${tx.amount > 0 ? "text-ok" : "text-navy"}`}
          >
            {tx.amount > 0 ? "+" : ""}
            {formatEur(tx.amount, true)}
          </p>
        </li>
      ))}
    </ul>
  );
}
