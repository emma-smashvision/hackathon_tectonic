"use client";

import { useStore } from "../../components/store";
import { KIND_LABEL } from "../../engine/plan";

/** What you picked up on this drive. Nothing happens until you confirm it on the way out. */
export function Glovebox() {
  const { glovebox, trip } = useStore();
  if (!glovebox.length) return null;
  const shown = glovebox.slice(-3);
  return (
    <div className="glovebox" data-hud>
      <div className="glovebox-head">
        <span className="mono xs">GLOVEBOX</span>
        <span className="mono xs muted">
          {glovebox.length} picked up · {trip.length} looked at
        </span>
      </div>
      <ul>
        {shown.map((p) => (
          <li key={p.id}>
            <b className={`kind-tag kind-${p.spec.kind}`}>{KIND_LABEL[p.spec.kind]}</b>
            <span>{p.spec.title}</span>
          </li>
        ))}
      </ul>
      {glovebox.length > shown.length && <div className="xs muted">+{glovebox.length - shown.length} more</div>}
      <div className="xs glovebox-foot">You confirm these when you leave. Nothing happens before that.</div>
    </div>
  );
}
