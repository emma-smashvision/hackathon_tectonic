import { describe, expect, test } from "bun:test";
import { CHAPTERS, chooseBranch, completeNow, founderRoadFor, MAP_EDGES, MAP_NODES, mapStateFor, nowNode, routeNodes } from "./founder";
import { PARTNERS, PROFILES } from "./model";

describe("founder road", () => {
  const sofie = founderRoadFor("physio", "sofie")!;

  test("Sofie already founded her practice and is now at the BV crossroads", () => {
    const done = sofie.nodes.filter((n) => n.status === "done").map((n) => n.id);
    for (const id of ["account", "sole", "social", "kbo", "riziv", "vat", "liability", "regularisation", "room"]) expect(done).toContain(id);
    expect(nowNode(sofie)?.id).toBe("compare");
    expect(nowNode(sofie)?.chapter).toBe("crossroads");
    expect(sofie.fork?.after).toBe("compare");
    expect(sofie.fork?.pick).toBe("b");
    expect(sofie.nodes.filter((n) => n.status === "now")).toHaveLength(1);
  });

  test("choosing the BV road starts its first step, and steps advance one by one", () => {
    const bv = chooseBranch(sofie, "b");
    expect(bv.nodes.find((n) => n.id === "compare")?.status).toBe("done");
    expect(nowNode(bv)?.id).toBe("plan");
    expect(routeNodes(bv, "b").some((n) => n.branch === "a")).toBe(false);
    expect(nowNode(completeNow(bv, "b"))?.id).toBe("bank-cert");
    const stay = chooseBranch(sofie, "a");
    expect(nowNode(stay)?.id).toBe("a-review");
  });

  test("every node is complete, in a known chapter, with known partners", () => {
    for (const profile of PROFILES) {
      for (const key of [undefined, "sofie", "karim"]) {
        const road = founderRoadFor(profile.id, key)!;
        expect(road.nodes.length).toBeGreaterThan(0);
        expect(new Set(road.nodes.map((n) => n.id)).size).toBe(road.nodes.length);
        expect(road.nodes.filter((n) => n.status === "now").length).toBeLessThanOrEqual(1);
        for (const n of road.nodes) {
          expect(CHAPTERS.some((c) => c.id === n.chapter)).toBe(true);
          for (const id of n.partners) expect(PARTNERS[id]).toBeDefined();
          if (n.form) expect(n.form.needYou.length).toBeGreaterThan(0);
        }
        if (road.fork) expect(road.nodes.some((n) => n.id === road.fork!.after)).toBe(true);
      }
    }
  });

  test("only the customer's own road shows progress", () => {
    expect(founderRoadFor("freelancer", "karim")!.mine).toBe(true);
    expect(nowNode(founderRoadFor("freelancer", "karim")!)).toBeDefined();
    expect(founderRoadFor("lawyer", "sofie")!.mine).toBe(false);
    expect(founderRoadFor("lawyer", "sofie")!.nodes.every((n) => n.status === "next")).toBe(true);
  });

  test("the map is connected and places Sofie between Grow and the BV", () => {
    const ids = new Set(MAP_NODES.map((m) => m.id));
    for (const [a, b] of MAP_EDGES) { expect(ids.has(a)).toBe(true); expect(ids.has(b)).toBe(true); }
    const state = mapStateFor(sofie);
    expect(state.done).toContain("side");
    expect(state.route).toContain("bv");
  });
});
