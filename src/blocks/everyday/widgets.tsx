"use client";

import { useState } from "react";
import { formatEur } from "@/lib/format";
import type { ListRow } from "../primitives";
import {
  AlertCard,
  BlockButton,
  DetailDialog,
  Donut,
  HeroNumber,
  ListRows,
  ProgressBar,
  Timeline,
  TintedIcon,
  WidgetFrame,
} from "../primitives";
import type { BlockRenderProps } from "../types";

const DEBITS = [
  {
    id: "proximus",
    icon: "phone",
    title: "Proximus",
    sub: "2 Oct · Telecom",
    amount: formatEur(67, true),
    badge: "+€12",
    tone: "amber",
  },
  {
    id: "engie",
    icon: "home",
    title: "Engie",
    sub: "5 Oct · Energy",
    amount: formatEur(84.2, true),
  },
  {
    id: "water",
    icon: "receipt",
    title: "De Watergroep",
    sub: "8 Oct · Water",
    amount: formatEur(32, true),
  },
] satisfies ListRow[];
export function DirectDebits(props: BlockRenderProps) {
  const { size, tier } = props;
  const [open, setOpen] = useState(false);
  return (
    <WidgetFrame
      {...props}
      title={size === "sm" ? "Direct debits" : "Upcoming direct debits"}
      tone="amber"
    >
      {size === "sm" ? (
        <>
          <HeroNumber value={formatEur(67)} label="Proximus · 2 Oct" />
          <span className="bp-chip" data-tone="amber">
            €12 higher
          </span>
        </>
      ) : (
        <>
          {size === "lg" && (
            <HeroNumber
              value={formatEur(183.2, true)}
              label="Scheduled in the next 8 days"
            />
          )}
          <ListRows
            rows={DEBITS.slice(
              0,
              tier === "essential" ? 1 : size === "md" ? 2 : 3,
            )}
            label="Next direct debits"
          />
          <p className="core-notice" data-tone="amber">
            Proximus €12 higher than usual
          </p>
          {size === "lg" && tier === "expert" && (
            <p className="bp-muted">
              Usually €55. Your account can cover all 3 upcoming debits.
            </p>
          )}
        </>
      )}
      <div className="core-footer">
        <BlockButton secondary onClick={() => setOpen(true)}>
          {size === "sm" ? "Review" : "Review direct debits"}
        </BlockButton>
      </div>
      {open && (
        <DetailDialog title="Domiciliëringen" onClose={() => setOpen(false)}>
          <ListRows rows={DEBITS} />
          <div className="core-notice" data-tone="amber">
            Proximus: €67 this month, usually €55.
          </div>
          <p className="bp-muted">
            Check your latest Proximus invoice for the €12 difference. These are
            scheduled payments, not yet collected.
          </p>
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}

export function DuplicatePayment(props: BlockRenderProps) {
  const { size, tier } = props;
  const [decision, setDecision] = useState<
    "review" | "kept" | "requested" | null
  >(null);
  const [open, setOpen] = useState(false);
  const resolved = decision === "kept" || decision === "requested";
  const review = () => {
    setDecision("review");
    setOpen(true);
  };
  return (
    <WidgetFrame
      {...props}
      title={resolved ? "All sorted" : "Paid twice?"}
      tone={resolved ? "green" : "amber"}
      className="core-duplicate"
    >
      {resolved ? (
        <div className="core-resolution">
          <TintedIcon name="check" tone="green" />
          <h3 className="bp-heading" role="status">
            {decision === "kept"
              ? "Marked as intentional"
              : "Refund request saved"}
          </h3>
          <p className="bp-muted">
            {decision === "kept"
              ? "We’ll keep both Engie payments."
              : "Your demo request is ready. Nothing has been sent."}
          </p>
          <BlockButton secondary onClick={() => setDecision(null)}>
            Undo
          </BlockButton>
        </div>
      ) : size === "sm" ? (
        <>
          <HeroNumber
            value={formatEur(84.2, true)}
            label="Engie · paid twice"
          />
          <p className="bp-muted">3 & 4 Sept</p>
          <BlockButton onClick={review}>Review</BlockButton>
        </>
      ) : (
        <>
          <AlertCard
            question="One bill. Two payments?"
            detail="Engie €84.20 paid twice on 3 & 4 Sept."
            primary={{ label: "Get it back", onClick: review }}
            secondary={{
              label: "It’s fine",
              onClick: () => setDecision("kept"),
            }}
          />
          {size === "lg" && tier !== "essential" && (
            <ListRows
              rows={[
                {
                  id: "first",
                  title: "3 September",
                  sub: "Direct debit",
                  amount: `−${formatEur(84.2, true)}`,
                },
                {
                  id: "second",
                  title: "4 September",
                  sub: "Bank transfer",
                  amount: `−${formatEur(84.2, true)}`,
                  badge: "Possible duplicate",
                  tone: "amber",
                },
              ]}
              label="Matching payments"
            />
          )}
          {size === "lg" && tier === "expert" && (
            <p className="bp-muted">
              Same recipient, amount and invoice reference.
            </p>
          )}
        </>
      )}
      {open && (
        <DetailDialog
          title="Review the duplicate"
          onClose={() => setOpen(false)}
        >
          <HeroNumber
            value={formatEur(84.2, true)}
            label="Potential refund from Engie"
          />
          <p className="bp-muted">
            Same invoice paid by direct debit on 3 Sept and bank transfer on 4
            Sept. Check the invoice before requesting a refund.
          </p>
          <BlockButton
            onClick={() => {
              setDecision("requested");
              setOpen(false);
            }}
          >
            Save demo refund request
          </BlockButton>
          <BlockButton
            secondary
            onClick={() => {
              setDecision("kept");
              setOpen(false);
            }}
          >
            It’s fine — keep both
          </BlockButton>
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}

export function PaymentSafety(props: BlockRenderProps) {
  const { size, tier } = props;
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  return (
    <WidgetFrame
      {...props}
      title="Payment check"
      tone="green"
      className="core-safety"
    >
      <div className="core-safety__heading">
        <TintedIcon name="shield" tone="green" />
        <h3 className="bp-heading">
          {size === "sm" ? "New payee?" : "Is this payment safe?"}
        </h3>
      </div>
      {size !== "sm" && (
        <p className="bp-muted">
          A quick check before you send to someone new.
        </p>
      )}
      {size === "lg" && tier !== "essential" && (
        <div className="core-payee">
          <span className="core-avatar">JV</span>
          <div>
            <strong>Jules Vermeulen</strong>
            <p className="bp-muted">New recipient · BE•• 9012</p>
          </div>
          <span className="bp-chip">€125</span>
        </div>
      )}
      {size === "lg" && tier !== "essential" && (
        <Timeline
          steps={[
            {
              id: "name",
              title: "Check the name",
              detail: "Does it match the account holder?",
              status: "current",
            },
            {
              id: "contact",
              title: "Confirm the request",
              detail:
                tier === "expert"
                  ? "Call using a number you already know."
                  : undefined,
              status: "upcoming",
            },
          ]}
        />
      )}
      {size === "sm" && tier === "expert" && (
        <p className="bp-muted">Check before sending.</p>
      )}
      <div className="core-footer">
        <BlockButton
          onClick={() => {
            setOpen(true);
            setChecked(false);
          }}
        >
          {size === "sm" ? "Check payee" : "Check this payment"}
        </BlockButton>
      </div>
      {open && (
        <DetailDialog title="New payee check" onClose={() => setOpen(false)}>
          <ListRows
            rows={[
              {
                id: "payee",
                title: "Jules Vermeulen",
                sub: "Account ending 9012",
                amount: "€125.00",
                icon: "user",
              },
            ]}
          />
          {checked ? (
            <div role="status" className="core-notice" data-tone="amber">
              <strong>Name matches in this demo.</strong>
              <p>
                A name match does not guarantee a safe payment. Confirm the
                request with Jules using a number you already know.
              </p>
            </div>
          ) : (
            <>
              <p className="bp-muted">
                We’ll compare the recipient name with the account holder. This
                demo uses a simulated result.
              </p>
              <BlockButton onClick={() => setChecked(true)}>
                Check name and account
              </BlockButton>
            </>
          )}
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}

const COSTS = [
  {
    id: "home",
    title: "Home & bills",
    sub: "Fixed costs",
    amount: formatEur(1240),
    icon: "home",
  },
  {
    id: "daily",
    title: "Everyday spending",
    sub: "Spent this month",
    amount: formatEur(530),
    icon: "receipt",
  },
  {
    id: "left",
    title: "Still available",
    sub: "Of your €2,500 budget",
    amount: formatEur(730),
    icon: "wallet",
    tone: "green",
  },
] satisfies ListRow[];
export function Budget(props: BlockRenderProps) {
  const { size, tier } = props;
  const [open, setOpen] = useState(false);
  return (
    <WidgetFrame {...props} title="Budget & bills" tone="green">
      <div className="core-budget__hero">
        <HeroNumber
          value={formatEur(730)}
          label={size === "sm" ? "Left this month" : "Left to spend this month"}
        />
        {size !== "sm" && tier !== "essential" && (
          <Donut
            label="Monthly budget in euros"
            segments={[
              { label: "Fixed costs", value: 1240, color: "#7fd6f7" },
              { label: "Everyday", value: 530, color: "#b5a3ff" },
              { label: "Available", value: 730, color: "#61dca3" },
            ]}
          >
            <span>
              29%<small>left</small>
            </span>
          </Donut>
        )}
      </div>
      {size === "sm" ? (
        <ProgressBar
          value={730 / 2500}
          label="Budget remaining"
          color="var(--block-ok)"
        />
      ) : tier === "essential" ? (
        <ProgressBar
          value={730 / 2500}
          label="Budget remaining"
          color="var(--block-ok)"
        />
      ) : (
        <div className="core-budget__legend">
          <span>
            <i style={{ background: "#7fd6f7" }} />
            Fixed
          </span>
          <span>
            <i style={{ background: "#b5a3ff" }} />
            Everyday
          </span>
          <span>
            <i style={{ background: "#61dca3" }} />
            Available
          </span>
        </div>
      )}
      {size === "lg" && tier !== "essential" && (
        <ListRows
          rows={COSTS.slice(0, tier === "expert" ? 3 : 2)}
          label="Budget breakdown"
        />
      )}
      {size === "lg" && tier === "essential" && (
        <p className="bp-muted">
          Your bills are accounted for. This is your space for everything else.
        </p>
      )}
      <div className="core-footer">
        <BlockButton secondary onClick={() => setOpen(true)}>
          {size === "sm" ? "My budget" : "See my budget"}
        </BlockButton>
      </div>
      {open && (
        <DetailDialog
          title="Your September budget"
          onClose={() => setOpen(false)}
        >
          <ListRows rows={COSTS} label="Monthly budget breakdown" />
          <ProgressBar value={1770 / 2500} label="Budget used" />
          <p className="bp-muted">
            €1,770 of €2,500 used. Fixed costs include rent, utilities,
            insurance and subscriptions.
          </p>
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}

export function Advisor(props: BlockRenderProps) {
  const { size, tier } = props;
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  return (
    <WidgetFrame {...props} title="Your advisor" className="core-advisor">
      <div className="core-advisor__person">
        <span className="core-avatar core-avatar--advisor" aria-hidden="true">
          SD
          <span />
        </span>
        <div>
          <h3 className="bp-heading">Sofie{size !== "sm" ? " De Smet" : ""}</h3>
          {size !== "sm" && (
            <p className="bp-muted">A familiar voice, here for you.</p>
          )}
        </div>
      </div>
      {size === "sm" && tier !== "essential" && (
        <p className="bp-muted">8 Oct · 14:30</p>
      )}
      {size === "lg" && (
        <p className="core-statement">
          Big plans.
          <br />
          Small questions.
          <br />
          Let’s talk.
        </p>
      )}
      {size !== "sm" && tier !== "essential" && (
        <div className="core-appointment">
          <TintedIcon name="calendar" />
          <div>
            <strong>8 Oct · 14:30</strong>
            <p className="bp-muted">
              {tier === "expert"
                ? "Video call · 30 min · Home plans"
                : "Your next appointment"}
            </p>
          </div>
        </div>
      )}
      <div className="core-footer">
        <BlockButton
          icon="phone"
          onClick={() => {
            setOpen(true);
            setRequested(false);
          }}
        >
          {size === "sm" ? "Call Sofie" : "Call my advisor"}
        </BlockButton>
      </div>
      {open && (
        <DetailDialog title="Talk to Sofie" onClose={() => setOpen(false)}>
          <p className="bp-muted">
            Your next appointment is a video call on 8 October at 14:30.
          </p>
          {requested ? (
            <p className="core-feedback" role="status">
              Callback saved in this demo. Sofie has not been contacted.
            </p>
          ) : (
            <>
              <p className="bp-muted">
                Prefer to talk sooner? Leave a callback request.
              </p>
              <BlockButton icon="phone" onClick={() => setRequested(true)}>
                Request a demo callback
              </BlockButton>
            </>
          )}
        </DetailDialog>
      )}
    </WidgetFrame>
  );
}
