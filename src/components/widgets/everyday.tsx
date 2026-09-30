"use client";

import { useState } from "react";
import { directDebitList, findDuplicatePayment } from "@/lib/engine/infer";
import { formatDate, formatEur } from "@/lib/format";
import { Button, Icon } from "../ui";
import { addDays, type WidgetProps } from "./types";

export function DuplicatePaymentWidget({ profile }: WidgetProps) {
  const pair = findDuplicatePayment(profile);
  const [answer, setAnswer] = useState<"back" | "fine" | null>(null);
  if (!pair) {
    return (
      <p className="t-body text-navy/80">
        No double payments found in the last weeks.
      </p>
    );
  }
  const [a, b] = pair;
  if (answer) {
    return (
      <p className="t-body flex items-start gap-3 rounded-xl bg-ok/10 p-3 text-ok">
        <Icon name="check" className="size-6 shrink-0" />
        {answer === "back"
          ? `Refund request for ${a.merchant} prepared. In the real app, KBC asks for it within 8 weeks.`
          : "Thanks. We will not ask about this payment again."}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <div className="t-body rounded-2xl bg-warn/10 p-4 text-navy">
        <p className="font-semibold text-warn">Possible double payment</p>
        <p className="mt-1">
          <strong>{a.merchant}</strong> {formatEur(-a.amount, true)} was paid on{" "}
          {formatDate(a.date)} and again on {formatDate(b.date)}.
        </p>
      </div>
      <div className="grid gap-2">
        <Button onClick={() => setAnswer("back")}>Get it back</Button>
        <Button tone="secondary" onClick={() => setAnswer("fine")}>
          It’s fine
        </Button>
      </div>
    </div>
  );
}

export function DirectDebitsWidget({ profile, variant }: WidgetProps) {
  const debits = directDebitList(profile);
  const shown = variant === "detailed" ? debits : debits.slice(0, 4);
  return (
    <div className="space-y-3">
      <p className="t-body text-navy/80">
        {debits.length} bills are paid automatically (domiciliëringen).
      </p>
      <ul className="divide-y divide-navy/10">
        {shown.map((d) => (
          <li key={d.merchant} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="t-body truncate font-semibold text-navy">
                  {d.merchant}
                </p>
                <p className="t-small text-navy/70">
                  Next around {formatDate(addDays(d.date, 30))}
                </p>
              </div>
              <p className="t-body shrink-0 font-semibold tabular-nums text-navy">
                {formatEur(d.amount, true)}
              </p>
            </div>
            {d.increase >= 5 && (
              <p className="t-small mt-1 flex items-center gap-1.5 font-medium text-warn">
                <Icon name="info" className="size-4" />
                {formatEur(d.increase)} higher than usual
              </p>
            )}
          </li>
        ))}
      </ul>
      {debits.length > shown.length && (
        <p className="t-small text-navy/60">
          And {debits.length - shown.length} more.
        </p>
      )}
    </div>
  );
}
