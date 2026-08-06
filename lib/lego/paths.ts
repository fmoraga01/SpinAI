// Pure Catmull-Rom control-point generation for piece travel paths (R8) —
// see design.md "Trayectorias — paths.ts". No `three` import: returns plain
// tuples; `THREE.CatmullRomCurve3` is built from these in
// `app/components/lego/timeline.ts`.
import { createRng } from "./rng";
import type { Vector3Tuple } from "./layout";

/** Perpendicular offset applied to intermediate control points, as a
 * fraction of the straight-line travel distance. Keeps curves "weaving"
 * without crossing neighboring pieces' paths (design.md). */
const OFFSET_RATIO = 0.22;

function subtract(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function length(v: Vector3Tuple): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function normalize(v: Vector3Tuple): Vector3Tuple {
  const len = length(v);
  if (len < 1e-9) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a: Vector3Tuple, b: Vector3Tuple): Vector3Tuple {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

/**
 * Builds the intermediate control points of a Catmull-Rom travel path from
 * `from` to `to`: 2-3 points along the straight line, displaced
 * perpendicularly by a pseudo-random (but seed-deterministic) offset, so no
 * piece travels in a straight line (R8). Returns the full point list
 * (`[from, ...controls, to]`) ready to hand to
 * `new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))`.
 *
 * Deterministic: the same `(from, to, seed)` always produces the same
 * result, so this is testable without a non-deterministic `Math.random()`.
 */
export function buildCatmullRomPath(
  from: Vector3Tuple,
  to: Vector3Tuple,
  seed: number
): Vector3Tuple[] {
  const rng = createRng(seed);
  const direction = subtract(to, from);
  const distance = length(direction);
  const forward = normalize(direction);

  // Any vector not parallel to `forward`, used to derive a perpendicular
  // basis for the offset — falls back to a different axis if `forward`
  // happens to be aligned with the default "up" reference.
  const upRef: Vector3Tuple =
    Math.abs(forward[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const perpA = normalize(cross(forward, upRef));
  const perpB = normalize(cross(forward, perpA));

  const controlCount = 2 + Math.floor(rng() * 2); // 2 or 3 intermediate points
  const points: Vector3Tuple[] = [from];

  for (let i = 1; i <= controlCount; i++) {
    const t = i / (controlCount + 1);
    const base: Vector3Tuple = [
      from[0] + direction[0] * t,
      from[1] + direction[1] * t,
      from[2] + direction[2] * t,
    ];
    const offsetMagnitude = distance * OFFSET_RATIO * (0.5 + rng() * 0.5);
    const angle = rng() * Math.PI * 2;
    const offset: Vector3Tuple = [
      (perpA[0] * Math.cos(angle) + perpB[0] * Math.sin(angle)) * offsetMagnitude,
      (perpA[1] * Math.cos(angle) + perpB[1] * Math.sin(angle)) * offsetMagnitude,
      (perpA[2] * Math.cos(angle) + perpB[2] * Math.sin(angle)) * offsetMagnitude,
    ];
    points.push([base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]]);
  }

  points.push(to);
  return points;
}
