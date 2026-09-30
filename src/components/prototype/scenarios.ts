import type { IconName } from "../ui";

/** Demo characters: a persona plus the live signals that tell their story. */
export interface Scenario {
  id: string;
  persona: string;
  name: string;
  role: string;
  /** What KBC picks up on, shown as on-screen captions. */
  noticed: string[];
  /** What the home does about it, in one line. */
  outcome: string;
  signals: string[];
  /** Animated character in public/characters; falls back to an icon. */
  avatar?: string;
  /** Small corner mark to tell apart two stories of the same person. */
  badge?: IconName;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "holiday",
    avatar: "/characters/lina-lisbon.svg",
    persona: "lina",
    name: "Lina, 31",
    role: "Off to Lisbon",
    noticed: ["Flight BRU → LIS", "Card used in Lisbon"],
    outcome:
      "Her trip moves to the top: flight, card and insurance in one place.",
    signals: ["flight", "abroad"],
  },
  {
    id: "moving",
    avatar: "/characters/tom.svg",
    persona: "tom",
    name: "Tom, 29",
    role: "Moving to a new city",
    noticed: ["IKEA purchase", "Moving company", "Rent in a new city"],
    outcome: "Moving becomes the main thing, budget stays close.",
    signals: ["ikea", "mover", "rent"],
  },
  {
    id: "senior",
    avatar: "/characters/margaret.svg",
    persona: "margaret",
    name: "Margaret, 74",
    role: "Retired, likes it calm",
    noticed: ["Large text is on", "Zooms in often", "Pension every month"],
    outcome: "Bigger text, bigger buttons, fewer things on screen.",
    signals: [],
  },
  {
    id: "house",
    avatar: "/characters/sofie-pieter.svg",
    persona: "sofie",
    name: "Sofie & Pieter",
    role: "Saving for a first home",
    noticed: ["€750 to the house fund", "Mortgage simulator, 3×"],
    outcome: "Their house fund gets the spotlight.",
    signals: ["mortgage"],
  },
  {
    id: "freelancer",
    avatar: "/characters/karim.svg",
    persona: "karim",
    name: "Karim, 45",
    role: "Freelancer and investor",
    noticed: ["Irregular invoices", "Monthly investment plan"],
    outcome: "Tax reserve and portfolio up front.",
    signals: [],
  },
  {
    id: "investor",
    avatar: "/characters/marc.svg",
    persona: "marc",
    name: "Marc, 71",
    role: "Retired, checks stocks daily",
    noticed: ["Portfolio checks every day", "Age 71, still hands-on"],
    outcome: "Behaviour beats age: he gets the detailed view.",
    signals: [],
  },
  {
    id: "prize",
    persona: "emma",
    badge: "trophy",
    name: "Emma & Thomas",
    role: "Just won the hackathon",
    noticed: ["€10,000 in: hackathon prize", "One-off, not a salary"],
    outcome: "Their prize, with ideas: a holiday, a buffer or investing.",
    signals: ["prize"],
  },
];
