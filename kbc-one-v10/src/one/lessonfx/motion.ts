'use client';
import { useSyncExternalStore } from 'react';
const query = '(prefers-reduced-motion: reduce)';
const subscribe = (fn: () => void) => { const m = window.matchMedia(query); m.addEventListener('change', fn); return () => m.removeEventListener('change', fn); };
export function useLessonMotion(reducedMotion = false): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true) || reducedMotion;
}
