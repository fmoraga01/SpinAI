// GSAP master timeline — floating -> signal -> assembly -> Final Lock ->
// wave -> OrbitControls handoff. See design.md "GSAP timeline maestro" and
// "Final Lock — secuencia explícita".
import * as THREE from "three";
import gsap from "gsap";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildCatmullRomPath } from "@/lib/lego/paths";
import type { PieceRef } from "./bricks";
import { CAMERA_RADIUS, CAMERA_HEIGHT } from "./scene";

export type PiecePhase = "idle" | "signaling" | "traveling" | "settled";

export interface PieceRuntime {
  ref: PieceRef;
  curve: THREE.CatmullRomCurve3;
  progress: number; // 0-1 (can transiently exceed 1 during back.out overshoot)
  scale: number;
  phase: PiecePhase;
  floatingPosition: THREE.Vector3;
  cubePosition: THREE.Vector3;
  radialDir: THREE.Vector3;
  waveOffset: number;
  startQuaternion: THREE.Quaternion;
  endQuaternion: THREE.Quaternion;
  idlePhase: number;
  idleAxis: THREE.Vector3;
  idleSpeed: number;
  driftPhase: THREE.Vector3;
  driftAmplitude: number;
  currentPosition: THREE.Vector3;
  currentQuaternion: THREE.Quaternion;
}

/** Small, bounded extrapolation distance for the transient back.out()
 * overshoot past `progress = 1` (R8) — see `sampleCurve` below. */
const OVERSHOOT_EXTRAPOLATION = 0.6;

function randomAxis(): THREE.Vector3 {
  return new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ).normalize();
}

/** Builds the mutable per-piece animation state, one per `PieceRef`. Each
 * piece starts at its floating position/orientation with a random idle
 * rotation axis/speed and drift phase (R5). */
export function createPieceRuntimes(pieces: PieceRef[]): PieceRuntime[] {
  return pieces.map((ref, i) => {
    const floatingPosition = new THREE.Vector3(...ref.assignment.floatingPosition);
    const cubePosition = new THREE.Vector3(...ref.assignment.cubePosition);
    const pathPoints = buildCatmullRomPath(
      ref.assignment.floatingPosition,
      ref.assignment.cubePosition,
      i + 1
    );
    const curve = new THREE.CatmullRomCurve3(
      pathPoints.map((p) => new THREE.Vector3(...p))
    );
    const startQuaternion = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
    );
    return {
      ref,
      curve,
      progress: 0,
      scale: 1,
      phase: "idle",
      floatingPosition,
      cubePosition,
      radialDir: cubePosition.lengthSq() > 1e-6 ? cubePosition.clone().normalize() : new THREE.Vector3(0, 1, 0),
      waveOffset: 0,
      startQuaternion,
      endQuaternion: new THREE.Quaternion(), // identity: aligned, "factory" orientation once assembled
      idlePhase: Math.random() * Math.PI * 2,
      idleAxis: randomAxis(),
      idleSpeed: 0.3 + Math.random() * 0.5,
      driftPhase: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(Math.PI * 2),
      driftAmplitude: 0.15 + Math.random() * 0.2,
      currentPosition: floatingPosition.clone(),
      currentQuaternion: startQuaternion.clone(),
    };
  });
}

const _matrix = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _finalPos = new THREE.Vector3();

/** Writes a piece's current position/rotation/scale into its InstancedMesh
 * slot. Called from every GSAP `onUpdate` and from the idle rAF loop. */
export function updateMatrix(piece: PieceRuntime): void {
  _finalPos.copy(piece.currentPosition);
  if (piece.waveOffset !== 0) {
    _finalPos.addScaledVector(piece.radialDir, piece.waveOffset);
  }
  _scaleVec.set(piece.scale, piece.scale, piece.scale);
  _matrix.compose(_finalPos, piece.currentQuaternion, _scaleVec);
  piece.ref.mesh.setMatrixAt(piece.ref.index, _matrix);
  piece.ref.mesh.instanceMatrix.needsUpdate = true;
}

/** Samples the travel curve at `progress`, allowing a small, bounded
 * extrapolation past the endpoint for the transient overshoot produced by
 * `ease: "back.out(...)"` tweens targeting `progress: 1` (GSAP eases can
 * transiently exceed their target value — `CatmullRomCurve3.getPoint` only
 * accepts `[0,1]`, so values above 1 are extrapolated linearly along the
 * exit tangent instead of being clamped away, which is what would silently
 * swallow the overshoot R8 asks for). */
