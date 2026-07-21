import { describe, expect, it } from "vitest";
import { scaleSize } from "./sizes";

describe("scaleSize", () => {
  it("scales a clamp() value proportionally on all three components", () => {
    expect(scaleSize("clamp(16px, 2vw, 32px)", 1.25)).toBe(
      "clamp(20px, 2.50vw, 40px)"
    );
  });

  it("scales a plain px value", () => {
    expect(scaleSize("24px", 0.78)).toBe("19px");
  });

  it("rounds px output to the nearest integer", () => {
    expect(scaleSize("10px", 0.78)).toBe("8px");
  });

  it("returns non-px, non-clamp values unchanged", () => {
    expect(scaleSize("1.5", 1.25)).toBe("1.5");
    expect(scaleSize("bold", 1.25)).toBe("bold");
  });

  it("is a no-op at factor 1 for both formats", () => {
    expect(scaleSize("clamp(16px, 2vw, 32px)", 1)).toBe(
      "clamp(16px, 2.00vw, 32px)"
    );
    expect(scaleSize("24px", 1)).toBe("24px");
  });
});
