// Pure quality-tier decision for the LEGO hero scene (R19) — see design.md
// "Fallback mobile / gama baja". Takes the signals as parameters instead of
// reading `window`/`navigator` directly so it stays testable with Vitest.
export type QualityTier = "full" | "reduced";

/** Same `md:` breakpoint (768px) the rest of the layout uses (R2). */
const NARROW_VIEWPORT_BREAKPOINT = 768;
const LOW_CORE_COUNT_THRESHOLD = 4;
const LOW_DEVICE_MEMORY_GB = 4;

export function getQualityTier(
  viewportWidth: number,
  hardwareConcurrency: number | undefined,
  deviceMemory: number | undefined
): QualityTier {
  const isNarrowViewport = viewportWidth < NARROW_VIEWPORT_BREAKPOINT;
  const isLowCoreCount =
    hardwareConcurrency !== undefined && hardwareConcurrency <= LOW_CORE_COUNT_THRESHOLD;
  const isLowMemory =
    deviceMemory !== undefined && deviceMemory <= LOW_DEVICE_MEMORY_GB;

  return isNarrowViewport || isLowCoreCount || isLowMemory ? "reduced" : "full";
}

/**
 * Piece count per tier — a fixed perfect-cube number (`k^3`), not a random
 * range, per user request: the assembled shape must always be a true cube
 * (equal width/height/depth), not just "roughly cubic". Picking `n = k^3`
 * exactly means `generateCubePositions()` needs zero trimming to fit `n`
 * pieces into a `k*k*k` grid — 100% fill, no fragmentation, and
 * `chooseGridDims()` naturally returns `[k, k, k]` (its zero-waste result
 * always wins), no changes needed there.
 *
 * `full` is `k=10` (1000 pieces) per explicit user request ("el cubo debe
 * ser de 10x10"). `reduced` was NOT bumped to match 1:1 — that tier exists
 * specifically so low-end/narrow-viewport devices stay light (no shadows,
 * capped pixel ratio, etc., see `bricks.ts`/`scene.ts`), and 1000 pieces
 * would defeat that. Picked `k=6` (216 pieces) instead: a real, visible
 * step up from the previous `k=4` (64), while staying well under `full`'s
 * weight. `app/components/lego/scene.ts`'s `CAMERA_RADIUS`/`CAMERA_HEIGHT`
 * were increased alongside this — a `k=10` cube is physically much larger
 * (bounding radius ~12.6 world units vs. the old `k=5`'s ~6.24), and the
 * camera distance has to grow to keep fitting it in frame (see that file's
 * comment for the recalculated numbers) — this was the same class of bug
 * fixed once already (canvas/camera not fitting the actual scene content).
 */
export const BRICK_COUNT: Record<QualityTier, number> = {
  full: 1000, // 10^3
  reduced: 216, // 6^3
};

export function pickBrickCount(tier: QualityTier): number {
  return BRICK_COUNT[tier];
}
