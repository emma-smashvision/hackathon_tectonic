"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { BlockShell } from "@/blocks/shell";
import type { BlockRenderProps } from "@/blocks/types";
import { Icon, type IconName } from "@/components/ui";

export function Widget({
  children,
  title,
  icon,
  tone = "blue",
  ...props
}: BlockRenderProps & {
  children: ReactNode;
  title: string;
  icon: IconName;
  tone?: string;
}) {
  return (
    <BlockShell
      size={props.size}
      title={title}
      className={`tp-widget tp-${tone} ${props.largeText ? "tp-large" : ""} tp-tier-${props.tier}`}
    >
      <span className="tp-symbol" aria-hidden="true">
        <Icon name={icon} />
      </span>
      {children}
    </BlockShell>
  );
}

export function Action({
  children,
  onClick,
  disabled = false,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      className="tp-action"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      whileTap={{ scale: reduced ? 1 : 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.button>
  );
}

export function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="tp-detail">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export function Status({ children }: { children: ReactNode }) {
  return (
    <p className="tp-status" role="status">
      <Icon name="check" />
      {children}
    </p>
  );
}
