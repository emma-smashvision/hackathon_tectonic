"use client";

// KBC One · on the Home: what you set in motion from the road. After a drive, the debrief's
// confirmed follow-ups show here (and on the Road tab), so it's always clear what you did.
// Lives inside Kate's phone (.ph).

import { useStore } from "../hindsight/components/store";
import { KIND_LABEL, planProgress } from "../hindsight/engine/plan";
import { Icon } from "../kbc/ui/icons";

export function PlanCard({ onOpen }: { onOpen: () => void }) {
  const s = useStore();
  if (s.view === "city" || !s.plan.length) return null;
  const rows = s.plan.map((item) => ({ item, ...planProgress(item, s.life) })).filter((r) => !r.done);
  if (!rows.length) return null;
  return (
    <section className="intent road-intent plan-card" aria-label="Your plan">
      <div className="k">
        <span>
          <Icon name="road" size={13} /> YOUR PLAN · {rows.length} IN MOTION
        </span>
      </div>
      <ul className="plan-card-list">
        {rows.slice(0, 3).map(({ item, line }) => (
          <li key={item.id}>
            <span className={`plan-kind kind-${item.kind}`}>{KIND_LABEL[item.kind]}</span>
            <span className="grow">
              <b>{item.title}</b>
              <span className="plan-card-line">{line}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="road-acts">
        <button
          type="button"
          className="btn sec"
          style={{ flex: 1 }}
          onClick={() => {
            s.go({ name: "route" });
            onOpen();
          }}
        >
          See your plan
        </button>
      </div>
    </section>
  );
}
