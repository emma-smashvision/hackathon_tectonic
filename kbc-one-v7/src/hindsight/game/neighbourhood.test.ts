import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlaces } from "../engine/world";
import { PEOPLE } from "../../one/people";
import { lifeOf } from "../../one/road";
import { buildCity, nearest, spawnOn, HALF_W } from "./network";
import { neighbourhoodPlaces, nextStreetJourney, layoutNeighbourhood, focusTarget, routeTo } from "./neighbourhood";
import { layoutPlaces, STREET_Z } from "./streets";
import { streetTourFrame, TOUR_MS, SIGN_X } from "./streetTour";

const net = buildCity(undefined, { streets: true });
function placesFor(id: string) {
  const person = PEOPLE[id];
  assert.ok(person.world);
  const all = buildPlaces(person.world, lifeOf(person).life, person.advisor).places;
  const places = neighbourhoodPlaces(all);
  return { all, places, spots: layoutPlaces(places, null) };
}

test("the neighbourhood has at most four places and keeps every savings/investment product", () => {
  for (const id of ["tom", "karim", "lina", "sofie"]) {
    const { all, places } = placesFor(id);
    assert.ok(places.length <= 4);
    const savings = places.find((p) => p.id === "savings");
    const original = all.filter((p) => ["silo", "tower", "child"].includes(p.kind));
    assert.equal(savings?.facts.length ?? 0, original.reduce((sum, p) => sum + p.facts.length, 0));
    assert.equal(savings?.actions.length ?? 0, original.reduce((sum, p) => sum + p.actions.length, 0));
  }
});

test("Tom's car focus resolves to the existing products and the renewal journey", () => {
  const { places, spots } = placesFor("tom");
  assert.equal(places.find((p) => p.id === "garage")?.alert, true);
  assert.deepEqual(focusTarget({ kind: "place", id: "car" }, net, spots)?.panel, { type: "place", id: "garage" });
  assert.deepEqual(focusTarget({ kind: "journey", id: "car-insurance" }, net, spots, { month: 10, day: 2 })?.panel, { type: "journey", id: "garage" });
  assert.deepEqual(focusTarget({ kind: "journey", id: "company" }, net, spots)?.panel, { type: "fork", roadId: "freelance" });
  assert.ok(focusTarget({ kind: "journey", id: "first-home" }, net, spots));
  assert.equal(focusTarget({ kind: "journey", id: "missing" }, net, spots), null);
  assert.equal(focusTarget({ kind: "journey", id: "toString" }, net, spots), null);
});

test("tap routes stay on streets and roads, including every avenue and the return home", () => {
  const home = { x: -25, z: STREET_Z };
  const { spots } = placesFor("tom");
  const insurance = focusTarget({ kind: "journey", id: "car-insurance" }, net, spots, { month: 10, day: 2 })!;
  for (const target of [insurance.pose, ...net.avenues.flatMap((a) => [spawnOn(net, a.road.id, 0), ...(a.branches ? [spawnOn(net, a.road.id, (a.forkMonth ?? 0) + 3, "b")] : [])])]) {
    for (const [from, to] of [[home, target], [target, home]]) {
      let prev = from;
      for (const p of routeTo(net, from, to)) {
        for (let t = 0; t <= 1; t += 0.1) {
          const near = nearest(net, prev.x + (p.x - prev.x) * t, prev.z + (p.z - prev.z) * t);
          assert.ok(near.dist <= HALF_W, `route left road: ${near.dist}`);
        }
        prev = p;
      }
      assert.deepEqual(prev, to);
    }
  }
});


test("pitch landmarks fit four clear plots and keep Sofie's future home", () => {
  for (const id of ["tom", "karim", "sofie"]) {
    const { places } = placesFor(id);
    const spots = layoutNeighbourhood(places);
    assert.ok(spots.length <= 4);
    for (let i = 1; i < spots.length; i++) {
      assert.ok(spots[i].x - spots[i].width / 2 > spots[i - 1].x + spots[i - 1].width / 2);
    }
    for (const spot of spots) assert.ok(spot.z - spot.depth / 2 > STREET_Z + HALF_W);
  }
  assert.equal(placesFor("sofie").places.find((p) => p.id === "future-home")?.kind, "plot");
});

test("the nine-second tour passes every home place and ends at the next sign", () => {
  for (const id of ["tom", "karim", "sofie"]) {
    const spots = layoutNeighbourhood(placesFor(id).places);
    const seen = new Set<string>();
    let lastX = -Infinity;
    for (let ms = 0; ms <= TOUR_MS; ms += 100) {
      const frame = streetTourFrame(spots, ms);
      assert.ok(frame.pose.x >= lastX);
      assert.equal(frame.pose.z, STREET_Z);
      if (frame.placeId) seen.add(frame.placeId);
      lastX = frame.pose.x;
    }
    assert.deepEqual([...seen].sort(), spots.map((s) => s.id).sort());
    const end = streetTourFrame(spots, TOUR_MS);
    assert.equal(end.pose.x, SIGN_X);
    assert.equal(end.done, true);
    assert.deepEqual(streetTourFrame(spots, TOUR_MS + 5000), end);
  }
});

test("Market Mile holdings stay reachable from the savings place", () => {
  const person = PEOPLE.karim;
  const built = buildPlaces(person.world!, lifeOf(person).life, person.advisor);
  const towers = built.places.filter((p) => p.kind === "tower");
  assert.equal(towers.length, 3);
  const spots = [...layoutNeighbourhood(neighbourhoodPlaces(built.places)), ...layoutPlaces(built.places.filter((p) => p.street === "market"), built.market)];
  for (const tower of towers) {
    const target = focusTarget({ kind: "place", id: tower.id }, net, spots);
    assert.ok(target);
    assert.equal(target.pose.heading, -Math.PI / 2);
    assert.deepEqual(target.panel, { type: "place", id: tower.id });
  }
});

test("next signs agree with the car renewal and future-home destinations", () => {
  assert.equal(nextStreetJourney(placesFor("tom").places, { id: "everyday-only", name: "Everyday" }).id, "car-insurance");
  assert.equal(nextStreetJourney(placesFor("sofie").places, { id: "everyday-only", name: "Everyday" }).id, "first-home");
});
