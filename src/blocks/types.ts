import type { ReactNode } from "react";

/** iOS-style widget footprint. sm = 1×1 tile, md = 2×1, lg = 2×2. */
export type BlockSize = "sm" | "md" | "lg";

/** Content depth, independent of size and of accessibility. */
export type BlockTier = "essential" | "standard" | "expert";

export type BlockGroup =
  | "core"
  | "everyday"
  | "life"
  | "travel"
  | "wealth"
  | "prize";

export interface BlockRenderProps {
  size: BlockSize;
  tier: BlockTier;
  /** Large-text accessibility mode: bigger type and targets at every tier. */
  largeText: boolean;
}

/**
 * One building block. Each block ships its own mocked demo data, so the
 * gallery can render it without the engine. The engine plugs in later.
 */
export interface BlockDefinition {
  id: string;
  group: BlockGroup;
  title: string;
  /** One line: what it is for and who sees it. */
  description: string;
  /** Sizes this block supports; the gallery renders each one. */
  sizes: BlockSize[];
  render: (props: BlockRenderProps) => ReactNode;
}
