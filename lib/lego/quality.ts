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
 * always wins), no changes needed there. `full` uses `k=5` (125 pieces,
 * close to the original 80-120 range's upper end); `reduced` uses `k=4`
 * (64 pieces) — lighter than `full` for low-end/mobile, still a
 * convincingly dense cube (a `k=3`/27-piece cube reads as too sparse).
 */
export const BRICK_COUNT: Record<QualityTier, number> = {
  full: 125, // 5^3
  reduced: 64, // 4^3
};

export function pickBrickCount(tier: QualityTier): number {
  return BRICK_COUNT[tier];
}
