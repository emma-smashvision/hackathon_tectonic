"use client";
import type { ReactNode } from "react";
import { useStore } from "../../hindsight/components/store";
import { euro, int } from "../../hindsight/engine/format";
import { EVERYDAY_ONLY_ID, catalogueRoad, stopEvidenceFor } from "../crowd";
import { NotesList, PassItOn } from "../notes8";
import { Sheet } from "../yourroad/Sheet";
import { evidenceText } from "./evidenceText";

export interface PassItOnContext {
  roadId: string;
  stopId: string;
  passed: boolean;
}
export interface RoadStopSheetProps {
  roadId: string;
  stopId: string;
  passed?: boolean;
  large?: boolean;
  onClose: () => void;
  renderPassItOn?: (context: PassItOnContext) => ReactNode;
}
/** The same crowd stop sheet is also mounted by the optional Drive view. */
export function RoadStopSheet({
  roadId,
  stopId,
  passed = false,
  large = false,
  onClose,
  renderPassItOn,
}: RoadStopSheetProps) {
  const s = useStore();
  const road = catalogueRoad(roadId);
  const confirmed = roadId === s.road.id || roadId === EVERYDAY_ONLY_ID;
  const recurring = s.life.upcoming.find(
    (item) => item.scope === "everyday" && item.ref.id === stopId,
  );
  const evidence = stopEvidenceFor(roadId, stopId, {
    careOptIn: s.journeyFor(roadId).careOptIn,
    life: confirmed ? s.life : undefined,
    advisor: s.advisor,
    year: recurring?.cal.year,
  });
  if (!evidence || !road) return null;
  const personId = s.person?.key ?? "demo";
  const completed = !!s.person?.persona.driven.some((p) => p.roadId === roadId);
  const saved = (id: string) => s.plan.some((p) => p.id === id);
  const questionId = `road8:${roadId}:${stopId}:question`;
  return (
    <Sheet title={evidence.title} onClose={onClose}>
      <p className="road8-sheet-context">
        {road.name} · {passed ? "Passed stop" : `Month ${evidence.month}`}
      </p>
      {!evidence.available ? (
        <p>{evidence.reason}</p>
      ) : (
        <>
          <section className="road8-panel road8-surprise">
            <h3>What surprised people</h3>
            <p className="road8-stat">{evidenceText(evidence)}</p>
            <p className="road8-small">
              {evidence.denominator.shown
                ? `${int(evidence.denominator.value!)} earlier travellers · rounded outcomes`
                : "This group is too small to publish."}
            </p>
            {evidence.surprised.median.shown && evidence.kind === "bump" && (
              <p>Typical cost: {euro(evidence.surprised.median.value!)}</p>
            )}
            {evidence.surprised.range.some((bin) => bin.count.shown) && (
              <details className="road8-range">
                <summary>See the range people paid</summary>
                <ul>
                  {evidence.surprised.range.map((bin) => (
                    <li key={bin.id}>
                      {bin.count.shown && bin.lower.shown ? (
                        <>
                          <span>
                            {euro(bin.lower.value!)}
                            {bin.upper.shown
                              ? ` – ${euro(bin.upper.value!)}`
                              : " and above"}
                          </span>
                          <span>{int(bin.count.value!)} people</span>
                        </>
                      ) : (
                        <span>
                          Amount band withheld · fewer than 500 people
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          <section className="road8-panel road8-helped">
            <h3>What helped</h3>
            {evidence.helped.length ? (
              <ol>
                {evidence.helped.map((b) => (
                  <li key={b.id}>
                    <strong>{b.label}</strong>
                    <p>{b.association}</p>
                    {b.kbcProduct && (
                      <span className="road8-small">KBC savings action</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>Save a small next step or talk it through with a person.</p>
            )}
            <p className="road8-small">
              Ranked by observed outcome, not by what KBC sells. An association
              is not proof of a cause.
            </p>
          </section>
          <NotesList
            roadId={roadId}
            stopId={stopId}
            personId={personId}
            large={large || !!s.person?.noGame}
          />
          {evidence.notes.length > 0 && (
            <section
              className="road8-panel road8-notes"
              aria-label="Example notes from people ahead"
            >
              {evidence.notes.map((n) => (
                <figure key={n.id}>
                  <blockquote>“{n.text}”</blockquote>
                  <figcaption>{n.by} · synthetic example</figcaption>
                </figure>
              ))}
            </section>
          )}
          <div className="road8-pass-slot">
            {renderPassItOn ? (
              renderPassItOn({ roadId, stopId, passed })
            ) : (
              <PassItOn
                roadId={roadId}
                stopId={stopId}
                personId={personId}
                hasPassedStop={passed}
                hasCompletedRoad={completed}
                large={large || !!s.person?.noGame}
              />
            )}
          </div>
          <div className="road8-save-actions">
            {evidence.actions.map((action, index) => (
              <button
                key={action.id}
                className={index === 0 ? "road8-primary" : "road8-secondary"}
                disabled={saved(action.pick.id)}
                onClick={() => s.addPlanItem(action.pick)}
              >
                {saved(action.pick.id) ? "Saved ✓" : action.label}
              </button>
            ))}
            <button
              className="road8-secondary"
              disabled={saved(questionId)}
              onClick={() =>
                s.addPlanItem({
                  id: questionId,
                  source: {
                    scope: roadId === EVERYDAY_ONLY_ID ? "everyday" : "road",
                    roadId,
                    key: stopId,
                  },
                  spec: {
                    kind: "talk",
                    title: `Ask my adviser about ${evidence.title}`,
                    detail: `${road.name} · ${evidence.title}`,
                  },
                })
              }
            >
              {saved(questionId)
                ? "Saved ✓"
                : personId === "sofie"
                  ? "Save a question for Thursday"
                  : "Save an adviser question"}
            </button>
          </div>
          <p className="road8-small" role="status">
            {evidence.actions.some((a) => saved(a.pick.id)) || saved(questionId)
              ? "Saved in your plan."
              : "Choose one small next step."}
          </p>
        </>
      )}
      <p className="road8-footer">
        Anonymous groups of at least 500 · history, not a prediction · synthetic
        demo data
      </p>
    </Sheet>
  );
}
