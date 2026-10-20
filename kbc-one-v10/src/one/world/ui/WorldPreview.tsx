"use client";
import { useState } from "react";
import { WorldGame } from "./WorldGame";
export function WorldPreview({ personaId = "tom" }: { personaId?: string }) {
  const [event, setEvent] = useState("");
  return <main style={{ position: "fixed", inset: 0 }}><WorldGame personaId={personaId} onExit={() => setEvent("Exit requested")} onPlain={() => setEvent("Plain view requested")} onDrive={id => setEvent(`Drive requested: ${id}`)} />{event && <output data-testid="shell-event" style={{ position: "absolute", bottom: 6, left: 12, background: "#10253b", color: "white", padding: 8, fontSize: 12 }}>{event}</output>}</main>;
}
