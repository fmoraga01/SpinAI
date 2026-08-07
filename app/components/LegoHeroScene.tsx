"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../state-of-ai/useReducedMotion";
import { getQualityTier, pickBrickCount } from "@/lib/lego/quality";
import {
  generateFloatingPositions,
  generateCubePositions,
  selectFinalLockCorners,
} from "@/lib/lego/layout";
import { buildScene, CAMERA_RADIUS, CAMERA_HEIGHT } from "./lego/scene";
import { createMaterialPalette, buildBrickAssignments, buildInstancedMeshes } from "./lego/bricks";
import {
  createPieceRuntimes,
  stepIdlePieces,
  buildMasterTimeline,
  attachAssemblyLoop,
  placePieceAtCube,
  type PieceRuntime,
} from "./lego/timeline";

// `navigator.deviceMemory` is Chrome/Edge-only and missing from the
// standard `Navigator` type — see design.md "Fallback mobile / gama baja".
interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

export default function LegoHeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const tier = getQualityTier(
      window.innerWidth,
      navigator.hardwareConcurrency,
      (navigator as NavigatorWithMemory).deviceMemory
    );

    const brickCount = pickBrickCount(tier);
    const seed = Math.floor(Math.random() * 1_000_000) + 1;
    const floatingPositions = generateFloatingPositions(brickCount, seed);
    const cubeCells = generateCubePositions(brickCount);
    const finalLockCornerPositions = selectFinalLockCorners(cubeCells);

    const assignments = buildBrickAssignments(
      cubeCells,
      floatingPositions,
      finalLockCornerPositions,
      Math.random
    );
    const materials = createMaterialPalette(tier);
    const { meshes, pieces: pieceRefs } = buildInstancedMeshes(assignments, materials, tier);

    const { scene, camera, renderer, controls, resize, dispose: disposeScene } = buildScene(
      container,
      tier
    );
    meshes.forEach((mesh) => scene.add(mesh));

    const pieces = createPieceRuntimes(pieceRefs);
    const finalLockPieces = finalLockCornerPositions
      .map((pos) => pieces.find((p) => p.ref.assignment.cubePosition.join(",") === pos.join(",")))
      .filter((p): p is PieceRuntime => Boolean(p));

    const resizeToContainer = () => resize(container.clientWidth, container.clientHeight);
    resizeToContainer();
    const resizeObserver = new ResizeObserver(resizeToContainer);
    resizeObserver.observe(container);

    let rafId = 0;
    const cleanupFns: (() => void)[] = [];

    if (reducedMotion) {
      // R18: cube already assembled, static, camera fixed, controls on
      // immediately — no timeline, no continuous animation loop.
      pieces.forEach(placePieceAtCube);
      camera.position.set(0, CAMERA_HEIGHT, CAMERA_RADIUS);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.enabled = true;

      const renderOnce = () => renderer.render(scene, camera);
      renderOnce();
      controls.addEventListener("change", renderOnce);
      cleanupFns.push(() => controls.removeEventListener("change", renderOnce));
    } else {
      const timeline = buildMasterTimeline({ pieces, finalLockPieces, camera, controls });
      const removeAssemblyLoop = attachAssemblyLoop(timeline, pieces, controls, renderer.domElement);
      cleanupFns.push(() => timeline.kill(), removeAssemblyLoop);

      const start = performance.now();
      let lastTime = start;
      const frame = (time: number) => {
        const dt = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        stepIdlePieces(pieces, dt, (time - start) / 1000);
        // Only let OrbitControls drive the camera once it owns it (R14) —
        // calling `controls.update()` earlier would fight the GSAP-driven
        // `camera.position` tween during Escenas 1-3 (its damping math
        // isn't aware of those manual position writes).
        if (controls.enabled) controls.update();
        renderer.render(scene, camera);
        rafId = requestAnimationFrame(frame);
      };
      rafId = requestAnimationFrame(frame);
      timeline.play();
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      cleanupFns.forEach((fn) => fn());
      resizeObserver.disconnect();
      disposeScene();
    };
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        aspectRatio: "1 / 1",
        minHeight: 320,
        // Scales the rendered illustration up 15% visually without touching
        // the WebGL camera/framing math — the container's own layout size
        // (what `resize()`/`ResizeObserver` measure) is unaffected by
        // `transform`, only the painted result grows.
        transform: "scale(1.15)",
      }}
    />
  );
}
