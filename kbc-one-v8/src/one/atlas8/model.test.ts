import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { PEOPLE } from "../people";
import { AllRoads } from "./AllRoads";
import { atlasCatalogue, matchRoads, roadBadge } from "./model";
import { scaleMeasurements } from "./ScaleAtlas";

describe("All roads contract", () => {
  test("first-house phrase resolves to the published First home road", () => {
    expect(matchRoads("we just bought our first house").matches[0]?.id).toBe("first-home");
  });
  test("unknown situations never create a road or publish the review road", () => {
    expect(matchRoads("I am adopting a dragon").matches).toEqual([]);
    expect(matchRoads("heat pump").matches).toEqual([]);
    expect(matchRoads("heat pump").nearby[0]?.published).toBe(false);
  });
  test("badges preserve the confirmed road, previews and completed roads", () => {
    const road = (id: string) => atlasCatalogue.find(r => r.id === id)!;
    expect(roadBadge(road("moving-house"), PEOPLE.tom)).toBe("On now");
    expect(roadBadge(road("first-home"), PEOPLE.sofie)).toBe("Exploring");
    expect(roadBadge(road("first-home"), PEOPLE.karim)).toBe("Past");
    expect(roadBadge(road("heat-pump"), PEOPLE.tom)).toBe("Under review");
  });
  test("Nadia sees no crowd counts or metro view; Margaret gets the large list", () => {
    const render = (person: typeof PEOPLE[string]) => renderToStaticMarkup(createElement(AllRoads, {person, onClose() {}, onOpenRoad() {throw new Error("Must not silently open");}}));
    const nadia = render(PEOPLE.nadia);
    expect(nadia).not.toContain("drove it");
    expect(nadia).not.toContain("Metro overview");
    expect(nadia).not.toContain("Explore Losing a parent");
    expect(render(PEOPLE.margaret)).toContain("a8-large");
  });
  test("scale measurements stay withheld until the processed sample passes the gate", () => {
    const small = scaleMeasurements(499, 200, null);
    expect(small.processed.value).toBeNull();
    expect(small.elapsed.value).toBeNull();
    expect(small.progress.value).toBeNull();
    expect(small.shared.value).toBeNull();
    expect(scaleMeasurements(500, 200, null).elapsed.value).toBe(.2);
  });
});
