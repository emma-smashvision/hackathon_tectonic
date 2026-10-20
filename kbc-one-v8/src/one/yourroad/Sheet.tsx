"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { useStore } from "../../hindsight/components/store";
import { whenLabel } from "../../hindsight/engine/plan";
import { maskMoney } from "../../hindsight/engine/world";
import { plainPlanText } from "./model";

export function PlanSheet({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const [removed, setRemoved] = useState(false);
  const text = (value: string) => s.hideAmounts ? maskMoney(plainPlanText(value)) : plainPlanText(value);
  return (
    <Sheet title="Your plan" onClose={onClose}>
      <p>{s.plan.length ? "The steps you've chosen, all in one place." : "Your next steps will appear here when you prepare something."}</p>
      <p role="status" aria-live="polite" hidden={!removed}>Removed from your plan.</p>
      <ul className="yr-products">
        {s.plan.map((item) => (
          <li key={item.id}>
            <b>{text(item.title)}</b>
            <span>{text(item.detail)}</span>
            <span>
              {item.status === "booked" ? "Booked" : item.status === "set" ? "Reminder set" : item.status === "done" ? "Reviewed" : "Active"}
              {item.when ? ` · ${whenLabel(item.when)}` : ""}
              {item.product ? ` · ${text(item.product)}` : ""}
            </span>
            <button
              type="button"
              className="yr-button yr-secondary"
              style={{ marginTop: 12 }}
              aria-label={`Remove ${text(item.title)}`}
              data-remove-plan
              onClick={(event) => {
                const sheet = event.currentTarget.closest(".yr-sheet");
                s.removePlanItem(item.id);
                setRemoved(true);
                requestAnimationFrame(() => {
                  const next = sheet?.querySelector<HTMLButtonElement>("[data-remove-plan]") ?? sheet?.querySelector<HTMLButtonElement>(".yr-close");
                  next?.focus();
                });
              }}
            >Remove</button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const background = [
      ...(ref.current
        ?.closest(".road-phone")
        ?.querySelectorAll<HTMLElement>(".yr-body, .yr-footer") ?? []),
    ];
    background.forEach((el) => {
      el.inert = true;
    });
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const items = [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input, [tabindex="0"]',
        ) ?? []),
      ];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      background.forEach((el) => {
        el.inert = false;
      });
      previous?.focus();
    };
  }, []);
  return (
    <div className="yr-overlay" onClick={onClose}>
      <div
        className="yr-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="yr-sheet-title"
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <h2 id="yr-sheet-title">{title}</h2>
          <button
            className="yr-close"
            onClick={onClose}
            aria-label="Close details"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
