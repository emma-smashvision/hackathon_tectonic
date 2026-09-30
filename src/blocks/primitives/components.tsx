"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { BlockShell } from "../shell";
import type { BlockRenderProps } from "../types";

export type Tone = "blue" | "green" | "amber" | "red";
export type PrimitiveAction = {
  label: string;
  onClick: () => void;
  icon?: IconName;
};

/** Numbers may count up; formatted strings stay exact (including currency). */
export function HeroNumber({
  value,
  label,
  delta,
  tone = "green",
  countUp = false,
  format = String,
}: {
  value: string | number;
  label: string;
  delta?: string;
  tone?: Tone;
  countUp?: boolean;
  format?: (value: number) => string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (typeof value !== "number" || !countUp || reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: setDisplay,
    });
    return () => controls.stop();
  }, [value, countUp, reduce]);
  return (
    <div className="bp-hero">
      <div className="bp-hero__value">
        {typeof display === "number" ? format(display) : display}
      </div>
      <div className="bp-muted">{label}</div>
      {delta && (
        <span className="bp-chip" data-tone={tone}>
          {delta}
        </span>
      )}
    </div>
  );
}

export function BlockButton({
  children,
  onClick,
  secondary = false,
  icon,
  disabled = false,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
  label?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={`bp-button${secondary ? " bp-button--secondary" : ""}`}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 450, damping: 30 }}
    >
      {icon && <Icon name={icon} />}
      <span>{children}</span>
    </motion.button>
  );
}

/** Sets local accessibility tokens too, so render(props) works outside the gallery. */
export function WidgetFrame({
  size,
  tier,
  largeText,
  title,
  tone = "blue",
  className = "",
  children,
}: BlockRenderProps & {
  title: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="core-widget"
      data-large-text={largeText}
      data-tier={tier}
      data-tone={tone}
    >
      <BlockShell
        size={size}
        title={title}
        className={`core-shell ${className}`}
      >
        {children}
      </BlockShell>
    </div>
  );
}

export function TintedIcon({
  name,
  tone = "blue",
}: {
  name: IconName;
  tone?: Tone;
}) {
  return (
    <span className="bp-symbol" data-tone={tone}>
      <Icon name={name} />
    </span>
  );
}

export function Countdown({
  days,
  date,
  label = "to go",
}: {
  days: number;
  date: string;
  label?: string;
}) {
  return (
    <div className="bp-countdown">
      <HeroNumber
        value={Math.max(0, Math.ceil(days))}
        label={`days ${label}`}
      />
      <time dateTime={date} className="bp-chip">
        {formatDate(date)}
      </time>
    </div>
  );
}

export interface ListRow {
  id: string;
  icon?: IconName;
  title: string;
  sub?: string;
  amount?: string;
  badge?: string;
  tone?: Tone;
}
export function ListRows({
  rows,
  label = "Overview",
}: {
  rows: ListRow[];
  label?: string;
}) {
  return (
    <ul className="bp-list" aria-label={label}>
      {rows.map((row) => (
        <li key={row.id} className="bp-list__row">
          {row.icon && <TintedIcon name={row.icon} tone={row.tone} />}
          <div className="bp-list__copy">
            <span className="bp-list__title">{row.title}</span>
            {row.sub && <span className="bp-muted">{row.sub}</span>}
          </div>
          {(row.amount || row.badge) && (
            <div className="bp-list__end">
              {row.amount && (
                <span className="bp-money" data-tone={row.tone}>
                  {row.amount}
                </span>
              )}
              {row.badge && (
                <span className="bp-chip" data-tone={row.tone}>
                  {row.badge}
                </span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AlertCard({
  question,
  detail,
  primary,
  secondary,
  tone = "amber",
}: {
  question: string;
  detail?: string;
  primary: PrimitiveAction;
  secondary: PrimitiveAction;
  tone?: Tone;
}) {
  return (
    <div className="bp-alert" data-tone={tone}>
      <TintedIcon name="shield" tone={tone} />
      <h3 className="bp-heading">{question}</h3>
      {detail && <p className="bp-muted">{detail}</p>}
      <div className="bp-alert__actions">
        <BlockButton onClick={primary.onClick}>{primary.label}</BlockButton>
        <BlockButton secondary onClick={secondary.onClick}>
          {secondary.label}
        </BlockButton>
      </div>
    </div>
  );
}

export function ActionRow({
  actions,
}: {
  actions: (PrimitiveAction & { icon: IconName })[];
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className="bp-actions"
      style={{ "--action-count": Math.min(4, actions.length) } as CSSProperties}
    >
      {actions.map((action) => (
        <motion.button
          type="button"
          key={action.label}
          className="bp-action"
          aria-label={action.label}
          onClick={action.onClick}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 450, damping: 30 }}
        >
          <span>
            <Icon name={action.icon} />
          </span>
          <span>{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export interface TimelineStep {
  id: string;
  title: string;
  detail?: string;
  status: "done" | "current" | "upcoming";
}
export function Timeline({
  steps,
  label = "Your next steps",
}: {
  steps: TimelineStep[];
  label?: string;
}) {
  return (
    <ol className="bp-timeline" aria-label={label}>
      {steps.map((step) => (
        <li
          key={step.id}
          data-status={step.status}
          aria-current={step.status === "current" ? "step" : undefined}
        >
          <span className="bp-timeline__dot" aria-hidden="true">
            {step.status === "done" ? <Icon name="check" /> : null}
          </span>
          <div>
            <div className="bp-list__title">
              {step.title}
              <span className="sr-only"> — {step.status}</span>
            </div>
            {step.detail && <p className="bp-muted">{step.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Native modal traps focus; cleanup restores the opener after React unmounts. */
export function DetailDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="bp-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <div className="bp-dialog__header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="bp-close"
          aria-label="Close details"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
      <p className="bp-dialog__demo">Demo preview · synthetic account data</p>
    </dialog>
  );
}
