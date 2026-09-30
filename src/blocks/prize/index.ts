import { createElement } from "react";
import type { BlockDefinition } from "../types";
import {
  KateSuggestions,
  PrizeCelebration,
  PutToWork,
  StartBusiness,
  TeamSplit,
} from "./widgets";

export const prizeBlocks: BlockDefinition[] = [
  {
    id: "prize-celebration",
    group: "prize",
    title: "Prize celebration",
    description: "Emma & Thomas’s €10,000 hackathon win from Spott.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(PrizeCelebration, props),
  },
  {
    id: "prize-team",
    group: "prize",
    title: "Split with the team",
    description: "Four teammates. Four equal shares. One shared win.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(TeamSplit, props),
  },
  {
    id: "prize-business",
    group: "prize",
    title: "Start a business",
    description: "A mocked first checklist for the founders’ next chapter.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(StartBusiness, props),
  },
  {
    id: "prize-work",
    group: "prize",
    title: "Put it to work",
    description:
      "An illustrative allocation, with room for today and tomorrow.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(PutToWork, props),
  },
  {
    id: "prize-kate",
    group: "prize",
    title: "Kate suggestions & Ask Kate",
    description: "Three relevant prompts and a local, scripted conversation.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(KateSuggestions, props),
  },
];
