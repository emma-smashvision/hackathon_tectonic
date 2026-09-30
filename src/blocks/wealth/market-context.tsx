"use client";

import type { BlockRenderProps } from "@/blocks/types";
import { WealthFrame } from "./parts/frame";

const market = {
  weeklyChange: "−4%",
  period: "This week",
  context:
    "Markets fell 4% this week. Drops like this have happened before, and recovery times have varied.",
};
export function MarketContext(props: BlockRenderProps) {
  const { size, tier } = props;
  return (
    <WealthFrame
      {...props}
      title="Market context"
      icon="info"
      action="Get context"
      detail={
        <>
          <p className="wealth-context-title">
            A wider view of a difficult week.
          </p>
          <p>{market.context}</p>
          <p>
            Over past market cycles, declines have ranged from brief setbacks to
            longer downturns. Some recoveries took months; others took years.
          </p>
          <p>
            A weekly market move does not describe every investment. Your
            portfolio can move differently depending on what it holds.
          </p>
          <p className="wealth-caption">
            This is an illustrative market scenario, not a live market report.
            History does not tell us what happens next.
          </p>
        </>
      }
    >
      {size === "sm" ? (
        <>
          <p className="wealth-value">{market.weeklyChange}</p>
          <p className="wealth-caption">Markets this week</p>
          {tier !== "essential" && (
            <p className="wealth-caption">A little perspective.</p>
          )}
        </>
      ) : (
        <>
          <div className="wealth-market-heading">
            <span className="wealth-market-mark" aria-hidden="true">
              ≈
            </span>
            <p className="wealth-context-title">A moment for perspective.</p>
          </div>
          <p className="wealth-body">
            {tier === "essential"
              ? "Markets fell 4% this week."
              : market.context}
          </p>
        </>
      )}
      {size === "lg" && tier !== "essential" && (
        <>
          <div className="wealth-perspective">
            <p>One week</p>
            <span aria-hidden="true" />
            <p>A longer story</p>
          </div>
          <p className="wealth-body">
            A fall is part of the market’s history. Its size and duration are
            different each time.
          </p>
          {tier === "expert" && (
            <p className="wealth-body">
              Your mix of shares and bonds can behave differently from the wider
              market.
            </p>
          )}
          <p className="wealth-footnote">
            History is context, not a forecast. Information only.
          </p>
        </>
      )}
    </WealthFrame>
  );
}
