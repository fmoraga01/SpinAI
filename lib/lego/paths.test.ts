import { describe, expect, it } from "vitest";
import { buildCatmullRomPath } from "./paths";
import type { Vector3Tuple } from "./layout";

function distanceToSegment(p: Vector3Tuple, a: Vector3Tuple, b: Vector3Tuple): number {
  const ab: Vector3Tuple = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap: Vector3Tuple = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const abLenSq = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  if (abLenSq < 1e-9) return Math.sqrt(ap[0] ** 2 + ap[1] ** 2 + ap[2] ** 2);
  const t = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / abLenSq;
  const closest: Vector3Tuple = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  return Math.sqrt(
    (p[0] - closest[0]) ** 2 + (p[1] - closest[1]) ** 2 + (p[2] - closest[2]) ** 2
  );
}

describe("buildCatmullRomPath", () => {
  const from: Vector3Tuple = [-3, 1.5, 2];
  const to: Vector3Tuple = [2, -1, -1.5];

  it("is deterministic: same seed produces the same path", () => {
    const a = buildCatmullRomPath(from, to, 11);
    const b = buildCatmullRomPath(from, to, 11);
    expect(a).toEqual(b);
  });

  it("produces different paths for different seeds", () => {
    const a = buildCatmullRomPath(from, to, 11);
    const b = buildCatmullRomPath(from, to, 12);
    expect(a).not.toEqual(b);
  });

  it("starts at `from` and ends at `to`", () => {
    const points = buildCatmullRomPath(from, to, 5);
    expect(points[0]).toEqual(from);
    expect(points[points.length - 1]).toEqual(to);
  });

  it("has 2 or 3 intermediate control points, each off the straight line", () => {
    const points = buildCatmullRomPath(from, to, 5);
    const intermediates = points.slice(1, -1);
    expect(intermediates.length).toBeGreaterThanOrEqual(2);
    expect(intermediates.length).toBeLessThanOrEqual(3);
    for (const p of intermediates) {
      expect(distanceToSegment(p, from, to)).toBeGreaterThan(0.01);
    }
  });

  it("degenerate case: from === to collapses all points to the same location", () => {
    const same: Vector3Tuple = [1, 1, 1];
    const points = buildCatmullRomPath(same, same, 5);
    for (const p of points) expect(p).toEqual(same);
  });
});
