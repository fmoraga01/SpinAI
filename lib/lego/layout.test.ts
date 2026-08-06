import { describe, expect, it } from "vitest";
import {
  MIN_DIST,
  FLOAT_RADIUS,
  generateFloatingPositions,
  generateCubePositions,
  selectFinalLockCorners,
} from "./layout";

describe("generateFloatingPositions", () => {
  it.each([80, 100, 120])(
    "places %i points with no pair closer than MIN_DIST",
    (n) => {
      const points = generateFloatingPositions(n, 7);
      expect(points).toHaveLength(n);
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const [ax, ay, az] = points[i];
          const [bx, by, bz] = points[j];
          const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2);
          expect(dist).toBeGreaterThanOrEqual(MIN_DIST - 1e-9);
        }
      }
    }
  );

  it("keeps every point inside the floating volume", () => {
    const points = generateFloatingPositions(100, 3);
    for (const [x, y, z] of points) {
      expect(Math.sqrt(x * x + y * y + z * z)).toBeLessThanOrEqual(FLOAT_RADIUS + 1e-9);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = generateFloatingPositions(90, 42);
    const b = generateFloatingPositions(90, 42);
    expect(a).toEqual(b);
  });
});

describe("generateCubePositions", () => {
  it.each([80, 100, 120, 30, 40])(
    "classifies exactly 8 corner positions (layer 5) for n=%i",
    (n) => {
      const cells = generateCubePositions(n);
      const corners = cells.filter((c) => c.layer === 5);
      expect(corners).toHaveLength(8);
    }
  );

  it("returns exactly n cells and no duplicate positions", () => {
    const n = 100;
    const cells = generateCubePositions(n);
    expect(cells).toHaveLength(n);
    const seen = new Set(cells.map((c) => c.position.join(",")));
    expect(seen.size).toBe(n);
  });

  it("distributes non-corner cells across every other layer for a typical n", () => {
    const cells = generateCubePositions(100);
    const perLayer = [0, 1, 2, 3, 4, 5].map(
      (layer) => cells.filter((c) => c.layer === layer).length
    );
    // layer 5 (corners) is always exactly 8; every other layer should have
    // at least some presence at n=100 so the assembly narrative (R7) has
    // something to show at each stage.
    expect(perLayer[5]).toBe(8);
    for (const layer of [0, 1, 2, 3, 4]) {
      expect(perLayer[layer]).toBeGreaterThan(0);
    }
  });

  it("is symmetric: corner cell coordinates are all at the same distance from the centroid", () => {
    const cells = generateCubePositions(100);
    const corners = cells.filter((c) => c.layer === 5);
    const cx = corners.reduce((s, c) => s + c.position[0], 0) / corners.length;
    const cy = corners.reduce((s, c) => s + c.position[1], 0) / corners.length;
    const cz = corners.reduce((s, c) => s + c.position[2], 0) / corners.length;
    const dists = corners.map(({ position: [x, y, z] }) =>
      Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2)
    );
    const first = dists[0];
    for (const d of dists) expect(d).toBeCloseTo(first, 6);
  });
});

describe("selectFinalLockCorners", () => {
  it("selects exactly 4 of the 8 corners", () => {
    const cells = generateCubePositions(100);
    const finalLock = selectFinalLockCorners(cells);
    expect(finalLock).toHaveLength(4);
  });

  it("selects corners that are a subset of layer-5 cells", () => {
    const cells = generateCubePositions(100);
    const corners = cells.filter((c) => c.layer === 5).map((c) => c.position);
    const finalLock = selectFinalLockCorners(cells);
    for (const pos of finalLock) {
      expect(corners).toContainEqual(pos);
    }
  });

  it("is deterministic across calls", () => {
    const cells = generateCubePositions(100);
    expect(selectFinalLockCorners(cells)).toEqual(selectFinalLockCorners(cells));
  });
});
