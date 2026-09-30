"use client";

import type { BlockRenderProps } from "@/blocks/types";
import { formatEur } from "@/lib/format";
import { Ring } from "./parts/charts";
import { Metric, Row, WealthFrame } from "./parts/frame";

const tax = { reserved: 8400, target: 12000, income: 40000, rate: 30 };
export function TaxReserve(props: BlockRenderProps) {
  const { size, tier } = props;
  const gap = tax.target - tax.reserved;
  return (
    <WealthFrame
      {...props}
      title="Tax reserve"
      icon="receipt"
      tone="amber"
      action="View estimate"
      detail={
        <>
          <Metric
            value={formatEur(tax.reserved)}
            label={`Reserved of ${formatEur(tax.target)} estimated target`}
          />
          <ul className="wealth-list">
            <Row
              label="Estimated taxable income"
              value={formatEur(tax.income)}
            />
            <Row label="Planning percentage" value={`${tax.rate}%`} />
            <Row label="Estimated target" value={formatEur(tax.target)} />
            <Row label="Already reserved" value={formatEur(tax.reserved)} />
            <Row label="Estimated gap" value={formatEur(gap)} />
          </ul>
          <p className="wealth-caption">
            A simple demo estimate: €40,000 × 30%. It excludes personal
            deductions and other taxes. This reserve is not a tax payment; the
            final amount depends on your tax assessment.
          </p>
        </>
      }
    >
      <Metric
        value={formatEur(tax.reserved)}
        label={
          tier !== "essential" && size !== "sm"
            ? `of ${formatEur(tax.target)} estimated`
            : "Set aside for tax"
        }
      />
      {tier !== "essential" && (
        <>
          {size !== "sm" && (
            <div className="wealth-tax-ring">
              <Ring
                value={70}
                label="Tax reserve: 70% of the estimated target, €8,400 of €12,000"
              />
            </div>
          )}
          {size === "sm" && <p className="wealth-caption">70% of target</p>}
        </>
      )}
      {tier !== "essential" && size === "lg" && (
        <>
          <div className="wealth-gap">
            <p className="wealth-caption">Estimated gap</p>
            <p className="wealth-gap-value">{formatEur(gap)}</p>
          </div>
          <p className="wealth-body">
            Your reserve is separate from your everyday balance.
          </p>
          {tier === "expert" && (
            <ul className="wealth-list">
              <Row
                label="Estimated taxable income"
                value={formatEur(tax.income)}
              />
              <Row label="Planning percentage" value="30%" />
            </ul>
          )}
          <p className="wealth-footnote">An estimate, not a tax bill.</p>
        </>
      )}
      {tier === "expert" && size === "md" && (
        <p className="wealth-caption">Gap: {formatEur(gap)}</p>
      )}
    </WealthFrame>
  );
}
