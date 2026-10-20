"use client";

import { calIndex, calLabel, calOf, dayLabel, MONTH_LONG, MONTH_SHORT } from "../../engine/everyday";
import { pct, signedEuro } from "../../engine/format";
import { goalCrowd, type UpcomingItem } from "../../engine/life";
import { EVERYDAY_ONLY_ID, getRoad } from "../../engine/roads";
import { allStops } from "../../engine/game";
import { nextRoads } from "../../game/next";
import { useReport, useStore } from "../store";
import { Icon } from "../ui";
import { GoalCard } from "./GoalCard";
import { MyPlan } from "./MyPlan";

function ItemRow({ u, hue, onOpen }: { u: UpcomingItem; hue: string; onOpen: () => void }) {
  const paved = u.kind === "bump" && u.ready >= 50;
  return (
    <button type="button" className={`route-item kind-${u.kind}`} onClick={onOpen}>
      <span className="route-dot" style={{ background: u.scope === "road" ? hue : "var(--sand)" }} />
      <span className="grow stack-4">
        <span className="small route-item-title">{u.title}</span>
        <span className="xs muted">
          {dayLabel(u.cal, u.day)} · {u.scope === "road" ? "your road" : "Everyday Road"}
          {u.kind === "bump" ? (paved ? " · paved" : u.ready > 0 ? ` · ready ${u.ready}%` : " · not prepared yet") : ""}
          {u.kind === "boost" && u.done.includes("main") ? " · parking planned" : ""}
        </span>
      </span>
      <span className="stack-4 route-amt">
        {u.amount != null && <span className={`mono small ${u.amount > 0 ? "mint" : ""}`}>{signedEuro(u.amount)}</span>}
        {u.amountSource !== "none" && <span className="xs muted">{u.amountSource === "crowd" ? "typical" : "last year"}</span>}
        {u.kind === "fork" && <span className="xs muted">crossroads</span>}
      </span>
    </button>
  );
}

