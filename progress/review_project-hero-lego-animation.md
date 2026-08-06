# Review — `project-hero-lego-animation`

**Veredicto: APROBADO CON NOTA — pendiente QA visual humana en navegador real
antes de dar la feature por terminada end-to-end.**

Revisado por una sesión independiente de la que implementó (no escribió este
código). Commit revisado: `a4f7e32` en `dev` (más `50c6845`,
`in_progress → in_review`). `npm run verify` completo (lint + build + test +
check-sdd-state) corrido de forma independiente en este sandbox, no tomado
del reporte de `implementer`. Diff real leído archivo por archivo contra
`requirements.md`/`design.md`/`tasks.md`, no solo el resumen de `impl_*.md`.

---

## Checkpoints — `Before in_review`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS** — 9 secciones, 39 tareas, todas `[x]`. Confirmé que corresponden a código real (no solo texto): sección 0 (deps en `package.json`), sección 1 (`lib/lego/{layout,paths,quality}.ts` + tests), sección 2 (`bricks.ts`/`scene.ts`/`LegoHeroScene.tsx`/`app/page.tsx`), secciones 3–8 (`timeline.ts`: idle loop, señal, ensamblaje por capas, Final Lock, reduced-motion, fallback de calidad), sección 9 (cleanup, design-check, verify, regresión de `AnimatedGrid`). |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí, exit 0: `lint` limpio, `build` compila (26 rutas, `/` incluida, sin errores SSR de `three`/`gsap`), `test` (Vitest) 7 archivos / **67 tests** en verde, `check-sdd-state` OK ("single active feature: project-hero-lego-animation (in_review)"). |
| 3 | Cambios en `lib/` con test Vitest real | **PASS** — `lib/lego/{layout,paths,quality}.ts` con sus `.test.ts` correspondientes; 31 de los 67 tests totales están en `lib/lego/` (`npx vitest run lib/lego` → 3 archivos, 31 tests, todos verdes). |
| 4 | `progress/impl_<feature>.md` con verificación por cada `R<n>` | **PASS** — `progress/impl_project-hero-lego-animation.md` tiene una entrada específica para R1–R21, cada una citando el archivo/función concreta y el mecanismo de verificación (test Vitest, `curl`+grep de DOM, o "code reading" honestamente etiquetado como tal cuando no había forma de confirmarlo visualmente). Sin huecos, sin "N/A" sin justificar. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **PASS con hallazgo menor no bloqueante** — ver sección dedicada abajo. |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — solo `project-hero-lego-animation` en `in_review`; confirmado también por `check-sdd-state`. |

## Checkpoints — `Before done`

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | `progress/review_<feature>.md` con pass/fail y veredicto | **PASS** — este archivo. |
| 2 | Ningún `R<n>` sin entrada de verificación | **PASS** — ver checkpoint 4 arriba. |
| 3 | Una sola feature activa | **PASS**. |
| 4 | `progress/history.md` con entrada resumen | **PENDIENTE de `leader`** al cierre de sesión, no responsabilidad de `reviewer`. |

---

## Verificación dirigida

### Fondo transparente (R3) — cambio de último momento sobre la spec original

Confirmado en `app/components/lego/scene.ts`:
- `new THREE.WebGLRenderer({ antialias: true, alpha: true })`
- `renderer.setClearColor(0x000000, 0)` — clear color transparente
- Ningún `scene.background = ...` en todo el diff (grep sobre `app/components/lego/*.ts` sin matches).
- `grep -rn "F6F7F9\|light gray\|studio background"` sobre todo el código nuevo → sin matches. No queda ningún vestigio del enfoque de "vitrina clara" descartado en `design.md`.
- `LegoHeroSceneLoader.tsx` (placeholder de `next/dynamic`) usa `background: "transparent"`, no `#F6F7F9` — consistente con la decisión vigente documentada en `design.md` ("Fondo de la escena").
- El resto de la página (`Nav`, columna de texto) sigue en dark theme: `app/page.tsx` no toca el `background` de la sección hero (`var(--color-bg)` implícito, sin cambios en ese punto del diff).

