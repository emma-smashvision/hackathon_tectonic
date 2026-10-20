"use client";

import { calLabel, EVERYDAY, type EverydayStop } from "../../engine/everyday";
import { euro, int, oneIn, pct, signedEuro } from "../../engine/format";
import { readiness } from "../../engine/game";
import { K_MIN } from "../../engine/gate";
import { refFromKey } from "../../engine/life";
import type { Yearly } from "../../engine/lives";
import { statsFor } from "../../engine/simulate";
import type { StopDef } from "../../engine/types";
import { type Tab, useReport, useStore } from "../store";
import { G, Icon, Ring } from "../ui";
import { potHint } from "./TodayView";
import { useLiveNotes } from "./useLiveNotes";

const BACK: Record<Tab, string> = { today: "Today", route: "Your route", road: "Your road", notes: "Pass it on" };

function BackBar({ to = "road" }: { to?: Tab }) {
  const { go } = useStore();
  return (
    <button type="button" className="back" onClick={() => go({ name: to })}>
      <Icon name="back" size={18} /> {BACK[to]}
    </button>
  );
}

export function StopView({ stopId, from }: { stopId: string; from?: Tab }) {
  const { road: myRoad, journey, toggleAction, go, life } = useStore();
  const ref = refFromKey(stopId);
  const everyday = ref.scope === "everyday";
  const road = everyday ? EVERYDAY : myRoad;
  const stop = road.stops.find((s) => s.id === ref.id) as StopDef;
  const stats = statsFor(road, stop);
  useReport(stats.decisions);
  const live = useLiveNotes(everyday ? "" : road.id).filter((n) => n.stopId === stop.id);
  const done = journey.done[stopId] ?? [];
  const ready = readiness(stop, done);
  const up = life.upcoming.find((u) => u.ref.key === stopId);
  const passed = everyday ? !up : stop.month <= journey.month;
  const away = stop.month - journey.month;
  const care = myRoad.care;
  const scope = everyday ? "everyday" : road.id;
  const lastYear = everyday ? life.def.yearly[(stop as EverydayStop).yearlyKey as keyof Yearly] : 0;
  const potFor = (id: string) => life.pots.find((p) => p.id === `tip:${stopId}:${id}`);

  const kicker =
    stop.kind === "bump" ? (care ? "WHAT'S AHEAD" : "BUMP AHEAD") : stop.kind === "boost" ? "MONEY COMING IN" : "ON THE ROAD";
  const when = everyday
    ? `EVERYDAY ROAD · ${up ? `${calLabel(up.cal).toUpperCase()} · IN ${up.inDays} DAYS` : "PASSED"}`
    : passed
      ? `PASSED · MONTH ${stop.month}`
      : `MONTH ${stop.month} · IN ~${away} MONTH${away === 1 ? "" : "S"}`;

  const chip = (id: string, label: string, plus?: number) => {
    const on = done.includes(id);
    const hint = potHint(scope, stop, id);
    const pot = potFor(id);
    return (
      <div className="stack-4">
        <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggleAction(stopId, id)}>
          {on ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />}
          {label}
          {!care && plus != null && <span className="mono xs">+{plus}</span>}
        </button>
        {hint && !care && (
          <span className="xs muted pot-hint">
            {on && pot ? `Pot: ${euro(pot.balance)} so far · ${euro(pot.monthly)} a month` : `This ${hint}.`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`screen detail ${care ? "care" : ""}`}>
      <BackBar to={from ?? "road"} />
      <div className="row between start">
        <div className="stack-6">
          <div className={`kicker tone-${stop.kind}`}>
            {kicker} · {when}
          </div>
          <h1 className="detail-title">{stop.title}</h1>
        </div>
        {!care && stop.kind !== "boost" && (
          <Ring value={ready} size={52} stroke={4} color={ready >= 50 ? "var(--mint)" : "var(--amber)"} label={`${ready}% ready`} />
        )}
      </div>

      {stats.kind === "bump" && (
        <>
          <div className="stack-8">
            <div className="muted small">
              What <b className="ink">{int(stats.n)} people</b> paid at this point
            </div>
            <div className="hist" role="img" aria-label="Distribution of what people paid">
              {stats.bins.map((b) => (
                <div key={b.label} className="hist-col">
                  <div className={`hist-bar ${b.over ? "over" : ""}`} style={{ height: `${Math.max(4, (b.share / Math.max(...stats.bins.map((x) => x.share))) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="hist-labels mono">
              {stats.bins.map((b) => (
                <div key={b.label}>{b.label}</div>
              ))}
            </div>
            <div className="small muted">
              <G g={stats.hitRate} fmt={(v) => <><b className="amber">{oneIn(v)}</b> {stop.hitVerb ?? "paid more than"} {euro(stats.threshold)}</>} /> · median{" "}
              <G g={stats.median} fmt={(v) => euro(v)} />
            </div>
          </div>

          <section className="panel stack-12">
            <div className="row between">
              <div className="panel-title">{care ? "What helped" : "What made the difference"}</div>
              {!care && (
                <div className="legend">
                  <span><i className="sw calm" />came through calmly</span>
                  <span><i className="sw hit" />got hit hard</span>
                </div>
              )}
            </div>
            {stats.behaviours.map((b) => {
              const on = done.includes(b.id);
              return (
                <div key={b.id} className="behaviour">
                  <div className="small">{b.label}</div>
                  <div className="bar-row">
                    <div className="bar calm" style={{ width: `${(b.calm.value ?? 0) * 100}%` }} />
                    <span className="mono xs">
                      <G g={b.calm} fmt={pct} fallback="–" />
                    </span>
                  </div>
                  {!care && (
                    <div className="bar-row">
                      <div className="bar hit" style={{ width: `${(b.hit.value ?? 0) * 100}%` }} />
                      <span className="mono xs amber">
                        <G g={b.hit} fmt={pct} fallback="–" />
                      </span>
                    </div>
                  )}
                  {!passed && chip(b.id, b.action.label, b.action.readiness)}
                  {passed && on && <span className="xs mint">You did this ✓</span>}
                </div>
              );
            })}
            {!care && done.length > 0 && (
              <div className="like-you">
                <G
                  g={stats.calmIf(done)}
                  fmt={(v) => (
                    <>
                      Of the people who did what you're doing, <b>{pct(v)}</b> came through calmly.
                    </>
                  )}
                  fallback="Too few people did exactly this to show a number."
                />
              </div>
            )}
          </section>
        </>
      )}

      {stats.kind === "boost" && (
        <section className="panel stack-12">
          <div className="big-stat mint">
            <G g={stats.median} fmt={(v) => euro(v)} />
          </div>
          <div className="small muted">typical amount, across {int(stats.n)} people</div>
          <p className="card-body">{stop.advice}</p>
          {stop.action && !passed && chip("main", stop.action.label)}
        </section>
      )}

      {stats.kind === "milestone" && (
        <section className="panel stack-12">
          <div className="big-stat">
            <G g={stats.rate} fmt={(v) => pct(v)} />
          </div>
          <div className="small muted">
            {stop.rate?.label} · {int(stats.n)} people
          </div>
          <p className="card-body">{stop.advice}</p>
          {stop.action && !passed && chip("main", stop.action.label)}
        </section>
      )}

      {everyday && lastYear !== 0 && stop.id !== "tax-return" && (
        <div className="last-year">
          <Icon name="calendar" size={16} />
          <span className="small">
            Last year for you: <b className="mono">{signedEuro(stop.kind === "bump" ? -Math.abs(lastYear) : lastYear)}</b>
          </span>
          <span className="xs muted">your own history, not a guess</span>
        </div>
      )}

      <div className="stack-8">
        {live.map((n) => (
          <figure key={n.id} className="note-card fresh">
            <blockquote>“{n.text}”</blockquote>
            <figcaption>
              <span>Just left by someone on this road</span>
              <span className="mono">new</span>
            </figcaption>
          </figure>
        ))}
        {stop.notes.slice(0, 1).map((n) => (
          <figure key={n.text} className="note-card">
            <blockquote>“{n.text}”</blockquote>
            <figcaption>
              <span>{n.by}</span>
              <span className="mono">{int(400 + ((n.text.length * 37) % 1600))} found this useful</span>
            </figcaption>
          </figure>
        ))}
      </div>

      {care && (
        <button type="button" className="btn primary" onClick={() => go({ name: "passport" })}>
          Talk it through with a person
        </button>
      )}
      <p className="fineprint">
        Shown because more than {K_MIN} people back each number. Figures are noised and rounded. Nothing here is ranked by what KBC sells.
      </p>
    </div>
  );
}

export { BackBar };
