import { describe, expect, it } from "vitest";
import {
  MIN_DIST,
  FLOAT_RADIUS,
  generateFloatingPositions,
  generateCubePositions,
  selectFinalLockCorners,
  chooseGridDims,
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

  // Bugfix regression (post-`done` reopen — see
  // progress/impl_project-hero-lego-animation.md, dated bugfix section): the
  // assembled cube used to render as a pile of overlapping pieces because
  // grid spacing (`CELL_UNIT`) was independent of the footprint actually
  // assigned to each cell. Every cube-assigned piece is now a fixed `"2x2"`
  // brick (`app/components/lego/bricks.ts`'s `pickBrickSize`): footprint
  // 1.6 x 1.6 world units (X/Z), height 0.72 (Y) — these half-extents must
  // stay in sync with `BRICK_SIZE_DEFS["2x2"]` / `STUD_UNIT` there. This
  // test asserts the real axis-aligned bounding boxes of every pair of
  // assigned cells never overlap, which is what an eyeballed screenshot
  // can't prove on its own for every one of the ~100 pieces.
  it.each([80, 100, 120, 30, 40])(
    "never overlaps the axis-aligned bounding box of any two assigned pieces (n=%i)",
    (n) => {
      const halfX = 0.8;
      const halfY = 0.36; // half of BRICK_SIZE_DEFS["2x2"].height (0.72, +20%)
      const halfZ = 0.8;
      const epsilon = 1e-9;
      const cells = generateCubePositions(n);
      for (let i = 0; i < cells.length; i++) {
        for (let j = i + 1; j < cells.length; j++) {
          const [ax, ay, az] = cells[i].position;
          const [bx, by, bz] = cells[j].position;
          const overlapsX = Math.abs(ax - bx) < 2 * halfX - epsilon;
          const overlapsY = Math.abs(ay - by) < 2 * halfY - epsilon;
          const overlapsZ = Math.abs(az - bz) < 2 * halfZ - epsilon;
          const overlaps = overlapsX && overlapsY && overlapsZ;
          expect(overlaps).toBe(false);
        }
      }
    }
  );
});

describe("chooseGridDims", () => {
  // Regression guard (3rd reopen — see progress/current.md and
  // progress/impl_project-hero-lego-animation.md dated section): a single
  // forced-cubic `k*k*k` grid left as little as 46.9% of cells filled for
  // `n=30`, which read as a fragmented cluster instead of a solid cube,
  // most visibly on the `prefers-reduced-motion` path. Every `n` tested
  // across both quality tiers (reduced: 30-40, full: 80-120) must now clear
  // a much higher floor.
  it.each([30, 35, 40, 80, 100, 120])(
    "keeps grid fill ratio for n=%i above 80%%",
    (n) => {
      const [kx, ky, kz] = chooseGridDims(n);
      const gridSize = kx * ky * kz;
      expect(gridSize).toBeGreaterThanOrEqual(n);
      expect(n / gridSize).toBeGreaterThan(0.8);
    }
  );

  it.each([30, 35, 40, 80, 100, 120])(
    "keeps every dimension >= 3 for n=%i",
    (n) => {
      const dims = chooseGridDims(n);
      for (const d of dims) expect(d).toBeGreaterThanOrEqual(3);
    }
  );

  // Regression guard (4th reopen — see progress/current.md "Bug 4" and
  // progress/impl_project-hero-lego-animation.md dated section): the old
  // tie-break-by-spread logic only ever activated when `waste` matched
  // exactly between two candidate boxes, which almost never happens for a
  // real `n` — so it always returned the globally least-wasteful box no
  // matter how elongated (e.g. `n=81` -> `[3,4,7]`, spread=4). A test that
  // only sampled a handful of `n` values (30, 35, 40, 80, 100, 120) missed
  // this because those particular values happened to dodge the bug. This
  // iterates *every* integer `n` in both quality tiers, not a sample, so an
  // isolated bad case like `n=81` can't slip through unnoticed again.
  // Bound (spread <= 1, fill >= 75%) verified by exhaustive brute force
  // before implementing `chooseGridDimsWithCap()` — see progress/current.md.
  it("keeps spread <= 1 and fill >= 75% for every n in the reduced tier (30-40)", () => {
    for (let n = 30; n <= 40; n++) {
      const dims = chooseGridDims(n);
      const gridSize = dims[0] * dims[1] * dims[2];
      const spread = Math.max(...dims) - Math.min(...dims);
      expect(spread, `spread for n=${n}`).toBeLessThanOrEqual(1);
      expect(n / gridSize, `fill ratio for n=${n}`).toBeGreaterThanOrEqual(0.75);
    }
  });

  it("keeps spread <= 1 and fill >= 75% for every n in the full tier (80-120)", () => {
    for (let n = 80; n <= 120; n++) {
      const dims = chooseGridDims(n);
      const gridSize = dims[0] * dims[1] * dims[2];
      const spread = Math.max(...dims) - Math.min(...dims);
      expect(spread, `spread for n=${n}`).toBeLessThanOrEqual(1);
      expect(n / gridSize, `fill ratio for n=${n}`).toBeGreaterThanOrEqual(0.75);
    }
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
