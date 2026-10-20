"use client";
// v9-world: the v7 phone curtain. Never mount R3F under a rotating/scaled parent.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { VillageGameProps } from "../hindsight/game/VillageGame";
import "../hindsight/game/village.css";
type GameComponent = typeof import("../hindsight/game/VillageGame").VillageGame;
let loadedGame: GameComponent | undefined;
let loadingGame: Promise<GameComponent> | undefined;
export function preloadCity() {
  return (loadingGame ??= import("../hindsight/game/VillageGame").then(
    (module) => {
      loadedGame = module.VillageGame;
      return loadedGame;
    },
  ));
}
export type LandscapeCityProps = VillageGameProps & {
  frameRef?: RefObject<HTMLDivElement | null>;
};
type Box = { left: number; top: number; width: number; height: number };
export function landscapeBox(width: number, height: number): Box {
  const w = Math.round(Math.min(width * 0.97, 2.05 * (height - 64)));
  const h = Math.round(w / 2.05);
  return {
    width: w,
    height: h,
    left: Math.round((width - w) / 2),
    top: Math.round((height - h) / 2),
  };
}
export function LandscapeCity({
  frameRef,
  personaId,
  focusLessonId,
  onExit,
  onPlain,
}: LandscapeCityProps) {
  const [phase, setPhase] = useState<
    "off" | "turning" | "on" | "playing" | "closing" | "returning"
  >("off");
  const [VillageGame, setGame] = useState<GameComponent | undefined>(
    () => loadedGame,
  );
  const [box, setBox] = useState<Box>();
  const [portrait, setPortrait] = useState(false);
  const [from, setFrom] = useState("none");
  const [settled, setSettled] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dialog = useRef<HTMLDivElement>(null);
  const callback = useRef(onExit);
  callback.current = onExit;
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const origin = useCallback(
    (target: Box) => {
      const r = frameRef?.current?.getBoundingClientRect();
      if (!r) return "rotate(-90deg) scale(.45)";
      return (
        "translate(" +
        (r.left + r.width / 2 - target.left - target.width / 2) +
        "px," +
        (r.top + r.height / 2 - target.top - target.height / 2) +
        "px) rotate(-90deg) scale(" +
        r.height / target.width +
        ")"
      );
    },
    [frameRef],
  );
  useEffect(() => {
    // Resolve the component during Home/rotation, avoiding a second lazy boundary.
    void preloadCity().then((Game) => setGame(() => Game));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    const target = landscapeBox(innerWidth, innerHeight);
    setBox(target);
    setPortrait(innerWidth < 700 && innerHeight > innerWidth);
    setFrom(reduce ? "none" : origin(target));
    setPhase("turning");
    setSettled(false);
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add("one-landscape");
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setSettled(true));
    });
    // Verify the rendered transform, including on a slow machine. A timer alone
    // can expire before the two opening animation frames have actually painted.
    const powerOn = () => {
      const element = dialog.current;
      if (element && !reduce) {
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(element).transform,
        );
        if (!matrix.isIdentity) {
          later(powerOn, 50);
          return;
        }
      }
      setPhase("on");
      later(() => setPhase("playing"), reduce ? 120 : 180);
    };
    later(powerOn, reduce ? 120 : 760);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      timers.current.forEach(clearTimeout);
      document.body.classList.remove("one-landscape");
      previous?.focus();
    };
  }, [origin, later]);
  useEffect(() => {
    if (phase !== "playing") return;
    dialog.current?.focus();
    const resize = () => {
      setBox(landscapeBox(innerWidth, innerHeight));
      setPortrait(innerWidth < 700 && innerHeight > innerWidth);
    };
    window.addEventListener("resize", resize);
    window.dispatchEvent(new Event("resize"));
    return () => window.removeEventListener("resize", resize);
  }, [phase]);
  const close = (plain = false) => {
    if (portrait) {
      document.body.classList.remove("one-landscape");
      if (plain && onPlain) onPlain();
      else callback.current();
      return;
    }
    if (phase === "closing" || phase === "returning") return;
    timers.current.forEach(clearTimeout);
    setPhase("closing");
    later(
      () => {
        setPhase("returning");
        setSettled(false);
      },
      reduced ? 80 : 320,
    );
    later(
      () => {
        document.body.classList.remove("one-landscape");
        if (plain && onPlain) onPlain();
        else callback.current();
      },
      (reduced ? 80 : 320) + (reduced ? 120 : 760),
    );
  };
  if (!box || phase === "off") return null;
  const mounted = phase === "on" || phase === "playing";
  return (
    <div className={"ls-wrap vg-turn phase-" + phase} data-phase={phase}>
      <div
        ref={dialog}
        tabIndex={-1}
        className="ls-phone"
        style={{
          ...(portrait
            ? {
                width: "calc(100% - 24px)",
                height: "calc(100% - 40px)",
                left: 12,
                top: 20,
              }
            : box),
          transform: portrait || settled ? "none" : from,
          opacity: reduced && !settled ? 0 : 1,
          transition:
            "transform " +
            (reduced ? 120 : 700) +
            "ms cubic-bezier(.3,.8,.25,1), opacity 120ms",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Your village"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const els = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled), input, textarea, [tabindex="0"]',
              ),
            ).filter((el) => el.offsetParent !== null);
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="ls-bezel">
          <span className="ls-island" aria-hidden="true" />
          <div className="ls-screen">
            {mounted && portrait && (
              <div className="vg-mobile-cue">
                <span aria-hidden="true">↻</span>
                <h1>Turn your phone to play</h1>
                <p>
                  Your village needs a little more room. Turn your device
                  sideways, or use the same lessons in plain view.
                </p>
                {onPlain && (
                  <button onClick={() => close(true)}>
                    Open plain lessons
                  </button>
                )}
                <button onClick={() => close()}>Back to app</button>
              </div>
            )}
            {(mounted || phase === "turning") && !portrait && VillageGame && (
              <VillageGame
                canvasEnabled={mounted}
                personaId={personaId}
                focusLessonId={focusLessonId}
                onExit={() => close()}
                onPlain={onPlain ? () => close(true) : undefined}
              />
            )}
            <div
              className={
                "ls-power " +
                (phase === "on"
                  ? "power-on"
                  : phase === "closing"
                    ? "power-off"
                    : phase === "playing"
                      ? ""
                      : "dark")
              }
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
