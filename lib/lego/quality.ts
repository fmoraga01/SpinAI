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

/** Piece count range per tier (R4 for full, R19 for reduced). */
export const BRICK_COUNT_RANGE: Record<QualityTier, [number, number]> = {
  full: [80, 120],
  reduced: [30, 40],
};

export function pickBrickCount(tier: QualityTier, rng: () => number = Math.random): number {
  const [min, max] = BRICK_COUNT_RANGE[tier];
  return Math.round(min + rng() * (max - min));
}
