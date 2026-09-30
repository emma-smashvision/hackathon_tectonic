"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { Icon, type IconName } from "@/components/ui";
import { BlockShell } from "../../shell";
import type { BlockRenderProps } from "../../types";

export function Frame({
  size,
  tier,
  largeText,
  title,
  children,
  tone = "blue",
}: BlockRenderProps & { title: string; children: ReactNode; tone?: string }) {
  return (
    <BlockShell size={size} title={title} className={`life-block life-${tone}`}>
      <div className="life-content" data-tier={tier} data-large={largeText}>
        {children}
      </div>
    </BlockShell>
  );
}

export function LifeIcon({ name }: { name: IconName }) {
  return (
    <span className="life-symbol">
      <Icon name={name} />
    </span>
  );
}

export function Action({
  children,
  onClick,
  secondary = false,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  secondary?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={`life-action${secondary ? " life-action-secondary" : ""}`}
      aria-label={label}
      onClick={onClick}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}

export function Ring({
  value,
  children,
}: {
  value: number;
  children: ReactNode;
}) {
  return (
    <div className="life-ring">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="life-ring-track" cx="50" cy="50" r="43" />
        <circle
          className="life-ring-fill"
          cx="50"
          cy="50"
          r="43"
          pathLength="100"
          strokeDasharray={`${value} 100`}
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

export function Chip({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "muted";
}) {
  return <span className={`life-chip life-chip-${tone}`}>{children}</span>;
}

export function Sheet({
  title,
  open,
  onClose,
  children,
  largeText,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  largeText: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="life-sheet"
      data-large={largeText}
      aria-labelledby={id}
      onCancel={onClose}
      onClose={onClose}
    >
      <div className="life-sheet-header">
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className="life-close"
          aria-label="Close"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
