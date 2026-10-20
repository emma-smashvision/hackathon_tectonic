"use client";

import { useState } from "react";
import { dayLabel, MONTH_LONG, weekday } from "../../engine/everyday";
import { euro, months1, signedEuro } from "../../engine/format";
import { fuelCrowd, potSpec, stopOf, todayPick } from "../../engine/life";
import type { StopDef } from "../../engine/types";
import { useReport, useStore } from "../store";
import { G, Icon } from "../ui";
import { FuelGauge, Sparkline, TripComputer, Tyres } from "./cockpit";
import { GoalCard } from "./GoalCard";
import { MyPlan } from "./MyPlan";

/** What a tip will do with money, in a few words. */
export function potHint(scope: string, stop: StopDef, id: string): string | null {
  const label = id === "main" ? (stop.action?.label ?? "") : (stop.behaviours?.find((b) => b.id === id)?.action.label ?? "");
  if (stop.kind === "boost" && id === "main") return "parks it in savings when it lands";
  const s = potSpec(scope, stop.id, id, label);
  if (!s) return null;
  if (s.kind === "monthly") return `starts a ${euro(s.amount)}-a-month pot`;
  if (s.kind === "pct") return `puts ${Math.round(s.pct * 100)}% of income in a pot`;
  if (s.kind === "target") return `builds a ${euro(s.amount)} pot`;
  if (s.kind === "spread") return "spreads it over the months left";
  if (s.kind === "fromBoost") return `parks ${Math.round(s.pct * 100)}% of your holiday pay for it`;
  if (s.kind === "pensionSpread") return "splits the yearly amount into twelve monthly transfers";
  if (s.kind === "covered") return "it's paid from the estate";
  return null;
}

