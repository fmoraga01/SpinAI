// Pure position-generation logic for the LEGO hero scene (no `three` import —
// see design.md "Generación de posiciones — layout.ts"). Works with plain
// `[number, number, number]` tuples; the Three.js layer (`app/components/lego`)
// converts these to `THREE.Vector3` when building the scene.
import { createRng } from "./rng";

export type Vector3Tuple = [number, number, number];

export type CubeLayer = 0 | 1 | 2 | 3 | 4 | 5;

export interface CubeCell {
  position: Vector3Tuple;
  layer: CubeLayer;
}

// ── Floating positions (R4) ────────────────────────────────────────────────

/** Radius of the sphere the floating pieces are scattered inside. */
export const FLOAT_RADIUS = 6;
/** Minimum center-to-center distance enforced between floating pieces. */
export const MIN_DIST = 1.1;
const MAX_PLACEMENT_ATTEMPTS = 300;

function distance(a: Vector3Tuple, b: Vector3Tuple): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function randomPointInSphere(rng: () => number, radius: number): Vector3Tuple {
  // Rejection sampling: draw from the bounding cube, discard outside the
  // sphere. Cheap and exact (no bias toward the corners the way a naive
  // spherical-coordinate sample would introduce toward the poles).
  let x = 0, y = 0, z = 0;
  let attempts = 0;
  do {
    x = (rng() * 2 - 1) * radius;
    y = (rng() * 2 - 1) * radius;
    z = (rng() * 2 - 1) * radius;
    attempts++;
  } while (x * x + y * y + z * z > radius * radius && attempts < 50);
  return [x, y, z];
}

/**
 * Generates `n` non-colliding floating positions inside a bounded sphere
 * (R4) via Poisson-disc-style rejection: each candidate is discarded and
 * regenerated if it lands closer than `MIN_DIST` to any already-accepted
 * point, up to `MAX_PLACEMENT_ATTEMPTS`. If no valid candidate is found in
 * time (astronomically unlikely at this density — see progress notes for
 * the packing-density math), the best candidate seen (largest minimum
 * distance to existing points) is used instead, so `n` is always satisfied.
 *
 * Deterministic given `seed` (default varies per call site) so this is
 * testable with Vitest without relying on `Math.random()`.
 */
export function generateFloatingPositions(n: number, seed = 1): Vector3Tuple[] {
  const rng = createRng(seed);
  const points: Vector3Tuple[] = [];

  for (let i = 0; i < n; i++) {
    let best: Vector3Tuple | null = null;
    let bestMinDist = -Infinity;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt++) {
      const candidate = randomPointInSphere(rng, FLOAT_RADIUS);
      const minDist = points.length === 0
        ? Infinity
        : Math.min(...points.map((p) => distance(p, candidate)));

      if (minDist >= MIN_DIST) {
        best = candidate;
        break;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        best = candidate;
      }
    }

    points.push(best ?? randomPointInSphere(rng, FLOAT_RADIUS));
  }

  return points;
}

// ── Cube (final) positions (R7 grouping) ───────────────────────────────────

/**
 * World-space spacing between adjacent grid cells of the assembled cube.
 *
 * **Bugfix (post-`done` reopen, see progress/impl_project-hero-lego-animation.md
 * for the dated section with the full writeup):** this used to be a single
 * `CELL_UNIT = 1.3` shared by all 3 axes, sized independently of the actual
 * brick footprint being placed. `pickBrickSize()` in
 * `app/components/lego/bricks.ts` picked a footprint per cell (up to `2x4` =
 * 4 studs * 0.8 = 3.2 world units wide) with no awareness of how far apart
 * neighboring cells were — every brick bigger than the cell spacing invaded
 * its neighbors, so the assembled cube rendered as a pile of overlapping
 * pieces instead of a clean cube with small, even gaps (R15).
 *
 * Fix: `pickBrickSize()` now always returns the single canonical `"2x2"`
 * footprint for every cube-assigned piece (see that function's own comment
 * for why), so grid spacing only has to fit *one* known footprint instead of
 * an unbounded mix. Horizontal (X/Z) and vertical (Y) spacing are still kept
 * as two separate constants — not because footprint varies anymore, but
 * because the `2x2` brick's footprint (1.6 world units) and height (0.6
 * world units) are themselves different, and a single spacing value sized
 * for one of them would leave the other axis either overlapping or full of
 * gaps much bigger than the rest. These numbers must stay numerically in
 * sync with `BRICK_SIZE_DEFS["2x2"]` / `STUD_UNIT` in
 * `app/components/lego/bricks.ts` if that canonical size ever changes.
 */
const BRICK_GAP = 0.12;
/** `BRICK_SIZE_DEFS["2x2"]` footprint: 2 studs * STUD_UNIT (0.8) = 1.6. */
const CELL_UNIT_XZ = 1.6 + BRICK_GAP;
/** `BRICK_SIZE_DEFS["2x2"]` height: 0.6. */
const CELL_UNIT_Y = 0.6 + BRICK_GAP;

