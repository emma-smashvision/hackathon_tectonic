"use client";
import { useEffect } from "react";
import { useCityEngine } from "../engine/runtime";
import { NO_INPUT, type Input } from "../engine/driving";
const keys: Record<string, keyof Input> = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'brake' };
export function useDriveControls(toggleMap: () => void) {
  const { rt } = useCityEngine();
  useEffect(() => {
    const clear = () => { rt.current.keys = { ...NO_INPUT }; rt.current.touch = { ...NO_INPUT }; };
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))) return;
      if (event.code === 'KeyM' && !event.repeat) { event.preventDefault(); toggleMap(); clear(); return; }
      const key = keys[event.code]; if (!key) return;
      if (rt.current.mapOpen || rt.current.frozen || rt.current.shot) return;
      event.preventDefault(); rt.current.keys[key] = true;
    };
    const up = (event: KeyboardEvent) => { const key = keys[event.code]; if (key) rt.current.keys[key] = false; };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear); document.addEventListener('visibilitychange', hidden);
    return () => { clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', hidden); };
  }, [rt, toggleMap]);
}
