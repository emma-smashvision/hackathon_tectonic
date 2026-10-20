import { expect, test } from "bun:test";
import { PEOPLE } from "@/one/people";
import { buildPlaces, createDemoState, moveToGoal } from "@/one/places/model";
import { worldFor } from "../model";
import { withPlaceProgress } from "./placeProgress";

test("a local allocation fills Home and Savings without changing source finances or stored lessons", () => {
  const person = PEOPLE.tom;
  const demo = createDemoState(person);
  const world = worldFor("tom");
  const source = JSON.stringify({ person, world });
  const account = demo.accounts.find(item => item.id !== "current" && !item.locked && item.balance >= 50)!;
  const changed = moveToGoal(demo, account.id, demo.goals[0].id, 50);
  expect(changed.error).toBeUndefined();
  const shown = withPlaceProgress(world, buildPlaces(person, changed.state));
  for (const id of ["home", "savings"]) {
    const old = world.areas.find(area => area.id === id)!;
    const next = shown.areas.find(area => area.id === id)!;
    expect(next.finance.goals[0].saved).toBe(old.finance.goals[0].saved + 50);
    expect(next.finance.percent).toBeGreaterThanOrEqual(old.finance.percent!);
    expect(next.completed).toBe(old.completed);
  }
  expect(JSON.stringify({ person, world })).toBe(source);
});

test("opening places preserves the model's finance summary and mortgage progress", () => {
  for (const id of ["tom", "karim", "sofie", "lina"]) {
    const world = worldFor(id);
    const shown = withPlaceProgress(world, buildPlaces(PEOPLE[id]));
    expect(shown.areas).toEqual(world.areas);
  }
});
