"use client";

import type { BlockRenderProps } from "@/blocks/types";
import { WealthFrame } from "./parts/frame";

const retirement = {
  days: 142,
  milestones: [
    {
      date: "25 Jan 2027",
      title: "Last salary",
      note: "Your final monthly salary",
    },
    {
      date: "1 Feb 2027",
      title: "Pension starts",
      note: "First pension month",
    },
    {
      date: "19 Feb 2027",
      title: "Group insurance payout",
      note: "Expected funds available",
    },
  ],
};
function Timeline({ detailed = false }: { detailed?: boolean }) {
  return (
    <ol className="wealth-timeline">
      {retirement.milestones.map((m) => (
        <li key={m.title}>
          <span className="wealth-timeline-dot" aria-hidden="true" />
          <div>
            <p className="wealth-caption">{m.date}</p>
            <p className="wealth-name">{m.title}</p>
            {detailed && <p className="wealth-caption">{m.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
export function Retirement(props: BlockRenderProps) {
  const { size, tier } = props;
  return (
    <WealthFrame
      {...props}
      title="Retirement"
      icon="calendar"
      action="View timeline"
      detail={
        <>
          <p className="wealth-context-title">
            142 days until your retirement money is available.
          </p>
          <Timeline detailed />
          <p className="wealth-caption">
            Countdown from the demo date, 30 September 2026, to an expected
            group insurance payout on 19 February 2027. Dates are illustrative
            and subject to confirmation.
          </p>
        </>
      }
    >
      <p className="wealth-value wealth-countdown">
        {retirement.days}
        <span className="wealth-unit"> days</span>
      </p>
      <p className="wealth-caption">
        {size === "sm"
          ? "Until your payout"
          : "Until your retirement money is available"}
      </p>
      {tier !== "essential" && size === "md" && (
        <p className="wealth-retirement-date">
          19 February 2027 <span>Expected payout</span>
        </p>
      )}
      {tier !== "essential" && size === "lg" && (
        <Timeline detailed={tier === "expert"} />
      )}
      {tier === "expert" && size === "sm" && (
        <p className="wealth-caption">19 Feb 2027</p>
      )}
    </WealthFrame>
  );
}
