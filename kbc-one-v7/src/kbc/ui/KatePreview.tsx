"use client";

import { useEffect, useRef, useState } from "react";
import type { Proposal } from "../kate";
import type { HomeModel, Snapshot } from "../types";
import { api } from "./api";

export const KATE_QUICK_CHIPS = ["Make text bigger", "Fewer blocks", "Back to KBC style"];

export function KatePreview({ proposal: p, applied, onApply, onChange }: {
  proposal: Proposal; applied: boolean; onApply: () => void | Promise<void>; onChange: () => void;
}) {
  const [pending, setPending] = useState(false);
  if (p.type === "action" || p.type === "drive") return null;
  const theme = p.type === "theme" || p.type === "customization" ? p.theme : undefined;
  const tracker = p.type === "tracker" ? p : p.type === "customization" ? p.tracker : undefined;
  const changes = p.type === "customization" || p.type === "layout" ? p.changes : p.type === "theme" ? [`Style: ${p.theme.base}, ${p.theme.name}`] : [`Add ${p.spec.title} · size ${p.size.toUpperCase()}`];
  const colors = theme?.colors ?? { bg: "#0a1220", surface: "#152239", text: "#e8eef6", muted: "#b1c0d3", accent: "#4cc3f2", accentText: "#092438" };
  return <section className="kate-preview" aria-label="Preview changes">
    <div className="kate-preview-label">Preview · {changes.length} {changes.length === 1 ? "change" : "changes"}</div>
    <div className="kate-preview-summary">
      <div className="kate-mini-phone" aria-label="Mini phone preview" style={{ background: colors.bg, color: colors.text, borderColor: colors.accent }}>
        <div style={{ background: colors.accent, color: colors.accentText }}>Balance</div>
        <div className="kate-mini-fixed" style={{ color: colors.muted }}>↗ · Pay · ▦ · ▤</div>
        <div style={{ background: colors.surface }}>Yours</div>
        <div style={{ background: colors.surface }}>{tracker ? "Coffee" : "Your road"}</div>
      </div>
      <ul>{changes.map((change, i) => <li key={`${i}-${change}`}>{change}</li>)}</ul>
    </div>
    <p className="kate-preview-safety">Contrast checked · Balance, Transfer, Pay, Scan and Cards stay visible.</p>
    {tracker && <div className="kate-preview-tracker" style={{ background: colors.surface, color: colors.text }}>
      <small style={{ color: colors.muted }}>New in Yours · Tracker · Size {tracker.size.toUpperCase()}</small>
      <strong>{tracker.spec.title} this {tracker.spec.period} · {tracker.preview.value}</strong>
    </div>}
    <p className="kate-preview-note">Nothing changes until Apply. Undo is available for 10 seconds.</p>
    <div className="kate-preview-buttons">
      <button className="btn" style={{ background: colors.accent, color: colors.accentText }} disabled={applied || pending} onClick={async () => { setPending(true); try { await onApply(); } finally { setPending(false); } }}>{applied ? "Applied" : pending ? "Applying…" : "Apply"}</button>
      <button className="btn ghost" style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--line)" }} disabled={applied || pending} onClick={onChange}>Change</button>
    </div>
  </section>;
}

