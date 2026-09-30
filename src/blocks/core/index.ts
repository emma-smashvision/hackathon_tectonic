import { createElement } from "react";
import type { BlockDefinition } from "../types";
import { Balance, QuickActions, RecentActivity } from "./widgets";

export const coreBlocks: BlockDefinition[] = [
  {
    id: "core-balance",
    group: "core",
    title: "Balance",
    description: "Your everyday balance, with room for other currencies.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Balance, props),
  },
  {
    id: "core-quick-actions",
    group: "core",
    title: "Quick actions",
    description: "Pay, transfer and the little things you do most.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(QuickActions, props),
  },
  {
    id: "core-recent-activity",
    group: "core",
    title: "Recent activity",
    description: "A clear view of what came in and went out.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(RecentActivity, props),
  },
];
