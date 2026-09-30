"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { PERSONAS } from "@/lib/engine/personas";
import { runEngine } from "@/lib/engine/rank";
import { Inspector } from "../inspector/inspector";
import { PhoneHome } from "../phone/phone-home";
import { initialState, loadSaved, reducer, save } from "./state";

export function Prototype() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);

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

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-10 lg:py-10">
        <header className="lg:col-span-2">
          <p className="text-xs font-semibold tracking-widest text-azure-ink uppercase">
            Tectonic Hackathon · KBC challenge
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            One KBC. Your version.
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            A home screen that rebuilds itself around each customer:{" "}
            <strong className="text-slate-800">
              signals → inferred needs → ranked widgets → homepage config
            </strong>
            . Synthetic data only; everything runs in your browser.
          </p>
        </header>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="mx-auto h-[min(820px,85dvh)] w-full max-w-[400px] overflow-hidden rounded-[2.75rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl shadow-navy/30">
            <div className="h-full overflow-hidden rounded-[2rem]">
              <PhoneHome
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
          <p className="mt-3 text-center text-xs text-slate-500">
            Core zone (balance, pay) is fixed. Everything below adapts.
          </p>
        </div>

        <section aria-label="Engine inspector">
          <Inspector
            personas={PERSONAS}
            personaId={state.personaId}
            profile={current.profile}
            needs={needs}
            config={config}
            injected={current.injected}
            onSelectPersona={(id) => dispatch({ type: "selectPersona", id })}
            onInject={(signal) => dispatch({ type: "inject", signal })}
            onReset={() => dispatch({ type: "reset" })}
            onUnhide={(widget) => dispatch({ type: "unhide", widget })}
          />
        </section>
      </main>
    </MotionConfig>
  );
}
