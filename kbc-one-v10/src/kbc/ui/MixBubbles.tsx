"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { bubbleLabel, fitBubbleCluster } from "../home-mix";
import type { Placed } from "../types";
import { Icon } from "./icons";

export type MixBubble = { key: string; block: Placed; suggestion?: string };

/** The v1 drifting field, with the same glass, seeded layout and gentle motion. */
export function MixBubbles({ bubbles, large, editing, onOpen, onRemove, onReorder, onAdd, canAdd, focus, onVisibleCount }: {
  bubbles: MixBubble[];
  large: boolean;
  editing: boolean;
  onOpen: (bubble: MixBubble) => void;
  onRemove: (id: string) => void;
  onReorder: (from: string, to: string) => void;
  onAdd?: () => void;
  canAdd?: boolean;
  focus: string | null;
  onVisibleCount?: (count: number) => void;
}) {
  const field = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 342, height: 260 });
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const [moving, setMoving] = useState<{ id: string; x: number; y: number } | null>(null);
  useEffect(() => {
    if (!field.current) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(field.current);
    return () => observer.disconnect();
  }, []);
  const { count, sizes, positions } = fitBubbleCluster(bubbles.map(b => b.block), box.width, box.height, large);
  useEffect(() => { onVisibleCount?.(count); }, [count, onVisibleCount]);
  const addSpot = Array.from({ length: 49 }, (_, i) => ({
    x: 30 + (i % 7) / 6 * Math.max(0, box.width - 60),
    y: 30 + Math.floor(i / 7) / 6 * Math.max(0, box.height - 60),
  })).sort((a, b) => {
    const room = (p: { x: number; y: number }) => Math.min(...positions.map((c, i) => Math.hypot(c.x * box.width - p.x, c.y * box.height - p.y) - sizes[i] / 2));
    return room(b) - room(a);
  })[0];
  return <div ref={field} className={`mix-field ${editing ? "is-editing" : ""}`} aria-label="Your home bubbles" style={onVisibleCount ? undefined : { height: Math.max(290, Math.ceil(bubbles.length / 2) * 170) }}>
    {bubbles.slice(0, count).map((bubble, i) => {
      const b = bubble.block;
      const editable = editing && !bubble.suggestion;
      const amp = large ? 2 : 3 + i % 3;
      const style = {
        width: sizes[i], height: sizes[i], "--bubble-size": `${sizes[i]}px`, left: `${positions[i].x * 100}%`, top: `${positions[i].y * 100}%`,
        "--fx": `${i % 2 === 0 ? amp : -amp}px`, "--fy": `${i % 2 === 0 ? -amp - 2 : amp + 2}px`,
        "--float-time": `${(large ? 14 : 8) + i}s`, "--float-delay": `${i * .5}s`,
        "--drag-x": `${moving?.id === b.id ? moving.x : 0}px`, "--drag-y": `${moving?.id === b.id ? moving.y : 0}px`,
      } as CSSProperties;
      return <div key={bubble.key} className="mix-float" style={style} data-bubble-id={editable ? b.id : undefined}
        data-moving={moving?.id === b.id} data-editable={editable} data-dimmed={focus !== null && focus !== bubble.key}>
        <button type="button" className="mix-bubble" data-block={b.id} data-primary={i === 0} data-tone={b.tone}
          data-suggestion={bubble.suggestion} aria-label={`${b.title}: ${b.value}${bubble.suggestion ? ", suggested" : ""}. ${editable ? "Drag to reorder, or use left and right arrow keys" : "Open details"}`}
          onClick={() => { if (!editing) onOpen(bubble); }}
          onKeyDown={e => {
            if (!editable || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
            e.preventDefault();
            const owned = bubbles.filter(x => !x.suggestion);
            const index = owned.findIndex(x => x.block.id === b.id);
            const to = owned[index + (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1)];
            if (to) onReorder(b.id, to.block.id);
          }}
          onPointerDown={e => {
            if (!editable || e.button !== 0) return;
            drag.current = { id: b.id, x: e.clientX, y: e.clientY, moved: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => {
            if (!drag.current || drag.current.id !== b.id) return;
            const x = e.clientX - drag.current.x, y = e.clientY - drag.current.y;
            if (Math.hypot(x, y) > 8) drag.current.moved = true;
            if (drag.current.moved) setMoving({ id: b.id, x, y });
          }}
          onPointerUp={e => {
            if (drag.current?.id === b.id && drag.current.moved) {
              const targets = [...field.current!.closest(".home-mix")!.querySelectorAll<HTMLElement>("[data-bubble-id]")]
                .filter(el => el.dataset.bubbleId !== b.id).map(el => {
                  const rect = el.getBoundingClientRect();
                  return { id: el.dataset.bubbleId!, distance: Math.hypot(e.clientX - rect.x - rect.width / 2, e.clientY - rect.y - rect.height / 2) };
                }).sort((a, b) => a.distance - b.distance);
              if (targets[0]?.distance < 100) onReorder(b.id, targets[0].id);
            }
            drag.current = null; setMoving(null);
          }}
          onPointerCancel={() => { drag.current = null; setMoving(null); }}>
          {b.id === "roadmap" ? <>
            <span className="road-ring" aria-hidden="true" />
            <svg className="road-fork" viewBox="0 0 64 30" aria-hidden="true">
              <path d="M4 22 H20 C30 22 32 8 44 8 H60" className="road-fork-pick" />
              <path d="M20 22 H60" className="road-fork-other" />
              <circle cx="20" cy="22" r="4" className="road-fork-you" />
            </svg>
            <span className="road-kicker">Your next level</span>
            <span className="mix-value">{b.value}</span>
            <span className="mix-label">{bubbleLabel(b)}</span>
          </> : <>
          <Icon name={b.icon} size={large ? 23 : 18} />
          <span className="mix-value">{b.value.replace(/^(\d+) payments?$/, "$1")}</span>
          <span className="mix-label">{bubbleLabel(b)}</span>
          </>}
          {bubble.suggestion && <span className="mix-spark" aria-hidden="true"><Icon name="spark" size={12} /></span>}
        </button>
        {editable && <button type="button" className="mix-remove" aria-label={`Remove ${b.title}`} onClick={() => onRemove(b.id)}>×</button>}
      </div>;
    })}
    {editing && onAdd && <button type="button" className="mix-add" style={{ left: addSpot.x - 29, top: addSpot.y - 29 }} disabled={!canAdd} onClick={onAdd} aria-label={canAdd ? "Add a bubble" : "Six bubbles maximum"}>+ Add</button>}
  </div>;
}
