"use client";

import type { BlockRenderProps } from "@/blocks/types";
import { formatEur } from "@/lib/format";
import { Ring, Sparkline } from "./parts/charts";
import { Metric, Row, WealthFrame } from "./parts/frame";

const portfolio = {
  value: 248560,
  today: 1973,
  holdings: [
    { name: "World ETF", amount: 149136, share: "60%", note: "Global shares" },
    {
      name: "Euro bonds",
      amount: 62140,
      share: "25%",
      note: "Government & company bonds",
    },
    {
      name: "European shares",
      amount: 37284,
      share: "15%",
      note: "European companies",
    },
  ],
};

function Holdings({ detailed = false }: { detailed?: boolean }) {
  return (
    <ul className="wealth-list">
      {portfolio.holdings.map((h) => (
        <Row
          key={h.name}
          label={h.name}
          value={detailed ? formatEur(h.amount) : h.share}
          note={detailed ? `${h.share} · ${h.note}` : undefined}
        />
      ))}
    </ul>
  );
}

export function Portfolio(props: BlockRenderProps) {
  const { size, tier } = props;
  const overview = tier !== "essential";
  return (
    <WealthFrame
      {...props}
      title="Portfolio"
      icon="chart"
      action="View portfolio"
      detail={
        <>
          <Metric
            value={formatEur(portfolio.value)}
            label="Total portfolio value"
          />
          <p className="wealth-positive">
            +0.8% today · +{formatEur(portfolio.today)}
          </p>
          <Sparkline expanded />
          <Holdings detailed />
          <p className="wealth-caption">
            Demo snapshot, 30 September 2026, 16:30. Values can rise or fall.
            Returns shown before fees and taxes.
          </p>
        </>
      }
    >
      <div className="wealth-summary">
        <Metric
          value={formatEur(portfolio.value)}
          label={overview ? undefined : "Your investments"}
        />
        {overview && (
          <p className="wealth-change wealth-positive">
            +0.8% <span>today</span>
          </p>
        )}
      </div>
      {overview && size === "md" && (
        <div className="wealth-mini-chart">
          <Sparkline />
        </div>
      )}
      {overview && size === "lg" && (
        <>
          <Sparkline expanded />
          <div className="wealth-chart-label">
            <span>1 Sep</span>
            <span>30 Sep</span>
          </div>
          <div className="wealth-allocation">
            <Ring
              value={60}
              allocation
              label="Allocation: 60% global shares, 25% euro bonds, 15% European shares"
            />
            <div className="wealth-legend">
              <span>
                <i />
                Global shares 60%
              </span>
              <span>
                <i />
                Bonds 25%
              </span>
              <span>
                <i />
                Europe 15%
              </span>
            </div>
          </div>
          <Holdings detailed={tier === "expert"} />
        </>
      )}
      {tier === "expert" && size !== "lg" && (
        <p className="wealth-caption">
          {size === "sm"
            ? "3 holdings"
            : `+${formatEur(portfolio.today)} today · 3 holdings`}
        </p>
      )}
    </WealthFrame>
  );
}
