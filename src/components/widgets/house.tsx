"use client";

import { Button, Icon } from "../ui";
import { Checklist } from "./life-events";
import type { WidgetProps } from "./types";

export function AppointmentsWidget({ profile, variant }: WidgetProps) {
  const all = profile.customer.appointments ?? [];
  const list = variant === "detailed" ? all : all.filter((a) => !a.done);
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {list.map((a) => (
          <li
            key={a.id}
            className={`flex items-start gap-3 rounded-2xl p-3 ${a.done ? "bg-navy/5 text-navy/60" : "bg-azure-50 text-navy"}`}
          >
            <Icon
              name={a.done ? "check" : "calendar"}
              className="mt-0.5 size-5 shrink-0"
            />
            <div className="min-w-0">
              <p className="t-body font-semibold">{a.title}</p>
              <p className="t-small">
                {a.when}, {a.where}
                {a.done ? " (done)" : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <Button tone="secondary" className="w-full">
        <Icon name="calendar" />
        Book advisor
      </Button>
    </div>
  );
}

const HOUSE_STEPS = ["Visits", "Offer", "Mortgage", "Notary", "Keys"] as const;

export function HouseTimelineWidget({ profile, variant }: WidgetProps) {
  const agent = profile.transactions.some(
    (t) => t.category === "real_estate_agent",
  );
  const done = agent ? 1 : 0;
  return (
    <div className="space-y-4">
      <ol className="space-y-0" aria-label="House-buying timeline">
        {HOUSE_STEPS.map((step, i) => {
          const status = i < done ? "done" : i === done ? "now" : "later";
          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    status === "done"
                      ? "bg-ok text-white"
                      : status === "now"
                        ? "bg-navy text-white ring-4 ring-azure/30"
                        : "bg-navy/10 text-navy/60"
                  }`}
                >
                  {status === "done" ? (
                    <Icon name="check" className="size-4" />
                  ) : (
                    i + 1
                  )}
                </span>
                {i < HOUSE_STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`w-0.5 flex-1 ${i < done ? "bg-ok" : "bg-navy/15"}`}
                  />
                )}
              </div>
              <div className="pb-3">
                <p className="t-body font-semibold text-navy">{step}</p>
                <p className="t-small text-navy/70">
                  {status === "done"
                    ? "Done"
                    : status === "now"
                      ? "In progress"
                      : "Coming up"}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {variant === "detailed" && (
        <Checklist
          label="Documents for your mortgage"
          items={[
            "Last 3 payslips of both of you",
            "ID cards",
            "Proof of own funds",
            "Signed sales agreement (compromis)",
          ]}
        />
      )}
    </div>
  );
}

const INSURANCES = [
  {
    name: "Home insurance",
    why: "Needed from the day you get the keys",
  },
  {
    name: "Fire insurance",
    why: "Required by the bank for your mortgage",
  },
  {
    name: "Debt balance insurance",
    why: "Protects your partner if one of you can no longer pay",
  },
];

export function HouseInsuranceWidget({ variant }: WidgetProps) {
  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {INSURANCES.map((ins) => (
          <li
            key={ins.name}
            className="flex items-start gap-3 rounded-2xl border border-navy/10 p-3"
          >
            <Icon name="umbrella" className="mt-0.5 size-5 text-azure-ink" />
            <div>
              <p className="t-body font-semibold text-navy">{ins.name}</p>
              {variant === "detailed" && (
                <p className="t-small text-navy/70">{ins.why}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Button tone="secondary" className="w-full">
        Get a quote
      </Button>
    </div>
  );
}
