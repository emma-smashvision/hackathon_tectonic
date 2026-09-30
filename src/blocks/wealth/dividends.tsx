"use client";

import type { BlockRenderProps } from "@/blocks/types";
import { formatDate, formatEur } from "@/lib/format";
import { Metric, Row, WealthFrame } from "./parts/frame";

const dividends = {
  received: 1842,
  upcoming: [
    { name: "World ETF", date: "2026-10-15", amount: 286 },
    { name: "European shares", date: "2026-11-06", amount: 94 },
    { name: "Euro bonds", date: "2026-12-18", amount: 118 },
  ],
};
function Dates({ all = false }: { all?: boolean }) {
  return (
    <ul className="wealth-list">
      {dividends.upcoming.slice(0, all ? 3 : 2).map((d) => (
        <Row
          key={d.name}
          label={d.name}
          value={formatEur(d.amount)}
          note={`Expected ${formatDate(d.date)}`}
        />
      ))}
    </ul>
  );
}
export function Dividends(props: BlockRenderProps) {
  const { size, tier } = props;
  return (
    <WealthFrame
      {...props}
      title="Dividends"
      icon="wallet"
      tone="green"
      action="View income"
      detail={
        <>
          <Metric
            value={formatEur(dividends.received)}
            label="Received in 2026, after withholding tax"
          />
          <h3>Expected payments</h3>
          <Dates all />
          <p className="wealth-caption">
            Upcoming amounts are estimates before tax. Dates and amounts can
            change; payments are not guaranteed.
          </p>
        </>
      }
    >
      <Metric
        value={formatEur(dividends.received)}
        label="Received this year"
      />
      {tier !== "essential" && size === "sm" && (
        <p className="wealth-caption">Next: 15 Oct</p>
      )}
      {tier !== "essential" && size === "md" && (
        <div className="wealth-inline-note">
          <span className="wealth-date-stamp">
            <b>15</b>Oct
          </span>
          <div>
            <p className="wealth-name">{formatEur(286)} expected</p>
            <p className="wealth-caption">World ETF</p>
          </div>
        </div>
      )}
      {tier !== "essential" && size === "lg" && (
        <>
          {tier === "expert" ? (
            <p className="wealth-section-label">Expected payments</p>
          ) : (
            <div className="wealth-income-strip">
              <span className="wealth-date-stamp">
                <b>15</b>Oct
              </span>
              <div>
                <p className="wealth-name">Your next payment</p>
                <p className="wealth-caption">
                  World ETF · {formatEur(286)} estimated
                </p>
              </div>
            </div>
          )}
          <Dates all={tier === "expert"} />
          <p className="wealth-footnote">
            Upcoming payments are estimates before tax.
          </p>
        </>
      )}
    </WealthFrame>
  );
}