interface GridCell {
  position: Vector3Tuple;
  coords: [number, number, number];
  extremeCount: number;
}

/**
 * Picks the 3 integer grid dimensions `[kx, ky, kz]` (each >= 3) used as the
 * base box for `buildFullGrid()`.
 *
 * **Bugfix (post-`done` reopen, 3rd pass — see
 * progress/impl_project-hero-lego-animation.md dated section for the full
 * writeup):** this used to be a single `k = max(3, ceil(cbrt(n)))`, forcing
 * a perfectly cubic `k*k*k` grid. For most `n` in either quality tier there
 * is no `k` whose cube lands close to `n` (e.g. `n=30`: `k=3` -> 27 cells,
 * too few; `k=4` -> 64 cells, 46.9% of which stay empty after trimming),
 * so the assembled shape looked like a fragmented cluster with loose corner
 * pieces rather than a solid cube — most visible on the
 * `prefers-reduced-motion` path, whose fixed frontal camera has no
 * occlusion to hide the gaps (the default `autoRotate` three-quarter angle
 * happened to hide most of them).
 *
 * Fix: search integer triples `[a, b, c]` (each >= 3, within a small window
 * around `ceil(cbrt(n))`) for the one whose product is `>= n` with the least
 * waste (`product - n`), breaking ties by the smallest spread between the
 * largest and smallest dimension so the box still reads as roughly cubic
 * rather than an obviously elongated slab. This raises worst-case fill from
 * ~47% to ~83%+ (see the dated progress section for the full table of
 * before/after fill ratios per tested `n`).
 */
export function chooseGridDims(n: number): [number, number, number] {
  const k0 = Math.max(3, Math.ceil(Math.cbrt(n)));
  const lo = 3;
  const hi = k0 + 2;

  let best: [number, number, number] = [k0, k0, k0];
  let bestWaste = k0 * k0 * k0 - n;
  let bestSpread = 0;

  for (let a = lo; a <= hi; a++) {
    for (let b = a; b <= hi; b++) {
      for (let c = b; c <= hi; c++) {
        const product = a * b * c;
        if (product < n) continue;
        const waste = product - n;
        const spread = c - a;
        if (waste < bestWaste || (waste === bestWaste && spread < bestSpread)) {
          bestWaste = waste;
          bestSpread = spread;
          best = [a, b, c];
        }
      }
    }
  }

  return best;
}

function buildFullGrid(kx: number, ky: number, kz: number): GridCell[] {
  const centerX = (kx - 1) / 2;
  const centerY = (ky - 1) / 2;
  const centerZ = (kz - 1) / 2;
  const cells: GridCell[] = [];
  for (let x = 0; x < kx; x++) {
    for (let y = 0; y < ky; y++) {
      for (let z = 0; z < kz; z++) {
        const extremeCount = [
          x === 0 || x === kx - 1,
          y === 0 || y === ky - 1,
          z === 0 || z === kz - 1,
        ].filter(Boolean).length;
        cells.push({
          position: [
            (x - centerX) * CELL_UNIT_XZ,
            (y - centerY) * CELL_UNIT_Y,
            (z - centerZ) * CELL_UNIT_XZ,
          ],
          coords: [x, y, z],
          extremeCount,
        });
      }
    }
  }
  return cells;
}

/** Evenly-spread selection of `count` items out of `pool`, preserving order. */
function strideSample<T>(pool: T[], count: number): T[] {
  if (count <= 0) return [];
  if (count >= pool.length) return pool.slice();
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    result.push(pool[Math.floor((i * pool.length) / count)]);
  }
  return result;
}

/**
 * Generates the assembled-cube positions (R7 grouping into 6 hierarchical
 * layers). The base box dimensions `[kx, ky, kz]` (each >= 3) are derived
 * from `n` by `chooseGridDims()` as the near-cubic box with the least wasted
 * cells that still holds at least `n` cells (see that function's own
 * comment for the bugfix history — this used to force a perfectly cubic
 * `k*k*k` grid, which left up to ~53% of cells empty for `n` values that
 * don't land near a perfect cube). **The grid is built at those dimensions
 * and trimmed down to exactly `n` cells**, not the other way around. The
 * trim always keeps all 8 corners (`layer 5`, required unconditionally by
 * the Final Lock, R11-R14, in every quality tier) and distributes the
 * remaining budget proportionally across the other 5 layers using an
 * evenly-spread stride sample, so no layer collapses to zero unless `n` is
 * smaller than the cell count already claimed by the corners plus a fair
 * share of the other layers (documented decision — see
 * progress/impl_project-hero-lego-animation.md for the exact rationale).
 */