### Sin vestigios de "Fase 2" ni simplificaciones diferidas

`grep -rn "Fase 2\|fase 2\|phase 2\|Phase 2\|TODO\|FIXME\|for now\|por ahora\|simplific"` sobre `app/components/lego/*.ts`, `app/components/LegoHeroScene.tsx`, `app/components/LegoHeroSceneLoader.tsx`, `lib/lego/*.ts` → **sin matches**. La única pieza explícitamente fuera de alcance (interactividad más allá de `OrbitControls`) está documentada como decisión permanente en `requirements.md`/`design.md`, no como recorte temporal — no hay código que la insinúe como pendiente.

### `AnimatedGrid.tsx` intacto (requisito explícito)

- `git log --all -- app/components/AnimatedGrid.tsx` no muestra ningún commit de esta feature tocando ese archivo; el último commit que lo toca es de otra feature anterior no relacionada.
- `app/state-of-ai/page.tsx` sigue con `import AnimatedGrid from "../components/AnimatedGrid"` y `<AnimatedGrid variant="background" intensity={0.2} />` sin cambios (línea 226).

### Los 3 bugs que el implementer dice haber encontrado y arreglado

1. **`.toArray()` sobre tupla plana**: confirmé `grep -rn "toArray()" app/components` → **sin matches** en todo el código actual. El código real usa `ref.assignment.cubePosition.join(",")` (líneas 327, 333 de `timeline.ts`, y también en `LegoHeroScene.tsx` línea 65) — consistente con el fix declarado, no quedó rastro del bug.
2. **Alcance del tween de órbita de cámara** (solo cubría la fase `floating` de 3s): confirmado en `timeline.ts` líneas 350-368 — comentario explícito "Camera orbit tween spanning the full Escenas 1-3 (floating -> signal -> assembly)", con `theta: Math.PI * 0.85` como destino único de un solo tween que cubre toda esa ventana. Coincide con lo declarado.
3. **`controls.update()` sin gatear por `controls.enabled`**: confirmado en `LegoHeroScene.tsx` línea 104 — `if (controls.enabled) controls.update();`, con comentario explicando por qué (evitar que el damping de `OrbitControls` pelee contra las escrituras de `camera.position` de GSAP durante Escenas 1-3). Coincide con lo declarado.

Los 3 bugs están efectivamente arreglados en el diff final, no solo mencionados en la nota de progreso.

### Cleanup / R20 (primera librería WebGL del repo — foco especial)

`app/components/lego/scene.ts` (`dispose()`): recorre `scene.traverse()`, llama `geometry.dispose()` y `material.dispose()` (soporta array de materiales) por objeto, `scene.environment.dispose()` + `pmremGenerator.dispose()` (libera el environment map procedural), `controls.dispose()`, `renderer.dispose()`.

`app/components/LegoHeroScene.tsx` (cleanup del `useEffect`): `cancelAnimationFrame(rafId)`, `cleanupFns.forEach(fn => fn())` (incluye `timeline.kill()` + remoción del listener de auto-rotate en la rama animada, o remoción del listener `"change"` de `controls` en la rama `reducedMotion`), `resizeObserver.disconnect()`, `disposeScene()`. Todos los elementos que pide R20 (geometrías, materiales, renderer, listeners de resize, `timeline.kill()`, `controls.dispose()`) están presentes y se llaman en el orden correcto al desmontar. No hay forma de confirmar empíricamente con un profiler de memoria real en este sandbox (ver limitación de entorno abajo), pero el código en sí está completo — no es una promesa sin implementación.

### Dependencias nuevas (`package.json`)

