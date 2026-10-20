import type { AreaDefinition, AreaId } from "./types";

export const AREA_CATALOGUE: readonly AreaDefinition[] = [
  { id: "home", title: "Home", subtitle: "Your place, at your pace", roadIds: ["moving-house", "first-home"], hue: "#70d7ff" },
  { id: "car", title: "Car", subtitle: "Keep your journeys covered", roadIds: ["everyday-only"], hue: "#a5a7ff" },
  { id: "family", title: "Family", subtitle: "Make plans together", roadIds: ["first-child", "everyday-only"], hue: "#ffbe91" },
  { id: "kids", title: "Kids", subtitle: "Learn and save together", roadIds: ["student-kid", "everyday-only"], hue: "#f8d77e" },
  { id: "savings", title: "Savings", subtitle: "Progress towards your own goals", roadIds: ["everyday-only"], hue: "#65dfc8" },
  { id: "investments", title: "Investments", subtitle: "Understand risk and costs", roadIds: [], hue: "#b0a2ff", educationOnly: true },
  { id: "pension", title: "Pension", subtitle: "Understand your later-life choices", roadIds: ["retirement", "first-job", "everyday-only"], hue: "#a5d8ae" },
  { id: "work", title: "Work", subtitle: "Plan for changes in working life", roadIds: ["first-job", "freelance", "job-loss"], hue: "#ffa88a" },
  { id: "abroad", title: "Abroad", subtitle: "Explore life across borders", roadIds: ["moving-abroad"], hue: "#81baff" },
  { id: "private-banking", title: "Private banking", subtitle: "Explore support for complex plans", roadIds: [], hue: "#d4c496" },
  { id: "care", title: "Care garden", subtitle: "A person first, when you are ready", roadIds: ["caring-parent", "losing-parent", "separation"], hue: "#b7c8bf", care: true },
];
export const ACTIVE_AREAS: Record<string, readonly AreaId[]> = {
  tom: ["home", "car", "savings", "work"],
  karim: ["home", "savings", "investments", "pension", "work"],
  sofie: ["home", "family", "savings", "pension"],
  lina: ["home", "family", "kids", "savings", "pension"],
  margaret: ["home", "savings", "pension"],
  nadia: ["home", "savings", "work", "care"], // r2-wu: ordinary life remains available beside optional care.
};
