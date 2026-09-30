"use client";

import { motion, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  BUBBLE_FIELD,
  bubbleSize,
  type Direction,
  layoutBubbles,
  type presentHomepage,
} from "@/lib/engine/present";
import type { AdaptiveWidgetId, Density, NeedId } from "@/lib/engine/types";
import { Icon, type IconName } from "../ui";
import { WIDGET_META } from "../widgets/registry";

type Home = ReturnType<typeof presentHomepage>;

export interface FieldBubble {
  key: string;
  kind: "widget" | "question";
  id?: AdaptiveWidgetId;
  need?: NeedId;
  label: string;
  value: string;
  icon: IconName;
  size: number;
  direction: Direction;
  nudge: boolean;
  pinned: boolean;
}

/** Bubbles plus the one low-confidence question, in display order. */
export function fieldBubbles(home: Home, density: Density): FieldBubble[] {
  return [
    ...home.bubbles.map((b) => ({
      key: b.id,
      kind: "widget" as const,
      id: b.id,
      label: b.label,
      value: b.value,
      icon: WIDGET_META[b.id].icon,
      size: b.size,
      direction: b.direction,
      nudge: b.nudge,
      pinned: b.pinned,
    })),
    ...home.questions.map((q) => ({
      key: `q-${q.need}`,
      kind: "question" as const,
      need: q.need,
      label: q.question,
      value: "You tell us",
      icon: "sparkle" as IconName,
      size: bubbleSize(0.3, density),
      direction: "neutral" as Direction,
      nudge: true,
      pinned: false,
    })),
  ];
}

/** Stable id shared by a bubble and the sheet it morphs into. */
export const morphId = (key: string) => `bubble-${key}`;

/**
 * Floating, drifting info bubbles, after InvestSuite's FloatingBubbles:
 * sqrt-weight sizing, deterministic seeds relaxed until nothing overlaps,
 * a CSS `bubbleFloat` drift per bubble, and highlight/dim while one opens.
 */
export function BubbleField({
  bubbles,
  density,
  focus,
  hideFocused,
  onTap,
}: {
  bubbles: FieldBubble[];
  density: Density;
  /** Key of the bubble being opened: it grows, the others dim and pause. */
  focus: string | null;
  /** While the sheet is open the focused bubble lives in the sheet instead. */
  hideFocused: boolean;
  onTap: (bubble: FieldBubble) => void;
}) {
  const field = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(340);
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const height = BUBBLE_FIELD[density];
  const positions = layoutBubbles(
    bubbles.map((b) => b.size),
    width,
    height,
    density === "simple" ? 12 : 8,
  );
  const slow = density === "simple";

  return (
    <section
      ref={field}
      className="bubble-field"
      data-zone="adaptive"
      aria-label="For you now"
      style={{ height }}
    >
      {bubbles.map((bubble, i) => {
        const pos = positions[i];
        const highlighted = focus === bubble.key;
        const dimmed = focus !== null && !highlighted;
        const amp = slow ? 2 : 3 + (i % 3);
        const style = {
          width: bubble.size,
          height: bubble.size,
          left: `${pos.x * 100}%`,
          top: `${pos.y * 100}%`,
          "--fx": `${i % 2 === 0 ? amp : -amp}px`,
          "--fy": `${i % 2 === 0 ? -amp - 2 : amp + 2}px`,
          animationDuration: `${(slow ? 14 : 8) + i}s`,
          animationDelay: `${(i * 0.5).toFixed(1)}s`,
          animationPlayState: focus ? "paused" : "running",
        } as CSSProperties;
        if (highlighted && hideFocused)
          return (
            <span
              key={bubble.key}
              className="float-bubble float-bubble-ghost"
              style={style}
              aria-hidden="true"
            />
          );
        return (
          <motion.button
            key={bubble.key}
            layoutId={morphId(bubble.key)}
            type="button"
            className="float-bubble"
            data-primary={i === 0}
            data-kind={bubble.kind}
            data-direction={bubble.direction}
            data-widget={bubble.id}
            style={{ ...style, x: "-50%", y: "-50%", borderRadius: 999 }}
            aria-label={
              bubble.kind === "widget"
                ? `${bubble.label}: ${bubble.value}${bubble.pinned ? ", pinned" : ""}${bubble.nudge ? ", needs attention" : ""}. Open details`
                : `${bubble.label} Tell us`
            }
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              scale: highlighted ? 1.2 : 1,
              opacity: dimmed ? 0.25 : 1,
            }}
            whileHover={{ scale: highlighted ? 1.2 : 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => onTap(bubble)}
          >
            <Icon name={bubble.icon} className="float-bubble-icon" />
            <span className="float-bubble-value">{bubble.value}</span>
            <span className="float-bubble-label">{bubble.label}</span>
            {bubble.pinned && <Icon name="pin" className="float-bubble-pin" />}
            {bubble.nudge && <span className="nudge-dot" aria-hidden="true" />}
          </motion.button>
        );
      })}
      {bubbles.length === 0 && (
        <p className="t-body absolute inset-x-0 top-1/2 text-center text-white/70">
          A little space for you. Ask Kate whenever you need a hand.
        </p>
      )}
    </section>
  );
}

/** Compact strip of the same bubbles while a sheet is open (InvestSuite's BubbleStrip). */
export function BubbleStrip({
  bubbles,
  active,
  onTap,
}: {
  bubbles: FieldBubble[];
  active: string | null;
  onTap: (bubble: FieldBubble) => void;
}) {
  const strip = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [edges, setEdges] = useState({ start: false, end: false });
  const bubbleKeys = bubbles.map((bubble) => bubble.key).join("|");

  useEffect(() => {
    const element = strip.current;
    if (!element || !bubbleKeys) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY))
        return;
      event.preventDefault();
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? element.clientWidth
            : 1;
      element.scrollBy({ left: event.deltaY * unit, behavior: "instant" });
    };
    let listening = false;
    const measure = () => {
      const max = element.scrollWidth - element.clientWidth;
      const overflowing = max > 1;
      setEdges({
        start: element.scrollLeft > 1,
        end: element.scrollLeft < max - 1,
      });
      if (overflowing === listening) return;
      listening = overflowing;
      if (listening)
        element.addEventListener("wheel", wheel, { passive: false });
      else element.removeEventListener("wheel", wheel);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
      element.removeEventListener("wheel", wheel);
    };
  }, [bubbleKeys]);

  useEffect(() => {
    if (!active) return;
    strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [active, reduced]);

  return (
    <nav
      ref={strip}
      aria-label="Switch between your items"
      className="bubble-strip"
      data-overflow={edges.start || edges.end}
      data-fade-start={edges.start}
      data-fade-end={edges.end}
    >
      {bubbles.map((b) => (
        <motion.button
          key={b.key}
          type="button"
          className="bubble-strip-item"
          aria-current={b.key === active ? "true" : undefined}
          title={b.label}
          whileTap={reduced ? undefined : { scale: 0.9 }}
          onClick={() => onTap(b)}
        >
          <Icon name={b.icon} className="size-4 shrink-0" />
          <span className="truncate">{b.label}</span>
        </motion.button>
      ))}
    </nav>
  );
}
