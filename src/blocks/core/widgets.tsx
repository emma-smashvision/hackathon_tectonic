"use client";

import { useState } from "react";
import type { IconName } from "@/components/ui";
import { formatEur } from "@/lib/format";
import type { ListRow } from "../primitives";
import {
  ActionRow,
  BlockButton,
  DetailDialog,
  HeroNumber,
  ListRows,
  Sparkline,
  TintedIcon,
  WidgetFrame,
} from "../primitives";
import type { BlockRenderProps } from "../types";

const BALANCE = 2840.65;
const POCKETS = [
  {
    id: "eur",
    title: "Euro",
    sub: "Everyday account",
    amount: formatEur(BALANCE, true),
    badge: "EUR",
    icon: "wallet",
  },
  {
    id: "gbp",
    title: "Pound sterling",
    sub: "Ready for London",
    amount: "£320.00",
    badge: "GBP",
    icon: "plane",
  },
  {
    id: "jpy",
    title: "Japanese yen",
    sub: "A little further afield",
    amount: "¥24,500",
    badge: "JPY",
    icon: "plane",
  },
] satisfies ListRow[];

export function Balance(props: BlockRenderProps) {
  const { size, tier } = props;
  const [open, setOpen] = useState(false);
  const detailed = tier !== "essential";
  return (
    <WidgetFrame {...props} title="Your balance" className="core-balance">
      <div className="core-balance__top">
        <HeroNumber
          value={formatEur(BALANCE, true)}
          label={
            size === "sm" ? "Available" : "Available in your everyday account"
          }
        />
        {size !== "sm" && <TintedIcon name="wallet" />}
      </div>
      {size === "sm" && tier === "expert" && (
        <span className="bp-muted">EUR · •• 4821</span>
      )}
      {size !== "sm" && detailed && (
        <section className="core-pockets" aria-label="Currency pockets">
          {POCKETS.map((pocket) => (
            <div key={pocket.id}>
              <span className="bp-muted">{pocket.badge}</span>
              <strong>{pocket.amount}</strong>
            </div>
          ))}
        </section>
      )}
      {size === "lg" && detailed && (
        <div className="core-balance__insight">
          <div className="core-between">
            <span className="bp-muted">
              {detailed ? "This month" : "Room for your everyday"}
            </span>
            <span className="bp-chip" data-tone="green">
              +{formatEur(340)}
            </span>
          </div>
          <Sparkline
            values={[2100, 2300, 2200, 2520, 2400, 2630, 2600, 2840]}
            label="Euro balance rose from €2,100 to €2,840 this month"
          />
          {tier === "expert" && (
            <div className="core-between bp-muted">
              <span>In {formatEur(3250)}</span>
              <span>Out {formatEur(2910)}</span>
            </div>
          )}
        </div>
      )}
      <div className="core-footer">
        <BlockButton
          onClick={() => setOpen(true)}
          icon={size === "sm" ? undefined : "wallet"}
        >
          {size === "sm" ? "Account" : "View account"}
        </BlockButton>
      </div>
      {open && (
        <DetailDialog title="Your accounts" onClose={() => setOpen(false)}>
          <ListRows rows={POCKETS} label="Account balances" />
          <p className="bp-muted">Everyday account · ending 4821</p>
          <p className="bp-muted">
            Available balance includes {formatEur(42.5, true)} in pending card
            payments.
          </p>
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}

const SHORTCUTS: { label: string; icon: IconName; detail: string }[] = [
  {
    label: "Pay",
    icon: "qr",
    detail:
      "Scan a payment code with your camera, or choose a saved recipient.",
  },
  {
    label: "Transfer",
    icon: "send",
    detail:
      "Move money from your everyday account to one of your own accounts.",
  },
  {
    label: "To savings",
    icon: "wallet",
    detail: "Your rainy-day savings account has €4,250.00 available.",
  },
  {
    label: "Split a bill",
    icon: "user",
    detail: "Choose a recent payment and share the amount with friends.",
  },
];
export function QuickActions(props: BlockRenderProps) {
  const { size, tier } = props;
  const [selected, setSelected] = useState<(typeof SHORTCUTS)[number] | null>(
    null,
  );
  const [preview, setPreview] = useState(false);
  const actions = SHORTCUTS.slice(
    0,
    size === "sm" || tier === "essential" ? 2 : tier === "standard" ? 3 : 4,
  );
  return (
    <WidgetFrame {...props} title="Quick actions" className="core-quick">
      {size === "lg" && (
        <div className="core-quick__intro">
          <TintedIcon name="send" />
          <h3 className="core-statement">
            A little less admin.
            <br />A little more day.
          </h3>
          <p className="bp-muted">Your everyday moves, one tap away.</p>
        </div>
      )}
      <ActionRow
        actions={actions.map((action) => ({
          ...action,
          onClick: () => {
            setSelected(action);
            setPreview(false);
          },
        }))}
      />
      {size !== "sm" && tier === "expert" && (
        <p className="bp-muted core-note">
          Your shortcuts, in the order you use them.
        </p>
      )}
      {selected && (
        <DetailDialog title={selected.label} onClose={() => setSelected(null)}>
          <p className="bp-muted">{selected.detail}</p>
          {preview ? (
            <p className="core-feedback" role="status">
              Demo ready. No money has moved.
            </p>
          ) : (
            <>
              <ListRows
                rows={[
                  {
                    id: "from",
                    icon: "wallet",
                    title: "Everyday account",
                    sub: "From · ending 4821",
                    amount: formatEur(BALANCE, true),
                  },
                ]}
              />
              <BlockButton onClick={() => setPreview(true)}>
                Try this action
              </BlockButton>
            </>
          )}
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}

const ACTIVITY = [
  {
    id: "coffee",
    icon: "receipt",
    title: "MOK Coffee",
    sub: "Today, 09:41 · Card",
    amount: `−${formatEur(4.8, true)}`,
  },
  {
    id: "groceries",
    icon: "box",
    title: "Delhaize",
    sub: "Yesterday · Card",
    amount: `−${formatEur(46.32, true)}`,
  },
  {
    id: "salary",
    icon: "arrow-up-right",
    title: "Salary",
    sub: "28 Sept · Transfer",
    amount: `+${formatEur(3250, true)}`,
    tone: "green",
  },
  {
    id: "train",
    icon: "qr",
    title: "SNCB / NMBS",
    sub: "27 Sept · Mobile",
    amount: `−${formatEur(12.4, true)}`,
  },
] satisfies ListRow[];
export function RecentActivity(props: BlockRenderProps) {
  const { size, tier } = props;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const rows = ACTIVITY.filter(
    (row) =>
      filter === "all" ||
      (filter === "in" ? row.id === "salary" : row.id !== "salary"),
  );
  return (
    <WidgetFrame {...props} title="Recent activity">
      {size === "sm" ? (
        <>
          <HeroNumber value={`−${formatEur(4.8, true)}`} label="MOK Coffee" />
          {tier === "expert" && <p className="bp-muted">Today · Card</p>}
        </>
      ) : (
        <>
          {size === "lg" && tier === "expert" && (
            <fieldset className="core-filters" aria-label="Filter activity">
              {(["all", "in", "out"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? "All"
                    : value === "in"
                      ? "Money in"
                      : "Money out"}
                </button>
              ))}
            </fieldset>
          )}
          <ListRows
            rows={rows.slice(
              0,
              tier === "essential"
                ? 1
                : size === "md"
                  ? 2
                  : tier === "expert"
                    ? 4
                    : 3,
            )}
            label="Recent transactions"
          />
        </>
      )}
      <div className="core-footer">
        <BlockButton secondary onClick={() => setOpen(true)}>
          {size === "sm" ? "Activity" : "All activity"}
        </BlockButton>
      </div>
      {open && (
        <DetailDialog title="September activity" onClose={() => setOpen(false)}>
          <ListRows rows={ACTIVITY} label="All recent transactions" />
          <p className="bp-muted">All payments shown are completed.</p>
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}
