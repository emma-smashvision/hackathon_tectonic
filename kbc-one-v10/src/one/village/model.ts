import { PEOPLE } from "../people";
import { lessonsFor } from "../learning/lessons";
import type { Plot, Village } from "./types";

/** Amount-free summaries honour privacy without inferring holdings or wealth. */
export function villageFor(personaId: string): Village {
  const person = Object.hasOwn(PEOPLE, personaId) ? PEOPLE[personaId] : undefined;
  if (!person) return { personaId, name: "Your village", plots: [], playable: false };
  const world = person.world;
  const plot = (kind: Plot["kind"], title: string, subtitle: string, overview: Plot["overview"]): Plot => ({ id: `${personaId}:${kind}`, kind, title, subtitle, overview });
  const plots: Plot[] = [
    plot("home", "Home", personaId === "tom" ? "Moving from Leuven to Gent" : person.household.household, [
      { label: "Home", value: person.household.household },
      { label: "Home cover", value: world?.home?.insurance?.label ?? person.household.cover.find(c => c.id === "home")?.note ?? "Not available" },
      { label: "Next payment", value: "See your account for the next payment" },
    ]),
    plot("car", "Car", world?.car?.label ?? "No car details available", [
      { label: "Vehicle", value: world?.car?.label ?? "Not available" },
      { label: "Insurance", value: world?.car?.insurance?.label ?? "Not available" },
    ]),
    plot("savings", "Savings & investments", "Your accounts and goals", [
      { label: "Savings", value: person.household.pots.map(p => p.label).join(", ") || "Not available" },
      { label: "Goals", value: person.household.goals.map(g => g.label).join(", ") || "No saved goals" },
      { label: "Investments", value: world?.holdings.map(h => h.name).join(", ") || "No investment details available" },
    ]),
    plot("pension", "Pension", world?.pension ? "Pension saving" : "Your pension overview", [
      { label: "Pension", value: world?.pension ? "Pension saving is recorded in your account" : person.household.incomes.some(i => i.id === "pension") ? "Pension income is recorded in your account" : "Not available" },
    ]),
  ];
  // A fifth building needs known family/business context; the host uses an empty slot as a garden.
  if (personaId === "karim") plots.push(plot("business", "Business", "Freelance designer", [
    { label: "Work", value: person.persona.line },
    { label: "Reserve", value: person.household.goals.map(goal => goal.label).join(", ") || "Not available" },
    { label: "Adviser", value: person.advisor?.name ?? "Not available" },
  ]));
  else if (personaId === "sofie" || world?.child) plots.push(plot("family", "Family", world?.child ? `With ${world.child.name}` : "Sofie & Pieter", [
    { label: "Household", value: person.household.household },
    ...(world?.child ? [{ label: "Child account", value: `${world.child.name}’s pocket money` }] : [{ label: "Shared goal", value: person.household.goals.map(goal => goal.label).join(", ") || "Not available" }]),
    { label: "Adviser", value: person.advisor?.name ?? "Not available" },
  ]));
  const lessons = lessonsFor(personaId);
  const titles: Record<string, [string, string]> = {
    tom: ["New flat in Gent", "Learn 3 moving lessons to build your flat in Gent"],
    karim: ["Your workshop", "Learn a freelance lesson to build your workshop"],
    sofie: ["Your family courtyard", "Learn an energy lesson to build your family courtyard"],
    lina: ["Your winter garden", "Learn a December lesson to build your winter garden"],
    margaret: ["Your village garden", "Learn about your yearly energy bill"],
  };
  return { personaId, name: personaId === "sofie" ? "Sofie & Pieter’s village" : `${person.persona.name}’s village`, plots,
    playable: personaId !== "nadia" && !person.noGame,
    ...(lessons.length ? { destination: { id: `${personaId}:destination`, roadId: lessons[0].roadId, title: titles[personaId][0], goal: titles[personaId][1], lessonIds: lessons.map(l => l.id) } } : {}),
  };
}
