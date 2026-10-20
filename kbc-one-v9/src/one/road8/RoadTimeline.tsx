import { MONTH_LONG } from "../../hindsight/engine/everyday";
import { roadViewFor, stopEvidenceFor, EVERYDAY_ONLY_ID } from "../crowd";
import { evidenceText } from "./evidenceText";

type RoadView = NonNullable<ReturnType<typeof roadViewFor>>;
export function RoadTimeline({
  view,
  onOpen,
}: {
  view: RoadView;
  onOpen: (id: string) => void;
}) {
  const everyday = view.roadId === EVERYDAY_ONLY_ID;
  const simple = view.largeSimple || view.care;
  const stops = [
    ...view.nextStops.map((stop) => ({ ...stop, fork: false })),
    ...(view.fork && view.fork.month >= (view.position.month ?? 0)
      ? [
          {
            ...view.fork,
            offset: view.fork.month - (view.position.month ?? 0),
            year: null,
            passed: false,
            fork: true,
          },
        ]
      : []),
  ].sort(
    (a, b) =>
      a.offset - b.offset ||
      Number(b.stopId === "december") - Number(a.stopId === "december"),
  );
  const ghosts = view.ghostGroups.filter((group) => group.count.shown);
  return (
    <div className={`road8-timeline ${simple ? "road8-cards" : ""}`}>
      <div className="road8-you">
        <span className="road8-you-dot">
          {view.position.preview ? "You?" : "You"}
        </span>
        <div>
          <strong>{view.position.label}</strong>
          <span>
            {view.position.preview
              ? "Exploring · your position stays the same"
              : "Now · the road continues below"}
          </span>
        </div>
      </div>
      {!simple && ghosts.length > 0 && (
        <div className="road8-ghosts">
          <span className="road8-ghost-dots" aria-hidden="true">
            {ghosts.slice(0, 3).map((g) => (
              <i key={g.id} />
            ))}
          </span>
          <p>
            Ghost riders
            <br />
            <span>
              Anonymous groups of at least 500 ahead
              <br />
              Illustrative stages · not a prediction
            </span>
          </p>
        </div>
      )}
      <ol className="road8-stops">
        {stops.map((stop, index) => {
          const evidence = stop.fork
            ? null
            : stopEvidenceFor(view.roadId, stop.stopId, {
                careOptIn: view.available,
              });
          const when = everyday
            ? `${MONTH_LONG[stop.month - 1]}${stop.year ? ` ${stop.year}` : ""}`
            : `Month ${stop.month}`;
          return (
            <li key={stop.id} className={index === 0 ? "road8-next" : ""}>
              <button
                className="road8-stop"
                onClick={() => onOpen(stop.stopId)}
              >
                <span className="road8-stop-dot" aria-hidden="true">
                  {stop.fork ? "⑂" : ""}
                </span>
                <span className="road8-stop-content">
                  <span className="road8-when">
                    {index === 0 ? "Next · " : ""}
                    {when}
                  </span>
                  <strong>{stop.title}</strong>
                  <span className="road8-stop-evidence">
                    {evidence
                      ? evidenceText(evidence)
                      : "Compare the branches after 1 and 3 years"}
                  </span>
                  {index === 0 && (
                    <span className="road8-open">
                      {stop.fork ? "Compare what happened" : "See what helped"}{" "}
                      <span aria-hidden="true">→</span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {!stops.length && (
        <p className="road8-end">
          You have reached the end of this road. Your experience can help
          someone who comes next.
        </p>
      )}
    </div>
  );
}
