import { describe, expect, it } from "vitest";
import { getQualityTier, pickBrickCount, BRICK_COUNT_RANGE } from "./quality";
import { createRng } from "./rng";

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
  it("stays within the documented range per tier", () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      const full = pickBrickCount("full", rng);
      expect(full).toBeGreaterThanOrEqual(BRICK_COUNT_RANGE.full[0]);
      expect(full).toBeLessThanOrEqual(BRICK_COUNT_RANGE.full[1]);
      const reduced = pickBrickCount("reduced", rng);
      expect(reduced).toBeGreaterThanOrEqual(BRICK_COUNT_RANGE.reduced[0]);
      expect(reduced).toBeLessThanOrEqual(BRICK_COUNT_RANGE.reduced[1]);
    }
  });
});
