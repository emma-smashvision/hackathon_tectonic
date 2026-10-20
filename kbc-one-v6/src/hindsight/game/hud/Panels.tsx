"use client";

import { useEffect, useMemo, useState } from "react";
import { euro, int, oneIn, pct } from "../../engine/format";
import { readiness } from "../../engine/game";
import { K_MIN } from "../../engine/gate";
import { getRoad } from "../../engine/roads";
import { forkStats, statsFor } from "../../engine/simulate";
import type { RoadDef, StopDef } from "../../engine/types";
import { MonthRecapCard } from "../../components/phone/RecapView";
import { potHint } from "../../components/phone/TodayView";
import { useLiveNotes } from "../../components/phone/useLiveNotes";
import { useStore } from "../../components/store";
import { G, Icon, Ring } from "../../components/ui";
import { calLabel, EVERYDAY, everydayStop } from "../../engine/everyday";
import { type LifeState, refFromKey } from "../../engine/life";
import { KIND_LABEL, specForTip, type TripEntry } from "../../engine/plan";
import type { Yearly } from "../../engine/lives";
import { ringAt, ringHeading } from "../everydayRing";
import { DISTRICTS, spawnOn, STREET_COLOR, STREETS } from "../network";
import { streetStart } from "../streets";
import { nextRoads } from "../next";
import { useGame } from "../runtime";
import { NoteComposer } from "./NoteComposer";

/** Log what you looked at on this drive, for the debrief on the way out. */
function useVisit(e: TripEntry | null) {
  const { logVisit } = useStore();
  const key = e ? `${e.roadId}|${e.key}` : "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: key stands for the entry
  useEffect(() => {
    if (e) logVisit(e);
  }, [key]);
}

/**
 * A tip as a real action. On your own road it's prepared right away (a pot starts paving the bump)
 * and goes into the glovebox; on a test drive you can take it with you. Either way nothing is final
 * until you confirm it in the debrief on the way out.
 */
function TipAction({
  road,
  life,
  stopKey,
  actionId,
  label,
  plus,
  own,
}: {
  road: RoadDef;
  life: LifeState;
  stopKey: string;
  actionId: string;
  label: string;
  plus?: number;
  own: boolean;
}) {
  const s = useStore();
  const takeId = `take:${road.id}:${stopKey}:${actionId}`;
  const on = own ? (s.journeyFor(road.id).done[stopKey] ?? []).includes(actionId) : s.glovebox.some((p) => p.id === takeId);
  const spec = specForTip({ road, life, advisor: s.advisor }, stopKey, actionId);
  const click = () => {
    if (own) s.toggleAction(stopKey, actionId);
    else if (on) s.dropPick(takeId);
    else if (spec) s.pickUp({ id: takeId, source: { scope: stopKey.startsWith("ev:") ? "everyday" : "road", roadId: road.id, key: stopKey, actionId }, spec, testDrive: true });
  };
  return (
    <div className="stack-4">
      <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={click}>
        <Icon name={on ? "check" : "plus"} size={14} />
        {own ? label : `Take with you: ${label}`}
        {own && !road.care && plus != null && <span className="mono xs">+{plus}</span>}
      </button>
      {spec && (
        <span className="xs muted tip-next">
          <b className={`kind-tag kind-${spec.kind}`}>{KIND_LABEL[spec.kind]}</b> {on ? "In your glovebox: you confirm it when you leave." : spec.title}
        </span>
      )}
    </div>
  );
}

function Sheet({ title, kicker, tone, children }: { title: string; kicker: string; tone?: string; children: React.ReactNode }) {
  const { setPanel } = useGame();
  return (
    <aside className="sheet" role="dialog" aria-label={title} data-hud>
      <div className="row between start">
        <div className="stack-6">
          <div className="kicker" style={tone ? { color: tone } : undefined}>
            {kicker}
          </div>
          <h2 className="sheet-title">{title}</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Close (Esc)" onClick={() => setPanel(null)}>
          ✕
        </button>
      </div>
      {children}
    </aside>
  );
}

