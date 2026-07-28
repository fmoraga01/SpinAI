import { describe, expect, it } from "vitest";
import { healthFromTimeline } from "./projects";
import { WeeklyUpdate } from "./types";

function update(weekOf: string, status: WeeklyUpdate["status"]): WeeklyUpdate {
  return { id: weekOf, weekOf, status, note: "" };
}

describe("healthFromTimeline", () => {
  it("returns null for an empty timeline", () => {
    expect(healthFromTimeline([])).toBeNull();
  });

  it("returns the status of the single entry when there is only one", () => {
    expect(healthFromTimeline([update("2026-07-06", "at_risk")])).toBe("at_risk");
  });

  it("returns the status of the most recent weekOf, not the last array entry", () => {
    const updates = [
      update("2026-07-20", "on_track"),
      update("2026-07-06", "delayed"),
      update("2026-07-13", "at_risk"),
    ];
    expect(healthFromTimeline(updates)).toBe("on_track");
  });

  it("picks the most recent weekOf even when the array is out of order", () => {
    const updates = [
      update("2026-06-01", "delayed"),
      update("2026-08-01", "at_risk"),
      update("2026-07-01", "on_track"),
    ];
    expect(healthFromTimeline(updates)).toBe("at_risk");
  });
});
