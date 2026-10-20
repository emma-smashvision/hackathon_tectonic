"use client";

import type { Placed, StyleId } from "../types";
import { Icon } from "./icons";

type Props = { blocks: Placed[]; style: StyleId; onOpen: (b: Placed) => void };

const cls = (b: Placed, base: string) =>
  [
    base,
    b.size,
    b.tone === "warn" || b.protection ? "warn" : "",
    b.suggested && !b.protection ? "sug" : "",
  ]
    .filter(Boolean)
    .join(" ");

function Tag({ b }: { b: Placed }) {
  if (b.protection) return <span className="tag warn-t">Check this</span>;
  if (b.suggested) return <span className="tag">✦ Suggested</span>;
  if (b.custom) return <span className="tag">Made with Kate</span>;
  return null;
}

function Bars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <span className="minibars" aria-hidden="true">
      {values.map((v, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static chart bars
        <i key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </span>
  );
}

export function Calm({ blocks, onOpen }: Props) {
  return (
    <div className="calm-field">
      {blocks.map((b) => (
        <button
          type="button"
          key={b.id}
          className={cls(b, "bub")}
          onClick={() => onOpen(b)}
          aria-label={`${b.title}: ${b.value}. Open details`}
        >
          <span className={b.tone === "warn" ? "warn-t" : undefined}>
            <Icon name={b.icon} size={b.size === "s" ? 16 : 19} />
          </span>
          <span className="v">{b.value}</span>
          <span className="t">{b.title}</span>
        </button>
      ))}
    </div>
  );
}

export function Cards({ blocks, onOpen }: Props) {
  return (
    <div className="card-grid">
      {blocks.map((b) => (
        <button
          type="button"
          key={b.id}
          className={`blk ${cls(b, "tile")}`}
          onClick={() => onOpen(b)}
        >
          <span className="t">
            <span className={b.protection ? "warn-t" : undefined}>
              {b.title}
            </span>
            <Tag b={b} />
          </span>
          <span className="v">{b.value}</span>
          {b.sub && <span className="s">{b.sub}</span>}
          {b.size !== "s" && b.list?.length ? (
            <span style={{ marginTop: 8, display: "block" }}>
              {b.list.slice(0, b.size === "l" ? 5 : 3).map((l) => (
                <span className="li" key={l.left}>
                  <span>{l.left}</span>
                  <span
                    className={
                      l.tone === "warn"
                        ? "warn-t"
                        : l.tone === "good"
                          ? "good-t"
                          : undefined
                    }
                  >
                    {l.right}
                  </span>
                </span>
              ))}
            </span>
          ) : b.progress !== undefined ? (
            <span className="prog">
              <i style={{ width: `${Math.round(b.progress * 100)}%` }} />
            </span>
          ) : b.bars?.length ? (
            <Bars values={b.bars} />
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function Dense({ blocks, onOpen }: Props) {
  return (
    <div className="dense-list">
      {blocks.map((b) => (
        <button
          type="button"
          key={b.id}
          className={`blk ${cls(b, "drow")}`}
          onClick={() => onOpen(b)}
        >
          <span className="h">
            <span className={b.protection ? "warn-t" : undefined}>
              {b.title}
            </span>
            <Tag b={b} />
          </span>
          <span className="main">
            <span>{b.value}</span>
            {b.sub && <small>{b.sub}</small>}
          </span>
          {b.progress !== undefined && (
            <span className="prog">
              <i style={{ width: `${Math.round(b.progress * 100)}%` }} />
            </span>
          )}
          {b.list?.slice(0, 4).map((l) => (
            <span className="li" key={l.left}>
              <span>{l.left}</span>
              <span
                className={
                  l.tone === "warn"
                    ? "warn-t"
                    : l.tone === "good"
                      ? "good-t"
                      : undefined
                }
              >
                {l.right}
              </span>
            </span>
          ))}
        </button>
      ))}
    </div>
  );
}

export function Large({ blocks, onOpen }: Props) {
  return (
    <div className="large-list">
      {blocks.map((b) => (
        <button
          type="button"
          key={b.id}
          className={`blk ${cls(b, "lc")}`}
          onClick={() => onOpen(b)}
        >
          {(b.protection || b.suggested) && (
            <span style={{ display: "block", marginBottom: 6 }}>
              <Tag b={b} />
            </span>
          )}
          <p>{b.sentence}</p>
          {b.action && (
            <span
              className="btn wide"
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {b.action.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function BlockList(props: Props) {
  if (!props.blocks.length) return null;
  if (props.style === "calm") return <Calm {...props} />;
  if (props.style === "dense") return <Dense {...props} />;
  if (props.style === "large") return <Large {...props} />;
  return <Cards {...props} />;
}
