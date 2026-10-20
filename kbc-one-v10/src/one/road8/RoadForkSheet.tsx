"use client";
import { useMemo, useState } from "react";
import { useStore } from "../../hindsight/components/store";
import { euro, int, pct } from "../../hindsight/engine/format";
import { forkEvidenceFor } from "../crowd";
import { Sheet } from "../yourroad/Sheet";

export function RoadForkSheet({
  roadId,
  onClose,
}: {
  roadId: string;
  onClose: () => void;
}) {
  const s = useStore();
  const [horizon, setHorizon] = useState<1 | 3>(1);
  const [similar, setSimilar] = useState(true);
  const persona = s.person?.persona ?? s.road.persona;
  const careOptIn = s.journeyFor(roadId).careOptIn;
  const evidence = useMemo(
    () =>
      forkEvidenceFor(roadId, {
        careOptIn,
        likeYou: persona,
      }),
    [roadId, careOptIn, persona],
  );
  if (!evidence) return null;
  const stats = (similar ? evidence.subgroup : evidence.comparisons).find(
    (c) => c.horizon === horizon,
  )!;
  const withheld = stats.branches.some((b) =>
    b.metrics.some((m) => !m.value.shown),
  );
  const saved = s.plan.some((p) => p.id === `road8:fork:${roadId}`);
  return (
    <Sheet title={evidence.title} onClose={onClose}>
      <p>
        What happened to earlier travellers after the choice. Exploring a branch
        keeps your position unchanged.
      </p>
      <div
        className="road8-segment"
        role="group"
        aria-label="Time after the choice"
      >
        {([1, 3] as const).map((year) => (
          <button
            key={year}
            aria-pressed={horizon === year}
            onClick={() => setHorizon(year)}
          >
            After {year} {year === 1 ? "year" : "years"}
          </button>
        ))}
      </div>
      <div className="road8-segment" role="group" aria-label="Comparison group">
        <button aria-pressed={similar} onClick={() => setSimilar(true)}>
          Similar income & buffer
        </button>
        <button aria-pressed={!similar} onClick={() => setSimilar(false)}>
          Everyone
        </button>
      </div>
      <div className="road8-fork-grid">
        {stats.branches.map((branch) => (
          <section className="road8-panel" key={branch.id}>
            <h3>{branch.label}</h3>
            <p className="road8-small">
              {branch.driverCount.shown
                ? `${int(branch.driverCount.value!)} earlier travellers`
                : "Group size withheld"}
            </p>
            <dl>
              {branch.metrics.map((metric) => (
                <div key={metric.key}>
                  <dt>{metric.label}</dt>
                  <dd>
                    {metric.value.shown
                      ? metric.kind === "pct"
                        ? pct(metric.value.value!)
                        : metric.kind === "money"
                          ? euro(metric.value.value!)
                          : `${metric.value.value! > 0 ? "+" : ""}${Math.round(metric.value.value!)}%`
                      : "Withheld"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {withheld && (
        <p className="road8-withheld">
          Some subgroup outcomes are withheld: fewer than 500 people back them.
          Choose Everyone to see the wider crowd.
        </p>
      )}
      <p className="road8-small">{evidence.wording}</p>
      <button
        className="road8-primary"
        disabled={saved}
        onClick={() =>
          s.addPlanItem({
            id: `road8:fork:${roadId}`,
            source: { scope: "fork", roadId, key: evidence.stopId },
            spec: {
              kind: "talk",
              title: `Ask my adviser: ${evidence.title}`,
              detail:
                "Compare the practical differences and the historical outcomes.",
            },
          })
        }
      >
        {saved ? "Saved ✓" : "Save an adviser question"}
      </button>
      <p className="road8-footer">
        Anonymous groups of at least 500 · history, not a prediction · synthetic
        demo data
      </p>
    </Sheet>
  );
}
