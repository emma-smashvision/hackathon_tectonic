"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { AdaptiveSlot } from "@/lib/engine/types";
import { Icon } from "../ui";
import { WIDGET_META } from "../widgets/registry";

function IconButton({
  label,
  pressed,
  expanded,
  controls,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
      className={`inline-flex size-[max(2.25rem,calc(var(--tap)*0.8))] shrink-0 items-center justify-center rounded-full text-navy/70 transition-colors hover:bg-navy-50 hover:text-navy ${pressed ? "bg-azure-50 text-navy" : ""}`}
    >
      {children}
    </button>
  );
}

export function WidgetCard({
  slot,
  isNew,
  onTogglePin,
  onHide,
  children,
}: {
  slot: AdaptiveSlot;
  isNew: boolean;
  onTogglePin: () => void;
  onHide: () => void;
  children: ReactNode;
}) {
  const meta = WIDGET_META[slot.id];
  const [whyOpen, setWhyOpen] = useState(false);
  const titleId = useId();
  const whyId = useId();
  const whyButton = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!whyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWhyOpen(false);
        whyButton.current?.querySelector("button")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [whyOpen]);

  return (
    <section
      aria-labelledby={titleId}
      className={`relative rounded-3xl bg-white p-4 shadow-sm ring-1 transition-shadow ${isNew ? "ring-2 ring-azure shadow-azure/20 shadow-lg" : "ring-navy/10"}`}
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy">
          <Icon name={meta.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="t-title text-navy">
            {meta.title}
          </h3>
          {isNew && (
            <p className="t-small font-semibold text-azure-ink">New for you</p>
          )}
        </div>
        <div ref={whyButton} className="flex items-center">
          <IconButton
            label={`Why am I seeing ${meta.title}?`}
            expanded={whyOpen}
            controls={whyId}
            onClick={() => setWhyOpen((v) => !v)}
          >
            <Icon name="info" />
          </IconButton>
          <IconButton
            label={slot.pinned ? `Unpin ${meta.title}` : `Pin ${meta.title}`}
            pressed={slot.pinned}
            onClick={onTogglePin}
          >
            <Icon
              name="pin"
              className={slot.pinned ? "size-5 fill-current" : "size-5"}
            />
          </IconButton>
          <IconButton label={`Hide ${meta.title}`} onClick={onHide}>
            <Icon name="eye-off" />
          </IconButton>
        </div>
      </header>

      {whyOpen && (
        <section
          id={whyId}
          aria-label={`Why you see ${meta.title}`}
          className="absolute inset-x-3 top-16 z-20 rounded-2xl bg-navy p-4 text-white shadow-xl"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="t-body font-semibold">Why am I seeing this?</p>
            <button
              type="button"
              aria-label="Close explanation"
              onClick={() => setWhyOpen(false)}
              className="rounded-full p-1 hover:bg-white/10"
            >
              <Icon name="close" className="size-4" />
            </button>
          </div>
          <ul className="t-small list-disc space-y-1 pl-4 text-white/90">
            {slot.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="t-small mt-3 text-white/70">
            Not useful? Hide it — you&apos;re always in control.
          </p>
        </section>
      )}

      {children}
    </section>
  );
}
