"use client";

import { useEffect, useRef, useState } from "react";
import { monthBundles } from "../../../one/roadmap/model";
import { useCityControls } from "./useCityControls";

/** One quiet acknowledgement per monthly bundle, without interrupting the drive. */
export function MinorStopToast() {
  const api = useCityControls();
  const seen = useRef(new Set<string>());
  const sequence = useRef(0);
  const [toast, setToast] = useState<{ id: string; text: string } | null>(null);
  useEffect(() => {
    for (const event of api.events) {
      if (event.seq <= sequence.current) continue;
      sequence.current = event.seq;
      if (event.type !== "minorPassed") continue;
      const track = api.roadmap.tracks.find((item) => item.id === event.trackId);
      const bundle = track && monthBundles(track).find((item) => item.stops.some((stop) => stop.id === event.stopId));
      if (!bundle || seen.current.has(bundle.id)) continue;
      seen.current.add(bundle.id);
      const when = bundle.stops[0].when;
      const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(when.year, when.month, 1));
      setToast({ id: bundle.id, text: `${month} bills · ${bundle.count} · nothing to do` });
    }
  }, [api.events, api.roadmap]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return toast ? <div className="city-minor-toast" role="status" data-hud>{toast.text}</div> : null;
}