export function generateCubePositions(n: number): CubeCell[] {
  const [kx, ky, kz] = chooseGridDims(n);
  const grid = buildFullGrid(kx, ky, kz);
  const centerX = (kx - 1) / 2;
  const centerY = (ky - 1) / 2;
  const centerZ = (kz - 1) / 2;

  const corners = grid.filter((c) => c.extremeCount === 3); // always exactly 8
  const edges = grid.filter((c) => c.extremeCount === 2);
  const faces = grid.filter((c) => c.extremeCount === 1);
  const interior = grid.filter((c) => c.extremeCount === 0);

  // Interior cells are further split into 3 sub-layers (core / inner layers
  // / structural) by Chebyshev distance-to-center rank, see design.md. At
  // small grid sizes several interior cells share the exact same distance
  // value, so the split is done by *rank* among cells sorted by distance
  // (ties broken by build order, deterministic) rather than by distinct
  // distance value — that guarantees ~evenly-sized buckets (so every
  // sub-layer has some presence for the assembly narrative, R7) instead of
  // collapsing to zero whenever there are fewer than 3 distinct distance
  // values. Distance is Chebyshev over the per-axis center offsets — with
  // `kx`/`ky`/`kz` no longer necessarily equal (see `chooseGridDims()`),
  // this is no longer perfectly rotationally symmetric, but it only needs
  // to produce a reasonable, deterministic layering, not an exact one.
  const interiorSorted = interior
    .map((c) => ({
      cell: c,
      dist: Math.max(
        Math.abs(c.coords[0] - centerX),
        Math.abs(c.coords[1] - centerY),
        Math.abs(c.coords[2] - centerZ)
      ),
    }))
    .sort((a, b) => a.dist - b.dist);
  const interiorCount = interiorSorted.length;
  const interiorLayerOf = (rank: number): 0 | 1 | 2 =>
    interiorCount === 0 ? 0 : (Math.min(2, Math.floor((rank / interiorCount) * 3)) as 0 | 1 | 2);
  const core = interiorSorted.filter((c, i) => interiorLayerOf(i) === 0).map((c) => c.cell);
  const innerLayers = interiorSorted.filter((c, i) => interiorLayerOf(i) === 1).map((c) => c.cell);
  const structural = interiorSorted.filter((c, i) => interiorLayerOf(i) === 2).map((c) => c.cell);

  const remaining = Math.max(0, n - corners.length);
  const nonCornerPools: { layer: CubeLayer; pool: GridCell[] }[] = [
    { layer: 0, pool: core },
    { layer: 1, pool: innerLayers },
    { layer: 2, pool: structural },
    { layer: 3, pool: faces },
    { layer: 4, pool: edges },
  ];
  const totalNonCorner = nonCornerPools.reduce((sum, p) => sum + p.pool.length, 0);

  const targets = nonCornerPools.map((p) =>
    totalNonCorner === 0 ? 0 : Math.round((remaining * p.pool.length) / totalNonCorner)
  );
  // Rounding can leave the sum off by a few — reconcile against the largest
  // pools first so the final count matches `remaining` exactly.
  let diff = remaining - targets.reduce((a, b) => a + b, 0);
  const order = nonCornerPools
    .map((p, i) => i)
    .sort((a, b) => nonCornerPools[b].pool.length - nonCornerPools[a].pool.length);
  let guard = 0;
  while (diff !== 0 && guard < 10000) {
    for (const i of order) {
      if (diff === 0) break;
      if (diff > 0 && targets[i] < nonCornerPools[i].pool.length) {
        targets[i]++;
        diff--;
      } else if (diff < 0 && targets[i] > 0) {
        targets[i]--;
        diff++;
      }
    }
    guard++;
  }

  const result: CubeCell[] = corners.map((c) => ({ position: c.position, layer: 5 }));
  nonCornerPools.forEach((p, i) => {
    strideSample(p.pool, targets[i]).forEach((c) => {
      result.push({ position: c.position, layer: p.layer });
    });
  });

  return result;
}

/**
 * Of the 8 assembled corners (`layer 5`), selects the 4 designated for the
 * Final Lock climax (R11-R13): an alternating diagonal set (even-parity
 * corners relative to the cube's centroid, i.e. a regular-tetrahedron
 * subset — no two of the 4 share a cube edge), a deterministic criterion
 * documented in design.md as "diagonal alterna". The other 4 corners settle
 * normally as part of the regular `assembly` phase.
 */
export function selectFinalLockCorners(cells: CubeCell[]): Vector3Tuple[] {
  const corners = cells.filter((c) => c.layer === 5);
  if (corners.length === 0) return [];
  const cx = corners.reduce((s, c) => s + c.position[0], 0) / corners.length;
  const cy = corners.reduce((s, c) => s + c.position[1], 0) / corners.length;
  const cz = corners.reduce((s, c) => s + c.position[2], 0) / corners.length;

  return corners
    .filter((c) => {
      const bits =
        (c.position[0] > cx ? 1 : 0) + (c.position[1] > cy ? 1 : 0) + (c.position[2] > cz ? 1 : 0);
      return bits % 2 === 0;
    })
    .map((c) => c.position);
}
