import { describe, expect, test } from "bun:test";
import { entryMode, entryReceipt, focusedLesson } from "./entry";
import type { Lesson } from "../learning/types";

describe("village entry routing", () => {
  test("all six people get the appropriate route, including a custom large look", () => {
    for (const id of ["tom", "karim", "sofie", "lina"]) expect(entryMode(id, false, true)).toBe("game");
    expect(entryMode("margaret", false, true)).toBe("plain");
    expect(entryMode("tom", true, true)).toBe("plain");
    expect(entryMode("nadia", false, false)).toBe("care");
    expect(entryMode("nadia", true, false)).toBe("care");
    expect(entryMode("other", false, false)).toBe("plain");
  });
  test("stop routing accepts bare and composite IDs and never substitutes another road", () => {
    const lessons = [{ id: "tom:energy", roadId: "moving-house", stopId: "moving-house:energy-new-address" }, { id: "tom:setting", roadId: "moving-house", stopId: "moving-house:setting-up" }] as Lesson[];
    expect(focusedLesson(lessons, "moving-house", "energy-new-address")?.id).toBe("tom:energy");
    expect(focusedLesson(lessons, "moving-house", "moving-house:setting-up")?.id).toBe("tom:setting");
    expect(focusedLesson(lessons, "first-home", "energy-new-address")).toBeUndefined();
    expect(focusedLesson(lessons, "moving-house", "unknown")).toBeUndefined();
  });
  test("Home receipts do not claim a saved reminder when the user declined", () => {
    expect(entryReceipt(1, 3, true, false)).toBe("Reminder saved · 1/3 built");
    expect(entryReceipt(1, 3, false, false)).toBe("1/3 built");
    expect(entryReceipt(1, 1, true, false, "Step")).toBe("Step saved · 1/1 built");
    expect(entryReceipt(1, 1, false, true)).toBe("1/1 lessons complete");
  });
});
