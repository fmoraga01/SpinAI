// LEGO-brick geometry, materials and InstancedMesh construction — see
// design.md "InstancedMesh — bricks.ts". Imports `three` directly (unlike
// `lib/lego/*`, which stays framework-agnostic).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { CubeCell, Vector3Tuple } from "@/lib/lego/layout";
import type { QualityTier } from "@/lib/lego/quality";

export type BrickSizeId = "2x2" | "2x4" | "1x2" | "plate1x1";
export type ColorName = "white" | "gray" | "blue";

const STUD_UNIT = 0.8; // world-space size of one "stud" footprint cell
const STUD_RADIUS = 0.16;
const STUD_HEIGHT = 0.12;
const STUD_SEGMENTS = 10; // 8-12 per design.md, low-res is enough at this scale
const BEVEL_SEGMENTS = 2; // low, per design.md — LEGO bevels are subtle

interface BrickSizeDef {
  studsX: number;
  studsZ: number;
  height: number;
}

export const BRICK_SIZE_DEFS: Record<BrickSizeId, BrickSizeDef> = {
  "2x2": { studsX: 2, studsZ: 2, height: 0.6 },
  "2x4": { studsX: 4, studsZ: 2, height: 0.6 },
  "1x2": { studsX: 2, studsZ: 1, height: 0.6 },
  plate1x1: { studsX: 1, studsZ: 1, height: 0.22 },
};

/** Palette restricted to white/gray/blue per user request — white
 * dominates, gray is the secondary neutral, blue (`--color-primary`, same
 * accent color as the rest of the site) is a deliberate low-volume,
 * high-contrast accent. */
export const COLOR_PALETTE: { name: ColorName; hex: number; weight: number }[] = [
  { name: "white", hex: 0xf4f5f7, weight: 65 },
  { name: "gray", hex: 0xb9bec9, weight: 27 },
  { name: "blue", hex: 0x2c40ff, weight: 8 }, // var(--color-primary)
];

function pickWeighted<T extends { weight: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

export function pickBrickColor(rng: () => number): ColorName {
  return pickWeighted(COLOR_PALETTE, rng).name;
}

/**
 * All cube-assigned pieces now use a single canonical footprint (`"2x2"`).
 *
 * **Bugfix (post-`done` reopen — see progress/impl_project-hero-lego-animation.md,
 * dated bugfix section, for the full writeup and the visual evidence).**
 * This originally picked per-layer weighted mix of `2x2`/`2x4`/`1x2`/
 * `plate1x1` (layer 2 biased 70% toward `2x4` for visual "mass" — see
 * design.md), but `generateCubePositions()` in `lib/lego/layout.ts` places
 * pieces on a uniform grid with no awareness of which footprint a given
 * cell would end up with — a `2x4` (3.2 world units wide) assigned next to
 * a `plate1x1` (0.8 wide) neighbor massively overlapped it, and the
 * assembled cube looked like a pile of overlapping pieces instead of a
 * clean cube with small, even gaps (R15). Forcing every piece to the same
 * footprint lets `layout.ts` use a single, correct grid spacing (see its
 * `CELL_UNIT_XZ`/`CELL_UNIT_Y` comment) and guarantees no two neighboring
 * pieces can overlap, at the documented cost of losing the layer-2
 * "large block" visual variety and the `1x2`/`2x4`/`plate1x1` mix during
 * the floating cloud (a piece's geometry/size is fixed for its whole
 * lifetime — it can't be one size while floating and another once
 * assembled). `rng`/`layer` are kept as parameters (unused for now) so the
 * call site and function signature don't need to change if per-layer
 * variety is reintroduced later behind a size-aware grid.
 */
export function pickBrickSize(_rng: () => number, _layer: CubeCell["layer"]): BrickSizeId {
  void _rng;
  void _layer;
  return "2x2";
}

/**
 * Builds one merged `BufferGeometry` per brick size: a `RoundedBoxGeometry`
 * body (real bevels, not a plain `BoxGeometry` — see design.md) plus a grid
 * of low-poly `CylinderGeometry` studs on top, fused with
 * `mergeGeometries` so each size stays a single geometry (required for
 * `InstancedMesh`).
 */
export function buildBrickGeometry(sizeId: BrickSizeId): THREE.BufferGeometry {
  const { studsX, studsZ, height } = BRICK_SIZE_DEFS[sizeId];
  const width = studsX * STUD_UNIT;
  const depth = studsZ * STUD_UNIT;
  const bevelRadius = Math.min(0.08, Math.min(width, depth, height) * 0.12);

  const body = new RoundedBoxGeometry(width, height, depth, BEVEL_SEGMENTS, bevelRadius);

  // RoundedBoxGeometry sets `this.index = null` internally (it's built
  // non-indexed, unlike plain BoxGeometry/CylinderGeometry) — mergeGeometries
  // requires every input to agree on indexed vs. non-indexed, so the studs
  // must be de-indexed too or the merge silently fails and studs disappear.
  const bodyNonIndexed = body.index ? body.toNonIndexed() : body;

  const studGeometries: THREE.BufferGeometry[] = [];
  for (let sx = 0; sx < studsX; sx++) {
    for (let sz = 0; sz < studsZ; sz++) {
      const stud = new THREE.CylinderGeometry(
        STUD_RADIUS,
        STUD_RADIUS,
        STUD_HEIGHT,
        STUD_SEGMENTS
      ).toNonIndexed();
      const x = (sx - (studsX - 1) / 2) * STUD_UNIT;
      const z = (sz - (studsZ - 1) / 2) * STUD_UNIT;
      const y = height / 2 + STUD_HEIGHT / 2;
      stud.translate(x, y, z);
      studGeometries.push(stud);
    }
  }

  const merged = mergeGeometries([bodyNonIndexed, ...studGeometries], false);
  if (!merged) {
    // Should be unreachable now that every input geometry is non-indexed
    // with the same (position, normal, uv) attribute set — kept as a
    // defensive fallback so a brick still renders (without studs) instead
    // of throwing if a future three.js version changes this shape again.
    return bodyNonIndexed;
  }
  return merged;
}

/**
 * `roughness`/`clearcoat`/etc. are the definitive values from design.md
 * ("Material" section), not a range — `tier === "reduced"` only turns off
 * `clearcoat` (R19 cost reduction), it doesn't change the base look.
 */
export function createMaterialPalette(
  tier: QualityTier
): Map<ColorName, THREE.MeshPhysicalMaterial> {
  const materials = new Map<ColorName, THREE.MeshPhysicalMaterial>();
  for (const { name, hex } of COLOR_PALETTE) {
    materials.set(
      name,
      new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: tier === "full" ? 0.3 : 0.45,
        metalness: 0,
        clearcoat: tier === "full" ? 0.6 : 0,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1,
      })
    );
  }
  return materials;
}

