"use client";
// v10-shell: audio starts only after an explicit user gesture and ends on exit.
import { useEffect, useRef, useState } from "react";

type SoundGraph = { context: AudioContext; engine: OscillatorNode; gain: GainNode };
export function CitySound({ speed }: { speed: () => number }) {
  const [muted, setMuted] = useState(true);
  const graph = useRef<SoundGraph | null>(null);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  useEffect(() => {
    if (muted) return;
    const audio = graph.current;
    if (!audio) return;
    const tick = () => {
      const now = audio.context.currentTime;
      audio.engine.frequency.setTargetAtTime(42 + Math.min(100, Math.abs(speedRef.current()) * 2), now, .12);
      audio.gain.gain.setTargetAtTime(document.hidden ? 0 : .018, now, .12);
    };
    const cue = (event: Event) => {
      if (document.hidden) return;
      const kind = (event as CustomEvent<string>).detail;
      if (kind !== "pickup" && kind !== "pave") return;
      const tone = audio.context.createOscillator(), volume = audio.context.createGain();
      const now = audio.context.currentTime;
      tone.type = "sine";
      tone.frequency.setValueAtTime(kind === "pickup" ? 660 : 330, now);
      tone.frequency.exponentialRampToValueAtTime(kind === "pickup" ? 990 : 660, now + .18);
      volume.gain.setValueAtTime(.035, now);
      volume.gain.exponentialRampToValueAtTime(.001, now + .3);
      tone.connect(volume).connect(audio.context.destination);
      tone.start(); tone.stop(now + .32);
      tone.onended = () => { tone.disconnect(); volume.disconnect(); };
    };
    const timer = window.setInterval(tick, 100);
    window.addEventListener("city10:sound", cue);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("city10:sound", cue);
      document.removeEventListener("visibilitychange", tick);
      audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, .03);
    };
  }, [muted]);
  useEffect(() => () => {
    const audio = graph.current;
    if (audio) { audio.engine.stop(); void audio.context.close(); graph.current = null; }
  }, []);
  const toggle = async () => {
    if (!muted) { setMuted(true); return; }
    try {
      if (!graph.current) {
        const context = new AudioContext();
        const engine = context.createOscillator(), gain = context.createGain();
        engine.type = "sine"; engine.frequency.value = 42; gain.gain.value = 0;
        engine.connect(gain).connect(context.destination); engine.start();
        graph.current = { context, engine, gain };
      }
      await graph.current.context.resume();
      setMuted(false);
    } catch { setMuted(true); }
  };
  return <button type="button" className="c10-sound" onClick={() => void toggle()} aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Mute sound"}>{muted ? "Sound off" : "Sound on"}</button>;
}