function sampleCurve(curve: THREE.CatmullRomCurve3, rawT: number): THREE.Vector3 {
  const t = THREE.MathUtils.clamp(rawT, 0, 1);
  const point = curve.getPoint(t);
  const excess = rawT - 1;
  if (excess > 0) {
    const tangent = curve.getTangent(1).normalize();
    point.addScaledVector(tangent, Math.min(excess, 0.5) * OVERSHOOT_EXTRAPOLATION);
  }
  return point;
}

function updatePieceFromProgress(piece: PieceRuntime): void {
  piece.currentPosition.copy(sampleCurve(piece.curve, piece.progress));
  const clamped = THREE.MathUtils.clamp(piece.progress, 0, 1);
  piece.currentQuaternion.copy(piece.startQuaternion).slerp(piece.endQuaternion, clamped);
  updateMatrix(piece);
}

/** Idle drift + self-rotation for pieces still in the "floating" phase (R5)
 * — runs every render frame outside of GSAP, in parallel with whatever
 * stage of the master timeline is currently playing (matches
 * `AnimatedGrid.tsx`'s `idlePhase` pattern, reused as an idea, not code). */
export function stepIdlePieces(pieces: PieceRuntime[], dt: number, elapsed: number): void {
  for (const piece of pieces) {
    if (piece.phase !== "idle") continue;
    piece.idlePhase += dt * piece.idleSpeed;
    const spin = new THREE.Quaternion().setFromAxisAngle(piece.idleAxis, dt * piece.idleSpeed);
    piece.currentQuaternion.multiply(spin);
    piece.currentPosition.set(
      piece.floatingPosition.x + Math.sin(elapsed * 0.4 + piece.driftPhase.x) * piece.driftAmplitude,
      piece.floatingPosition.y + Math.sin(elapsed * 0.33 + piece.driftPhase.y) * piece.driftAmplitude,
      piece.floatingPosition.z + Math.sin(elapsed * 0.37 + piece.driftPhase.z) * piece.driftAmplitude
    );
    updateMatrix(piece);
  }
}

export interface CameraOrbitState {
  theta: number;
}

/** Total angular sweep of the ambient camera orbit across Escenas 1-3
 * (unchanged from the tween this replaced). */
const CAMERA_ORBIT_SWEEP = Math.PI * 0.85;

/** Drives the ambient camera orbit outside the (reversible) master
 * timeline — see the comment above `buildMasterTimeline`'s Final Lock
 * section for why: a tween living *inside* a timeline that gets
 * `reverse()`d for the rewind loop would rotate backward during
 * disassembly, producing a visible direction-flip at the loop seam.
 * `state.theta` only ever increases (`dt` from the render loop is always
 * >= 0 regardless of which way `tl` is currently playing), so the camera
 * orbits the same direction through assembly *and* rewind, seamlessly.
 *
 * Rotation is paused — not reset, just held — once `tl.time()` reaches
 * `rotatingZoneEnd` (pass `tl.labels.finalLock`, the same instant the old
 * tween's duration ended), matching the original "camera holds through
 * Final Lock/wave so attention stays on the corner pieces" behavior in
 * both playback directions (`tl.time()` reports the current absolute
 * position regardless of forward/reverse). No-ops once `controls.enabled`
 * (R14 handoff to OrbitControls has happened, it owns the camera now). */
export function stepCameraOrbit(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  tl: gsap.core.Timeline,
  rotatingZoneEnd: number,
  state: CameraOrbitState,
  dt: number
): void {
  if (controls.enabled) return;
  if (tl.time() < rotatingZoneEnd) {
    const angularSpeed = CAMERA_ORBIT_SWEEP / rotatingZoneEnd;
    state.theta = (state.theta + angularSpeed * dt) % (Math.PI * 2);
  }
  camera.position.set(
    Math.sin(state.theta) * CAMERA_RADIUS,
    CAMERA_HEIGHT,
    Math.cos(state.theta) * CAMERA_RADIUS
  );
  camera.lookAt(0, 0, 0);
}

