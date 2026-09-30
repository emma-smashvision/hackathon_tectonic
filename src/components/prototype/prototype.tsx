"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { PERSONAS } from "@/lib/engine/personas";
import { runEngine } from "@/lib/engine/rank";
import { Inspector } from "../inspector/inspector";
import { PhoneHome } from "../phone/phone-home";
import { Icon } from "../ui";
import { SCENARIOS, type Scenario } from "./scenarios";
import { initialState, loadSaved, reducer, save } from "./state";

const TOUR_STEP_MS = 7000;

export function Prototype() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);

  // Restore saved pins/hides after mount so server and client HTML match.
  useEffect(() => {
    const saved = loadSaved();
    if (saved) dispatch({ type: "hydrate", saved });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [hydrated, state]);

  const current = state.personas[state.personaId];
  const { needs, config } = useMemo(
    () => runEngine(current.profile, current.decisions),
    [current.profile, current.decisions],
  );

  const play = (scenario: Scenario) => {
    dispatch({
      type: "scenario",
      persona: scenario.persona,
      signals: scenario.signals,
    });
    setScenarioId(scenario.id);
    setResetVersion((v) => v + 1);
  };

  // Start on the first character.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once after hydration
  useEffect(() => {
    if (hydrated) play(SCENARIOS[0]);
  }, [hydrated]);

  // Auto-tour for silent screen recordings: step through every character.
  const playRef = useRef(play);
  playRef.current = play;
  useEffect(() => {
    if (!touring) return;
    const timer = window.setInterval(() => {
      const index = SCENARIOS.findIndex((s) => s.id === scenarioId);
      playRef.current(SCENARIOS[(index + 1) % SCENARIOS.length]);
    }, TOUR_STEP_MS);
    return () => window.clearInterval(timer);
  }, [touring, scenarioId]);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId);

  return (
    <MotionConfig reducedMotion="user">
      <div className="stage-bg" aria-hidden="true" />
      <main className="stage">
        <header className="stage-brand">
          <span className="text-lg font-black tracking-tight text-white">
            KBC<span className="text-azure">.</span>
          </span>
          <span className="stage-kicker">
            One KBC · 2.3M different dashboards - customized for you only
          </span>
        </header>

        <section className="stage-story" aria-live="polite">
          <AnimatePresence mode="wait">
            {scenario ? (
              <motion.div
                key={`${scenario.id}-${resetVersion}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                {scenario.avatar && (
                  // biome-ignore lint/performance/noImgElement: animated SVG, static export
                  <img src={scenario.avatar} alt="" className="story-avatar" />
                )}
                <p className="stage-kicker">Meet</p>
                <h1 className="story-name">{scenario.name}</h1>
                <p className="story-role">{scenario.role}</p>
                <p className="stage-kicker mt-8">KBC noticed</p>
                <ul className="mt-3 flex flex-col items-start gap-2">
                  {scenario.noticed.map((signal, i) => (
                    <motion.li
                      key={signal}
                      className="signal-pill"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.35 }}
                    >
                      <span className="signal-dot" />
                      {signal}
                    </motion.li>
                  ))}
                </ul>
                <motion.p
                  className="story-outcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 + scenario.noticed.length * 0.35 }}
                >
                  <Icon name="sparkle" className="size-5 shrink-0 text-azure" />
                  {scenario.outcome}
                </motion.p>
              </motion.div>
            ) : (
              <motion.div key="intro">
                <h1 className="story-name">Your bank, your way.</h1>
                <p className="story-role">
                  Pick someone on the right and watch the app change.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <div className="stage-phone">
          <div className="phone-halo" aria-hidden="true" />
          <div className="phone-frame">
            <div className="h-full overflow-hidden rounded-[2.4rem]">
              <PhoneHome
                key={`${state.personaId}-${resetVersion}`}
                decisions={current.decisions}
                signals={current.injected.map((s) => s.id)}
                profile={current.profile}
                config={config}
                personaKey={state.personaId}
                hiddenCount={current.decisions.hidden.length}
                onTogglePin={(widget) =>
                  dispatch({ type: "togglePin", widget })
                }
                onHide={(widget) => dispatch({ type: "hide", widget })}
                onUnhideAll={() => {
                  for (const widget of current.decisions.hidden) {
                    dispatch({ type: "unhide", widget });
                  }
                }}
                onAnswer={(need, relevant) =>
                  dispatch({ type: "answer", need, relevant })
                }
              />
            </div>
          </div>
        </div>

        <nav className="stage-cast" aria-label="Characters">
          <ul className="cast-list">
            {SCENARIOS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={s.id === scenarioId}
                  aria-label={`${s.name}: ${s.role}`}
                  title={`${s.name} · ${s.role}`}
                  className="cast-avatar"
                  onClick={() => {
                    setTouring(false);
                    play(s);
                  }}
                >
                  {s.avatar ? (
                    // biome-ignore lint/performance/noImgElement: animated SVG, static export
                    <img src={s.avatar} alt="" className="size-full" />
                  ) : (
                    <Icon name="user" className="size-7" />
                  )}
                  {s.badge && (
                    <span className="cast-badge">
                      <Icon name={s.badge} className="size-3.5" />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="cast-tools">
            <button
              type="button"
              className="cast-tool"
              aria-pressed={touring}
              aria-label={touring ? "Stop tour" : "Play tour"}
              title={touring ? "Stop tour" : "Play tour"}
              onClick={() => setTouring((t) => !t)}
            >
              <Icon name={touring ? "pause" : "play"} className="size-4" />
            </button>
            <button
              type="button"
              className="cast-tool"
              aria-label="Inside the engine"
              title="Inside the engine"
              onClick={() => setEngineOpen(true)}
            >
              <Icon name="sliders" className="size-4" />
            </button>
          </div>
        </nav>
      </main>

      <EngineDrawer open={engineOpen} onClose={() => setEngineOpen(false)}>
        <Inspector
          personas={PERSONAS}
          personaId={state.personaId}
          profile={current.profile}
          needs={needs}
          config={config}
          injected={current.injected}
          onSelectPersona={(id) => {
            setScenarioId(null);
            dispatch({ type: "selectPersona", id });
          }}
          onInject={(signal) => dispatch({ type: "inject", signal })}
          onReset={() => {
            dispatch({ type: "reset" });
            setResetVersion((v) => v + 1);
          }}
          onUnhide={(widget) => dispatch({ type: "unhide", widget })}
        />
      </EngineDrawer>
    </MotionConfig>
  );
}

/** Tucked-away demo controls: signals, needs and ranking for presenters. */
function EngineDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-label="Inside the engine"
      className="engine-drawer"
      onClose={onClose}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="text-sm font-semibold text-navy">Inside the engine</h2>
        <button
          type="button"
          aria-label="Close engine"
          onClick={onClose}
          className="rounded-full p-2 text-navy hover:bg-navy-50"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