/** KBC One: `embedded` hides the greeting header (the Road tab has its own). */
export function TodayView({ embedded = false }: { embedded?: boolean } = {}) {
  const { road, journey, life, go, toggleAction, advanceMonth, checkCover, newDriver, optInCare } = useStore();
  const care = road.care;
  const crowd = care ? null : fuelCrowd(road);
  useReport(crowd ? [crowd.decision] : []);
  const pick = todayPick(road, journey, life);
  const pickStop = pick.ref ? (stopOf(road, pick.ref) as StopDef | undefined) : undefined;
  const [openTyre, setOpenTyre] = useState<string | null>(null);
  const name = newDriver ? "" : `, ${road.persona.name}`;
  const t = life.today;
  const checked = journey.cover ?? [];
  const finished = journey.month >= road.months;
  const pots = life.pots.filter((p) => p.kind !== "goal" && (p.balance > 0 || p.monthly > 0));
  const fogged = care && !journey.careOptIn;
  const items = life.next30.filter((i) => i.kind !== "spend").slice(0, 12);
  const hint = pick.action && pickStop ? potHint(pick.ref?.scope === "everyday" ? "everyday" : road.id, pickStop, pick.action.id) : null;
  const on = pick.action ? (journey.done[pick.action.key] ?? []).includes(pick.action.id) : false;

  return (
    <div className={`screen today ${care ? "care" : ""}`}>
      {!embedded && (
      <header className="today-head">
        <div className="row between">
          <div className="kicker">
            {weekday(t.cal, t.day)} {t.day} {MONTH_LONG[t.cal.month]}
          </div>
          <button type="button" className="avatar" aria-label="Open your passport" onClick={() => go({ name: "passport" })}>
            {newDriver ? "Y" : road.persona.name[0]}
          </button>
        </div>
        <h1 className="today-title">{care ? `Hello${name}.` : `Morning${name}.`}</h1>
        <div className="today-roads small">
          <span>
            <span className="road-dot" style={{ background: care ? "var(--lilac)" : road.hue }} /> {road.name} · month {journey.month} of {road.months}
          </span>
          <span>
            <span className="road-dot everyday-dot" /> Everyday Road · {MONTH_LONG[t.cal.month]}
          </span>
        </div>
      </header>
      )}

      <MyPlan compact onAll={() => go({ name: "route" })} />

      {/* the dashboard: the car is what you have */}
      <section className="dash" aria-label="Your dashboard">
        <div className="dash-fuel">
          <FuelGauge fuel={life.fuel} crowd={crowd} care={care} />
          <div className="dash-fuel-num">
            <b className="mono">{months1(life.fuel)}</b>
            <span className="xs">months of buffer</span>
          </div>
          {crowd && (
            <div className="xs dash-crowd">
              <i className="crowd-dot" /> drivers at your point:{" "}
              <G g={crowd} fmt={(v) => <b className="mono">{months1(v)}</b>} fallback="—" />
            </div>
          )}
        </div>
        <TripComputer life={life} care={care} />
        <div className="dash-foot">
          <button type="button" className="dash-mini" onClick={() => document.getElementById("boot")?.scrollIntoView({ behavior: "smooth" })}>
            <span className="xs muted">Boot</span>
            <b className="mono small">{euro(life.pots.filter((p) => !p.locked).reduce((s, p) => s + p.balance, 0))}</b>
            <span className="xs muted">
              in {pots.length + life.goals.length} pot{pots.length + life.goals.length === 1 ? "" : "s"}
            </span>
          </button>
          <button type="button" className="dash-mini tyres-btn" onClick={() => document.getElementById("tyres")?.scrollIntoView({ behavior: "smooth" })}>
            <Tyres cover={life.def.cover} checked={checked} size={30} />
            <span className="stack-4">
              <span className="xs muted">Tyres</span>
              <b className="small">
                {life.def.cover.filter((c) => c.state !== "ok" && !checked.includes(c.id)).length
                  ? `${life.def.cover.filter((c) => c.state !== "ok" && !checked.includes(c.id)).length} to check`
                  : "All good"}
              </b>
            </span>
          </button>
        </div>
      </section>

      {/* one thing on the road today */}
      <section className={`one-thing one-${pick.tone}`} aria-label="One thing today">
        <div className="kicker">{pick.kicker}</div>
        <div className="one-title">{pick.title}</div>
        <p className="card-body">{pick.line}</p>
        <div className="row wrap gap">
          {pick.action && (
            <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={() => pick.action && toggleAction(pick.action.key, pick.action.id)}>
              {on ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />}
              {pick.action.label}
            </button>
          )}
          {pick.coverId && (
            <button type="button" className="chip-btn" onClick={() => pick.coverId && checkCover(pick.coverId)}>
              <Icon name="check" size={14} /> I checked it
            </button>
          )}
          {care && !journey.careOptIn && (
            <button type="button" className="chip-btn" onClick={optInCare}>
              Show me what's ahead
            </button>
          )}
          {pick.ref && (
            <button type="button" className="btn small ghost" onClick={() => pick.ref && go({ name: "stop", stopId: pick.ref.key, from: "today" })}>
              {care ? "Read more" : "See the crowd"} <Icon name="chev" size={14} />
            </button>
          )}
          {pick.tone === "goal" && (
            <button type="button" className="btn small ghost" onClick={() => go({ name: "route" })}>
              Destinations <Icon name="chev" size={14} />
            </button>
          )}
        </div>
        {hint && <div className="xs muted">{on ? "Done: it " : "This "}{hint}.</div>}
        {care && (
          <button type="button" className="btn small primary" onClick={() => go({ name: "passport" })}>
            Talk to a person
          </button>
        )}
      </section>

      {/* salary day: the monthly ritual */}
      <section className="salary">
        {finished ? (
          <>
            <div className="grow stack-4">
              <div className="small salary-line">You finished {road.name}.</div>
              <div className="xs muted">Back on the Everyday Road. See where drivers went next.</div>
            </div>
            <button type="button" className="btn small primary" onClick={() => go({ name: "route" })}>
              Your route
            </button>
          </>
        ) : (
          <>
            <div className="grow stack-4">
              <div className="small salary-line">
                <Icon name="calendar" size={14} />{" "}
                {life.salary ? (
                  <>
                    {life.salary.label} · {dayLabel(life.salary.cal, life.salary.day)} ·{" "}
                    <b>{life.salary.inDays === 0 ? "today" : `in ${life.salary.inDays} days`}</b>
                  </>
                ) : (
                  "End of the month"
                )}
              </div>
              <div className="xs muted">Close {MONTH_LONG[t.cal.month]} and drive one month forward.</div>
            </div>
            <button type="button" className="btn small primary" onClick={() => advanceMonth()}>
              {care ? "Close the month" : "Salary day"} <Icon name="play" size={12} />
            </button>
          </>
        )}
      </section>

      {/* trip computer, in full */}
      <section className="today-sec">
        <div className="row between">
          <div className="panel-title">Next 30 days</div>
          <span className="xs muted">balance, day by day</span>
        </div>
        <Sparkline life={life} />
        <div className="day-list">
          {items.map((i) => (
            <button
              type="button"
              key={i.key}
              className={`day-row kind-${i.kind}`}
              disabled={!i.ref || (fogged && i.ref.scope === "road")}
              onClick={() => i.ref && go({ name: "stop", stopId: i.ref.key, from: "today" })}
            >
              <span className="mono xs day-date">{dayLabel(i.cal, i.day)}</span>
              <span className="grow small day-label">
                {fogged && i.ref?.scope === "road" ? "On your road · when you're ready" : i.label}
                {i.typical && !fogged && <span className="typ"> typical</span>}
              </span>
              <span className={`mono small ${i.amount > 0 ? "mint" : ""}`}>{fogged && i.ref?.scope === "road" ? "" : signedEuro(i.amount)}</span>
            </button>
          ))}
        </div>
        <div className="xs muted lh">Amounts marked typical come from the crowd. Nothing here is a guess about you.</div>
      </section>

      <section className="today-sec" id="boot">
        <div className="panel-title">The boot</div>
        {pots.length === 0 && life.goals.length === 0 && (
          <div className="xs muted lh">{care ? "Nothing in the boot right now, and that's okay. Your account carries you this month." : "No pots yet. Tips you take on the road become pots here."}</div>
        )}
        <div className="pot-grid">
          {pots.map((p) => (
            <div key={p.id} className={`pot pot-${p.kind}`}>
              <span className="xs muted">{p.label}</span>
              <b className="mono">{euro(p.balance)}</b>
              <span className="xs muted">
                {[p.monthly ? `+${euro(p.monthly)} a month` : "", p.forLabel ? `for ${p.forLabel.toLowerCase()}` : "", p.locked ? "locked until you retire" : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          ))}
        </div>
        {!care && life.goals.map((g) => <GoalCard key={g.id} road={road} goal={g} compact />)}
      </section>

      <section className="today-sec" id="tyres">
        <div className="panel-title">The tyres</div>
        <div className="xs muted">Your cover, checked by you. A tyre to check is worth a look; a missing one is a gap.</div>
        {life.def.cover.map((c) => {
          const ok = checked.includes(c.id);
          const st = ok ? "ok" : c.state;
          return (
            <div key={c.id} className={`tyre-row tyre-row-${st}`}>
              <button type="button" className="tyre-head" aria-expanded={openTyre === c.id} onClick={() => setOpenTyre(openTyre === c.id ? null : c.id)}>
                <i className={`tyre-dot tyre-${st}`} />
                <span className="grow small">{c.label}</span>
                <span className="xs mono">{ok ? "CHECKED" : st === "ok" ? "OK" : st === "gap" ? "GAP" : "CHECK"}</span>
              </button>
              {openTyre === c.id && (
                <div className="tyre-body-text stack-6">
                  <div className="xs lh">{c.note}</div>
                  {c.state !== "ok" && (
                    <button type="button" className={`chip-btn ${ok ? "on" : ""}`} aria-pressed={ok} onClick={() => checkCover(c.id)}>
                      {ok ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />} {ok ? "Checked" : "Mark as checked"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
      <p className="fineprint today-fine">
        Synthetic household for the demo. Your money is replayed from your own choices; anything ahead uses the crowd's typical amounts.
      </p>
    </div>
  );
}
