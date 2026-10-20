"use client";

import { calLabel, calOf, dayLabel, MONTH_LONG } from "../../engine/everyday";
import { euro, months1, signedEuro } from "../../engine/format";
import type { MonthRecap, StopOutcome } from "../../engine/life";
import type { RoadDef } from "../../engine/types";
import { Icon } from "../ui";

const OUTCOME: Record<StopOutcome["outcome"], { label: string; tone: string }> = {
  paved: { label: "Paved", tone: "mint" },
  hit: { label: "Hit", tone: "amber" },
  covered: { label: "Covered", tone: "mint" },
  parked: { label: "Parked", tone: "mint" },
  landed: { label: "Landed", tone: "mint" },
  info: { label: "Passed", tone: "muted" },
};

function StopLine({ s, care }: { s: StopOutcome; care: boolean }) {
  const o = OUTCOME[s.outcome];
  const money = s.kind === "boost" || s.outcome === "landed" ? signedEuro(s.amount) : s.amount ? signedEuro(-s.amount) : "";
  const parts = [
    s.fromPot ? `${euro(s.fromPot)} from its pot` : "",
    s.fromSavings ? `${euro(s.fromSavings)} from savings` : "",
    s.fromAccount && (s.fromPot || s.fromSavings) ? `${euro(s.fromAccount)} from your account` : "",
  ].filter(Boolean);
  return (
    <div className="recap-stop">
      <span className={`recap-badge ${care ? "lilac" : o.tone}`}>{care ? "Behind you" : o.label}</span>
      <div className="grow stack-4">
        <div className="row between gap">
          <b className="small">{s.title}</b>
          <span className="mono small nowrap">{money}</span>
        </div>
        {(s.note || parts.length > 0) && <div className="xs muted lh">{[s.note, parts.join(" · ")].filter(Boolean).join(" ")}</div>}
      </div>
    </div>
  );
}

/** The salary-day recap: one month driven, what it did to the car. Used by the App and the City. */
export function MonthRecapCard({
  recap,
  road,
  anchor,
  onDone,
  doneLabel,
}: {
  recap: MonthRecap;
  road: RoadDef;
  anchor: number;
  onDone: () => void;
  doneLabel?: string;
}) {
  const m = recap.month;
  const care = road.care;
  const nextCal = calOf(anchor, m.k + 1);
  const delta = recap.fuelAfter - recap.fuelBefore;
  const stops = m.stops.filter((s) => s.amount || s.kind !== "milestone" || s.outcome !== "info");
  return (
    <div className={`recap ${care ? "care" : ""}`}>
      <div className="kicker mint">{care ? "MONTH CLOSED" : "SALARY DAY · MONTH CLOSED"}</div>
      <h2 className="recap-title">
        {MONTH_LONG[m.cal.month]} {m.cal.year}, closed.
      </h2>
      <div className="recap-hero">
        <span className="mono">{signedEuro(m.income + m.oneOffs)}</span>
        <span className="small muted">came in{m.partial ? " since you opened the app" : ""}</span>
      </div>
      <div className="recap-grid">
        <div>
          <span className="xs muted">Bills</span>
          <b className="mono">{euro(m.bills)}</b>
        </div>
        <div>
          <span className="xs muted">Everyday</span>
          <b className="mono">{euro(m.spend)}</b>
        </div>
        <div>
          <span className="xs muted">To pots &amp; goals</span>
          <b className="mono">{euro(m.toPots)}</b>
        </div>
        <div>
          <span className="xs muted">Lowest point</span>
          <b className={`mono ${m.lowest < 0 ? (care ? "lilac" : "amber") : ""}`}>{euro(m.lowest)}</b>
        </div>
      </div>

      {stops.length > 0 && (
        <div className="stack-8">
          <div className="panel-title">On the road this month</div>
          {stops.map((s) => (
            <StopLine key={s.ref.key} s={s} care={care} />
          ))}
        </div>
      )}

      <div className="recap-fuel">
        <Icon name="gauge" size={18} />
        <div className="grow">
          <div className="small">
            Fuel {months1(recap.fuelBefore)} → <b>{months1(recap.fuelAfter)} months</b>
          </div>
          <div className="xs muted">
            {Math.abs(delta) < 0.05 ? "Steady." : delta > 0 ? "Your buffer grew." : care ? "Your buffer went down. That's what it's there for." : "Your buffer went down this month."}
          </div>
        </div>
      </div>

      {!care && recap.goals.length > 0 && (
        <div className="stack-6">
          <div className="panel-title">Destinations</div>
          {recap.goals.map((g) => (
            <div key={g.id} className="row between small">
              <span>
                <Icon name="pin" size={14} /> {g.label}
              </span>
              <span className="mono xs">
                {g.reached ? "ARRIVED" : `${g.after === g.before ? "no transfer yet" : signedEuro(g.after - g.before)} · ETA ${g.eta ? calLabel(g.eta) : "—"}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {recap.finished ? (
        <div className="like-you">
          You reached the end of <b>{road.name}</b>. You merge back onto the Everyday Road; your route shows where drivers went next.
        </div>
      ) : (
        recap.next.length > 0 && (
          <div className="stack-6">
            <div className="panel-title">Coming up</div>
            {recap.next.map((u) => (
              <div key={u.ref.key} className="row between small gap">
                <span>
                  <span className="mono xs muted">{dayLabel(u.cal, u.day)}</span> {u.title}
                </span>
                <span className="mono xs muted">{u.amount != null ? signedEuro(u.amount) : u.kind === "fork" ? "crossroads" : ""}</span>
              </div>
            ))}
          </div>
        )
      )}
      <button type="button" className="btn primary" onClick={onDone}>
        {doneLabel ?? `Drive into ${MONTH_LONG[nextCal.month]}`}
      </button>
    </div>
  );
}