function useMode(roadId: string) {
  const { road } = useStore();
  return road.id === roadId ? "own" : "test";
}

function MakeMine({ road }: { road: RoadDef }) {
  // KBC One: a test drive never changes whose life this is. No "live this road" switch.
  return (
    <div className="test-note">
      <div className="small lh">
        <b>Test drive.</b> You're looking at {road.name} through the eyes of the {road.alumni.toLocaleString("en-GB")} people who drove it. Nothing you do here changes your own plan.
      </div>
    </div>
  );
}

export function StopPanel({ stopKey }: { stopKey: string }) {
  const { net } = useGame();
  const { roads, journeyFor, toggleAction } = useStore();
  const ps = net.stops.find((s) => s.key === stopKey);
  const road = roads.find((r) => r.id === ps?.roadId);
  const live = useLiveNotes(road?.id ?? "first-home");
  const mode = useMode(road?.id ?? "");
  const store = useStore();
  useVisit(
    ps && road && ps.stop.kind !== "fork"
      ? { key: ps.stop.id, roadId: road.id, title: ps.stop.title, kind: ps.stop.kind as TripEntry["kind"] }
      : null,
  );
  if (!ps || !road || ps.stop.kind === "fork") return null;
  const stop = ps.stop as StopDef;
  const stats = statsFor(road, stop);
  const j = journeyFor(road.id);
  const done = j.done[stop.id] ?? [];
  const ready = readiness(stop, done);
  const passed = stop.month <= j.month;
  const own = mode === "own";
  const canAct = own && !passed;
  const canTake = !own && !passed && !road.care;
  const tipLife = own ? store.life : store.lifeForRoad(road.id);
  const tone = road.care ? "#B7B0DA" : stop.kind === "bump" ? "#F3A93C" : stop.kind === "boost" ? "#7FD6A8" : "#5ED4E8";
  const notes = live.filter((n) => n.stopId === stop.id);

  return (
    <Sheet title={stop.title} kicker={`${road.name} · month ${stop.month}${passed && own ? " · passed" : ""}`} tone={tone}>
      {!own && <MakeMine road={road} />}
      {stats.kind === "bump" && (
        <>
          <div className="row between">
            <div className="sheet-stat" style={{ color: tone }}>
              <G g={stats.hitRate} fmt={(v) => `${oneIn(v)} ${stop.hitVerb ?? "paid more than"} ${euro(stats.threshold)}`} />
            </div>
            {own && !road.care && <Ring value={ready} size={52} color={ready >= 50 ? "var(--mint)" : "var(--amber)"} label={`${ready}% ready`} />}
          </div>
          <div className="hist small-hist" role="img" aria-label="What people paid">
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
          <p className="card-body">{stop.advice}</p>
          <div className="stack-12">
            <div className="row between">
              <div className="panel-title">{road.care ? "What helped" : "What made the difference"}</div>
              {!road.care && (
                <div className="legend">
                  <span>
                    <i className="sw calm" />
                    calm
                  </span>
                  <span>
                    <i className="sw hit" />
                    hit hard
                  </span>
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
                  {!road.care && (
                    <div className="bar-row">
                      <div className="bar hit" style={{ width: `${(b.hit.value ?? 0) * 100}%` }} />
                      <span className="mono xs amber">
                        <G g={b.hit} fmt={pct} fallback="–" />
                      </span>
                    </div>
                  )}
                  {(canAct || canTake) && (
                    <TipAction road={road} life={tipLife} stopKey={stop.id} actionId={b.id} label={b.action.label} plus={b.action.readiness} own={canAct} />
                  )}
                  {!canAct && !canTake && on && <span className="xs mint">You did this ✓</span>}
                </div>
              );
            })}
            {own && !road.care && done.length > 0 && (
              <div className="like-you">
                <G g={stats.calmIf(done)} fmt={(v) => <>Of the people who did what you're doing, <b>{pct(v)}</b> came through calmly.</>} fallback="Too few people did exactly this to show a number." />
              </div>
            )}
            {canAct && !road.care && <div className="xs muted">Prepare to 50% and the bump is paved: you drive over it smoothly.</div>}
          </div>
        </>
      )}
      {stats.kind !== "bump" && (
        <>
          <div className="big-stat" style={{ color: tone }}>
            {stats.kind === "boost" ? <G g={stats.median} fmt={(v) => euro(v)} /> : <G g={stats.rate} fmt={(v) => pct(v)} />}
          </div>
          <div className="small muted">{stats.kind === "boost" ? `typical amount, across ${int(stats.n)} people` : `${stop.rate?.label} · ${int(stats.n)} people`}</div>
          <p className="card-body">{stop.advice}</p>
          {stop.action && (canAct || canTake) && (
            <TipAction road={road} life={tipLife} stopKey={stop.id} actionId="main" label={stop.action.label} own={canAct} />
          )}
        </>
      )}

      <div className="stack-8">
        {notes.map((n) => (
          <figure key={n.id} className="note-card fresh">
            <blockquote>“{n.text}”</blockquote>
            <figcaption>
              <span>Left on the road by a driver ahead</span>
              <span className="mono">new</span>
            </figcaption>
          </figure>
        ))}
        {stop.notes.slice(0, 2).map((n) => (
          <figure key={n.text} className="note-card">
            <blockquote>“{n.text}”</blockquote>
            <figcaption>
              <span>{n.by}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {own && passed && <NoteComposer roadId={road.id} stopId={stop.id} prompt={`You've passed “${stop.short}”. Leave one line for the people still behind you.`} />}
      <p className="fineprint">Shown because more than {K_MIN} people back each number. Synthetic population. Nothing here is ranked by what KBC sells.</p>
    </Sheet>
  );
}

export function ForkPanel({ roadId }: { roadId: string }) {
  const { roads, journeyFor, chooseFork } = useStore();
  const road = roads.find((r) => r.id === roadId);
  useVisit(road?.fork ? { key: road.fork.id, roadId: road.id, title: road.fork.title, kind: "fork" } : null);
  const [horizon, setHorizon] = useState<1 | 3>(1);
  const [likeYou, setLikeYou] = useState(true);
  const mode = useMode(roadId);
  const stats = useMemo(
    () => (road?.fork ? forkStats(road, road.fork, horizon, likeYou ? { bufferBand: road.persona.bufferBand, incomeBand: road.persona.incomeBand } : null) : null),
    [road, horizon, likeYou],
  );
  if (!road?.fork || !stats) return null;
  const fork = road.fork;
  const chosen = journeyFor(road.id).forkChoice[fork.id];
  return (
    <Sheet title={fork.title} kicker={`${road.name} · crossroads · month ${fork.month}`}>
      {mode === "test" && <MakeMine road={road} />}
      <p className="small muted lh">{fork.intro} Steer left or right at the split, or lean one way here.</p>
      <div className="seg" role="group" aria-label="Time after the choice">
        <button type="button" aria-pressed={horizon === 1} onClick={() => setHorizon(1)}>
          1 year later
        </button>
        <button type="button" aria-pressed={horizon === 3} onClick={() => setHorizon(3)}>
          3 years later
        </button>
      </div>
      <div className="seg" role="group" aria-label="Who to compare with">
        <button type="button" aria-pressed={likeYou} onClick={() => setLikeYou(true)}>
          People like me
        </button>
        <button type="button" aria-pressed={!likeYou} onClick={() => setLikeYou(false)}>
          Everyone
        </button>
      </div>
      <div className="fork-grid">
        {fork.branches.map((br, i) => {
          const bs = stats.branches[i];
          return (
            <div key={br.id} className={`fork-col ${i === 0 ? "a" : "b"} ${chosen === br.id ? "chosen" : ""}`}>
              <div>
                <div className="mono xs muted">{i === 0 ? "◀ LEFT" : "RIGHT ▶"}</div>
                <div className="fork-name">{br.label}</div>
                <div className="mono xs muted">{int(bs.n)} people</div>
              </div>
              {bs.metrics.map((m) => (
                <div key={m.key}>
                  <div className="xs muted">{m.label}</div>
                  <div className="fork-val">
                    <G g={m.value} fallback="—" fmt={(v) => (m.kind === "pct" ? pct(v) : m.kind === "delta" ? `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(Math.round(v))}%` : euro(v))} />
                  </div>
                </div>
              ))}
              {mode === "own" && (
                <button type="button" className={`btn small ${chosen === br.id ? "done" : "ghost"}`} aria-pressed={chosen === br.id} onClick={() => chooseFork(fork.id, br.id)}>
                  {chosen === br.id ? "My road" : "Lean this way"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {stats.branches.some((b) => b.metrics.some((m) => !m.value.shown)) && (
        <div className="held-box">Some numbers are hidden: fewer than {K_MIN} people like you took that road. Switch to “Everyone”.</div>
      )}
    </Sheet>
  );
}

export function CarePanel({ roadId }: { roadId: string }) {
  const { roads, optInCareFor } = useStore();
  const { setPanel, rt, net } = useGame();
  const [called, setCalled] = useState(false);
  const road = roads.find((r) => r.id === roadId);
  if (!road) return null;
  return (
    <Sheet title={`${int(road.alumni)} people drove this road before you.`} kicker={`${road.name} · quiet road`} tone="#B7B0DA">
      <p className="card-body">
        This road is quieter. No offers, no nudges, no game. The road ahead stays in the fog until you want to see it. A person can drive it with you.
      </p>
      <button type="button" className={`btn ${called ? "done" : "primary"}`} onClick={() => setCalled(true)} aria-pressed={called}>
        {called ? (
          <>
            <Icon name="check" size={16} /> A call is requested for tomorrow morning
          </>
        ) : (
          "Talk to a person first"
        )}
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          optInCareFor(road.id);
          setPanel(null);
        }}
      >
        Show me what's ahead
      </button>
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          const av = net.avenues.find((a) => a.road.id === road.id);
          if (av) {
            const p = av.trunk.pts[0];
            rt.current.teleport = { x: p.x, z: p.z, heading: Math.atan2(-av.dir.x, -av.dir.z) };
          }
          setPanel(null);
        }}
      >
        Not now, take me back
      </button>
    </Sheet>
  );
}

/** An Everyday Road stop on the ring: the crowd's year, and your own last year. */
export function EverydayPanel({ stopKey }: { stopKey: string }) {
  const { life, journey, toggleAction, road } = useStore();
  const ref = refFromKey(stopKey);
  const stop = everydayStop(ref.id);
  useVisit(stop ? { key: stopKey, roadId: road.id, title: stop.title, kind: "everyday" } : null);
  if (!stop) return null;
  const stats = statsFor(EVERYDAY, stop);
  const up = life.upcoming.find((u) => u.ref.key === stopKey);
  const done = journey.done[stopKey] ?? [];
  const ready = readiness(stop, done);
  const care = road.care;
  const last = life.def.yearly[stop.yearlyKey as keyof Yearly] ?? 0;
  const tone = stop.kind === "bump" ? "#F3A93C" : stop.kind === "boost" ? "#7FD6A8" : "#5ED4E8";
  const chip = (id: string, label: string, plus?: number) => {
    const on = done.includes(id);
    const hint = potHint("everyday", stop, id);
    return (
      <div key={id} className="stack-4">
        <button type="button" className={`chip-btn ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggleAction(stopKey, id)}>
          <Icon name={on ? "check" : "plus"} size={14} />
          {label}
          {!care && plus != null && <span className="mono xs">+{plus}</span>}
        </button>
        {hint && !care && (
          <span className="xs muted tip-next">{on ? "In your glovebox: you confirm it when you leave." : `This ${hint}.`}</span>
        )}
      </div>
    );
  };
  return (
    <Sheet title={stop.title} kicker={`Everyday Road · ${up ? calLabel(up.cal) : "every year"}`} tone={tone}>
      {stats.kind === "bump" ? (
        <>
          <div className="row between">
            <div className="sheet-stat" style={{ color: tone }}>
              <G g={stats.hitRate} fmt={(v) => `${oneIn(v)} ${stop.hitVerb ?? "paid more than"} ${euro(stats.threshold)}`} />
            </div>
            {!care && <Ring value={ready} size={52} color={ready >= 50 ? "var(--mint)" : "var(--amber)"} label={`${ready}% ready`} />}
          </div>
          <div className="small muted">
            Across {int(stats.n)} households last year · median <G g={stats.median} fmt={(v) => euro(v)} />
          </div>
          <p className="card-body">{stop.advice}</p>
          <div className="stack-12">
            <div className="panel-title">What made the difference</div>
            {stats.behaviours.map((b) => (
              <div key={b.id} className="behaviour">
                <div className="small">{b.label}</div>
                <div className="bar-row">
                  <div className="bar calm" style={{ width: `${(b.calm.value ?? 0) * 100}%` }} />
                  <span className="mono xs">
                    <G g={b.calm} fmt={pct} fallback="–" /> calm
                  </span>
                </div>
                {up && chip(b.id, b.action.label, b.action.readiness)}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="big-stat" style={{ color: tone }}>
            {stats.kind === "boost" ? <G g={stats.median} fmt={(v) => euro(v)} /> : <G g={stats.rate} fmt={(v) => pct(v)} />}
          </div>
          <div className="small muted">{stats.kind === "boost" ? `typical amount, across ${int(stats.n)} households` : `${stop.rate?.label} · ${int(stats.n)} households`}</div>
          <p className="card-body">{stop.advice}</p>
          {stop.action && up && chip("main", stop.action.label)}
        </>
      )}
      {last !== 0 && stop.id !== "tax-return" && (
        <div className="last-year">
          <Icon name="calendar" size={16} />
          <span className="small">
            Last year for you: <b className="mono">{stop.kind === "bump" ? `−${euro(Math.abs(last))}` : euro(last)}</b>
          </span>
          <span className="xs muted">your own history, not a guess</span>
        </div>
      )}
      {stop.notes.slice(0, 1).map((n) => (
        <figure key={n.text} className="note-card">
          <blockquote>“{n.text}”</blockquote>
          <figcaption>
            <span>{n.by}</span>
          </figcaption>
        </figure>
      ))}
      <p className="fineprint">Shown because more than {K_MIN} households back each number. Synthetic population.</p>
    </Sheet>
  );
}

/** Salary day in the city: the month you just drove, closed. */
export function RecapPanel() {
  const { recap, dismissRecap, road, life } = useStore();
  const { setPanel } = useGame();
  if (!recap) return null;
  return (
    <aside className="sheet recap-sheet" role="dialog" aria-label="Month recap" data-hud>
      <MonthRecapCard
        recap={recap}
        road={road}
        anchor={life.anchor}
        doneLabel="Keep driving"
        onDone={() => {
          dismissRecap();
          setPanel(null);
        }}
      />
    </aside>
  );
}

export function CompletePanel({ roadId }: { roadId: string }) {
  const { roads, journeyFor } = useStore();
  const { setPanel, rt, net, flash } = useGame();
  const road = roads.find((r) => r.id === roadId);
  if (!road) return null;
  const j = journeyFor(road.id);
  const bumps = road.stops.filter((s) => s.kind === "bump");
  const paved = bumps.filter((s) => readiness(s, j.done[s.id]) >= 50).length;
  const next = nextRoads(road.id);
  return (
    <Sheet title={`You finished ${road.name}.`} kicker="ROAD COMPLETE · NEW STAMP" tone="#7FD6A8">
      <div className="stamp current" style={{ borderColor: road.hue, color: road.hue, alignSelf: "center" }}>
        <span className="stamp-name">{road.name}</span>
        <span className="mono xs">{new Date().getFullYear()}</span>
      </div>
      <div className="kv">
        <span>Months driven</span>
        <b>{road.months}</b>
        <span>Bumps paved before you hit them</span>
        <b>
          {paved} / {bumps.length}
        </b>
        <span>Postcards</span>
        <b>{j.postcards.length}</b>
      </div>
      {next.length > 0 && (
        <div className="stack-8">
          <div className="panel-title">Where drivers went next</div>
          {next.map((n) =>
            n.road ? (
              <div key={n.road.id} className="next-row">
                <span className="road-dot" style={{ background: n.road.hue }} />
                <span className="grow small">{n.road.name}</span>
                <span className="mono xs">{n.shown && n.share != null ? pct(n.share) : "—"}</span>
                <button
                  type="button"
                  className="btn small ghost"
                  onClick={() => {
                    rt.current.teleport = spawnOn(net, n.road?.id ?? road.id, 0);
                    setPanel(null);
                  }}
                >
                  Test drive
                </button>
              </div>
            ) : null,
          )}
          <div className="xs muted">Share of drivers who turned onto that road within three years. Synthetic.</div>
        </div>
      )}
      <button
        type="button"
        className="btn primary"
        onClick={() => {
          const av = net.avenues.find((a) => a.road.id === road.id);
          if (av) {
            const p = ringAt(av.angle);
            rt.current.teleport = { x: p.x, z: p.z, heading: ringHeading(av.angle) };
          }
          flash("info", "Back on the Everyday Road. Life roads branch off it and merge back.");
          setPanel(null);
        }}
      >
        Merge back onto the Everyday Road
      </button>
      <NoteComposer roadId={road.id} stopId={null} prompt={`${int(road.current)} people are on this road right now. Leave them one line.`} />
    </Sheet>
  );
}

export function PassportPanel() {
  const { road, roads, journeyFor, stamps, explored, myNotes, access, newDriver } = useStore();
  const live = roads.filter((r) => r.status === "live");
  const pavedTotal = live.reduce((s, r) => s + r.stops.filter((st) => st.kind === "bump" && readiness(st, journeyFor(r.id).done[st.id]) >= 50).length, 0);
  const driven = newDriver ? [] : road.persona.driven;
  const j = journeyFor(road.id);
  return (
    <Sheet title={`${newDriver ? "Your" : `${road.persona.name}'s`} life so far`} kicker="HINDSIGHT PASSPORT">
      <div className="stamps">
        {driven.map((d) => {
          const r = getRoad(d.roadId);
          return r ? (
            <div key={d.roadId} className="stamp" style={{ borderColor: r.hue, color: r.hue }}>
              <span className="stamp-name">{r.name}</span>
              <span className="mono xs">{d.year}</span>
            </div>
          ) : null;
        })}
        {stamps.map((s) => {
          const r = getRoad(s.roadId);
          return r ? (
            <div key={s.roadId} className="stamp current" style={{ borderColor: r.hue, color: r.hue }}>
              <span className="stamp-name">{r.name}</span>
              <span className="mono xs">finished</span>
            </div>
          ) : null;
        })}
        {!stamps.some((s) => s.roadId === road.id) && (
          <div className="stamp current" style={{ borderColor: road.hue, color: road.hue }}>
            <span className="stamp-name">{road.name}</span>
            <span className="mono xs">month {j.month}</span>
          </div>
        )}
      </div>
      <div className="achievements">
        <div className="ach">
          <b>{explored.length}</b>
          <span>of {live.length} roads explored</span>
        </div>
        <div className="ach">
          <b>{pavedTotal}</b>
          <span>bumps paved in time</span>
        </div>
        <div className="ach">
          <b>{myNotes.length}</b>
          <span>notes left for others</span>
        </div>
        <div className="ach">
          <b>{stamps.length + driven.length}</b>
          <span>roads driven</span>
        </div>
      </div>
      <div className="stack-6">
        <div className="panel-title">What Hindsight stores about you</div>
        <code className="pointer">{`{ road: "${road.id}", month: ${j.month} }`}</code>
        <div className="xs muted lh">One pointer. Everything in this city is about the crowd, never a guess about you.</div>
      </div>
      <div className="stack-6">
        <div className="panel-title">Who looked at my road</div>
        {access.filter((a) => a.roadId === road.id).length === 0 ? (
          <div className="xs muted">Nobody at KBC has opened your road.</div>
        ) : (
          access
            .filter((a) => a.roadId === road.id)
            .map((a) => (
              <div key={`${a.at}-${a.reason}`} className="xs">
                <span className="mono">{a.at}</span> · {a.who} · <span className="muted">{a.reason}</span>
              </div>
            ))
        )}
      </div>
    </Sheet>
  );
}

export function MapPanel() {
  const { roads, road, pickRoad, journeyFor, explored, setView, world } = useStore();
  const { setPanel, rt, net, setMapView } = useGame();
  const groups = useMemo(() => {
    const order = ["work", "home", "family", "abroad", "later", "care"] as const;
    return order.map((d) => ({ d, list: roads.filter((r) => r.family === d) }));
  }, [roads]);
  return (
    <Sheet title="Hindsight City" kicker="EVERY ROAD, ONE CITY">
      <p className="small muted lh">Drive any road. Your own road changes your life; any other road is a test drive through the crowd's eyes.</p>
      {world && (
        <div className="stack-6">
          <div className="fam-label" style={{ color: STREET_COLOR.home }}>
            Your world · inside the ring
          </div>
          {(["home", "market"] as const).map((id) => (
            <div key={id} className="map-row">
              <span className="road-dot" style={{ background: STREET_COLOR[id] }} />
              <div className="grow">
                <div className="small">{STREETS[id].name}</div>
                <div className="xs muted">
                  {id === "home" ? "Your home, car, savings and pension · only you see this" : world.holdings.length ? "Your investments, month by month" : "Nothing invested"}
                </div>
              </div>
              <button
                type="button"
                className="btn small ghost"
                onClick={() => {
                  rt.current.teleport = streetStart(id, 0.12);
                  setMapView(false);
                  setPanel(null);
                }}
              >
                Drive there
              </button>
            </div>
          ))}
        </div>
      )}
      {groups.map(({ d, list }) => (
        <div key={d} className="stack-6">
          <div className="fam-label" style={{ color: DISTRICTS[d].color }}>
            {DISTRICTS[d].name}
          </div>
          {list.map((r) => (
            <div key={r.id} className={`map-row ${r.id === road.id ? "on" : ""}`}>
              <span className="road-dot" style={{ background: r.status === "pending" ? "#F3A93C" : r.hue }} />
              <div className="grow">
                <div className="small">
                  {r.name} {explored.includes(r.id) && <span className="mono xs mint">explored</span>}
                </div>
                <div className="xs muted">
                  {r.status === "pending" ? "Awaiting a human yes" : `${r.persona.name}, ${r.persona.age} · ${int(r.alumni)} drove it`}
                </div>
              </div>
              {r.status === "live" && (
                <div className="row gap">
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => {
                      rt.current.teleport = spawnOn(net, r.id, 0);
                      setMapView(false);
                      setPanel(null);
                    }}
                  >
                    Test drive
                  </button>
                  <button
                    type="button"
                    className="btn small primary"
                    onClick={() => {
                      pickRoad(r.id);
                      rt.current.teleport = spawnOn(net, r.id, journeyFor(r.id).month);
                      setMapView(false);
                      setPanel(null);
                    }}
                  >
                    Live it
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <button type="button" className="btn ghost" onClick={() => setView("atlas")}>
        Open the Atlas (bank view)
      </button>
    </Sheet>
  );
}
