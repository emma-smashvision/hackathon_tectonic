"use client";

import { calLabel } from "../../engine/everyday";
import { duration, euro, pct } from "../../engine/format";
import { type GoalState, goalCrowd } from "../../engine/life";
import type { RoadDef } from "../../engine/types";
import { useStore } from "../store";
import { G, Icon } from "../ui";

/** A goal is a destination: where you'd arrive at your pace, and how drivers like you did. */
export function GoalCard({ road, goal, compact = false }: { road: RoadDef; goal: GoalState; compact?: boolean }) {
  const { setGoal } = useStore();
  const crowd = goalCrowd(road, goal, road.persona.bufferBand);
  const share = goal.target ? Math.min(1, goal.saved / goal.target) : 0;
  const max = Math.max(goal.defaultMonthly * 4, 400);
  const step = max > 400 ? 25 : 5;
  return (
    <section className={`goal-card ${goal.reached ? "reached" : ""}`} aria-label={`Destination: ${goal.label}`}>
      <div className="row between start gap">
        <div className="goal-name">
          <Icon name="pin" size={16} /> {goal.label}
        </div>
        <div className="goal-eta mono">
          {goal.reached ? "ARRIVED" : goal.eta ? `ETA ${calLabel(goal.eta)}` : "NO ETA YET"}
        </div>
      </div>
      <div className="goal-bar" role="img" aria-label={`${euro(goal.saved)} of ${euro(goal.target)}`}>
        <div style={{ width: `${share * 100}%` }} />
      </div>
      <div className="row between xs muted">
        <span>{euro(goal.saved)} saved</span>
        <span>{euro(goal.target)}</span>
      </div>
      {!goal.reached && (
        <>
          <label className="goal-pace">
            <span className="row between small">
              <span>Your pace</span>
              <b className="mono">{euro(goal.monthly)} a month</b>
            </span>
            <input
              type="range"
              className="slider"
              min={0}
              max={max}
              step={step}
              value={goal.monthly}
              onChange={(e) => setGoal(goal.id, { monthly: Number(e.target.value) })}
              aria-label={`Monthly amount for ${goal.label}`}
            />
          </label>
          <div className="goal-odds">
            <G
              g={crowd.reach}
              fmt={(v) => (
                <>
                  <b>{pct(v)}</b> of drivers who started like you got there within {duration(crowd.within)}.
                </>
              )}
              fallback="Too few drivers started exactly like you to show the odds."
            />
          </div>
          {!compact && (
            <div className="stack-6">
              <div className="xs muted">What made the difference</div>
              <div className="goal-diff">
                <span className="small">Automated the monthly transfer</span>
                <div className="bar-row">
                  <div className="bar calm" style={{ width: `${(crowd.reachAuto.value ?? 0) * 100}%` }} />
                  <span className="mono xs">
                    <G g={crowd.reachAuto} fmt={pct} fallback="–" />
                  </span>
                </div>
                <span className="small">Moved money by hand</span>
                <div className="bar-row">
                  <div className="bar dim" style={{ width: `${(crowd.reachManual.value ?? 0) * 100}%` }} />
                  <span className="mono xs">
                    <G g={crowd.reachManual} fmt={pct} fallback="–" />
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`chip-btn ${goal.auto ? "on" : ""}`}
                aria-pressed={goal.auto}
                onClick={() => setGoal(goal.id, { auto: !goal.auto })}
              >
                {goal.auto ? <Icon name="check" size={14} /> : <Icon name="plus" size={14} />}
                {goal.auto ? `Automated: ${euro(goal.monthly)} on the 1st` : `Automate ${euro(goal.monthly)} on the 1st`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
