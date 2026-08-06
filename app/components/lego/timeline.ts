// GSAP master timeline — floating -> signal -> assembly -> Final Lock ->
// wave -> OrbitControls handoff. See design.md "GSAP timeline maestro" and
// "Final Lock — secuencia explícita".
import * as THREE from "three";
import gsap from "gsap";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildCatmullRomPath } from "@/lib/lego/paths";
import type { PieceRef } from "./bricks";

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

const CAMERA_RADIUS = 11;
const CAMERA_HEIGHT = 3.4;
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
 * ranges (1.2-2.2s duration, 0.3-0.6s pause). */
const ASSEMBLY_STAGE_DURATIONS = [2.2, 1.9, 1.6, 1.4, 1.3, 1.2];
const ASSEMBLY_STAGE_PAUSES = [0.3, 0.32, 0.36, 0.42, 0.5, 0.55];

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

function addFinalCornerTravel(tl: gsap.core.Timeline, piece: PieceRuntime, startTime: number): number {
  const approachDuration = 0.5;
  const alignDuration = 0.8; // "rotación lenta de alineación" (R12)
  const settleDuration = 0.2;

  tl.to(
    piece,
    {
      progress: 0.85,
      duration: approachDuration,
      ease: "power2.inOut",
      onStart: () => {
        piece.phase = "traveling";
      },
      onUpdate: () => updatePieceFromProgress(piece),
    },
    startTime
  );
  // Alignment: mostly rotation, "sin traslación grande — ya está cerca".
  tl.to(
    piece,
    { progress: 0.97, duration: alignDuration, ease: "sine.inOut", onUpdate: () => updatePieceFromProgress(piece) },
    startTime + approachDuration
  );
  const settleStart = startTime + approachDuration + alignDuration;
  tl.to(piece, { progress: 1, duration: settleDuration / 2, ease: "power2.out", onUpdate: () => updatePieceFromProgress(piece) }, settleStart);
  // "Satisfying magnetic snap" climax: a more pronounced flash than the
  // regular per-piece snaps (1 -> 1.08 -> 1, per design.md).
  tl.to(piece, { scale: 1.08, duration: settleDuration / 2, ease: "back.out(2)", onUpdate: () => updateMatrix(piece) }, settleStart + settleDuration / 2);
  tl.to(
    piece,
    {
      scale: 1,
      duration: settleDuration / 2,
      ease: "power1.inOut",
      onUpdate: () => updateMatrix(piece),
      onComplete: () => {
        piece.phase = "settled";
      },
    },
    settleStart + settleDuration
  );
  return settleStart + settleDuration * 1.5;
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
  const tl = gsap.timeline({
    paused: true,
    onComplete: () => {
      controls.enabled = true; // R14
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
    },
  });

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
    let stageEnd = cursor;
    group.forEach((piece, i) => {
      const stagger = Math.min(i * 0.015, 0.3);
      const end = addPieceTravel(tl, piece, cursor + stagger, duration);
      stageEnd = Math.max(stageEnd, end);
    });
    cursor = stageEnd + ASSEMBLY_STAGE_PAUSES[stageIndex];
  });

  // Camera orbit tween spanning the full Escenas 1-3 (floating -> signal ->
  // assembly), a single slow `theta` sweep with `ease: "none"` (R5, R17:
  // always smooth, never abrupt) — inserted at position 0 now that its
  // total duration (`cursor`, the end of the assembly stages) is known.
  // Camera holds its final orbit position through Final Lock/wave so
  // attention stays on the corner pieces during the climax.
  const preFinalLockDuration = cursor;
  const cameraState = { theta: 0 };
  tl.to(
    cameraState,
    {
      theta: Math.PI * 0.85,
      duration: preFinalLockDuration,
      ease: "none",
      onUpdate: () => {
        camera.position.set(
          Math.sin(cameraState.theta) * CAMERA_RADIUS,
          CAMERA_HEIGHT,
          Math.cos(cameraState.theta) * CAMERA_RADIUS
        );
        camera.lookAt(0, 0, 0);
      },
    },
    0
  );

  // ── Final Lock (R11-R13): 3 corners in sequence, 4th is the climax.
  tl.addLabel("finalLock", cursor);
  cursor += 0.65; // "dejar flotando, pausar" (0.5-0.8s)
  for (let i = 0; i < 3; i++) {
    const end = addPieceTravel(tl, finalLockPieces[i], cursor, 1.0);
    cursor = end + (i < 2 ? 0.4 : 1.0); // longer pause after the 3rd (R12)
  }
  cursor = addFinalCornerTravel(tl, finalLockPieces[3], cursor);

  // ── Onda final (R13) — tiny, near-imperceptible ripple through the
  // completed cube, propagating from the center outward.
  tl.addLabel("wave", cursor);
  const WAVE_DURATION = 0.6;
  const WAVE_TWEEN = 0.25;
  const WAVE_AMPLITUDE = 0.06;
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
  cursor = waveEnd;

  return tl;
}

/** Stops `controls.autoRotate` on the first user interaction with the
 * canvas after the timeline hands off control (R14). Returns a cleanup
 * function to remove the listener on unmount (R20). */
export function attachAutoRotateStopper(controls: OrbitControls, domElement: HTMLElement): () => void {
  const stop = () => {
    // Ignore stray clicks during Escenas 1-3/Final Lock, before the
    // timeline hands control over (R14) — otherwise an early click would
    // consume this (would-be) one-shot listener and leave nothing to stop
    // `autoRotate` once it actually starts.
    if (!controls.enabled) return;
    controls.autoRotate = false;
    domElement.removeEventListener("pointerdown", stop);
  };
  domElement.addEventListener("pointerdown", stop);
  return () => domElement.removeEventListener("pointerdown", stop);
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
