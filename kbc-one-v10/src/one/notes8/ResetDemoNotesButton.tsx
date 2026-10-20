"use client";

import { useState } from "react";
import { notesRequest } from "./useNotes";

export function ResetDemoNotesButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function reset() {
    setBusy(true);
    setMessage("");
    try { await notesRequest({ action: "reset-demo" }, "DELETE"); setMessage("Demo notes reset for all personas."); }
    catch { setMessage("Could not reset demo notes. Please try again."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="dir-btn" disabled={busy} onClick={() => { void reset(); }}>{busy ? "Resetting notes…" : "Reset demo notes"}</button>
    {message && <p className="eng-intro" role="status">{message}</p>}
  </>;
}
