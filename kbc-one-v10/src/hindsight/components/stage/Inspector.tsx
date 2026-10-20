"use client";

import { int } from "../../engine/format";
import { K_MIN } from "../../engine/gate";
import { convoySize } from "../../engine/simulate";
import { useStore } from "../store";

function shortLabel(label: string) {
  const parts = label.split(":");
  return parts.slice(1).join(" · ");
}

export function Inspector() {
  const { road, journey, decisions, screen } = useStore();
  const held = decisions.filter((d) => !d.shown).length;
  const atMonth = convoySize(road);

  return (
    <aside className="inspector" aria-label="Behind the glass">
      <div className="side-title">Behind the glass</div>

      <div className="stack-6">
        <div className="side-sub">The only thing stored per customer</div>
        <code className="pointer">{`{ road: "${road.id}", month: ${journey.month} }`}</code>
        <div className="xs muted lh">
          This screen is one shared view for road + month, computed once and served to the ~{int(atMonth)} people around this point.
        </div>
      </div>

      <div className="stack-6">
        <div className="row between">
          <div className="side-sub">Crowd gate · {screen.name}</div>
          <div className="mono xs">
            {decisions.length - held} shown · <span className={held ? "amber" : ""}>{held} held</span>
          </div>
        </div>
        <div className="gate-list">
          {decisions.length === 0 && <div className="xs muted">No crowd numbers on this screen.</div>}
          {decisions.map((d) => (
            <div key={d.label} className={`gate-row ${d.shown ? "" : "held"}`}>
              <span className="gate-mark">{d.shown ? "✓" : "✕"}</span>
              <span className="gate-label">{shortLabel(d.label)}</span>
              <span className="mono xs">n={int(d.n)}</span>
            </div>
          ))}
        </div>
        <div className="xs muted lh">
          Rule: at least {K_MIN} people behind a number, Laplace noise on counts, rounding. Below that, the number is never computed for display.
        </div>
      </div>

      <div className="stack-6">
        <div className="side-sub">Policy for this road</div>
        {road.care ? (
          <ul className="policy">
            <li>Care road: no offers, no readiness game, no ticker</li>
            <li>Crowd view only after the customer opts in</li>
            <li>A person is offered first</li>
          </ul>
        ) : (
          <ul className="policy">
            <li>Advice ranked by outcome, not by product margin</li>
            <li>Readiness and postcards on</li>
          </ul>
        )}
        <div className="xs muted">Never shown on this road:</div>
        <div className="chips-wrap">
          {road.blocked.map((b) => (
            <span key={b} className="blocked-chip">
              {b}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
