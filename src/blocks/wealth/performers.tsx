"use client";

import { useState } from "react";
import type { BlockRenderProps } from "@/blocks/types";
import { Row, WealthFrame } from "./parts/frame";

const performers = [
  { name: "World ETF", change: 14, context: "Global shares led your gains." },
  { name: "Euro bonds", change: 3, context: "Bonds added a smaller gain." },
  {
    name: "European shares",
    change: -9,
    context: "European shares trailed your other holdings.",
  },
];
const changeLabel = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(n)}%`;

function PerformanceDetails() {
  const [order, setOrder] = useState("best");
  const sorted = [...performers].sort((a, b) =>
    order === "best" ? b.change - a.change : a.change - b.change,
  );
  return (
    <>
      <label className="wealth-select-label">
        Show first
        <select value={order} onChange={(e) => setOrder(e.target.value)}>
          <option value="best">Highest return</option>
          <option value="lowest">Lowest return</option>
        </select>
      </label>
      <ul className="wealth-list">
        {sorted.map((p) => (
          <Row
            key={p.name}
            label={p.name}
            value={`${changeLabel(p.change)} YTD`}
            note={p.context}
            tone={p.change > 0 ? "positive" : "negative"}
          />
        ))}
      </ul>
      <p className="wealth-caption">
        YTD means since 1 January 2026. These are percentage returns, not each
        holding’s contribution in euros. Before fees and taxes.
      </p>
    </>
  );
}

export function Performers(props: BlockRenderProps) {
  const { size, tier } = props;
  return (
    <WealthFrame
      {...props}
      title="Winners & losers"
      icon="list"
      tone="green"
      action="Compare"
      detail={<PerformanceDetails />}
    >
      <div className="wealth-performer">
        {size !== "sm" && <p className="wealth-caption">Top performer</p>}
        <p className="wealth-value wealth-positive">
          +14%<span className="wealth-unit"> YTD</span>
        </p>
        <p className="wealth-name">World ETF</p>
      </div>
      {tier !== "essential" && size !== "sm" && (
        <div className="wealth-laggard">
          <p className="wealth-caption">Laggard</p>
          <strong className="wealth-negative">−9% YTD</strong>
          <p className="wealth-caption">European shares</p>
        </div>
      )}
      {tier !== "essential" && size === "sm" && (
        <p className="wealth-caption">
          Lowest <span className="wealth-negative">−9% YTD</span>
        </p>
      )}
      {tier !== "essential" && size === "lg" && (
        <>
          <p className="wealth-body">
            Global shares led your gains. European shares had a weaker year.
          </p>
          {tier === "expert" && (
            <>
              <p className="wealth-caption">Highest to lowest · since 1 Jan</p>
              <ul className="wealth-list">
                {performers.map((p) => (
                  <Row
                    key={p.name}
                    label={p.name}
                    value={changeLabel(p.change)}
                    tone={p.change > 0 ? "positive" : "negative"}
                  />
                ))}
              </ul>
            </>
          )}
          <p className="wealth-footnote">
            Past performance does not predict future returns.
          </p>
        </>
      )}
    </WealthFrame>
  );
}
