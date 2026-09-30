import { formatEur } from "@/lib/format";
import { Button, Icon } from "../ui";
import type { WidgetProps } from "./types";

export function BalanceWidget({ profile, density }: WidgetProps) {
  const { customer } = profile;
  return (
    <section
      aria-labelledby="core-balance"
      className="rounded-3xl bg-navy p-5 text-white shadow-lg shadow-navy/20"
    >
      <h2 id="core-balance" className="t-small font-medium text-white/80">
        Current account
      </h2>
      <p className="t-figure mt-1">{formatEur(customer.balance, true)}</p>
      <p className="t-small mt-3 text-white/80">
        {density === "simple" ? "Savings" : "Savings account"}:{" "}
        <span className="font-semibold text-white">
          {formatEur(customer.savings)}
        </span>
      </p>
    </section>
  );
}

export function QuickPayWidget({ density }: WidgetProps) {
  const simple = density === "simple";
  return (
    <section aria-label="Pay and transfer" className="grid grid-cols-2 gap-2">
      <Button className="w-full">
        <Icon name="send" />
        Transfer
      </Button>
      <Button tone="secondary" className="w-full">
        <Icon name="qr" />
        {simple ? "Pay" : "Scan & pay"}
      </Button>
    </section>
  );
}
