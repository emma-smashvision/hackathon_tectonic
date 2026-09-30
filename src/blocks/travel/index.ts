import { createElement } from "react";
import type { BlockDefinition } from "../types";
import { CurrencyExchange, Esim, NearbyAtms, TripReady } from "./widgets";

export const travelBlocks: BlockDefinition[] = [
  {
    id: "travel-trip",
    group: "travel",
    title: "Trip ready",
    description: "Lina’s Lisbon essentials, all in one place.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(TripReady, props),
  },
  {
    id: "travel-currency",
    group: "travel",
    title: "Currency accounts & exchange",
    description: "Three currency pockets and a transparent demo exchange.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(CurrencyExchange, props),
  },
  {
    id: "travel-esim",
    group: "travel",
    title: "eSIM",
    description: "A proposed data plan for Lina’s week in Portugal.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Esim, props),
  },
  {
    id: "travel-atms",
    group: "travel",
    title: "Nearby ATMs",
    description: "An illustrative Lisbon map with clear ATM fees.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(NearbyAtms, props),
  },
];
