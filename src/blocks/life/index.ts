import { createElement } from "react";
import type { BlockDefinition } from "../types";
import { Appointments } from "./appointments";
import { HouseFund } from "./house-fund";
import { Insurance } from "./insurance";
import { MovingChecklist } from "./moving";
import { BuyingTimeline } from "./timeline";

export const lifeBlocks: BlockDefinition[] = [
  {
    id: "life-house-fund",
    group: "life",
    title: "House fund & mortgage",
    description: "Sofie & Pieter · a first home, one step closer.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(HouseFund, props),
  },
  {
    id: "life-buying-timeline",
    group: "life",
    title: "The route to your keys",
    description: "Every milestone and document for your first home.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(BuyingTimeline, props),
  },
  {
    id: "life-appointments",
    group: "life",
    title: "People to see",
    description: "Your advisor, estate agent and notary, all in view.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Appointments, props),
  },
  {
    id: "life-insurance",
    group: "life",
    title: "A home, covered",
    description: "The cover to arrange before you collect the keys.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Insurance, props),
  },
  {
    id: "life-moving",
    group: "life",
    title: "Make your move",
    description: "Tom · five small steps to a fresh start in Leuven.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(MovingChecklist, props),
  },
];