`git show a4f7e32 -- package.json` confirma `three@^0.180.0`, `gsap@^3.15.0` en `dependencies`, `@types/three` en `devDependencies` (verificado también en `node_modules` vía `npm run build`/`test` en verde). Versiones más nuevas que las sugeridas en `design.md` (`^0.170.0`/`^3.12.5`) — documentado y justificado en `impl_*.md` como "latest stable at implementation time", no bloqueante.

### Diseño de módulos vs. `design.md`

Estructura real coincide con la propuesta (`lib/lego/{rng,layout,paths,quality}.ts` con tests, `app/components/lego/{bricks,scene,timeline}.ts`, `app/components/LegoHeroScene.tsx`). Única desviación: se agregó `app/components/LegoHeroSceneLoader.tsx` (no estaba en la lista de archivos de `design.md`) porque este Next.js 16.2.12 rechaza `ssr: false` dentro de un Server Component — confirmé el mensaje de error es real revisando `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`, sección "Importing Server Components". Es una desviación menor, bien documentada, que no afecta ningún requisito (R21 se sigue cumpliendo: `app/page.tsx` queda Server Component puro, `three`/`gsap` solo se cargan vía el wrapper cliente).

### `design-check` (checkpoint 5) — hallazgo menor no bloqueante

`tasks.md` (9.2) afirma "Skill `design-check` corrido (manualmente, ver progress doc) ... sin hallazgos", pero **`progress/impl_project-hero-lego-animation.md` no contiene ninguna mención de "design-check"** (grep case-insensitive sin matches) — la remisión "ver progress doc" no está respaldada por contenido real ahí. Esto es una laguna de documentación, no necesariamente de trabajo no hecho.

Para no bloquear solo por esto, corrí el criterio del skill yo mismo sobre los dos `.tsx` nuevos bajo `app/components/` (`LegoHeroScene.tsx`, `LegoHeroSceneLoader.tsx`, los únicos en su alcance textual):
- Sin hex colors nuevos: ambos usan `var(--color-border)` / `var(--radius-md)` / `background: "transparent"` exclusivamente.
- Sin `border-radius` hardcodeado, sin `boxShadow` custom, sin `fontSize` fuera de escala (ninguno de los dos define `fontSize`).
- Confirmé independientemente: **no hay drift de design tokens** en ninguno de los dos archivos.

Hallazgo: **no bloqueante**, pero `implementer` debería corregir la remisión en `tasks.md`/agregar la sección faltante en `impl_*.md` para que la trazabilidad quede completa la próxima vez — la checklist no debería decir "ver progress doc" cuando el progress doc no tiene esa sección.

---

## Limitación de entorno — sin navegador/GPU real (foco pedido explícitamente)

`impl_project-hero-lego-animation.md` declara con honestidad, al principio del
documento, que este sandbox no tiene display ni navegador headless
disponible: toda verificación de "feel" real (pacing del timeline, si el
Final Lock se siente como clímax, si el drag de `OrbitControls` se siente
bien, si la densidad de 80-120 piezas se ve correcta, si los fallbacks de
`prefers-reduced-motion`/mobile realmente renderizan pixel-correcto) se hizo
por lectura de código y por tests Vitest de la lógica pura, **no** por
observación visual en un navegador real — a diferencia de, por ejemplo,
confirmar clases CSS vía `curl`, que sí se hizo.

