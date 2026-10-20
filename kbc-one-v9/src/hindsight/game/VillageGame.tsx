"use client";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { catalogueFor, roadViewFor } from "../../one/crowd";
import type { Lesson, LessonProgress } from "../../one/learning/types";
import {
  lessonsFor,
  villageFor,
  useVillageProgress,
  LessonCard,
} from "../../one/learning";
import type { SceneProps } from "./VillageScene";
import { VillagePicture } from "../../one/villagecard/VillagePicture";
import { PassItOn } from "../../one/notes8";
import "./village.css";
// The curtain preloads this complete module while Home is visible.
import { VillageScene as Scene } from "./VillageScene";
export type VillageGameProps = {
  personaId: string;
  focusLessonId?: string;
  onExit: () => void;
  onPlain?: () => void;
  /** Prepare the HUD during the phone turn, but defer WebGL until it settles. */
  canvasEnabled?: boolean;
};
class SceneBoundary extends Component<
  { children: ReactNode; onFailed: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailed();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function VillageGame(props: VillageGameProps) {
  return <Game key={props.personaId} {...props} />;
}
function Game({
  personaId,
  focusLessonId,
  onExit,
  onPlain,
  canvasEnabled = true,
}: VillageGameProps) {
  const village = useMemo(() => villageFor(personaId), [personaId]);
  const lessons = useMemo(() => lessonsFor(personaId), [personaId]);
  const progress = useVillageProgress(personaId);
  const [mode, setMode] = useState<SceneProps["mode"]>("village");
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      lessons.findIndex(
        (l) => l.id === focusLessonId || l.stopId === focusLessonId,
      ),
    ),
  );
  const [focusUsed, setFocusUsed] = useState(false);
  const [panel, setPanel] = useState<string>();
  const [paved, setPaved] = useState<string[]>([]);
  const [reward, setReward] = useState<Lesson>();
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [reduced, setReduced] = useState(false);
  const [failed, setFailed] = useState(false);
  const [worldReady, setWorldReady] = useState(false);
  const ready = useCallback(() => setWorldReady(true), []);
  const [plain, setPlain] = useState(false);
  const labelRefs = useRef<Record<string, HTMLElement | null>>({});
  const root = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const view = useMemo(
    () => roadViewFor(personaId, village.destination?.roadId),
    [personaId, village.destination],
  );
  const complete =
    lessons.length > 0 && lessons.every((l) => progress.done.includes(l.id));
  const doneIds = lessons
    .filter((l) => progress.done.includes(l.id))
    .map((l) => l.id);
  const focused = !focusUsed
    ? lessons.find((l) => l.id === focusLessonId || l.stopId === focusLessonId)
    : undefined;
  const next = focused ?? lessons.find((l) => !progress.done.includes(l.id));
  const lesson = lessons[active];
  const plot = village.plots.find((p) => p.id === panel);
  const roads = useMemo(() => catalogueFor(personaId), [personaId]);
  const [preview, setPreview] = useState<string>();
  const selectedRoad = roads.find((r) => r.id === preview);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    change();
    media.addEventListener("change", change);
    return () => {
      media.removeEventListener("change", change);
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    root.current?.focus();
  }, []);
  const labels = useCallback<SceneProps["onLabels"]>((positions) => {
    for (const [id, p] of Object.entries(positions)) {
      const el = labelRefs.current[id];
      if (el) {
        el.style.left = p.x + "%";
        el.style.top = p.y + "%";
        el.style.visibility = p.visible ? "visible" : "hidden";
      }
    }
  }, []);
  const arrive = useCallback(() => setMode("lesson"), []);
  const start = (l: Lesson, forcePlain = false) => {
    setFocusUsed(true);
    setActive(lessons.indexOf(l));
    setPanel(undefined);
    setReward(undefined);
    setPaved([]);
    setMode(forcePlain || plain || failed ? "lesson" : "travel");
  };
  const finish = (p: LessonProgress) => {
    progress.complete(p.lessonId);
    setPaved((old) => old.filter((id) => id !== p.lessonId));
    setReward(lesson);
    setMode("village");
    setToast(
      (doneIds.includes(p.lessonId)
        ? "Lesson revisited"
        : lesson.reward.label) +
        " · " +
        Math.min(
          doneIds.length + (doneIds.includes(p.lessonId) ? 0 : 1),
          lessons.length,
        ) +
        "/" +
        lessons.length,
    );
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1500);
  };
  const step = (p: LessonProgress) => {
    if (p.step === "apply" || p.step === "save")
      setPaved((old) =>
        old.includes(p.lessonId) ? old : [...old, p.lessonId],
      );
  };
  const openPlain = () => {
    if (onPlain) onPlain();
    else {
      setPlain(true);
      if (next) start(next, true);
    }
  };
  const closePanel = () => {
    setPaved([]);
    setPanel(undefined);
    setMode("village");
    setPreview(undefined);
  };
  if (!village.playable || !village.destination)
    return (
      <section className="vg vg-unavailable">
        <h1>At your pace</h1>
        <p>Your plain overview is available in the app.</p>
        <button onClick={onExit}>Back to app</button>
      </section>
    );
  return (
    <section
      ref={root}
      tabIndex={-1}
      className={
        "vg " +
        (mode === "lesson" ? "vg-learning " : "") +
        (plain ? "vg-plain" : "")
      }
      aria-label={village.name}
      data-mode={mode}
      data-built={doneIds.length}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (panel || mode !== "village") closePanel();
          else onExit();
        }
      }}
    >
      <div className="vg-world">
        {!worldReady && (
          <div className="vg-warm-preview" aria-hidden="true">
            <VillagePicture built={doneIds.length} total={lessons.length} />
          </div>
        )}
        <div className={"vg-live-world" + (worldReady ? " ready" : "")}>
          {canvasEnabled && (
            <SceneBoundary
              onFailed={() => {
                setFailed(true);
                setPlain(true);
              }}
            >
              <Scene
                onReady={ready}
                village={village}
                lessons={lessons}
                done={doneIds}
                paved={paved}
                activeIndex={active}
                mode={mode}
                reduced={reduced}
                onPlot={(id) => {
                  setPanel(id);
                  setMode("village");
                }}
                onLabels={labels}
                onArrive={arrive}
              />
            </SceneBoundary>
          )}
        </div>
      </div>
      <header className="vg-top">
        <button onClick={onExit}>← Back to app</button>
        <div className="vg-goal">
          <small>{village.name}</small>
          <h1>
            {complete
              ? village.destination.title + " · lessons complete"
              : village.destination.goal}
          </h1>
          <div
            className="vg-progress"
            aria-label={
              doneIds.length + " of " + lessons.length + " lessons completed"
            }
          >
            {lessons.map((l) => (
              <i
                key={l.id}
                className={progress.done.includes(l.id) ? "is-done" : ""}
              />
            ))}
            <span>
              {doneIds.length}/{lessons.length} lessons
            </span>
          </div>
        </div>
        <nav>
          {mode === "village" ? (
            <>
              <button
                onClick={() => {
                  setPanel("roads");
                  setPreview(undefined);
                }}
              >
                All roads
              </button>
              <button onClick={openPlain}>Plain view</button>
            </>
          ) : (
            <button onClick={closePanel}>Village</button>
          )}
        </nav>
      </header>
      {worldReady && mode === "village" && !panel && !plain && !toast && (
        <div className="vg-labels">
          {village.plots.map((p) => (
            <button
              key={p.id}
              ref={(el) => {
                labelRefs.current[p.id] = el;
              }}
              className="vg-place"
              onClick={() => setPanel(p.id)}
            >
              <strong>{p.title}</strong>
              <span>{p.subtitle}</span>
            </button>
          ))}
          <div
            className={
              "vg-place vg-destination " + (complete ? "is-complete" : "")
            }
            ref={(el) => {
              labelRefs.current.destination = el;
            }}
          >
            <strong>
              {village.destination.title}
              {complete ? " ✓" : ""}
            </strong>
            <span>
              {doneIds.length}/{lessons.length} lessons
            </span>
          </div>
        </div>
      )}
      {toast && (
        <div className="vg-toast" role="status">
          <svg
            className="vg-crane-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 22h10M6 22V3h4v19M3 6h18M6 3l15 3M6 9l4 4-4 4 4 4M18 6v8m0 0v2a2 2 0 0 0 4 0" />
          </svg>
          <span>{toast}</span>
        </div>
      )}
      {mode === "village" && !panel && (!complete || focused) && (
        <aside className="vg-next">
          {reward ? (
            <>
              <div className="vg-stamp">
                <span>{reward.stamp.icon}</span>
                <div>
                  <small>Passport stamp</small>
                  <strong>{reward.stamp.label}</strong>
                </div>
              </div>
              <p>
                {progress.saved.length
                  ? "A step saved for later."
                  : "Lesson complete. You can save a step later."}
              </p>
            </>
          ) : (
            <>
              <small>Next on your road</small>
              <h2>
                {view?.road.name} · {lessons.length}{" "}
                {lessons.length === 1 ? "bump" : "bumps"} ahead
              </h2>
              <p>
                {view?.road.driverCount.shown
                  ? new Intl.NumberFormat("nl-BE").format(
                      view.road.driverCount.value!,
                    ) + " earlier travellers. "
                  : ""}
                Learn what helped them. Pave each bump and build your village.
              </p>
            </>
          )}
          {next && (
            <button className="vg-gold" onClick={() => start(next)}>
              ▶{" "}
              {reward
                ? "Next bump: " + next.title
                : "Start lesson " + next.order + " · 1 min"}
            </button>
          )}
        </aside>
      )}
      {mode === "travel" && (
        <aside className="vg-travel" role="status">
          <strong>On the way to {lesson.title}</strong>
          <button onClick={arrive}>Arrive now</button>
        </aside>
      )}
      {mode === "lesson" && (
        <>
          <span className="vg-driving-caption">
            {paved.includes(lesson.id)
              ? "✦ Bump paved · try the new case"
              : "Car stopped before the bump · ghost cars show earlier groups"}
          </span>
          {paved.includes(lesson.id) && (
            <span className="vg-paved" role="status">
              ✦ Paved
            </span>
          )}
          <div className="vg-lesson-panel">
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              variant={plain ? "plain" : "game"}
              onStep={step}
              onDone={finish}
            />
          </div>
        </>
      )}
      {mode === "village" && complete && !panel && !focused && (
        <>
          <aside className="vg-next vg-finished">
            <small>Road complete · {view?.road.name}</small>
            <h2>{village.destination.title}</h2>
            <div className="vg-stamps">
              {lessons.map((l) => (
                <span key={l.id}>
                  {l.stamp.icon} {l.stamp.label}
                </span>
              ))}
            </div>
            <p>
              {progress.saved.length}{" "}
              {progress.saved.length === 1 ? "step" : "steps"} saved for later.
              Leave a note for the next traveller.
            </p>
            <button className="vg-blue" onClick={() => setPanel("note")}>
              ✍ Write a note for the next traveller
            </button>
          </aside>
          <aside className="vg-where">
            <small>Where could you go next?</small>
            <strong>Explore another life road</strong>
            <button onClick={() => setPanel("roads")}>All roads →</button>
          </aside>
        </>
      )}
      {panel && (
        <aside
          className="vg-panel"
          aria-label={
            plot?.title ?? (panel === "roads" ? "All roads" : "Leave a note")
          }
        >
          <button
            className="vg-close"
            aria-label="Close panel"
            onClick={closePanel}
          >
            ✕
          </button>
          {plot ? (
            <>
              <small>Your village</small>
              <h2>{plot.title}</h2>
              <p>{plot.subtitle}</p>
              <dl>
                {plot.overview.map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="vg-muted">
                Your overview. Learning changes the village decoration, never
                your account balances.
              </p>
              {next && (
                <button className="vg-gold" onClick={() => start(next)}>
                  Learn: {next.title}
                </button>
              )}
            </>
          ) : panel === "roads" ? (
            <>
              <small>Explore at your pace</small>
              <h2>All roads</h2>
              <input
                aria-label="Find a road"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a life road…"
              />
              {selectedRoad ? (
                <div className="vg-road-preview">
                  <h3>{selectedRoad.name}</h3>
                  <p>{selectedRoad.tagline}</p>
                  <p>
                    {selectedRoad.care
                      ? "A plain support path, when you are ready."
                      : selectedRoad.status === "review"
                        ? "Under review. No lessons are available."
                        : "A preview only. Your current road stays the same."}
                  </p>
                  {selectedRoad.id === village.destination.roadId && next && (
                    <button className="vg-gold" onClick={() => start(next)}>
                      Continue your lesson
                    </button>
                  )}
                  <button onClick={() => setPreview(undefined)}>
                    Back to all roads
                  </button>
                </div>
              ) : (
                <div className="vg-roads">
                  {roads
                    .filter((r) =>
                      (r.name + " " + r.group)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <button key={r.id} onClick={() => setPreview(r.id)}>
                        <strong>{r.name}</strong>
                        <span>
                          {r.badge ?? (r.care ? "Plain support" : r.group)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </>
          ) : (
            <>
              <h2>A note for someone ahead</h2>
              <PassItOn
                roadId={village.destination.roadId}
                personId={personaId}
                hasCompletedRoad
              />
            </>
          )}
        </aside>
      )}
      {failed && mode !== "lesson" && (
        <div className="vg-fallback">
          <p>
            The village picture is unavailable. The same lessons work in plain
            view.
          </p>
          <button onClick={openPlain}>Open plain lessons</button>
        </div>
      )}
      <footer className="vg-footer">
        Synthetic demo crowd · not a forecast
      </footer>
    </section>
  );
}
