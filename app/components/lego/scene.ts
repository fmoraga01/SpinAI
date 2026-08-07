// Scene/camera/renderer/lights setup — see design.md "Iluminación y cámara
// — scene.ts" and "Fondo de la escena: transparente sobre el dark theme
// existente".
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { QualityTier } from "@/lib/lego/quality";

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/**
 * Bugfix (post-`done` reopen, 5th pass — see
 * progress/impl_project-hero-lego-animation.md dated section for the full
 * writeup): these used to be 11/3.4, sized without checking whether the
 * scene content actually fits inside the camera's frustum at that
 * distance. It didn't: the floating cloud (`FLOAT_RADIUS = 6` in
 * `lib/lego/layout.ts`, plus brick margin) has an effective bounding
 * radius of ~7.17 world units, and the worst-case assembled cube (full
 * tier, e.g. `n=101`) is ~6.24 — both bigger than the ~3.65 a camera at
 * distance 11 with a 37° FOV can actually frame. Pieces routinely
 * overflowed the canvas, especially during the floating phase (Scene 1) —
 * this went unnoticed across 4 prior review passes because this sandbox's
 * `navigator.hardwareConcurrency = 4` always forces the smaller `reduced`
 * tier by default, and the one place `full` tier was checked, the camera
 * was manually (and temporarily) pulled back just to see the result,
 * without recognizing that as evidence the *default* camera was wrong.
 *
 * Fixed values (verified by computing the actual bounding radius of both
 * the floating cloud and the worst-case assembled cube across the full
 * `n` range of both quality tiers, then solving for a camera distance
 * that fits the larger of the two with ~15% margin — see the dated
 * progress section for the exact numbers): `CAMERA_RADIUS = 26`,
 * `CAMERA_HEIGHT = 8` (same height/radius ratio as before). Exported so
 * `timeline.ts`'s orbit tween and `LegoHeroScene.tsx`'s
 * `prefers-reduced-motion` static camera use the exact same numbers — the
 * three previously had 3 independent copies of this constant, which is
 * exactly the kind of desync that let this bug hide in the first place.
 *
 * Bumped again (26/8 -> 44/13.54, same ratio) when `BRICK_COUNT.full`
 * (`lib/lego/quality.ts`) went from `k=5` (125 pieces) to `k=10` (1000)
 * per user request ("el cubo debe ser de 10x10") — a `k=10` cube is
 * physically much bigger (bounding radius ~12.6 world units vs. ~6.24
 * before), so the same "does the content actually fit in the frustum"
 * math had to be redone: recomputed camera distance to fit the new
 * worst case (the `k=10` cube, now bigger than the floating cloud) with
 * the same ~15% margin.
 */
export const CAMERA_RADIUS = 44;
export const CAMERA_HEIGHT = 13.54;

export function buildScene(container: HTMLElement, tier: QualityTier): SceneBundle {
  const scene = new THREE.Scene();
  // R3: no `scene.background` — the canvas stays fully transparent so the
  // pieces float directly over `var(--color-bg)` behind it.

  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
  camera.position.set(0, CAMERA_HEIGHT, CAMERA_RADIUS);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0); // R3: transparent clear color
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = tier === "full";
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(
    tier === "full" ? window.devicePixelRatio : Math.min(window.devicePixelRatio, 1.5)
  );
  container.appendChild(renderer.domElement);

  // Key light — high intensity, elevated/lateral, casts the soft contact
  // shadow that sells the "product photography" feel (full tier only).
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(5, 8, 6);
  keyLight.castShadow = tier === "full";
  if (tier === "full") {
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.radius = 4;
  }
  scene.add(keyLight);

  // Fill light — low intensity, opposite side.
  const fillLight = new THREE.DirectionalLight(0xdde3ff, 0.45);
  fillLight.position.set(-6, 3, -3);
  scene.add(fillLight);

  // Rim light — separates the pieces from the dark, now-transparent
  // background behind the canvas.
  const rimLight = new THREE.DirectionalLight(0xaeb8ff, 1.1);
  rimLight.position.set(-3, 5, -8);
  scene.add(rimLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.32);
  scene.add(ambientLight);

  // Shadow-catching ground: fully transparent material, only the shadow
  // itself renders (no visible floor), consistent with the transparent
  // canvas — full tier only.
  if (tier === "full") {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.4;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  let pmremGenerator: THREE.PMREMGenerator | null = null;
  if (tier === "full") {
    // Procedural studio environment map for PBR reflections — see design.md
    // ("permanent decision, not a temporary cut" re: RoomEnvironment vs a
    // custom HDRI). Independent of `scene.background`, which stays null.
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  // Scaled alongside CAMERA_RADIUS/CAMERA_HEIGHT above — was 14/42 when the
  // default distance was ~27.2, now ~46 (10x10x10 cube) — so manual zoom
  // after the narrative ends still has a sensible range around the new
  // default.
  controls.minDistance = 24;
  controls.maxDistance = 71;
  controls.target.set(0, 0, 0);

  function resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Bugfix (post-`done` reopen, 6th pass): `updateStyle` must be `true`
    // here. `WebGLRenderer.setSize()` always sets the canvas element's
    // `width`/`height` HTML attributes to `cssSize * pixelRatio` (the
    // drawing-buffer resolution) — with `updateStyle: false` it never sets
    // the canvas's CSS `style.width`/`style.height` to match, and with no
    // other CSS rule sizing the canvas (there isn't one — it's appended
    // directly via `container.appendChild`), a `<canvas>` element's CSS box
    // defaults to its `width`/`height` attribute values in CSS px. On any
    // display with `devicePixelRatio > 1` (any retina/HiDPI screen), that
    // made the canvas render literally larger than its container — e.g.
    // measured in this sandbox at `deviceScaleFactor: 2`, a 532px container
    // held a 795px canvas, overflowing past the container's own border.
    // `updateStyle: true` makes Three.js set `canvas.style.width/height` to
    // the intended CSS size explicitly, independent of pixel ratio.
    renderer.setSize(width, height, true);
  }

  function dispose() {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((m) => m.dispose());
      }
    });
    if (scene.environment) scene.environment.dispose();
    pmremGenerator?.dispose();
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  }

  return { scene, camera, renderer, controls, resize, dispose };
}