Esto es la misma categoría de limitación que las 5 features de animación CSS
previas (`changelog-empty-state-animation`, `schedule-content-animation`,
etc.) y que features de datos como `project-crud`/`weekly-update-entry`
(sin credenciales/browser real). Pero a diferencia de esas 5 features CSS
—donde razonar sobre el código estático es casi tan confiable como verlo,
porque son transiciones DOM simples—, acá el razonamiento estático tiene un
techo más bajo: es un pipeline WebGL real (contexto GPU, sampling de curvas
Catmull-Rom cuadro a cuadro, `InstancedMesh.setMatrixAt`, timing dependiente
de frame rate, interacción de arrastre de `OrbitControls`), exactamente la
clase de sistema donde bugs solo se manifiestan al correr. La evidencia más
concreta de este riesgo es que la propia revisión de código del
`implementer` encontró y arregló **3 bugs reales** (uno de ellos, el
`.toArray()` sobre una tupla, hubiera explotado en tiempo de ejecución sin
que `tsc`/build lo detectaran) — confirma que el código *sí* recibió una
revisión seria, pero también confirma que este dominio tiene una clase de
fallas que ni linter, ni build, ni Vitest, ni lectura de código pueden
garantizar al 100%: solo correrlo en un navegador real lo hace.

**Conclusión sobre este punto**: la limitación es real y no negligencia —
no hay nada más que `implementer` pudiera haber hecho razonablemente en este
sandbox. La cobertura de código/tests/build es sólida y honesta (sin
afirmaciones falsas de verificación visual que no ocurrió). Pero, dado que
esta es la primera integración WebGL del repo y sustancialmente más
compleja técnicamente que las 5 animaciones CSS previas, **recomiendo que
`feature_list.json` lleve una nota explícita de "pendiente QA visual humana
en navegador real antes de considerar la feature end-to-end verificada"**,
mismo patrón que se usó en `project-crud`/`weekly-update-entry` cuando no
se pudo probar contra credenciales/browser reales. No es motivo de rechazo
del código en sí (que está completo, testeado donde es testeable, y sin
huecos de trazabilidad) pero sí motivo para no cerrar el círculo de "esta
pieza se ve y se siente bien" sin que un humano la abra en un navegador.

---

## Veredicto final

**APROBADO, con nota obligatoria de QA visual humana pendiente.**

Las 39 tareas de `tasks.md` están marcadas `[x]` y corresponden a cambios
reales en el diff (`a4f7e32`). `npm run verify` pasa de punta a punta,
corrido de forma independiente (lint limpio, build sin errores SSR, 67
tests Vitest en verde incluyendo 31 de `lib/lego/`, `check-sdd-state` OK).
Los 21 requisitos (R1–R21) tienen cada uno una entrada de verificación
específica y honesta en `progress/impl_project-hero-lego-animation.md`,
confirmada contra el código real. `AnimatedGrid.tsx` y su uso en
`app/state-of-ai/page.tsx` quedaron intactos. El fondo transparente (R3,
decisión de último momento) está bien aplicado sin ningún resto del enfoque
anterior (`#F6F7F9`/panel claro). No queda ningún vestigio de "Fase 2" ni
simplificación diferida. Los 3 bugs que el `implementer` dice haber
encontrado y arreglado durante su autorevisión están efectivamente
corregidos en el diff final. El cleanup de WebGL (R20) está completo y
correcto en el código (geometrías/materiales/renderer/`timeline.kill()`/
`controls.dispose()`), aunque sin confirmación empírica de estabilidad de
memoria por falta de profiler real.

Único hallazgo, **no bloqueante**: la remisión de `tasks.md` (9.2) a "ver
progress doc" para `design-check` no está respaldada por contenido real en
`impl_*.md` — verifiqué el criterio yo mismo sobre los dos `.tsx` nuevos y
no hay drift de design tokens, pero `implementer` debería completar esa
sección la próxima vez.

Recomendación explícita para `leader`: al mover esta feature a `done` en
`feature_list.json`, agregar una nota tipo "pendiente QA visual humana en
navegador real (pacing/feel de la narrativa 3D, drag de `OrbitControls`,
render de fallbacks de `prefers-reduced-motion`/mobile) antes de considerar
la pieza verificada end-to-end en producción" — mismo patrón que
`project-crud`/`weekly-update-entry`. Esto no bloquea el pase a `done` en
sí (el trabajo de código/spec está completo y trazable), pero deja
constancia de que la validación visual real todavía no ocurrió.