/** Keeps Undo on the phone when Kate closes or the customer opens Your road. */
export function useKateCustomization(persona: string, onUpdated: (home: HomeModel, snapshot: Snapshot) => void, onError: (message: string) => void) {
  const [undo, setUndo] = useState<{ token: string; expires: number; persona: string } | null>(null);
  const [remaining, setRemaining] = useState(10);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const activePersona = useRef(persona);
  activePersona.current = persona;
  useEffect(() => { setUndo(null); }, [persona]);
  useEffect(() => {
    if (!undo) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((undo.expires - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setUndo(null);
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [undo]);
  const update = async (body: Record<string, unknown>) => {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    try {
      const response = await api.command(persona, body) as Awaited<ReturnType<typeof api.command>> & { undoToken?: string };
      const fresh = await api.home(persona, "cached");
      if (activePersona.current !== persona) return false;
      onUpdated(fresh.home, response.snapshot);
      setUndo(response.undoToken ? { token: response.undoToken, persona, expires: Date.now() + 10_000 } : null);
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not apply the preview. Please try again.");
      return false;
    } finally { pending.current = false; setBusy(false); }
  };
  return {
    command: update,
    apply: (proposal: Proposal) => update({ type: "kate_apply", proposal }),
    undoBar: undo?.persona === persona ? <div className="kate-undo" role="status"><span>Changes applied <small>· {remaining}s</small></span><button disabled={busy} onClick={() => update({ type: "kate_undo", token: undo.token })}>Undo</button></div> : null,
  };
}

export type LookCommand = (body: Record<string, unknown>) => Promise<boolean>;

/** compact fits the in-place Home editor; the full card fits More → Look. */
export function KateLooksCard({ snapshot, onCommand, compact = false }: { snapshot: Snapshot; onCommand: LookCommand; compact?: boolean }) {
  if (compact) return <YourLooks snapshot={snapshot} onCommand={onCommand} />;
  return <section className="kate-looks-card" aria-label="Theme card">
    <div className="kate-looks-heading"><span>Theme: {snapshot.theme?.name ?? "KBC"}<small>{snapshot.theme ? "Made with Kate" : "Your KBC look"}</small></span>
      {snapshot.theme && <button type="button" className="chip" onClick={() => onCommand({ type: "look_switch", id: "kbc" })}>KBC look</button>}
    </div>
    <YourLooks snapshot={snapshot} onCommand={onCommand} />
  </section>;
}

/** Shared by the theme card and the Kate sheet; saved swatches are direct choices. */
export function YourLooks({ snapshot, onCommand }: { snapshot: Snapshot; onCommand: LookCommand }) {
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  const saved = snapshot.looks ?? [];
  const target = saved.find((look) => look.id === selected) ?? saved[0];
  const choices = [{ id: "kbc", name: "KBC", bg: "#050b16", accent: "#00aeef" }, ...saved.map((look) => ({ id: look.id, name: look.theme.name, bg: look.theme.colors.bg, accent: look.theme.colors.accent }))];
  const run = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try { if (await onCommand(body)) { setAction(null); setMenu(false); } }
    finally { setBusy(false); }
  };
  return <div className="kate-looks" aria-label="Your looks">
    <div className="kate-looks-heading"><span>Your looks</span>{saved.length > 0 && <button type="button" className="iconbtn sm" aria-label="Manage looks" aria-expanded={menu} onClick={() => { setMenu(!menu); setAction(null); }}>···</button>}</div>
    <div className="kate-look-swatches">
      {choices.map((look) => <button key={look.id} type="button" className="kate-look-swatch" title={look.name} aria-label={`Use ${look.name} look`} aria-pressed={snapshot.activeLookId === look.id} disabled={busy}
        onPointerDown={() => { held.current = false; timer.current = setTimeout(() => { held.current = true; setHint(look.id); }, 500); }}
        onPointerUp={() => clearTimeout(timer.current)} onPointerLeave={() => clearTimeout(timer.current)} onPointerCancel={() => clearTimeout(timer.current)}
        onClick={() => { if (held.current) { held.current = false; return; } setHint(look.id); void run({ type: "look_switch", id: look.id }); }}>
        <span aria-hidden="true" style={{ background: `linear-gradient(145deg, ${look.bg} 48%, ${look.accent} 49%)` }}>{snapshot.activeLookId === look.id ? "✓" : ""}</span>
        <small>{look.name}</small>
      </button>)}
    </div>
    {hint && <div className="kate-look-hint" role="status">{choices.find((look) => look.id === hint)?.name}</div>}
    {menu && target && <div className="kate-look-menu" aria-label="Manage saved look">
      <label>Saved look<select aria-label="Saved look" value={target.id} onChange={(e) => { setSelected(e.target.value); setAction(null); }}>{saved.map((look) => <option key={look.id} value={look.id}>{look.theme.name}</option>)}</select></label>
      {!action ? <div className="kate-look-actions"><button type="button" className="chip" onClick={() => { setName(target.theme.name); setAction("rename"); }}>Rename</button><button type="button" className="chip" onClick={() => setAction("delete")}>Delete</button></div> : <>
        {action === "rename" ? <label>New name<input aria-label="Look name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} /></label> : <p>Delete “{target.theme.name}”?{snapshot.activeLookId === target.id ? " Your app will return to the KBC look." : ""}</p>}
        <div className="kate-look-actions"><button type="button" className="chip" disabled={busy || (action === "rename" && !name.trim())} onClick={() => run({ type: action === "rename" ? "look_rename" : "look_delete", id: target.id, name, confirm: true })}>{action === "rename" ? "Confirm rename" : "Confirm delete"}</button><button type="button" className="chip" disabled={busy} onClick={() => setAction(null)}>Cancel</button></div>
      </>}
    </div>}
  </div>;
}

/** Styles live with the new UI so the shared home stylesheet needs no edits. */
export function KatePreviewStyles() {
  return <style>{`
.kate-looks-card{margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:18px}.kate-looks-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:13px}.kate-looks-heading small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.kate-looks{min-width:0;margin-top:8px}.kate-sheet>.kate-looks{padding:0 16px 8px;margin-top:0;flex-shrink:0;border-bottom:1px solid var(--line)}.kate-look-swatches{display:flex;gap:6px;overflow-x:auto;padding:4px 0;scrollbar-width:thin}.ph .kate-look-swatch{background:transparent;border:1px solid transparent;border-radius:10px;min-width:52px;max-width:64px;flex-shrink:0;padding:4px;color:var(--text);cursor:pointer}.ph .kate-look-swatch[aria-pressed=true]{border-color:var(--accent)}.kate-look-swatch>span{width:30px;height:30px;display:grid;place-items:center;margin:auto;border-radius:50%;border:1px solid var(--muted);color:#fff;text-shadow:0 1px 3px #000,0 0 4px #000;font-size:18px}.kate-look-swatch small{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}.kate-look-hint{font-size:11px;color:var(--muted)}.kate-look-menu{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:var(--bg);font-size:13px}.kate-look-menu label{display:grid;gap:5px}.kate-look-menu :is(input,select){box-sizing:border-box;width:100%;min-height:40px;border-radius:8px;padding:6px;background:var(--surface);color:var(--text);border:1px solid var(--line);font:inherit}.kate-look-menu p{line-height:1.4}.kate-look-actions{display:flex;gap:8px;margin-top:8px}.ph .kate-look-actions button{min-height:40px}.ph.st-large .kate-look-swatch small{font-size:12px}
.kate-preview{padding:14px;border:1px solid var(--line,#2a3b55);border-radius:20px;background:var(--surface,#0f1828);display:grid;gap:10px;color:var(--text,#e8eef6)}
.kate-preview-label{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted,#b1c0d3)}
.kate-preview-summary{display:flex;gap:12px;align-items:center}.kate-preview-summary ul{margin:0;padding-left:17px;font-size:14px;line-height:1.5;flex:1}
.kate-mini-phone{width:66px;min-width:66px;height:112px;padding:8px 6px;border:1px solid;border-radius:13px;display:flex;flex-direction:column;gap:5px;font-size:8px;text-align:center;box-sizing:border-box}.kate-mini-phone>div{border-radius:4px;padding:5px 0}.kate-mini-phone .kate-mini-fixed{padding:0;font-size:7px}
.kate-preview-safety,.kate-preview-note{margin:0;font-size:12px;line-height:1.45;color:var(--muted,#b1c0d3)}
.kate-preview-tracker{border-radius:12px;padding:11px;display:grid;gap:4px}.kate-preview-tracker small{font-size:11px}.kate-preview-tracker strong{font-size:14px;font-weight:600}
.kate-preview-buttons{display:flex;gap:8px}.kate-preview-buttons button{flex:1;min-height:44px}.kate-preview-buttons button:last-child{flex:.65}
.kate-quick-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 16px}.ph .kate-quick-chips button{min-height:40px;font-size:12px;padding:8px 10px}
.kate-undo{position:absolute;bottom:90px;left:22px;right:22px;z-index:60;display:flex;gap:10px;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid #60748c;background:#132438;color:#f4f7fb;border-radius:16px;box-shadow:0 8px 32px #0008;font:500 14px system-ui}.kate-undo small{color:#bfd0e2}.kate-undo button{border:0;background:#4cc3f2;color:#092438;border-radius:12px;min-height:44px;padding:0 16px;font:600 14px system-ui;cursor:pointer}
.ph,.ph :is(.block,.kate-sheet,.intent,.dock,button),.road-layer,.road-layer :is(.phone,.phone-body){transition:background-color 450ms ease,color 450ms ease,border-color 450ms ease}
.ph.st-large .kate-preview :is(p,li,small){font-size:15px}.ph.st-large .kate-quick-chips button{font-size:15px;min-height:44px}
@media(prefers-reduced-motion:reduce){.ph,.ph *,.road-layer,.road-layer *{transition:none!important}}
`}</style>;
}
