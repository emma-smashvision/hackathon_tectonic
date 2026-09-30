import { createElement } from "react";
import type { BlockDefinition } from "../types";
import {
  Advisor,
  Budget,
  DirectDebits,
  DuplicatePayment,
  PaymentSafety,
} from "./widgets";

export const everydayBlocks: BlockDefinition[] = [
  {
    id: "everyday-direct-debits",
    group: "everyday",
    title: "Direct debits / domiciliëringen",
    description: "What’s due next, and what looks different.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(DirectDebits, props),
  },
  {
    id: "everyday-duplicate-payment",
    group: "everyday",
    title: "Duplicate payment alert",
    description: "A gentle nudge when the same bill may have been paid twice.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(DuplicatePayment, props),
  },
  {
    id: "everyday-payment-safety",
    group: "everyday",
    title: "Is this payment safe?",
    description: "Pause, check the payee, then decide.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(PaymentSafety, props),
  },
  {
    id: "everyday-budget",
    group: "everyday",
    title: "Budget & fixed costs",
    description: "Bills accounted for. Know what’s yours to spend.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Budget, props),
  },
  {
    id: "everyday-advisor",
    group: "everyday",
    title: "Call my advisor",
    description: "A real person, one tap away.",
    sizes: ["sm", "md", "lg"],
    render: (props) => createElement(Advisor, props),
  },
];
