import { coreBlocks } from "./core";
import { everydayBlocks } from "./everyday";
import { lifeBlocks } from "./life";
import { prizeBlocks } from "./prize";
import { travelBlocks } from "./travel";
import type { BlockDefinition, BlockGroup } from "./types";
import { wealthBlocks } from "./wealth";

export const BLOCK_GROUPS: {
  id: BlockGroup;
  title: string;
  blocks: BlockDefinition[];
}[] = [
  { id: "core", title: "Always there", blocks: coreBlocks },
  { id: "everyday", title: "Everyday money", blocks: everydayBlocks },
  { id: "life", title: "Life moments", blocks: lifeBlocks },
  { id: "travel", title: "Travel", blocks: travelBlocks },
  { id: "wealth", title: "Wealth", blocks: wealthBlocks },
  { id: "prize", title: "Prize & Kate", blocks: prizeBlocks },
];
