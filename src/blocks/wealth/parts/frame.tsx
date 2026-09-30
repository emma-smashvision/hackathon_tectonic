"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useId, useRef } from "react";
import { BlockShell } from "@/blocks/shell";
import type { BlockRenderProps } from "@/blocks/types";
import { Icon, type IconName } from "@/components/ui";

export function WealthFrame({
  size,
  tier,
  largeText,
  title,
  icon,
  tone = "blue",
  action,
  children,
  detail,
}: BlockRenderProps & {
  title: string;
  icon: IconName;
  tone?: "blue" | "green" | "amber";
  action: string;
  children: ReactNode;
  detail: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  return (
    <BlockShell
      size={size}
      title={title}
      className={`wealth-block wealth-${tone} wealth-${tier}${largeText ? " wealth-large-text" : ""}`}
    >
      <span className="wealth-symbol">
        <Icon name={icon} className="size-4" />
      </span>
      <div className="wealth-content">{children}</div>
      <motion.button
        type="button"
        tabIndex={0}
        className="wealth-action"
        aria-label={`${action}: ${title}`}
        aria-haspopup="dialog"
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        onClick={() => dialog.current?.showModal()}
      >
        {action}
        <span aria-hidden="true">›</span>
      </motion.button>
      <dialog ref={dialog} className="wealth-dialog" aria-labelledby={titleId}>
        <header className="wealth-dialog-header">
          <div>
            <p className="wealth-caption">Your wealth overview</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <form method="dialog">
            <button
              type="submit"
              aria-label={`Close ${title}`}
              className="wealth-close"
            >
              <Icon name="close" />
            </button>
          </form>
        </header>
        <div className="wealth-detail">{detail}</div>
        <p className="wealth-disclaimer">
          Illustrative demo data. Information only; no investment or tax advice.
        </p>
      </dialog>
    </BlockShell>
  );
}

export function Metric({
  value,
  label,
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`wealth-metric ${className}`}>
      <p className="wealth-value">{value}</p>
      {label && <p className="wealth-caption">{label}</p>}
    </div>
  );
}

export function Row({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <li className="wealth-row">
      <div>
        <span>{label}</span>
        {note && <small>{note}</small>}
      </div>
      <strong className={tone ? `wealth-${tone}` : ""}>{value}</strong>
    </li>
  );
}