export interface MasterTimelineParams {
  pieces: PieceRuntime[];
  finalLockPieces: PieceRuntime[]; // exactly 4, in Final Lock order
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

const FLOATING_DURATION = 3;
const SIGNAL_DURATION = 2;
const SIGNAL_TWEEN_DURATION = 0.35; // ~150-250ms up + settle back, per piece
const SNAP_DURATION = 0.15;

/** Assembly stage order (R7): core -> inner layers -> structural -> faces
 * -> edges -> the 4 non-Final-Lock corners (Final Lock's own 4 corners are
 * excluded here and animated separately, see `addFinalLock`). Durations
 * decrease and pauses grow across stages, per R10 ("ritmo acelera
 * gradualmente"); concrete values chosen within design.md's documented
 * ranges (1.2-2.2s duration, 0.3-0.6s pause).
 *
 * Pauses cut down from the design.md range (user feedback 2026-08-07: the
 * last 2-3 staggered pieces of a stage always lagged behind the rest, and
 * gating the next stage on 100% of the current stage landing — plus this
 * fixed pause on top — read as a dead stall, not a deliberate beat. See
 * `STAGE_OVERLAP_FACTOR` below for the other half of the fix. */
const ASSEMBLY_STAGE_DURATIONS = [2.2, 1.9, 1.6, 1.4, 1.3, 1.2];
const ASSEMBLY_STAGE_PAUSES = [0.12, 0.13, 0.15, 0.17, 0.2, 0.22];
/** Per-piece start stagger within a stage (R9's "no todas a la vez"),
 * tightened alongside the pause cut above — narrower spread means fewer
 * pieces visibly straggle at a stage's tail. */
const STAGE_STAGGER_STEP = 0.01;
const STAGE_STAGGER_CAP = 0.15;
/** Fraction of a stage's own span (start of its first piece to landing of
 * its last) that must elapse before the *next* stage's pieces start
 * moving. <1 means overlap: the next stage begins while this stage's
 * slowest pieces are still mid-flight/snapping, instead of everything
 * going still first — this is what actually removes the "espera" the
 * hard 100%-then-pause gate produced, the pause trim alone only shrinks
 * it. Chosen conservatively (pieces still get ~2/3 of the stage's motion
 * to land before the next one starts) so stages still read as "one layer
 * finishes, then the next" rather than all blurring together. */
const STAGE_OVERLAP_FACTOR = 0.65;

function addPieceTravel(
  tl: gsap.core.Timeline,
  piece: PieceRuntime,
  startTime: number,
  duration: number
): number {
  const mainDuration = duration * 0.8;
  const overshootDuration = duration * 0.2;
  tl.to(
    piece,
    {
      progress: 0.92,
      duration: mainDuration,
      ease: "power2.inOut",
      onStart: () => {
        piece.phase = "traveling";
      },
      // Bugfix (user report 2026-08-08): during the rewind loop, pieces
      // that finish reverse-traveling back to their floating spot stopped
      // idle-spinning (`stepIdlePieces` only steps `phase === "idle"`
      // pieces) — because `onComplete` above only fires forward, nothing
      // ever put them back on "idle" until the *entire* timeline reversed
      // all the way to t=0, so most pieces just sat frozen while only the
      // last (earliest-assembled, "core" stage) pieces were still visibly
      // moving. This tween is the *first* one added per piece (earliest
      // start time), so it's the *last* one exited while reversing —
      // exactly the moment this piece's own travel is fully undone.
      // `onReverseComplete` fires right then, per piece, independent of
      // when the rest of the timeline finishes.
      onReverseComplete: () => {
        piece.phase = "idle";
      },
      onUpdate: () => updatePieceFromProgress(piece),
    },
    startTime
  );
  tl.to(
    piece,
    { progress: 1, duration: overshootDuration, ease: "back.out(1.4)", onUpdate: () => updatePieceFromProgress(piece) },
    startTime + mainDuration
  );
  const snapStart = startTime + mainDuration + overshootDuration;
  tl.to(piece, { scale: 1.08, duration: SNAP_DURATION / 2, ease: "power1.out", onUpdate: () => updateMatrix(piece) }, snapStart);
  tl.to(
    piece,
    {
      scale: 1,
      duration: SNAP_DURATION / 2,
      ease: "power1.inOut",
      onUpdate: () => updateMatrix(piece),
      onComplete: () => {
        piece.phase = "settled";
      },
    },
    snapStart + SNAP_DURATION / 2
  );
  return snapStart + SNAP_DURATION;
}

/** Builds (but does not start — `paused: true`) the full narrative timeline
 * for one mount of the scene. All positions in the timeline are computed
 * against an explicit `cursor` (rather than relying on GSAP's implicit
 * sequential insertion) so every stage's pauses (R10) are just "nothing
 * scheduled during this gap", auditable in one place. */
export function buildMasterTimeline({
  pieces,
  finalLockPieces,
  camera,
  controls,
}: MasterTimelineParams): gsap.core.Timeline {
  // No onComplete handoff here anymore -- see `attachAssemblyLoop` below,
  // which owns the assemble/hold/rewind loop and the eventual R14 handoff
  // to OrbitControls (now on first user interaction, not automatic).
  const tl = gsap.timeline({ paused: true });

  let cursor = 0;

  // ── Escena 1: floating (R5) — idle drift/rotation is driven by
  // `stepIdlePieces` from the render loop, outside this timeline. The
  // camera orbit tween itself is added further below, once the full
  // Escenas 1-3 duration is known (design.md: "controlada por GSAP durante
  // las Escenas 1-3", not just the floating phase).
  tl.addLabel("floating", cursor);
  cursor += FLOATING_DURATION;

  // ── Escena 2: signal (R6) — propagates from the center outward.
  tl.addLabel("signal", cursor);
  const maxDistance = pieces.reduce((max, p) => Math.max(max, p.floatingPosition.length()), 0) || 1;
  for (const piece of pieces) {
    const delay = (piece.floatingPosition.length() / maxDistance) * (SIGNAL_DURATION - SIGNAL_TWEEN_DURATION);
    const start = cursor + delay;
    tl.to(
      piece,
      {
        scale: 1.18,
        duration: SIGNAL_TWEEN_DURATION / 2,
        ease: "power2.out",
        onStart: () => {
          piece.phase = "signaling";
        },
        // Same per-piece reverse-completion fix as `addPieceTravel`'s first
        // tween — this is the earliest-starting (so last-exited-in-reverse)
        // tween of the pair, so it's the right spot to hand the piece back
        // to "idle" the instant *this piece's* rewind through the signal
        // pulse finishes, not only once the whole timeline reaches t=0.
        onReverseComplete: () => {
          piece.phase = "idle";
        },
        onUpdate: () => updateMatrix(piece),
      },
      start
    );
    tl.to(
      piece,
      {
        scale: 1,
        duration: SIGNAL_TWEEN_DURATION / 2,
        ease: "power2.inOut",
        onUpdate: () => updateMatrix(piece),
        onComplete: () => {
          piece.phase = "idle";
        },
      },
      start + SIGNAL_TWEEN_DURATION / 2
    );
  }
  cursor += SIGNAL_DURATION;

  // ── Escena 3: assembly (R7-R10), 6 stages in hierarchical order. Final
  // Lock's 4 designated corners (layer 5) are excluded from the last stage.
  tl.addLabel("assembly", cursor);
  const finalLockKeys = new Set(finalLockPieces.map((p) => p.ref.assignment.cubePosition.join(",")));
  const stageGroups: PieceRuntime[][] = [0, 1, 2, 3, 4].map((layer) =>
    pieces.filter((p) => p.ref.assignment.layer === layer)
  );
  stageGroups.push(
    pieces.filter(
      (p) => p.ref.assignment.layer === 5 && !finalLockKeys.has(p.ref.assignment.cubePosition.join(","))
    )
  );

  const stageLabels = ["core", "innerLayers", "structural", "faces", "edges", "cornersNormal"];
  stageGroups.forEach((group, stageIndex) => {
    tl.addLabel(stageLabels[stageIndex], cursor);
    const duration = ASSEMBLY_STAGE_DURATIONS[stageIndex];
    const stageStart = cursor;
    let stageEnd = cursor;
    group.forEach((piece, i) => {
      const stagger = Math.min(i * STAGE_STAGGER_STEP, STAGE_STAGGER_CAP);
      const end = addPieceTravel(tl, piece, cursor + stagger, duration);
      stageEnd = Math.max(stageEnd, end);
    });
    // Overlap (see STAGE_OVERLAP_FACTOR comment): next stage starts partway
    // through this one's span, not after every last piece has fully landed.
    const stageSpan = stageEnd - stageStart;
    cursor = stageStart + stageSpan * STAGE_OVERLAP_FACTOR + ASSEMBLY_STAGE_PAUSES[stageIndex];
  });

  // Camera orbit used to live here as a GSAP tween (theta 0 -> 0.85*PI over
  // Escenas 1-3, held through Final Lock/wave) — moved out to
  // `stepCameraOrbit()` below (user feedback 2026-08-08: tweening it
  // *inside* this timeline meant `tl.reverse()` (the rewind loop's rewind)
  // reversed the camera's rotation direction along with the pieces, so
  // assembling and disassembling visibly orbited opposite ways, with an
  // abrupt direction flip right at the loop seam. `stepCameraOrbit` reads
  // `tl.time()` / `tl.labels.finalLock` (still set below, unchanged) but
  // drives `theta` off real elapsed time outside the timeline, so it always
  // advances the same direction regardless of which way the timeline is
  // currently playing — same reasoning as `stepIdlePieces` already being a
  // continuous effect run outside GSAP instead of a reversible tween.

  // ── Final Lock (R11-R13, simplified per user request 2026-08-08): used
  // to be a deliberate suspense build — 3 corners landing one at a time
  // with pauses between them, then a 4th "climax" corner with its own
  // slower approach/align/settle sequence (`addFinalCornerTravel`, since
  // removed). That took ~7s for just 4 pieces while the other ~121 landed
  // in ~8s combined, and read as disproportionately slow rather than
  // dramatic. Traded the suspense beat for speed: all 4 corners now
  // assemble simultaneously with the same `addPieceTravel` every other
  // piece uses (including its own "magnetic snap" flash, scale 1 -> 1.08
  // -> 1 — nothing piece-specific left to call out here anymore).
  tl.addLabel("finalLock", cursor);
  cursor += 0.65; // "dejar flotando, pausar" (0.5-0.8s) — kept as a short beat before the final snap
  const finalLockDuration = 1.0;
  let finalLockEnd = cursor;
  for (const piece of finalLockPieces) {
    const end = addPieceTravel(tl, piece, cursor, finalLockDuration);
    finalLockEnd = Math.max(finalLockEnd, end);
  }
  cursor = finalLockEnd;

  // ── Onda final (R13) + pulso de escala sincronizado — "cube complete"
  // climax. User feedback (2026-08-07): the original ripple alone (0.6s,
  // 0.06 amplitude) was intentionally tiny/near-imperceptible and didn't
  // read as a clear "done!" moment. Two effects now layered on top of each
  // other, both anchored at the same `cursor`:
  //   1. A synchronized scale pulse across every piece at once (no
  //      distance-based stagger, unlike the ripple below) — same
  //      "magnetic snap" overshoot feel every `addPieceTravel` snap already
  //      has (peak 1.08), but hitting the whole cube in lockstep so it
  //      reads as one unmistakable beat instead of a per-piece detail.
  //   2. The radial ripple, kept staggered by distance from center so it
  //      still visibly propagates outward — just bigger/slower than
  //      before (amplitude 0.06 -> 0.22, duration 0.6s -> 1.0s).
  tl.addLabel("wave", cursor);
  const PULSE_PEAK_SCALE = 1.16;
  const PULSE_UP_DURATION = 0.2;
  const PULSE_DOWN_DURATION = 0.3;
  for (const piece of pieces) {
    tl.to(
      piece,
      { scale: PULSE_PEAK_SCALE, duration: PULSE_UP_DURATION, ease: "back.out(2.5)", onUpdate: () => updateMatrix(piece) },
      cursor
    );
    tl.to(
      piece,
      { scale: 1, duration: PULSE_DOWN_DURATION, ease: "power2.inOut", onUpdate: () => updateMatrix(piece) },
      cursor + PULSE_UP_DURATION
    );
  }

  const WAVE_DURATION = 1.0;
  const WAVE_TWEEN = 0.4;
  const WAVE_AMPLITUDE = 0.22;
  const maxCubeDist = pieces.reduce((max, p) => Math.max(max, p.cubePosition.length()), 0) || 1;
  let waveEnd = cursor;
  for (const piece of pieces) {
    const delay = (piece.cubePosition.length() / maxCubeDist) * (WAVE_DURATION - WAVE_TWEEN);
    const start = cursor + delay;
    tl.to(piece, { waveOffset: WAVE_AMPLITUDE, duration: WAVE_TWEEN / 2, ease: "sine.inOut", onUpdate: () => updateMatrix(piece) }, start);
    const end = start + WAVE_TWEEN;
    tl.to(piece, { waveOffset: 0, duration: WAVE_TWEEN / 2, ease: "sine.inOut", onUpdate: () => updateMatrix(piece) }, start + WAVE_TWEEN / 2);
    waveEnd = Math.max(waveEnd, end);
  }
  cursor = Math.max(waveEnd, cursor + PULSE_UP_DURATION + PULSE_DOWN_DURATION);

  return tl;
}

/** Drives the assemble -> rewind -> reassemble ambient loop. The cube
 * starts rewinding the instant it finishes assembling — no hold (user
 * request 2026-08-08: originally held 5s before rewinding, then asked to
 * drop that wait entirely so it un-assembles "sin tiempo de espera").
 * `tl.reverse()` plays every tween in the timeline backward — including
 * the camera orbit and the Final Lock/wave climax — which is exactly a
 * "rewind": pieces retrace their travel curves back to their floating
 * positions through the same eases, ending at `progress = 0` (verified:
 * `updatePieceFromProgress` at `progress = 0` reproduces
 * `floatingPosition`/`startQuaternion` exactly, the same values
 * `createPieceRuntimes` seeded — so the loop is seamless, not a jump-cut).
 *
 * One thing GSAP's reverse doesn't handle for free: `piece.phase`
 * ("idle"/"signaling"/"traveling"/"settled", read by `stepIdlePieces` to
 * decide which pieces get ambient drift) is set by each tween's `onStart`/
 * `onComplete`. `onComplete` only fires on forward completion, never
 * during reverse playback, so after a reverse-to-start every piece is left
 * on whatever phase its *last forward-direction* tween's `onStart`
 * happened to set (in practice "signaling", from the Escena 2 signal
 * tween) instead of back to "idle" — silently killing that piece's idle
 * drift for the rest of the session. Fixed by forcing every piece back to
 * "idle" in `onReverseComplete`, once the timeline has actually reached
 * time 0.
 *
 * The loop runs until the user's first drag (`pointerdown`), which stops
 * it, freezes the timeline exactly where it is (assembling or
 * disassembling — decorative, not worth snapping to a "clean" state for),
 * and hands the camera over to `OrbitControls` (R14) with `autoRotate` off
 * (the user just grabbed it, so give direct control instead of fighting an
 * ambient auto-rotate) — the same handoff `attachAutoRotateStopper` used
 * to do once-only before this loop existed. Returns a cleanup function to
 * remove the listener/callbacks on unmount (R20). */
export function attachAssemblyLoop(
  tl: gsap.core.Timeline,
  pieces: PieceRuntime[],
  controls: OrbitControls,
  domElement: HTMLElement
): () => void {
  let stopped = false;

  tl.eventCallback("onComplete", () => {
    if (stopped) return;
    tl.reverse();
  });

  tl.eventCallback("onReverseComplete", () => {
    if (stopped) return;
    for (const piece of pieces) piece.phase = "idle";
    tl.play();
  });

  const stopOnInteract = () => {
    if (stopped) return;
    stopped = true;
    tl.eventCallback("onComplete", null);
    tl.eventCallback("onReverseComplete", null);
    tl.pause();
    controls.enabled = true; // R14
    controls.autoRotate = false;
    domElement.removeEventListener("pointerdown", stopOnInteract);
  };
  domElement.addEventListener("pointerdown", stopOnInteract);

  return () => {
    stopped = true;
    tl.eventCallback("onComplete", null);
    tl.eventCallback("onReverseComplete", null);
    domElement.removeEventListener("pointerdown", stopOnInteract);
  };
}

/** Places a piece directly at its assembled position/orientation with no
 * animation — used for `prefers-reduced-motion` (R18). */
export function placePieceAtCube(piece: PieceRuntime): void {
  piece.progress = 1;
  piece.phase = "settled";
  piece.currentPosition.copy(piece.cubePosition);
  piece.currentQuaternion.copy(piece.endQuaternion);
  updateMatrix(piece);
}