export interface BrickAssignment {
  size: BrickSizeId;
  color: ColorName;
  layer: CubeCell["layer"];
  floatingPosition: Vector3Tuple;
  cubePosition: Vector3Tuple;
  isFinalLockCorner: boolean;
}

/** Pairs each floating position with its assembled cube destination, and
 * assigns a (size, color) per piece. `floatingPositions.length` must equal
 * `cubeCells.length` (both derived from the same `n`). */
export function buildBrickAssignments(
  cubeCells: CubeCell[],
  floatingPositions: Vector3Tuple[],
  finalLockCorners: Vector3Tuple[],
  rng: () => number
): BrickAssignment[] {
  const finalLockKeys = new Set(finalLockCorners.map((p) => p.join(",")));
  return cubeCells.map((cell, i) => ({
    size: pickBrickSize(rng, cell.layer),
    color: pickBrickColor(rng),
    layer: cell.layer,
    floatingPosition: floatingPositions[i % floatingPositions.length],
    cubePosition: cell.position,
    isFinalLockCorner: finalLockKeys.has(cell.position.join(",")),
  }));
}

export interface PieceRef {
  mesh: THREE.InstancedMesh;
  index: number;
  assignment: BrickAssignment;
}

/** Groups assignments by (size, color) into one `InstancedMesh` per
 * combination (up to 20, not 1 draw call per piece — see design.md). */
export function buildInstancedMeshes(
  assignments: BrickAssignment[],
  materials: Map<ColorName, THREE.MeshPhysicalMaterial>,
  tier: QualityTier
): { meshes: THREE.InstancedMesh[]; pieces: PieceRef[] } {
  const geometryCache = new Map<BrickSizeId, THREE.BufferGeometry>();
  const getGeometry = (size: BrickSizeId) => {
    let geom = geometryCache.get(size);
    if (!geom) {
      geom = buildBrickGeometry(size);
      geometryCache.set(size, geom);
    }
    return geom;
  };

  const groups = new Map<string, BrickAssignment[]>();
  for (const a of assignments) {
    const key = `${a.size}:${a.color}`;
    const group = groups.get(key);
    if (group) group.push(a);
    else groups.set(key, [a]);
  }

  const meshes: THREE.InstancedMesh[] = [];
  const pieces: PieceRef[] = [];
  const matrix = new THREE.Matrix4();

  for (const [key, group] of groups) {
    const [size, color] = key.split(":") as [BrickSizeId, ColorName];
    const material = materials.get(color)!;
    const mesh = new THREE.InstancedMesh(getGeometry(size), material, group.length);
    mesh.castShadow = tier === "full";
    mesh.receiveShadow = tier === "full";
    group.forEach((assignment, index) => {
      matrix.compose(
        new THREE.Vector3(...assignment.floatingPosition),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1)
      );
      mesh.setMatrixAt(index, matrix);
      pieces.push({ mesh, index, assignment });
    });
    mesh.instanceMatrix.needsUpdate = true;
    meshes.push(mesh);
  }

  return { meshes, pieces };
}
