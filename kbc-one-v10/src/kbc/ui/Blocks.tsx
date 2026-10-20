"use client";

import type { Placed, StyleId } from "../types";
import { Icon } from "./icons";

type Props = { blocks: Placed[]; style: StyleId; onOpen: (b: Placed) => void };
const CONFIG = {
  calm: { list: "calm-field", block: "bub" },
  cards: { list: "card-grid", block: "blk tile" },
  dense: { list: "dense-list", block: "blk drow" },
  large: { list: "large-list", block: "blk lc" },
} as const;
const ROWS = { s: 0, m: 2, l: 4 } as const;

function Tag({ b }: { b: Placed }) {
  if (b.protection) return <span className="tag warn-t">Check this</span>;
  if (b.suggested) return <span className="tag">Suggested</span>;
  if (b.custom) return <span className="tag">Made with Kate</span>;
  return null;
}

function Detail({ b }: { b: Placed }) {
  if (b.list?.length && ROWS[b.size])
    return (
      <span className="block-detail">
        {b.list.slice(0, ROWS[b.size]).map((row) => (
          <span className="li" key={row.left}>
            <span>{row.left}</span>
            <span
              className={
                row.tone === "warn"
                  ? "warn-t"
                  : row.tone === "good"
                    ? "good-t"
                    : undefined
              }
            >
              {row.right}
            </span>
          </span>
        ))}
      </span>
    );
  if (b.progress !== undefined)
    return (
      <span className="prog">
        <i
          style={{
            width: `${Math.round(Math.max(0, Math.min(1, b.progress)) * 100)}%`,
          }}
        />
      </span>
    );
  if (b.bars?.length && b.size !== "s") {
    const max = Math.max(...b.bars, 1);
    return (
      <span className="minibars" aria-hidden="true">
        {b.bars.map((v, i) => (
          <i key={i} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
        ))}
      </span>
    );
  }
  return null;
}

/** One block component; size controls detail, style controls presentation,
 * and the phone's theme variables supply all colours and typography. */
function Block({
  b,
  style,
  onOpen,
}: {
  b: Placed;
  style: StyleId;
  onOpen: Props["onOpen"];
}) {
  const className = [
    CONFIG[style].block,
    b.size,
    b.tone === "warn" || b.protection ? "warn" : "",
    b.suggested && !b.protection ? "sug" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={className}
      data-block={b.id}
      data-size={b.size}
      data-style={style}
      onClick={() => onOpen(b)}
      aria-label={`${b.title}: ${b.value}. Open details`}
    >
      {style === "calm" ? (
        <>
          <span className={b.tone === "warn" ? "warn-t" : undefined}>
            <Icon name={b.icon} size={b.size === "s" ? 16 : 19} />
          </span>
          <span className="v">{b.value}</span>
          <span className="t">{b.title}</span>
        </>
      ) : style === "large" ? (
        <>
          {(b.protection || b.suggested) && <Tag b={b} />}
          <p>{b.sentence || `${b.title}: ${b.value}`}</p>
        </>
      ) : (
        <>
          <span className={style === "dense" ? "h" : "t"}>
            <span className={b.protection ? "warn-t" : undefined}>
              {b.title}
            </span>
            <Tag b={b} />
          </span>
          {style === "dense" ? (
            <span className="main">
              <span>{b.value}</span>
              {b.sub && <small>{b.sub}</small>}
            </span>
          ) : (
            <>
              <span className="v">{b.value}</span>
              {b.sub && <span className="s">{b.sub}</span>}
            </>
          )}
          <Detail b={b} />
        </>
      )}
    </button>
  );
}

export function BlockList({ blocks, style, onOpen }: Props) {
  if (!blocks.length) return null;
  return (
    <div className={CONFIG[style].list}>
      {blocks.map((b) => (
        <Block key={b.id} b={b} style={style} onOpen={onOpen} />
      ))}
    </div>
  );
}

// Existing detail sheets and previews use the same component/configuration path.
export const Calm = (props: Props) => <BlockList {...props} style="calm" />;
export const Cards = (props: Props) => <BlockList {...props} style="cards" />;
export const Dense = (props: Props) => <BlockList {...props} style="dense" />;
export const Large = (props: Props) => <BlockList {...props} style="large" />;
