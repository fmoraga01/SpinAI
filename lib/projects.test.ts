import { describe, expect, it } from "vitest";
import { mondayOf } from "./projects";

describe("mondayOf", () => {
  it("maps a Monday to itself", () => {
    expect(mondayOf("2026-07-06")).toBe("2026-07-06");
  });

  it("maps a Sunday to the previous Monday, not the next one", () => {
    expect(mondayOf("2026-07-05")).toBe("2026-06-29");
  });

  it("maps a midweek Wednesday to the Monday of that same week", () => {
    expect(mondayOf("2026-07-08")).toBe("2026-07-06");
  });

  it("handles a month boundary correctly (Saturday Aug 1 -> Monday in July)", () => {
    expect(mondayOf("2026-08-01")).toBe("2026-07-27");
  });
});
