"use client";

import { useEffect, useRef } from "react";
import type { Input } from "../driving";

export function DrivingPad({ setInput, releaseInput, compact = false }: { setInput: (input: Partial<Input>) => void; releaseInput: () => void; compact?: boolean }) {
  const latestRelease = useRef(releaseInput);
  latestRelease.current = releaseInput;
  useEffect(() => {
    const release = () => latestRelease.current();
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => { release(); window.removeEventListener("blur", release); document.removeEventListener("visibilitychange", release); };
  }, []);
  return <div className={`city-driving ${compact ? "is-compact" : ""}`} data-hud>
    <div className="city-pad" role="group" aria-label="Drive your car">
      {([['up', '↑', 'Drive forward'], ['left', '←', 'Turn left'], ['down', '↓', 'Brake or reverse'], ['right', '→', 'Turn right']] as const).map(([key, arrow, label]) => <button
        key={key} type="button" className={`city-pad-${key}`} aria-label={label}
        onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setInput({ [key]: true }); }}
        onPointerUp={() => setInput({ [key]: false })}
        onPointerCancel={releaseInput} onLostPointerCapture={() => setInput({ [key]: false })}
        onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); setInput({ [key]: true }); } }}
        onKeyUp={() => setInput({ [key]: false })} onBlur={() => setInput({ [key]: false })}
      >{arrow}</button>)}
    </div>
    <span>{compact ? "Hold an arrow to drive on" : "Hold arrows · or use ↑ ↓ ← → / WASD"}</span>
  </div>;
}
