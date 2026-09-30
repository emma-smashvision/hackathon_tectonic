"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { APPLY_THRESHOLD, QUESTION_THRESHOLD } from "@/lib/engine/infer";
import type { Persona } from "@/lib/engine/personas";
import { MIN_SCORE } from "@/lib/engine/rank";
import { INJECTIONS, type InjectionGroup } from "@/lib/engine/signals";
import type {
  AdaptiveWidgetId,
  AssessedNeed,
  HomepageConfig,
  NeedId,
  NeedSource,
  NeedStatus,
  Profile,
} from "@/lib/engine/types";
import { formatDate, formatEur } from "@/lib/format";
import type { InjectedSignal } from "../prototype/state";
import { Chip } from "../ui";
import { WIDGET_META } from "../widgets/registry";

const NEED_NAMES: Record<NeedId, string> = {
  homeBuying: "Buying a home",
  moving: "Moving",
  travel: "Travelling",
  taxReserve: "Tax reserve (irregular income)",
  investor: "Active investor",
  simpleUi: "Simple, large UI",
  retirement: "Retirement income",
  newFixedCosts: "New fixed costs",
  paymentSafety: "Payment safety",
  windfall: "One-off windfall",
};

const SOURCE_STYLE: Record<NeedSource, string> = {
  declared: "bg-navy text-white",
  inferred: "bg-azure-50 text-azure-ink",
  behaviour: "bg-amber-100 text-amber-900",
};

const STATUS_STYLE: Record<
  NeedStatus,
  { label: string; cls: string; bar: string }
> = {
  applied: {
    label: "Applied",
    cls: "bg-emerald-100 text-emerald-900",
    bar: "bg-ok",
  },
  question: {
    label: "Asking first",
    cls: "bg-sky-100 text-sky-900",
    bar: "bg-azure",
  },
  suppressed: {
    label: "Suppressed",
    cls: "bg-slate-200 text-slate-700",
    bar: "bg-slate-400",
  },
  weak: {
    label: "Too weak",
    cls: "bg-slate-100 text-slate-600",
    bar: "bg-slate-300",
  },
};