export function RouteView() {
  const { road, journey, life, go, stamps, newDriver, testDrive, optInCare, person } = useStore();
  // KBC One: no life road right now (Everyday Road only), and no game on care roads or in Large & simple
  const lifeLane = road.id !== EVERYDAY_ONLY_ID;
  const canDrive = !road.care && !person?.noGame;
  const care = road.care;
  const fogged = care && !journey.careOptIn;
  const goals = care ? [] : life.goals;
  const crowds = goals.map((g) => goalCrowd(road, g, road.persona.bufferBand));
  useReport(crowds.flatMap((c) => c.decisions));
  const behind = [
    ...(newDriver ? [] : road.persona.driven.map((d) => ({ roadId: d.roadId, label: String(d.year) }))),
    ...stamps.filter((s) => s.roadId !== road.id).map((s) => ({ roadId: s.roadId, label: "finished" })),
  ];
  const exits = fogged ? [] : nextRoads(road.id);
  const items = life.upcoming.filter((u) => !(fogged && u.scope === "road"));
  const groups: { key: number; label: string; list: UpcomingItem[] }[] = [];
  for (const u of items) {
    const key = calIndex(u.cal);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label: calLabel(u.cal), list: [] };
      groups.push(g);
    }
    g.list.push(u);
  }
  const prog = Math.min(1, journey.month / road.months);
  const strip = Array.from({ length: 12 }, (_, i) => calOf(life.anchor, life.m + i));
  const evByMonth = new Map<number, UpcomingItem[]>();
  for (const u of life.upcoming) if (u.scope === "everyday") evByMonth.set(calIndex(u.cal), [...(evByMonth.get(calIndex(u.cal)) ?? []), u]);

  return (
    <div className={`screen route ${care ? "care" : ""}`}>
      <header className="today-head">
        <div className="kicker">YOUR ROUTE</div>
        <h1 className="today-title">Where you've been, and what's ahead.</h1>
      </header>

      <MyPlan />

      <section className="today-sec">
        <div className="row between">
          <div className="panel-title">Behind you</div>
          <button type="button" className="btn small ghost" onClick={() => go({ name: "passport" })}>
            Passport <Icon name="chev" size={14} />
          </button>
        </div>
        {behind.length === 0 ? (
          <div className="xs muted">Your first road. Every road you finish becomes a stamp here.</div>
        ) : (
          <div className="mini-stamps">
            {behind.map((b) => {
              const r = getRoad(b.roadId);
              return r ? (
                <div key={`${b.roadId}-${b.label}`} className="mini-stamp" style={{ borderColor: r.hue, color: r.hue }}>
                  <span className="small">{r.name}</span>
                  <span className="mono xs">{b.label}</span>
                </div>
              ) : null;
            })}
          </div>
        )}
      </section>

      <section className="today-sec">
        <div className="panel-title">Now</div>
        {lifeLane && (
        <button type="button" className="lane" onClick={() => go({ name: "road" })}>
          <div className="row between small">
            <span>
              <span className="road-dot" style={{ background: care ? "var(--lilac)" : road.hue }} /> {road.name}
            </span>
            <span className="mono xs muted">
              month {journey.month} of {road.months}
            </span>
          </div>
          <div className="lane-track">
            <div className="lane-past" style={{ width: `${prog * 100}%`, background: care ? "var(--lilac)" : road.hue }} />
            {!fogged &&
              allStops(road).map((s) => (
                <i
                  key={s.id}
                  className={`lane-stop kind-${s.kind} ${s.month <= journey.month ? "passed" : ""}`}
                  style={{ left: `${(s.month / road.months) * 100}%` }}
                />
              ))}
            <i className="lane-you" style={{ left: `${prog * 100}%` }} />
          </div>
        </button>
        )}
        <div className="lane">
          <div className="row between small">
            <span>
              <span className="road-dot everyday-dot" /> Everyday Road
            </span>
            <span className="mono xs muted">{MONTH_LONG[life.today.cal.month]}</span>
          </div>
          <div className="year-strip" role="img" aria-label="The next twelve months on the Everyday Road">
            {strip.map((c, i) => {
              const ev = evByMonth.get(calIndex(c)) ?? [];
              return (
                <div key={calIndex(c)} className={`ym ${i === 0 ? "now" : ""}`}>
                  <span className="ym-dots">
                    {ev.slice(0, 3).map((u) => (
                      <i key={u.ref.key} className={`ym-dot kind-${u.kind}`} />
                    ))}
                  </span>
                  <span className="mono ym-label">{MONTH_SHORT[c.month][0]}</span>
                </div>
              );
            })}
          </div>
          <div className="xs muted">The same money year everyone drives: renewals in January, holiday pay in spring, the tax letter, December.</div>
        </div>
        {canDrive && (
          <button type="button" className="btn small ghost" onClick={() => testDrive(road.id, journey.month)}>
            <Icon name="road" size={14} /> Drive your route in Hindsight City
          </button>
        )}
      </section>

      <section className="today-sec">
        <div className="panel-title">The next 12 months</div>
        {fogged && (
          <div className="fog-note">
            <div className="small lh">Your road ahead rests in fog until you choose to look. The Everyday Road is shown as usual.</div>
            <button type="button" className="chip-btn" onClick={optInCare}>
              Show me what's ahead
            </button>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} className="route-month">
            <div className="route-month-label mono">{g.label.toUpperCase()}</div>
            {g.list.map((u) => (
              <ItemRow
                key={u.ref.key}
                u={u}
                hue={care ? "var(--lilac)" : road.hue}
                onOpen={() => (u.kind === "fork" ? go({ name: "fork" }) : go({ name: "stop", stopId: u.ref.key, from: "route" }))}
              />
            ))}
          </div>
        ))}
      </section>

      {exits.length > 0 && (
        <section className="today-sec">
          <div className="panel-title">Likely next exits</div>
          <div className="xs muted lh">Where drivers went within three years of finishing {road.name}. Not a prediction about you: just the crowd's hindsight.</div>
          {exits.map((n) =>
            n.road ? (
              <div key={n.road.id} className="exit-row">
                <span className="road-dot" style={{ background: n.road.care ? "var(--lilac)" : n.road.hue }} />
                <div className="grow stack-4">
                  <span className="small">{n.road.name}</span>
                  <span className="xs muted">{n.shown && n.share != null ? `${pct(n.share)} of drivers turned here` : "Too few drivers to show a share"}</span>
                </div>
                {canDrive && (
                  <button type="button" className="btn small ghost" onClick={() => n.road && testDrive(n.road.id)}>
                    Test-drive <Icon name="chev" size={14} />
                  </button>
                )}
              </div>
            ) : null,
          )}
        </section>
      )}

      {goals.length > 0 && (
        <section className="today-sec">
          <div className="panel-title">Destinations</div>
          <div className="xs muted lh">Your goals as places on the map. Move the pace and see when you'd arrive, and how drivers who started like you did.</div>
          {goals.map((g) => (
            <GoalCard key={g.id} road={road} goal={g} />
          ))}
        </section>
      )}
    </div>
  );
}
