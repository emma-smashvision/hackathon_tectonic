import { createElement } from "react";
import type { BlockDefinition } from "../types";
import { Dividends } from "./dividends";
import { MarketContext } from "./market-context";
import { Performers } from "./performers";
import { Portfolio } from "./portfolio";
import { Retirement } from "./retirement";
import { TaxReserve } from "./tax-reserve";

export const wealthBlocks: BlockDefinition[] = [
  {
    id: "wealth-portfolio",
    group: "wealth",
    title: "Portfolio",
    description:
      "Your investments at a glance. A closer view when you want it.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Portfolio, props),
  },
  {
    id: "wealth-performers",
    group: "wealth",
    title: "Winners & losers",
    description: "What moved your portfolio, with a little perspective.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Performers, props),
  },
  {
    id: "wealth-dividends",
    group: "wealth",
    title: "Dividends",
    description: "Income received, and the next dates in your diary.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Dividends, props),
  },
  {
    id: "wealth-market-context",
    group: "wealth",
    title: "Calm market context",
    description: "A quiet explanation for a week when markets fall.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(MarketContext, props),
  },
  {
    id: "wealth-tax-reserve",
    group: "wealth",
    title: "Tax reserve",
    description: "For Karim: a clear view of what is set aside for tax.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(TaxReserve, props),
  },
  {
    id: "wealth-retirement",
    group: "wealth",
    title: "Pension & retirement",
    description: "Your next chapter, with the important dates in order.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Retirement, props),
  },
];
