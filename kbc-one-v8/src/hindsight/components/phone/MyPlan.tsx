"use client";

import { useState } from "react";
import { KIND_LABEL, planProgress, slotsFor, todayWhen, whenLabel } from "../../engine/plan";
import { useStore } from "../store";
import { Icon } from "../ui";

/** Your plan: every follow-up you confirmed, with its status, next date and what it did so far. */
export function MyPlan({ compact = false, onAll }: { compact?: boolean; onAll?: () => void }) {
  const { plan, life, advisor, bookSlot, removePlanItem } = useStore();
  const [picking, setPicking] = useState<string | null>(null);
  if (!plan.length) return null;
  const rows = plan
    .map((item) => ({ item, ...planProgress(item, life) }))
    .sort((a, b) => Number(a.done) - Number(b.done));
  const shown = compact ? rows.filter((r) => !r.done).slice(0, 3) : rows;
  const open = rows.filter((r) => !r.done).length;
  const slots = slotsFor(advisor, todayWhen(life));
  return (
    <section className="today-sec my-plan" aria-label="My plan">
      <div className="row between">
        <div className="panel-title">My plan</div>
        <span className="xs muted">
          {open} in motion · {rows.length - open} done
        </span>
      </div>
      {shown.map(({ item, line, done }) => (
        <div key={item.id} className={`plan-row ${done ? "done" : ""}`}>
          <div className="row gap start">
            <b className={`kind-tag kind-${item.kind}`}>{KIND_LABEL[item.kind]}</b>
            <div className="grow stack-4">
              <span className="small plan-title">{item.title}</span>
              <span className="xs plan-line">
                {done && <Icon name="check" size={12} />} {line}
              </span>
              {!compact && (
                <span className="xs muted">
                  {item.from === "drive" ? "From your drive" : "From the app"} · since {item.since}
                  {item.product ? ` · KBC product: ${item.product}` : ""}
                </span>
              )}
            </div>
          </div>
          {!compact && !done && (
            <div className="row gap wrap plan-acts">
              {(item.kind === "book" || item.kind === "talk") && (
                <button type="button" className="btn small ghost" onClick={() => setPicking(picking === item.id ? null : item.id)}>
                  {item.when ? "Move it" : "Pick a moment"}
                </button>
              )}
              <button type="button" className="btn small ghost" onClick={() => removePlanItem(item.id)}>
                {item.kind === "setup" ? "Stop it" : item.kind === "remind" ? "Remove" : "Cancel"}
              </button>
            </div>
          )}
          {picking === item.id && (
            <div className="row gap wrap">
              {slots.map((sl) => (
                <button
                  key={sl.id}
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    bookSlot(item.id, sl);
                    setPicking(null);
                  }}
                >
                  {whenLabel(sl.when)} · {sl.with}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      {compact && rows.length > shown.length && onAll && (
        <button type="button" className="btn small ghost" onClick={onAll}>
          All {rows.length} on your route <Icon name="chev" size={14} />
        </button>
      )}
    </section>
  );
}
