import { describe, expect, it } from "vitest";
import { getQualityTier, pickBrickCount, BRICK_COUNT } from "./quality";

describe("getQualityTier", () => {
  it("is full for a wide viewport and no hardware signals", () => {
    expect(getQualityTier(1440, undefined, undefined)).toBe("full");
  });

  it("is reduced for a viewport narrower than the md: breakpoint", () => {
    expect(getQualityTier(767, undefined, undefined)).toBe("reduced");
  });

  it("768px exactly is still full (breakpoint is exclusive, matches Tailwind md:)", () => {
    expect(getQualityTier(768, undefined, undefined)).toBe("full");
  });

  it("is reduced when hardwareConcurrency is low", () => {
    expect(getQualityTier(1440, 4, undefined)).toBe("reduced");
    expect(getQualityTier(1440, 2, undefined)).toBe("reduced");
  });

  it("is full when hardwareConcurrency is comfortably high", () => {
    expect(getQualityTier(1440, 8, undefined)).toBe("full");
  });

  it("ignores hardwareConcurrency when undefined (no false penalty)", () => {
    expect(getQualityTier(1440, undefined, undefined)).toBe("full");
  });

  it("is reduced when deviceMemory is low", () => {
    expect(getQualityTier(1440, undefined, 4)).toBe("reduced");
    expect(getQualityTier(1440, undefined, 2)).toBe("reduced");
  });

  it("ignores deviceMemory when undefined (Safari/Firefox, no API support)", () => {
    expect(getQualityTier(1440, 8, undefined)).toBe("full");
  });

  it("is reduced if any single signal says so, even if others are fine", () => {
    expect(getQualityTier(1440, 8, 2)).toBe("reduced");
    expect(getQualityTier(320, 8, 8)).toBe("reduced");
  });
});

describe("pickBrickCount", () => {
  it("returns a fixed perfect-cube count per tier, matching BRICK_COUNT", () => {
    expect(pickBrickCount("full")).toBe(BRICK_COUNT.full);
    expect(pickBrickCount("reduced")).toBe(BRICK_COUNT.reduced);
  });

  it("both tier counts are perfect cubes (k^3 for an integer k >= 3)", () => {
    for (const n of Object.values(BRICK_COUNT)) {
      const k = Math.round(Math.cbrt(n));
      expect(k ** 3).toBe(n);
      expect(k).toBeGreaterThanOrEqual(3);
    }
  });
});
