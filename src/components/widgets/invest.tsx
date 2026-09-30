import { signedPercent } from "@/lib/engine/present";
import { formatDate, formatEur } from "@/lib/format";
import { addDays, type WidgetProps, within } from "./types";

function Row({
  name,
  value,
  ytd,
}: {
  name: string;
  value: number;
  ytd: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="t-body block truncate font-semibold text-navy">
          {name}
        </span>
        <span className="t-small block text-navy/65">{formatEur(value)}</span>
      </span>
      <span
        className={`t-body shrink-0 font-bold tabular-nums ${ytd >= 0 ? "text-ok" : "text-bad"}`}
      >
        {signedPercent(ytd)}
      </span>
    </li>
  );
}

export function PerformersWidget({ profile, variant }: WidgetProps) {
  const holdings = [...(profile.customer.holdings ?? [])].sort(
    (a, b) => b.ytd - a.ytd,
  );
  const well = holdings.filter((h) => h.ytd >= 0);
  const badly = holdings.filter((h) => h.ytd < 0);
  return (
    <div className="space-y-3">
      <div>
        <h4 className="t-small font-semibold text-navy/70">
          Doing well this year
        </h4>
        <ul className="divide-y divide-navy/10">
          {(variant === "detailed" ? well : well.slice(0, 2)).map((h) => (
            <Row key={h.name} {...h} />
          ))}
        </ul>
      </div>
      {badly.length > 0 && (
        <div>
          <h4 className="t-small font-semibold text-navy/70">
            Doing less well
          </h4>
          <ul className="divide-y divide-navy/10">
            {badly.map((h) => (
              <Row key={h.name} {...h} />
            ))}
          </ul>
        </div>
      )}
      <p className="t-small text-navy/60">
        Information only, not advice to buy or sell.
      </p>
    </div>
  );
}

export function DividendsWidget({ profile }: WidgetProps) {
  const received = within(profile.transactions, profile.today, 90).filter(
    (t) => t.category === "investment" && t.amount > 0,
  );
  const total = received.reduce((s, t) => s + t.amount, 0);
  return (
    <div className="space-y-3">
      <p className="t-small text-navy/70">Received in the last 3 months</p>
      <p className="t-figure text-navy">{formatEur(total)}</p>
      <ul className="space-y-1.5">
        {received.map((t) => (
          <li
            key={t.id}
            className="t-small flex justify-between gap-2 text-navy"
          >
            <span>
              {t.merchant.replace(/^Dividend, /, "")}, {formatDate(t.date)}
            </span>
            <span className="font-semibold text-ok">
              +{formatEur(t.amount)}
            </span>
          </li>
        ))}
        <li className="t-small flex justify-between gap-2 text-navy/70">
          <span>
            Expected: World ETF, {formatDate(addDays(profile.today, 21))}
          </span>
          <span>about {formatEur(530)}</span>
        </li>
      </ul>
    </div>
  );
}
