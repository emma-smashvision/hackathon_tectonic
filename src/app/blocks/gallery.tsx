"use client";

import { useState } from "react";
import "@/blocks/blocks.css";
import { BLOCK_GROUPS } from "@/blocks/registry";
import type { BlockTier } from "@/blocks/types";

const TIERS: BlockTier[] = ["essential", "standard", "expert"];

export function BlockGallery() {
  const [tier, setTier] = useState<BlockTier>("standard");
  const [largeText, setLargeText] = useState(false);

  return (
    <main
      className="blocks-root mx-auto max-w-6xl px-4 py-10"
      data-large-text={largeText}
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Building blocks
          </h1>
          <p className="text-sm opacity-70">
            Every block in every size. Switch tier and large text to compare.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              aria-pressed={tier === t}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ring-1 ring-white/15 ${tier === t ? "bg-white text-navy" : "hover:bg-white/10"}`}
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLargeText((v) => !v)}
            aria-pressed={largeText}
            className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-white/15 ${largeText ? "bg-white text-navy" : "hover:bg-white/10"}`}
          >
            Large text
          </button>
        </div>
      </header>

      {BLOCK_GROUPS.map((group) => (
        <section
          key={group.id}
          className="mb-12"
          aria-labelledby={`g-${group.id}`}
        >
          <h2 id={`g-${group.id}`} className="mb-4 text-lg font-semibold">
            {group.title}
            <span className="ml-2 text-sm font-normal opacity-50">
              {group.blocks.length} blocks
            </span>
          </h2>
          {group.blocks.length === 0 ? (
            <p className="text-sm opacity-50">In progress…</p>
          ) : (
            <div className="flex flex-col gap-8">
              {group.blocks.map((block) => (
                <article key={block.id} id={block.id}>
                  <h3 className="text-sm font-medium">{block.title}</h3>
                  <p className="mb-3 text-xs opacity-60">{block.description}</p>
                  <div className="flex flex-wrap items-start gap-[var(--block-gap)] overflow-x-auto">
                    {block.sizes.map((size) => (
                      <div key={size}>
                        {block.render({ size, tier, largeText })}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}