function Panel({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-navy">{title}</h2>
          {hint && <p className="text-xs text-slate-600">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function NeedRow({ need }: { need: AssessedNeed }) {
  const status = STATUS_STYLE[need.status];
  return (
    <motion.li layout className="space-y-1">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 rounded-lg py-1 text-sm">
          <span className="font-medium text-slate-900">
            {NEED_NAMES[need.id]}
          </span>
          <Chip className={SOURCE_STYLE[need.source]}>{need.source}</Chip>
          <Chip className={status.cls}>{status.label}</Chip>
          <span className="ml-auto font-mono text-xs text-slate-700 tabular-nums">
            {Math.round(need.confidence * 100)}%
          </span>
        </summary>
        <ul className="mt-1 mb-2 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
          {need.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>
      <div
        className="relative h-2 rounded-full bg-slate-100"
        aria-hidden="true"
      >
        <motion.div
          className={`h-full rounded-full ${status.bar}`}
          initial={false}
          animate={{ width: `${need.confidence * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
        <span
          aria-hidden="true"
          className="absolute -top-0.5 h-3 w-px bg-slate-500"
          style={{ left: `${APPLY_THRESHOLD * 100}%` }}
        />
      </div>
    </motion.li>
  );
}

function SignalList({ profile }: { profile: Profile }) {
  const { customer, behaviour } = profile;
  const facts: [string, string][] = [
    ["Age", `${customer.age}`],
    ["City", customer.city],
    ["Work", customer.occupation],
    ["Large text", behaviour.largeTextEnabled ? "On" : "Off"],
    ["Zoom sessions", `${Math.round(behaviour.zoomUsage * 100)}%`],
    ["Mis-taps", `${Math.round(behaviour.errorRate * 100)}%`],
    ["Portfolio views/wk", `${behaviour.portfolioViewsPerWeek}`],
    ["Mortgage sim. views", `${behaviour.pageViews.mortgageSimulator ?? 0}`],
  ];
  const txs = [...profile.transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-slate-500">{k}</dt>
            <dd className="font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <ul
        className="divide-y divide-slate-100 text-xs"
        aria-label="Latest transactions"
      >
        <AnimatePresence initial={false}>
          {txs.map((tx) => (
            <motion.li
              key={tx.id}
              layout
              initial={{ opacity: 0, backgroundColor: "#e6f7fd" }}
              animate={{ opacity: 1, backgroundColor: "#ffffff00" }}
              transition={{ duration: 1.2 }}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <span className="flex min-w-0 items-center gap-2">
                {tx.id.startsWith("live-") && (
                  <Chip className="bg-azure text-navy">live</Chip>
                )}
                <span className="truncate text-slate-800">{tx.merchant}</span>
              </span>
              <span className="shrink-0 font-mono text-slate-600">
                {formatDate(tx.date)} · {formatEur(tx.amount)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

const GROUPS: InjectionGroup[] = ["Transactions", "Behaviour"];

export function Inspector({
  personas,
  personaId,
  profile,
  needs,
  config,
  injected,
  onSelectPersona,
  onInject,
  onReset,
  onUnhide,
}: {
  personas: Persona[];
  personaId: string;
  profile: Profile;
  needs: AssessedNeed[];
  config: HomepageConfig;
  injected: InjectedSignal[];
  onSelectPersona: (id: string) => void;
  onInject: (id: string) => void;
  onReset: () => void;
  onUnhide: (id: AdaptiveWidgetId) => void;
}) {
  const active = personas.find((p) => p.id === personaId);
  const maxScore = Math.max(100, ...config.scores.map((s) => s.score));

  return (
    <div className="space-y-4">
      <Panel
        title="1 · Customer"
        hint={active?.tagline}
        action={
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-azure-ink ring-1 ring-azure-ink/30 hover:bg-azure-50"
          >
            Reset {active?.profile.customer.firstName}
          </button>
        }
      >
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Choose persona</legend>
          {personas.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === personaId}
              onClick={() => onSelectPersona(p.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                p.id === personaId
                  ? "bg-navy text-white"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </fieldset>
      </Panel>

      <Panel
        title="2 · Inject a live signal"
        hint="Each button adds a synthetic transaction or behaviour. Watch the phone rebuild."
      >
        <div className="space-y-3">
          {GROUPS.map((group) => (
            <div key={group}>
              <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                {group}
              </h3>
              <div className="flex flex-wrap gap-2">
                {INJECTIONS.filter((i) => i.group === group).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => onInject(i.id)}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm text-navy ring-1 ring-navy/20 transition-colors hover:bg-navy-50 active:bg-azure-50"
                  >
                    + {i.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {injected.length > 0 && (
            <p className="text-xs text-slate-600" aria-live="polite">
              Injected: {injected.map((s) => s.label).join(" → ")}
            </p>
          )}
        </div>
      </Panel>

      <details className="space-y-4">
        <summary className="cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold text-navy ring-1 ring-navy/20">
          Inside the engine · {config.density} / {config.tone}
        </summary>
        <Panel
          title="3 · Signals"
          hint="What the engine sees (synthetic data)."
        >
          <SignalList profile={profile} />
        </Panel>

        <Panel
          title="4 · Inferred needs"
          hint={`Applied at ≥${APPLY_THRESHOLD * 100}% (tick). ${QUESTION_THRESHOLD * 100}–${APPLY_THRESHOLD * 100}% becomes a question. Expand for reasons.`}
        >
          {needs.length === 0 ? (
            <p className="text-sm text-slate-600">
              No needs detected yet — the home stays neutral.
            </p>
          ) : (
            <ul className="space-y-3">
              {needs.map((n) => (
                <NeedRow key={n.id} need={n} />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="5 · Widget ranking"
          hint={`Score = base + Σ(need weight × confidence) + usage. Shown if ≥${MIN_SCORE} or pinned.`}
        >
          <ul className="space-y-1.5">
            {config.scores.map((s) => (
              <motion.li
                key={s.id}
                layout
                className="grid grid-cols-[8.5rem_1fr_auto] items-center gap-2 text-xs"
              >
                <span className="truncate font-medium text-slate-800">
                  {WIDGET_META[s.id].title}
                </span>
                <span className="h-2 rounded-full bg-slate-100">
                  <motion.span
                    className={`block h-full rounded-full ${s.shown ? "bg-navy" : "bg-slate-300"}`}
                    initial={false}
                    animate={{ width: `${(s.score / maxScore) * 100}%` }}
                  />
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-9 text-right font-mono tabular-nums">
                    {s.score}
                  </span>
                  {s.hidden ? (
                    <button
                      type="button"
                      onClick={() => onUnhide(s.id)}
                      className="rounded px-1.5 py-0.5 text-azure-ink underline"
                    >
                      unhide
                    </button>
                  ) : (
                    <Chip
                      className={
                        s.pinned
                          ? "bg-navy text-white"
                          : s.shown
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-slate-500"
                      }
                    >
                      {s.pinned ? "pinned" : s.shown ? "shown" : "—"}
                    </Chip>
                  )}
                </span>
              </motion.li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="6 · Homepage config"
          hint={`Density: ${config.density} · Tone: ${config.tone} · Core zone is fixed.`}
        >
          <details>
            <summary className="cursor-pointer text-sm text-azure-ink">
              Show the JSON the app renders from
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[0.7rem] text-slate-100">
              {JSON.stringify(
                {
                  core: config.core,
                  density: config.density,
                  tone: config.tone,
                  adaptive: config.adaptive.map(
                    ({ id, size, variant, score }) => ({
                      id,
                      size,
                      variant,
                      score,
                    }),
                  ),
                  questions: config.questions.map((q) => q.need),
                },
                null,
                2,
              )}
            </pre>
          </details>
        </Panel>
      </details>
    </div>
  );
}
