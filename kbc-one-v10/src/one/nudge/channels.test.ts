import { describe, expect, test } from "bun:test";
import { channelCardFor } from "./channels";
import { PEOPLE } from "../people";
import { kateFallback, kateFacts, rulesCustomization, validateProposal, guardGeneratedCrowdCopy } from "../../kbc/kate";
import { seedPersona } from "../../kbc/personas";
import type { Customer } from "../../kbc/types";
import { PRIVATE_NUDGE } from "./model";

const customer = (id: string): Customer => ({ persona: seedPersona(id)!, trackers: [], muted: [], rules: [], requests: [], log: [] });
describe("v8 shared channel identity", () => {
  for (const id of Object.keys(PEOPLE)) {
    test(`${id}: Home and both Kate paths open the same road and stop`, () => {
      const card = channelCardFor(id)!;
      expect(card).toBeTruthy();
      for (const message of ["What's ahead for me?", "Describe my situation"]) {
        const offline = kateFallback(customer(id), message).proposal;
        const onlineLocal = rulesCustomization(customer(id), message)?.proposal;
        expect(offline?.type).toBe("road");
        expect(onlineLocal).toEqual(offline);
        if (offline?.type === "road") {
          expect(offline.roadId).toBe(card.roadId);
          expect(offline.stopId).toBe(card.stopId);
        }
      }
      expect(kateFacts(customer(id)).road.canDrive).toBe(false);
      expect(validateProposal(customer(id), {type:"drive",road:"own"}, [])).toBeNull();
    });
  }
  test("private lock-screen text discloses no person's road, stop, or finances", () => {
    expect(JSON.stringify(PRIVATE_NUDGE)).not.toMatch(/house|parent|freelance|payment|€|Tom|Nadia|Margaret/i);
    expect(channelCardFor("nadia")?.care).toBe(true);
    expect(channelCardFor("margaret")?.care).toBe(false);
  });
});

test("situation matching offers a published road without assigning it", () => {
  const c = customer("tom");
  const before = JSON.stringify(c);
  const result = kateFallback(c, "I am going freelance");
  expect(result.proposal?.type).toBe("road");
  if (result.proposal?.type === "road") expect(result.proposal.roadId).toBe("freelance");
  expect(result.reply).toContain("current road stays the same");
  expect(JSON.stringify(c)).toBe(before);
  expect(kateFallback(c, "Describe a situation: starting a moon colony").reply).toContain("No published road yet");
  expect(kateFallback(c, "I am getting a heat pump").proposal).toBeNull();
});
test("generated crowd claims cannot borrow numbers from personal facts", () => {
  expect(guardGeneratedCrowdCopy("84% of customers did this.")).not.toContain("84");
  expect(guardGeneratedCrowdCopy("Most people did this.")).not.toContain("Most");
  expect(guardGeneratedCrowdCopy("Your account has €84.")).toBe("Your account has €84.");
});

test("confirmed stage changes survive restore and reach every channel", async () => {
  const { confirmRoad, pointersFor, previewRoad } = await import("../crowd");
  const { restorePointers } = await import("./useRoadPointers");
  const before = pointersFor("tom");
  const preview = previewRoad(before, "first-home", { month: 0, label: "Before the keys", date: null });
  expect(channelCardFor("tom", { pointers: preview })?.roadId).toBe("moving-house");
  const confirmed = confirmRoad(preview, "first-home", { month: 0, label: "Before the keys", date: "2026-11-01" });
  const restored = restorePointers("tom", JSON.parse(JSON.stringify(confirmed)));
  expect(restored.confirmed).toEqual(confirmed.confirmed);
  expect(channelCardFor("tom", { pointers: restored })?.roadId).toBe("first-home");
  const { kateRoadAnswer } = await import("../../kbc/kate");
  const proposal = kateRoadAnswer(customer("tom"), "What's ahead for me?", restored)?.proposal;
  expect(proposal?.type).toBe("road");
  if (proposal?.type === "road") expect(proposal.roadId).toBe("first-home");
  expect(restorePointers("margaret", restored).personId).toBe("margaret");
});

test("Home appearance requests keep the existing customization path", () => {
  expect(kateFallback(customer("tom"), "Make my home pink").proposal?.type).toBe("customization");
});
