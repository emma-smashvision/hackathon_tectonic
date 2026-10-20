"use client";

import { useMemo, useState } from "react";
import { euro, int, pct } from "../../engine/format";
import { K_MIN } from "../../engine/gate";
import { forkStats } from "../../engine/simulate";
import { useReport, useStore } from "../store";
import { G, Icon } from "../ui";
import { BackBar } from "./StopView";

export function ForkView() {
  const { road, journey, chooseFork } = useStore();
  const fork = road.fork;
  const [horizon, setHorizon] = useState<1 | 3>(1);
  const [likeYou, setLikeYou] = useState(true);
  const stats = useMemo(
    () =>
      fork
        ? forkStats(road, fork, horizon, likeYou ? { bufferBand: road.persona.bufferBand, incomeBand: road.persona.incomeBand } : null)
        : null,
    [road, fork, horizon, likeYou],
  );
  useReport(stats?.decisions ?? []);
  if (!fork || !stats) return null;
  const chosen = journey.forkChoice[fork.id];
  const anyHeld = stats.branches.some((b) => b.metrics.some((m) => !m.value.shown));

  return (
    <div className={`screen detail ${road.care ? "care" : ""}`}>
      <BackBar />
      <div className="stack-6">
        <div className="kicker">CROSSROADS · MONTH {fork.month}</div>
        <h1 className="detail-title">{fork.title}</h1>
        <p className="muted small lh">{fork.intro}</p>
      </div>

      <svg width="350" height="70" viewBox="0 0 350 70" aria-hidden="true" className="fork-svg">
        <path d="M175 70 C175 44,175 38,90 10 L70 0" className="fork-bed" />
        <path d="M175 70 C175 44,175 38,260 10 L280 0" className="fork-bed" />
        <path d="M175 70 C175 44,175 38,90 10 L70 0" className="fork-a" />
        <path d="M175 70 C175 44,175 38,260 10 L280 0" className="fork-b" />
        <circle cx="175" cy="62" r="7" className="fork-you" />
      </svg>

      <div className="seg" role="group" aria-label="Time after the choice">
        <button type="button" aria-pressed={horizon === 1} onClick={() => setHorizon(1)}>
          1 year later
        </button>
        <button type="button" aria-pressed={horizon === 3} onClick={() => setHorizon(3)}>
          3 years later
        </button>
      </div>
      <div className="seg" role="group" aria-label="Who to compare with">
        <button type="button" aria-pressed={likeYou} onClick={() => setLikeYou(true)}>
          People like me
        </button>
        <button type="button" aria-pressed={!likeYou} onClick={() => setLikeYou(false)}>
          Everyone
        </button>
      </div>
      <div className="xs muted">
        {likeYou ? `${int(stats.n)} people with a similar buffer and income` : `All ${int(stats.n)} drivers of this road`}
      </div>

      <div className="fork-grid">
        {fork.branches.map((br, i) => {
          const bs = stats.branches[i];
          return (
            <div key={br.id} className={`fork-col ${i === 0 ? "a" : "b"} ${chosen === br.id ? "chosen" : ""}`}>
              <div>
                <div className="fork-name">{br.label}</div>
                <div className="mono xs muted">{int(bs.n)} people</div>
              </div>
              {bs.metrics.map((m) => (
                <div key={m.key}>
                  <div className="xs muted">{m.label}</div>
                  <div className="fork-val">
                    <G
                      g={m.value}
                      fmt={(v) => (m.kind === "pct" ? pct(v) : m.kind === "delta" ? `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(Math.round(v))}%` : euro(v))}
                      fallback="—"
                    />
                  </div>
                </div>
              ))}
              <button type="button" className={`btn small ${chosen === br.id ? "done" : "ghost"}`} aria-pressed={chosen === br.id} onClick={() => chooseFork(fork.id, br.id)}>
                {chosen === br.id ? (
                  <>
                    <Icon name="check" size={14} /> My road
                  </>
                ) : (
                  "Leaning this way"
                )}
              </button>
            </div>
          );
        })}
      </div>

      {anyHeld && (
        <div className="held-box">
          Some numbers are hidden: fewer than {K_MIN} people like you took that road. Switch to “Everyone” to see the whole crowd.
        </div>
      )}

      <figure className="note-card outline">
        <blockquote>“{fork.branches[horizon === 1 ? 1 : 0].quote.text}”</blockquote>
        <figcaption>
          <span>{fork.branches[horizon === 1 ? 1 : 0].quote.by}</span>
        </figcaption>
      </figure>
    </div>
  );
}
