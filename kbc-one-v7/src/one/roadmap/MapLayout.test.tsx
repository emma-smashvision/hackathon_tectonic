import assert from "node:assert/strict";
import { test } from "node:test";
import { PEOPLE } from "../people";
import { lifeOf } from "../road";
import { roadmapFor, majorStops, monthBundles } from "./model";
import { layoutMap } from "./MapLayout";
import { planItemFrom } from "../../hindsight/engine/plan";

for (const key of ["tom", "karim", "sofie", "lina"]) {
  test(`${key}: expanded map preserves every stop in a checkpoint, monthly group or origin flag`, () => {
    const input = { ...lifeOf(PEOPLE[key]), plan: [] };
    const map = roadmapFor(PEOPLE[key], input);
    const before = JSON.stringify(map);
    const layout = layoutMap(map, {
      expandedTracks: map.tracks.map((t) => t.id),
    });
    const today = layout.nodes.find((n) => n.kind === "today")!;
    assert.equal(
      new Set(layout.nodes.map((n) => n.key)).size,
      layout.nodes.length,
    );
    for (const track of map.tracks)
      for (const stop of track.stops.filter(
        (s) => s.inDays >= 0 && s.id !== "today",
      )) {
        const matches = layout.nodes.filter(
          (n) =>
            (n.track.id === track.id &&
              (n.stop?.id === stop.id ||
                n.bills?.some((b) => b.id === stop.id))) ||
            (n.kind === "origin" &&
              n.track.parentId === track.id &&
              n.track.fromStopId === stop.id),
        );
        assert.ok(matches.length >= 1, `Missing ${stop.id}`);
        assert.ok(matches.every((n) => n.y < today.y && n.y >= 0));
      }
    if (map.nextUp)
      assert.ok(
        layout.nodes.some(
          (n) =>
            n.track.id === map.nextUp!.trackId &&
            n.stop?.id === map.nextUp!.stopId,
        ),
      );
    assert.equal(JSON.stringify(map), before);
  });
}
test("map checkpoints and bill pebbles follow the shared model for Tom and Karim", () => {
  for (const key of ["tom", "karim"]) {
    const map = roadmapFor(PEOPLE[key], { ...lifeOf(PEOPLE[key]), plan: [] });
    const root = map.tracks[0];
    const layout = layoutMap(map);
    const anchors = new Set(map.tracks.map((track) => track.fromStopId));
    for (const stop of majorStops(root).filter(
      (stop) => stop.inDays >= 0 && !anchors.has(stop.id),
    ))
      assert.ok(
        layout.nodes.some((node) => node.stop?.id === stop.id),
        stop.id,
      );
    for (const bundle of monthBundles(root)) {
      const node = layout.nodes.find((node) => node.key === bundle.id)!;
      assert.deepEqual(node.bills, bundle.stops);
      assert.equal(node.bills!.length, bundle.count);
    }
    if (key === "tom")
      assert.equal(
        layout.nodes.find((node) => node.key === "bundle:everyday:2026-10")!
          .bills!.length,
        4,
      );
  }
});
test("model weights alone decide grouping, without a second amount or action rule", () => {
  const map = roadmapFor(PEOPLE.tom, { ...lifeOf(PEOPLE.tom), plan: [] });
  const root = map.tracks[0];
  const bill = root.stops.find(
    (stop) =>
      stop.id !== "today" && stop.weight === "minor" && stop.inDays >= 0,
  )!;
  bill.weight = "major";
  bill.amount = 1;
  assert.ok(layoutMap(map).nodes.some((node) => node.stop?.id === bill.id));
  bill.weight = "minor";
  bill.amount = 999;
  assert.ok(
    layoutMap(map).nodes.some((node) =>
      node.bills?.some((stop) => stop.id === bill.id),
    ),
  );
  assert.ok(!layoutMap(map).nodes.some((node) => node.stop?.id === bill.id));
});
test("future journey is a short stub until explored; its next-up stop remains visible", () => {
  const input = { ...lifeOf(PEOPLE.tom), plan: [] };
  const map = roadmapFor(PEOPLE.tom, input);
  const closed = layoutMap(map);
  assert.equal(
    closed.nodes.filter((n) => n.track.id === "moving-house").length,
    1,
  );
  assert.equal(
    closed.nodes.find((n) => n.track.id === "moving-house")!.starts,
    "Starts in Nov",
  );
  const stubEdge = closed.edges.find(
    (e) => e.key === "edge:origin:moving-house",
  )!;
  assert.notEqual(stubEdge.from.x, stubEdge.to.x);
  const expanded = layoutMap(map, {
    expandedTracks: ["moving-house"],
  });
  assert.ok(
    expanded.nodes.some((n) => n.stop?.id === "moving-house:setting-up"),
  );
  const sofie = { ...lifeOf(PEOPLE.sofie), plan: [] };
  const preparation = layoutMap(roadmapFor(PEOPLE.sofie, sofie));
  assert.ok(preparation.nodes.some((n) => n.stop?.id === "first-home"));
});
test("Karim's crossing splits in two; a chosen branch is solid and no long side line starts at today", () => {
  const input = { ...lifeOf(PEOPLE.karim), plan: [] };
  const layout = layoutMap(roadmapFor(PEOPLE.karim, input));
  const crossing = layout.nodes.find((n) => n.crossing?.id === "company")!;
  const branches = layout.nodes.filter(
    (n) => n.kind === "origin" && n.track.fromStopId === "company",
  );
  assert.equal(branches.length, 2);
  assert.equal(branches[0].y, branches[1].y);
  assert.notEqual(branches[0].x, branches[1].x);
  for (const branch of branches) {
    const edge = layout.edges.find((e) => e.to === branch)!;
    assert.equal(edge.from, crossing);
    assert.ok(edge.possible);
    assert.ok(branch.y < crossing.y);
  }
  const entry = layout.edges.find((e) => e.key === "edge:origin:freelance")!;
  assert.ok(Math.abs(entry.from.y - entry.to.y) <= 100);
  const chosen = layoutMap(
    roadmapFor(PEOPLE.karim, {
      ...input,
      journey: { ...input.journey, forkChoice: { company: "bv" } },
    }),
  );
  assert.ok(
    chosen.edges
      .filter((e) => e.track.id === "freelance:company:bv")
      .every((e) => !e.possible),
  );
  assert.ok(
    chosen.edges
      .filter((e) => e.track.id === "freelance:company:sole")
      .every((e) => e.possible),
  );
});
test("prepared path follows the real plan and returns to zero after removal", () => {
  const input = { ...lifeOf(PEOPLE.tom), plan: [] };
  const map = roadmapFor(PEOPLE.tom, input);
  const stop = map.tracks[0].stops.find((s) => s.id === "car-renewal")!;
  const plan = [planItemFrom(stop.actions[0].pick, map.today, "app")];
  const ready = layoutMap(
    roadmapFor(PEOPLE.tom, { ...input, plan }),
  ).edges.find((e) => e.key === "edge:everyday/car-renewal")!.ready;
  assert.ok(ready > 0 && ready < 100);
  assert.equal(
    layoutMap(map).edges.find((e) => e.key === "edge:everyday/car-renewal")!
      .ready,
    0,
  );
});
