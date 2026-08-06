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

const CAMERA_RADIUS = 11;
const CAMERA_HEIGHT = 3.4;

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
  controls.minDistance = 6;
  controls.maxDistance = 18;
  controls.target.set(0, 0, 0);

  function resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
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
