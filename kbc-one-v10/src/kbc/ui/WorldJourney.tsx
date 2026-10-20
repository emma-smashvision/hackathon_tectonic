"use client";
// v11-shell: one landscape session; a drive returns to the same person's world.
import { Component, useEffect, useState, type ReactNode } from "react";
import type { CityExperienceProps } from "../../one/CityExperience";
import { preloadCity } from "../../one/LandscapeCity";
import { useVillageProgress } from "../../one/village";
import { missionsFor } from "../../hindsight/game/city10/missions/catalogue";
import "./world-shell.css";

type WorldComponent = typeof import("../../one/world/ui").WorldGame;
let loadedWorld: WorldComponent | undefined;
let loadingWorld: Promise<WorldComponent> | undefined;
export function preloadWorld() {
  return loadingWorld ??= import("../../one/world/ui").then(module => loadedWorld = module.WorldGame).catch(error => {
    loadingWorld = undefined;
    throw error;
  });
}

class WorldBoundary extends Component<{ children: ReactNode; onPlain?: () => void; onExit: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="v11-world-loading" role="alert">
      <h1>Your world could not open</h1><p>You can still read your areas and lessons in plain view.</p>
      <button onClick={this.props.onPlain}>Open plain world</button><button onClick={this.props.onExit}>Back to Home</button>
    </div> : this.props.children;
  }
}

export function WorldJourney({ personaId, focusLessonId, onExit, onPlain, onReady }: CityExperienceProps) {
  const [WorldGame, setWorld] = useState<WorldComponent | undefined>(() => loadedWorld);
  const [City, setCity] = useState<Awaited<ReturnType<typeof preloadCity>>>();
  const [drive, setDrive] = useState<string>();
  const [receipt, setReceipt] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [cityFailed, setCityFailed] = useState(false);
  const progress = useVillageProgress(personaId);
  const eligible = (id: string) => missionsFor(personaId).some(mission => !mission.testDrive && mission.lesson.id === id);
  useEffect(() => {
    let alive = true;
    void preloadWorld().then(Game => { if (alive) setWorld(() => Game); }).catch(() => { if (alive) setFailed(true); });
    void preloadCity().then(Game => { if (alive) setCity(() => Game); }).catch(() => { if (alive) setCityFailed(true); });
    if (focusLessonId && eligible(focusLessonId)) setDrive(focusLessonId);
    return () => { alive = false; };
  }, [personaId, focusLessonId]);
  useEffect(() => { if (WorldGame || failed) onReady?.(); }, [WorldGame, failed, onReady]);
  useEffect(() => {
    if (drive) return;
    const exitOverview = (event: KeyboardEvent) => {
      // World panels consume Escape in capture; only the overview reaches this handler.
      if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); onExit(); }
    };
    window.addEventListener("keydown", exitOverview);
    return () => window.removeEventListener("keydown", exitOverview);
  }, [drive, onExit]);
  const returnToWorld = () => {
    const lesson = missionsFor(personaId).find(m => m.lesson.id === drive)?.lesson;
    setReceipt(lesson && progress.done.includes(lesson.id)
      ? `${lesson.reward.label}${lesson.save && progress.saved.includes(lesson.save.id) ? " · Step saved" : ""}. Your progress is in your world.`
      : "Back in your world. Continue when you are ready.");
    setDrive(undefined);
  };
  return <WorldBoundary onExit={onExit} onPlain={onPlain}>
    {drive && City ? <City personaId={personaId} focusLessonId={drive} onExit={returnToWorld} onReturnToWorld={returnToWorld} onPlain={onPlain} />
      : drive && !City ? <div className="v11-world-loading"><h1>{cityFailed ? "The drive could not open" : "Your drive is opening"}</h1><button onClick={returnToWorld}>Back to your world</button></div>
      : failed ? <div className="v11-world-loading" role="alert"><h1>Your world could not open</h1><button onClick={onPlain}>Open plain world</button><button onClick={onExit}>Back to Home</button></div>
      : WorldGame ? <>
        <WorldGame personaId={personaId} onExit={onExit} onPlain={() => onPlain?.()} onDrive={id => {
          if (eligible(id)) { setReceipt(undefined); setDrive(id); }
          else setReceipt("This quest is available as a lesson in your world.");
        }} />
        {receipt && <aside className="v11-return-receipt" role="status"><span>{receipt}</span><button aria-label="Dismiss drive result" onClick={() => setReceipt(undefined)}>×</button></aside>}
      </> : <div className="v11-world-loading" role="status">Opening your world…</div>}
  </WorldBoundary>;
}
