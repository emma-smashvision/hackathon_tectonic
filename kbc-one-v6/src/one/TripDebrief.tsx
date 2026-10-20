"use client";

// KBC One · the debrief on the way out of the driving world.
// From info to action: what you looked at, what you picked up, and for each a concrete follow-up
// (start a pot, set a reminder, book a talk with your advisor or KBC Live). Nothing happened during
// the drive; only what you confirm here becomes your plan. The rest is undone.

import { useMemo, useState } from "react";
import { useStore } from "../hindsight/components/store";
import { Icon } from "../hindsight/components/ui";
import { MONTH_LONG } from "../hindsight/engine/everyday";
import { buildDebrief, KIND_LABEL, type Slot, slotsFor, todayWhen, type TripPick, whenLabel } from "../hindsight/engine/plan";

export function TripDebrief({ month, onDone }: { month: string; onDone: (kept: boolean, count: number) => void }) {
  const s = useStore();
  const debrief = useMemo(
    () =>
      buildDebrief({
        glovebox: s.glovebox,
        trip: s.trip,
        roads: s.roads,
        ownRoadId: s.road.id,
        lifeFor: (id) => (id === s.road.id ? s.life : s.lifeForRoad(id)),
        journeyDone: (id) => s.journeyFor(id).done,
        advisor: s.advisor,
      }),
    // the debrief is built once, when it opens
    // biome-ignore lint/correctness/useExhaustiveDependencies: snapshot on open
    [],
  );
  const items: (TripPick & { suggested?: boolean })[] = [...debrief.picked, ...debrief.suggested.map((p) => ({ ...p, suggested: true }))];
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((p) => [p.id, !p.suggested])));
  const slots = useMemo(() => slotsFor(s.advisor, todayWhen(s.life)), [s.advisor, s.life]);
  const [slotOf, setSlotOf] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.filter((p) => p.spec.kind === "book" || p.spec.kind === "talk").map((p) => [p.id, slots[0]?.id ?? "later"])),
  );
  const chosen = items.filter((p) => on[p.id]);
  const roadName = (id: string) => s.roads.find((r) => r.id === id)?.name ?? "the Everyday Road";
  const confirm = () => {
    const out = chosen.map((p) => {
      const sl = slots.find((x) => x.id === slotOf[p.id]);
      return { pick: p, slot: p.spec.kind === "book" || p.spec.kind === "talk" ? (sl as Slot | undefined) : undefined };
    });
    s.finishTrip(out);
    onDone(true, out.length);
  };
  const empty = items.length === 0;

  return (
    <div className="debrief" role="alertdialog" aria-label="Your trip: what to take with you">
      <div className="debrief-head">
        <div className="stack-6">
          <div className="kicker mint">YOUR TRIP · BEFORE YOU GO BACK</div>
          <h2 className="debrief-title">
            {empty
              ? "Nothing to take with you this time."
              : debrief.picked.length
                ? `You picked up ${debrief.picked.length} thing${debrief.picked.length === 1 ? "" : "s"}. Make ${debrief.picked.length === 1 ? "it" : "them"} your plan?`
                : "Anything to take with you?"}
          </h2>
          <p className="small muted lh">
            Nothing has happened yet. What you confirm becomes your plan; the rest is undone. Time doesn't move: you stay in {month}.
          </p>
        </div>
      </div>

      <div className="debrief-body">
        <aside className="debrief-seen">
          <div className="panel-title">On this drive</div>
          {debrief.seen.length === 0 && <div className="xs muted">You drove around without pulling over.</div>}
          {debrief.seen.map((t) => (
            <div key={`${t.roadId}|${t.key}`} className="seen-row">
              <i className={`seen-dot kind-${t.kind}`} />
              <span className="small">{t.title}</span>
              <span className="xs muted">{t.kind === "everyday" ? "Everyday Road" : t.kind === "place" ? "your world" : roadName(t.roadId)}</span>
            </div>
          ))}
        </aside>

        <section className="debrief-list" aria-label="Your follow-ups">
          {items.map((p) => {
            const isOn = !!on[p.id];
            const book = p.spec.kind === "book" || p.spec.kind === "talk";
            return (
              <div key={p.id} className={`follow ${isOn ? "on" : ""} ${p.suggested ? "suggested" : ""}`}>
                <label className="follow-top">
                  <input type="checkbox" checked={isOn} onChange={() => setOn((o) => ({ ...o, [p.id]: !isOn }))} />
                  <b className={`kind-tag kind-${p.spec.kind}`}>{KIND_LABEL[p.spec.kind]}</b>
                  <span className="follow-title">{p.spec.title}</span>
                </label>
                <div className="xs muted lh follow-detail">{p.spec.detail}</div>
                <div className="follow-tags">
                  {p.suggested && <span className="xs tag-suggest">Worth considering: you looked at it</span>}
                  {p.testDrive && <span className="xs muted">From your test drive of {roadName(p.source.roadId)}</span>}
                  {p.spec.product && <span className="xs tag-product">KBC product · {p.spec.product}</span>}
                </div>
                {book && isOn && (
                  <div className="slot-row" role="radiogroup" aria-label="When">
                    {slots.map((sl) => (
                      <button
                        key={sl.id}
                        type="button"
                        role="radio"
                        aria-checked={slotOf[p.id] === sl.id}
                        className={`slot ${slotOf[p.id] === sl.id ? "on" : ""}`}
                        onClick={() => setSlotOf((m) => ({ ...m, [p.id]: sl.id }))}
                      >
                        <b>{whenLabel(sl.when)}</b>
                        <span>{sl.with}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={slotOf[p.id] === "later"}
                      className={`slot ${slotOf[p.id] === "later" ? "on" : ""}`}
                      onClick={() => setSlotOf((m) => ({ ...m, [p.id]: "later" }))}
                    >
                      <b>Later</b>
                      <span>pick a moment from My plan</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {empty && <div className="small muted">When you pull over at a stop, a house or a tower, you can pick up follow-ups. They wait here until you leave.</div>}
        </section>
      </div>

      <div className="debrief-foot">
        {chosen.length > 0 ? (
          <button type="button" className="btn primary" onClick={confirm}>
            <Icon name="check" size={16} /> Confirm {chosen.length} and go back
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              s.exitCity(false);
              onDone(false, 0);
            }}
          >
            Go back
          </button>
        )}
        {chosen.length > 0 && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              s.exitCity(false);
              onDone(false, 0);
            }}
          >
            Go back without these
          </button>
        )}
        <button type="button" className="btn ghost" onClick={s.cancelExit}>
          Keep driving
        </button>
        <span className="xs muted debrief-note">Money only moves by standing orders you can stop any time. Appointments can be moved or cancelled.</span>
      </div>
    </div>
  );
}

export const monthName = (m: number) => MONTH_LONG[m];
