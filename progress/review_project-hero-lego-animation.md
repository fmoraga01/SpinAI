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

---

# Segunda pasada (2026-08-06, reapertura post-`done`)

**Veredicto: RECHAZADO.**

Sesión independiente de la que implementó el fix de esta reapertura (no
escribí `3758211` ni `f3a9c47`). Confirmé con navegador real propio
(Playwright + Chromium preinstalado, mismo método que
`progress/impl_project-hero-lego-animation.md` documenta en su sección
"Post-`done` bugfixes") en vez de creerle a las capturas que dejó
`implementer` — y encontré un problema real que esas capturas ya mostraban
pero que el reporte del `implementer` interpretó mal como "limpio".

## Resumen ejecutivo

- **Bug 1 (studs faltantes)**: confirmado arreglado. Ver detalle abajo.
- **Bug 2 tal como fue diagnosticado (solapamiento de piezas por footprint
  variable)**: confirmado arreglado para el caso denso (narrativa completa
  en desktop, tier alto). El test de no-solape en `layout.test.ts` pasa y
  mi propia sesión de navegador no encontró superposición en ningún
  screenshot.
- **Pero encontré un defecto nuevo, real y reproducible, emparentado con el
  mismo bug reportado por el usuario ("el cubo final ensamblado NO es un
  cubo")**: en la ruta obligatoria `prefers-reduced-motion` (R18) y en el
  extremo bajo del rango de piezas de cualquier tier, el cubo ensamblado
  queda visiblemente incompleto — no por solapamiento sino por relleno
  insuficiente de la rejilla (huecos grandes, clusters desconectados) —
  ver "Hallazgo nuevo" abajo. Esto no es un caso límite raro: es el
  comportamiento **garantizado** de la rama `reducedMotion` (código
  obligatorio de accesibilidad, no opcional) combinado con una cámara fija
  casi alineada a un eje que expone los huecos.

## Checkpoints — `Before in_review` (segunda pasada)

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS** — 37/37 `[x]`, 0 `[ ]` (`grep -c` verificado). |
| 2 | `npm run verify` pasa | **PASS** — corrido por mí de forma independiente: `lint` limpio, `build` compila (26 rutas, sin errores SSR), `test` → **7 archivos, 72 tests, todos verdes** (subió de 67 a 72: el test nuevo de no-solape en `layout.test.ts` agrega 5 casos vía `it.each`), `check-sdd-state` OK ("single active feature: project-hero-lego-animation (in_review)"). |
| 3 | Cambios en `lib/` con test Vitest real | **PASS** — `lib/lego/layout.test.ts` ganó el bloque `it.each([80,100,120,30,40])("never overlaps the axis-aligned bounding box of any two assigned pieces...")` (líneas 97-114), calcula el AABB real con los half-extents de `2x2` y verifica que ningún par de celdas se solape, para ambos tiers. Es un test honesto: cubre exactamente el mecanismo del bug original (footprint invadiendo al vecino), no un test cosmético. |
| 4 | `progress/impl_<feature>.md` con verificación por cada `R<n>` | **PASS con nota** — la tabla R1-R21 original (líneas 207-303) no fue re-escrita tras el bugfix de esta reapertura, así que R7/R15/R16 siguen describiendo el comportamiento pre-fix (mezcla de tamaños) sin una nota cruzada hacia la sección "Post-`done` bugfixes" que si documenta el cambio a tamaño único en detalle. No es un hueco de trazabilidad grave (la sección de bugfix sí cubre el detalle técnico exhaustivamente) pero sería más prolijo si la tabla R1-R21 tuviera una línea "ver sección post-`done` bugfixes" en R15/R16. No bloqueante por sí solo. |
| 5 | `design-check` si cambió `app/components/*.tsx` | **N/A, correctamente no re-ejecutado** — confirmé `git diff --stat c2e33d7 f3a9c47 -- app/components lib/lego`: solo tocó `app/components/lego/bricks.ts` (no es `.tsx`, es un módulo `.ts` fuera del alcance textual del skill, tal como ya había quedado establecido en la primera revisión) y `lib/lego/layout.ts`/`layout.test.ts`. Ningún `.tsx` cambió en esta reapertura. |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — confirmado por `check-sdd-state` y por inspección directa: solo `project-hero-lego-animation` en `in_review`. |

## Bug 1 — studs faltantes (commit `3758211`)

Confirmado arreglado, con navegador propio. `app/components/lego/bricks.ts`
ahora llama `.toNonIndexed()` tanto en el cuerpo (`RoundedBoxGeometry`) como
en cada stud (`CylinderGeometry`) antes de `mergeGeometries`. En mis propias
capturas (`reviewer_normal_canvas.png`, `reviewer_reducedmotion_canvas.png`,
`reviewer_mobile_canvas.png` — ver rutas abajo) **todas las piezas, en las
3 rutas que probé, muestran tacos visibles** en la cara superior. Sin
errores de consola de tipo "All geometries must have compatible
attributes" (revisé el log completo de consola en mis 3 sesiones — el único
error de consola presente en las 3 es un 401 esperado del `PinGate` antes
de loguearme, más un 500 no relacionado de un panel "Equipo" que no toca
esta feature). Bug 1 sigue arreglado, no se rompió con el fix del Bug 2.

## Bug 2 tal como fue diagnosticado — solapamiento por footprint variable

Confirmado arreglado **para el caso que motivó el reporte original**:
narrativa completa, desktop, tier denso. Mi captura
`reviewer_normal_canvas.png` (65s de espera, mismo método que
`implementer`) muestra un bloque sólido, sin piezas invadiendo a sus
vecinas, tacos alineados, gaps chicos y parejos — visualmente indistinguible
de `after_normal_60s.png` que dejó `implementer`. El test Vitest de AABB
confirma esto también a nivel de lógica pura para `n` en {30,40,80,100,120}.
Coincido con la conclusión del `implementer` en este punto específico.

## Hallazgo nuevo — el cubo queda incompleto (no solapado, pero tampoco "limpio") en `prefers-reduced-motion` y en el extremo bajo de cada tier

Se me pidió explícitamente no darle crédito ciego a las capturas ya
tomadas y levantar el navegador yo mismo — hacerlo reveló un problema real
que las propias capturas de `implementer` ya mostraban.

**Lo que vi con navegador propio**: mi captura
`reviewer_reducedmotion_canvas.png` (mismo `PIN` de prueba, viewport
desktop 1440×900, `reducedMotion: "reduce"` en el contexto de Playwright,
4s de espera — suficiente porque esta rama renderiza una sola vez sin
timeline) muestra una estructura partida en dos mitades visiblemente
separadas por un hueco central, más dos piezas de esquina completamente
aisladas flotando por debajo, sin contacto visible con el resto — **no es
un cubo reconocible, es un cluster fragmentado**. No es una casualidad de
un solo frame: la rama `reducedMotion` en
`app/components/LegoHeroScene.tsx` (líneas 76-88) hace un único
`renderer.render()` inicial y solo vuelve a renderizar en el evento
`"change"` de `controls` — no hay animación en curso que pueda "asentarse"
después. Es el estado final, determinístico salvo por el `n`/seed elegidos
al azar en cada carga de página.

**Confirmé la causa raíz de forma cuantitativa**, corriendo
`generateCubePositions(n)` directamente (no solo mirando pantallas):

```
n=30  k=4 grid=64  filled=30  fillRatio=46.9%
n=35  k=4 grid=64  filled=35  fillRatio=54.7%
n=40  k=4 grid=64  filled=40  fillRatio=62.5%   (tier "reduced", rango completo)
n=80  k=5 grid=125 filled=80  fillRatio=64.0%
n=100 k=5 grid=125 filled=100 fillRatio=80.0%
n=120 k=5 grid=125 filled=120 fillRatio=96.0%   (tier "full", rango completo)
```

`generateCubePositions()` recorta la rejilla `k³` a exactamente `n` piezas
vía `strideSample` (documentado como decisión intencional en `design.md`:
"el cubo final no necesariamente usa todas las piezas en una rejilla
completa uniforme... priorizando mantener simetría visual antes que llenar
cada celda") — pero en la práctica, en el extremo bajo de cada tier (`n=30`
del tier `reduced`, el que corresponde a viewports angostos/hardware
limitado — condición real, no de laboratorio) **casi la mitad de la
rejilla queda vacía**. Con una cámara fija casi alineada a un eje
(`camera.position.set(0, 3.4, 11)`, línea 80 de `LegoHeroScene.tsx`) eso se
ve como huecos estructurales y piezas sueltas, no como "gaps chicos y
parejos" (R15).

**Esto ya estaba en las propias capturas de `implementer`, mal
caracterizado**: revisé
`after_reduced-motion_8s.png` (ruta completa) y
`after_mobile_canvas_25s.png`/`after_mobile_canvas_35s.png` en
`/tmp/claude-0/.../scratchpad/shots/` — ambas muestran exactamente el mismo
patrón que reproduje yo: una mitad separada de la otra por un hueco
vertical visible, piezas sueltas sin contacto con la masa principal. El
texto de `impl_project-hero-lego-animation.md` (líneas 435-452) describe
esas mismas capturas como "same clean non-overlapping grid" / "clean
non-overlapping grid with the same small gaps, confirming the mobile/reduced
tier also assembles a clean cube, not just 'fewer overlapping pieces'" —
una lectura que no sostiene un vistazo de cerca. No hay solapamiento, es
cierto (en eso el `implementer` tiene razón), pero tampoco es un cubo
"limpio y reconocible" — es un cubo con boquetes. El problema original que
reportó el usuario ("el cubo final ensamblado NO es un cubo... piezas
superpuestas/desordenadas") queda resuelto en su mecanismo de
*solapamiento*, pero reaparece por un mecanismo distinto (*faltante de
piezas*) exactamente en la ruta de accesibilidad obligatoria (R18, no es
opcional) y en el extremo bajo de cualquier tier — condiciones alcanzables
por usuarios reales, no solo por este sandbox.

**Por qué la narrativa completa en desktop (mi `reviewer_normal_canvas.png`
y la de `implementer`) sí se ve bien pese a compartir la misma función**:
la cámara al final de la narrativa completa queda controlada por
`OrbitControls` en `autoRotate` desde un ángulo de tres cuartos, que oculta
buena parte de los huecos interiores por oclusión (las piezas del frente
tapan los huecos de atrás desde ese ángulo). La rama `reducedMotion` usa un
ángulo fijo mucho más frontal/axial que no tiene esa suerte. Es decir: el
mismo cubo "hueco" se ve aceptable desde un ángulo y roto desde otro — un
problema de fondo (relleno insuficiente de la rejilla) que la elección de
cámara de la narrativa completa maquilla parcialmente, pero que
`prefers-reduced-motion` expone sin filtro.

**Capturas propias** (no comprometidas al repo, evidencia de sesión, mismo
patrón que `implementer`):
`/tmp/claude-0/-home-user-SpinAI/3fafdfcd-94fd-50ca-8e5b-15291cdf5252/scratchpad/myshots/reviewer_normal_full.png`,
`reviewer_normal_canvas.png` (limpio, confirma Bug 1 + Bug 2 diagnosticado),
`reviewer_reducedmotion_full.png`, `reviewer_reducedmotion_canvas.png`
(fragmentado — el hallazgo nuevo), `reviewer_mobile_full.png`,
`reviewer_mobile_canvas.png`.

Script usado: `/tmp/claude-0/.../scratchpad/qa2.cjs` (Playwright, mismo PIN
de prueba efímero solo-local, mismo binario de Chromium preinstalado que
documenta `impl_*.md`). Señales de hardware en este sandbox:
`hardwareConcurrency=4`, `deviceMemory=8` — con el criterio de
`lib/lego/quality.ts` (`LOW_CORE_COUNT_THRESHOLD=4`, condición
`hardwareConcurrency <= 4`), **esto dispara tier `reduced` incluso en
viewport de escritorio ancho**, algo que ni `implementer` ni yo notamos
hasta este momento — vale la pena que quede documentado para la próxima
sesión en este entorno: cualquier QA visual hecha acá corre casi siempre en
tier `reduced` sin que el ancho del viewport lo sugiera.

## Trade-off: pérdida de variedad de tamaño de pieza (`pickBrickSize()` fijo a `"2x2"`)

Se me pidió dar un veredicto técnico, no decidir por el usuario. Mi
lectura:

- **No hay ningún `R<n>` en `requirements.md` que exija variedad de
  tamaño de pieza explícitamente.** Confirmé con grep — cero matches de
  "tamañ"/"variedad"/"2x4"/"2x2"/"1x2"/"plate" en `requirements.md`. La
  variedad de tamaño vivía únicamente en `design.md` ("80–120 piezas con
  3–4 variantes de tamaño... capa 2 sesgada 70% a `2x4` para masa visual").
- **`design.md` marca explícitamente solo dos decisiones como
  "definitivas, no a criterio de `implementer`"**: `RoundedBoxGeometry`
  para los bevels (línea 256) y los valores de material (línea 272) — ambas
  siguen intactas, no las tocó este fix. La frase de variedad de tamaño
  (línea 237) **no** lleva esa etiqueta explícita en el texto — a
  diferencia de lo que se me indicó en el encargo de esta revisión, no es
  literalmente una "decisión definitiva" marcada como tal en el documento,
  aunque sí es un detalle concreto y no ambiguo del diseño aprobado.
- **El ajuste de alcance de una sola fase (commit `f674e72`, el que el
  usuario pidió antes de aprobar)** se refería específicamente a: no
  diferir timing/easing/materiales/`RoomEnvironment` a una "Fase 2", fondo
  transparente en vez de panel claro, e interactividad fuera de
  `OrbitControls` fuera de alcance a secas. No menciona variedad de tamaño
  de pieza como parte de ese acuerdo explícito. Dicho esto, el espíritu de
  "una sola fase completa, sin recortes" sí aplica en un sentido más amplio,
  y perder por completo una característica visual que `design.md` describía
  con un peso concreto (70/25/5/0) es, en los hechos, un recorte de alcance
  real frente a lo que se implementó y aprobó en la primera pasada — no
  estoy de acuerdo con minimizarlo solo porque no tiene su propio `R<n>`.
- **Sobre si `implementer` "se lo tomó en serio" antes de descartar la
  variedad**: el propio texto de `impl_*.md` (líneas 361-374) describe solo
  2 opciones consideradas, y la opción 1 ("non-uniform per-axis cell
  spacing only") es una versión bastante superficial de "la otra
  dirección" — sigue usando una única constante de espaciado por eje, no
  una rejilla consciente del tamaño real de cada celda (empaquetado tipo
  vóxel/stud-resolution, que es lo que haría falta para preservar variedad
  sin solapamiento). No encontré evidencia de que se haya intentado en
  serio esa alternativa más difícil (ni un experimento fallido documentado,
  ni una estimación de esfuerzo) — se pasó directo a la opción simple. Esto
  no lo hace una mala decisión técnica (es honesta, está bien documentada,
  y de hecho resuelve el bug), pero tampoco puedo confirmar que fue "la
  única forma razonable" — fue la forma más simple, elegida sin agotar la
  alternativa más fiel al diseño aprobado.
- **Resultado visual**: para el caso denso (desktop, narrativa completa),
  el resultado con tamaño único se ve genuinamente limpio y "producto
  fotografiado" — no luce pobre ni genérico en las capturas que revisé. La
  pérdida es de variedad/riqueza visual (bloques grandes de "masa
  estructural"), no de calidad de render.

**Mi veredicto técnico en este punto** (no la decisión final, que es del
usuario): el trade-off es una simplificación de alcance real y
documentada, razonada y no perezosa en su ejecución, pero tampoco un
intento serio de la alternativa más difícil que preserva variedad. Si el
usuario valora "cumplir al pie de la letra la decisión de una sola fase sin
recortes" por encima de "shipeado y sin overlap", debería pedir que se
intente la rejilla consciente de tamaño por celda (empaquetado real, no
solo espaciado por eje) antes de aceptar esto. Si prioriza corrección
visual inmediata sobre fidelidad al detalle de `design.md`, el resultado
actual es aceptable **una vez resuelto el hallazgo nuevo de huecos en
`prefers-reduced-motion`/tier bajo** de la sección anterior.

## Veredicto final (segunda pasada)

**RECHAZADO.** Motivo de rechazo explícito, no relacionado con el
trade-off de tamaño (que dejo a decisión del usuario/`leader`): el fix del
Bug 2 corrige el mecanismo de solapamiento reportado, pero **no corrige,
y de hecho nunca detectó, un mecanismo hermano del mismo bug** (relleno
insuficiente de la rejilla del cubo) que deja el cubo visiblemente
incompleto en la ruta `prefers-reduced-motion` (R18, obligatoria, no
opcional) y en el extremo bajo del rango de piezas de cualquier tier
(`n=30` en tier `reduced` → 46.9% de relleno). Esto es reproducible de
forma determinística (no es un frame transitorio) y ya estaba presente,
sin detectar, en las propias capturas que `implementer` incluyó como
evidencia de "after" — el texto que las acompaña las describe como "cubo
limpio" cuando no lo son.

Qué necesito ver antes de aprobar:
1. Una revisión de `generateCubePositions()` (o de cómo se elige `n`/`k`,
   o de cómo se recortan las celdas al trimear a `n`) que garantice un
   relleno visualmente sólido incluso en `n=30` del tier `reduced` — no
   necesariamente 100%, pero no ~47%. Alternativas razonables: elegir `k`
   más chico para que `n` quede más cerca de `k³` (menos celda vacías en
   términos relativos) en vez de siempre tomar el `k` mínimo que alcanza;
   o no recortar de forma dispersa sino formar un cubo más chico pero
   completo.
2. Confirmación con navegador real (no solo capturas ya tomadas) de que
   `prefers-reduced-motion` y el tier `reduced` en su extremo bajo (`n`
   cercano a 30) se ven como un cubo reconocible, no un cluster
   fragmentado — para las 3 rutas: narrativa completa, `reducedMotion`, y
   mobile/`reduced` tier.
3. Corrección de la caracterización en `impl_project-hero-lego-animation.md`
   (líneas 435-452) para que no describa las capturas de
   `reduced-motion`/mobile como "clean" cuando muestran huecos — o, si tras
   el fix del punto 1 realmente quedan limpias, capturas nuevas que lo
   confirmen.

No bloqueante, aparte, ya mencionado por `implementer`: encuadre de cámara
recorta el cubo por los bordes del canvas en algunos frames (`scene.ts`,
FOV/framing) — lo confirmo también en mis propias capturas (bordes del
cubo tocan/superan el borde del `<canvas>` en varios ángulos), pero coincido
en que es una observación de pulido aparte, no parte de lo que hay que
aprobar/rechazar en esta pasada.

## `npm run verify` — resultado (corrido por mí, independiente)

```
lint            → limpio, sin errores
build           → ✓ Compiled successfully, 26 rutas generadas, sin errores SSR
test (vitest)   → 7 archivos, 72 tests, todos verdes
check-sdd-state → ✓ single active feature: project-hero-lego-animation (in_review)
                  ✓ all spec_ready+ features have requirements/design/tasks on disk
                  ✓ feature_list.json is consistent with docs/specs.md
```

# Tercera pasada (2026-08-06, tercera reapertura — fix de `chooseGridDims()`)

**Veredicto: RECHAZADO** — el bug 3 reportado (cubo fragmentado en
`prefers-reduced-motion` con `n` bajo) está genuinamente corregido y lo
confirmé yo mismo con navegador real, pero el fix introduce un problema
nuevo, real y visible en el tier `full` (no cubierto por el QA del
`implementer` ni por el test nuevo): para aproximadamente la mitad del
rango `n∈[80,120]` la caja elegida por `chooseGridDims()` es una losa
claramente alargada (ej. `n=81` → `[3,4,7]`, spread 4), no algo que se lea
como "cubo". Revisado por una sesión independiente de la que implementó.
Commits revisados: `0542a9c`, `78a0f17`.

## Checkpoints — `Before in_review` (tercera pasada)

| # | Checkpoint | Resultado |
|---|---|---|
| 1 | Toda tarea de `tasks.md` marcada `[x]` | **PASS** — `grep -c "^- \[x\]"` = 37, `grep -c "^- \[ \]"` = 0. |
| 2 | `npm run lint` pasa | **PASS** — corrido por mí, limpio. |
| 3 | `npm run build` pasa | **PASS** — corrido por mí, `✓ Compiled successfully`, 26 rutas generadas, sin errores SSR. |
| 4 | `progress/impl_<feature>.md` tiene entrada de verificación para cada `R<n>` | **PASS** — sección "Requirement-by-requirement verification (R1-R21)" cubre R1 a R21 sin huecos (confirmé contra los 21 `**R<n>**` de `requirements.md`). |
| 5 | Si cambió `app/components/*.tsx`, `design-check` corrido | **N/A, justificado** — `git show --stat 0542a9c` confirma que esta pasada solo tocó `lib/lego/layout.ts`, `lib/lego/layout.test.ts`, `progress/current.md`, `progress/impl_project-hero-lego-animation.md`. Cero `.tsx` tocados. |
| 6 | `feature_list.json` con una sola feature activa | **PASS** — único elemento con status `in_progress`/`in_review` en todo el archivo es `project-hero-lego-animation` (`in_review`). |
| — | `npm run verify` completo (lint+build+test+check-sdd-state) | **PASS** — corrido por mí de forma independiente: lint limpio, build limpio, **90/90 tests** (incluye el `describe("chooseGridDims")` nuevo), `check-sdd-state` OK. Ver salida completa al final de esta sección. |

## Verificación con navegador real, hecha por mí (no solo el reporte del `implementer`)

Levanté `npm run dev` yo mismo (`PIN`/`JWT_SECRET` locales, efímeros, nunca
commiteados) y Playwright + Chromium preinstalado
(`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
`--use-gl=swiftshader`), siguiendo la mecánica documentada en
`progress/impl_project-hero-lego-animation.md` ("Bug 3" y la nota de QA de
`progress/current.md`). Script propio, no reutilicé el del `implementer`.

**Ruta 1 (la obligatoria, la que expuso el bug original) —
`prefers-reduced-motion`, desktop, `n=30` forzado
(`page.addInitScript("Math.random = () => 0")` tras loguear, luego
`reload()`):** capturas propias
`review_A_reducedmotion_n30_8s_canvas.png` / `_14s_canvas.png` (scratchpad
de esta sesión) — cubo sólido, denso, sin fragmentación en dos mitades, sin
esquinas sueltas, studs visibles en cada pieza. Idéntico entre 8s y 14s
(asentado, como corresponde a la cámara fija de esta rama). **Confirmo
independientemente que el bug 3 original está arreglado en su ruta más
crítica.**

**Ruta adicional que yo agregué — tier `full` forzado
(`hardwareConcurrency`/`deviceMemory` sobreescritos a 16 vía
`addInitScript`, ya que este sandbox con `hardwareConcurrency=4` cae
siempre en tier `reduced` y por eso el `implementer` nunca ejerció el tier
`full` con navegador real) + `n=81` forzado
(`Math.random = () => 0.025` → `pickBrickCount()` = `round(80+0.025*40)` =
`81`), `prefers-reduced-motion` para tener cámara estática:** captura
`review_C_n81_reducedmotion_canvas_8s.png` / `_full.png` — la forma
ensamblada se lee como **tres filas largas alejándose de la cámara**, no
como un cubo: es visiblemente una losa alargada, no un cubo. Esto no es un
artefacto de cámara — coincide exactamente con lo que predice el análisis
de código de abajo.

**Regresión bugs 1/2 (spot-check, tier `full` forzado, `n=120`,
`prefers-reduced-motion`):** `review_D_n120_reducedmotion_canvas_8s.png` —
studs visibles en cada pieza (bug 1 sigue arreglado), piezas alineadas en
grilla uniforme sin solape visible, gaps chicos y parejos (bug 2 sigue
arreglado). La línea negra vertical centrada es el gap real entre las dos
columnas centrales de una grilla de eje par (`kx=4`) vista con la cámara
perfectamente frontal — no es un bug nuevo, es el mismo tipo de artefacto
que ya existía con cualquier `k` par en la implementación cúbica anterior.

## Revisión de código — `chooseGridDims()` (checkpoint pedido explícitamente: ¿la lógica tiene sentido, no solo los números reportados?)

Leí `lib/lego/layout.ts` línea por línea (`chooseGridDims`, `buildFullGrid`,
`interiorLayerOf` vía `generateCubePositions`, `selectFinalLockCorners`) y
además **ejecuté la función fuera del repo** (Node standalone) contra
**todo** el rango real de `n` de ambos tiers (`30..40` y `80..120`), no
solo los 6 valores que el `implementer` reportó en su tabla
(`30,35,40,80,100,120`) — esos 6 son precisamente los que menos exponen el
problema.

**Hallazgo — el desempate por "spread" casi nunca se activa en la
práctica:** el bucle de `chooseGridDims()` prioriza minimizar `waste`
(`product - n`) de forma estricta y solo usa `spread` (`c - a`) como
desempate cuando `waste` es **exactamente igual** entre dos candidatos. En
la práctica, para la mayoría de los `n`, hay un único candidato con el
`waste` mínimo absoluto, así que el desempate por spread nunca llega a
ejecutarse — el resultado es simplemente "la caja de menor desperdicio",
sin importar cuán alargada sea, aunque el comentario del propio código dice
que el desempate existe "so the box still reads as roughly cubic rather
than an obviously elongated slab".

Verificación cuantitativa (script Node, ver comandos corridos en esta
sesión): de los 41 valores enteros de `n` en `[80,120]` (tier `full`),
**22 (~54%)** producen una caja con `spread = max(dims) - min(dims) >= 3`
— ej.:

```
n=81  → [3,4,7]  spread=4  fill=96.4%
n=85  → [3,5,6]  spread=3  fill=94.4%
n=101 → [3,5,7]  spread=4  fill=96.2%
n=109 → [4,4,7]  spread=3  fill=97.3%
```

Es decir: el fill ratio es excelente (94-100%, la caja está llena, no
fragmentada — bug 3 en su forma original no reaparece), pero la **forma**
de la caja es una losa/ladrillo claramente no-cúbico, lo cual contradice
directamente:

- El comentario del propio `chooseGridDims()` ("breaking ties by the
  smallest spread... so the box still reads as roughly cubic rather than
  an obviously elongated slab").
- La metáfora central de `requirements.md` línea 10: "bloques [...] terminan
  ensamblándose en **un cubo perfecto** — metáfora de 'orden emergiendo de
  colaboración coordinada'".

El tier `reduced` (`n` 30-40, la ruta que expuso el bug original y la más
exigida por las instrucciones de esta pasada) **no tiene este problema**:
verifiqué los 11 valores enteros de ese rango y ninguno supera
`spread=2`. El problema es específico del tier `full` — que es,
justamente, el tier que **este sandbox nunca ejercita de forma natural**
(`navigator.hardwareConcurrency=4` fuerza `reduced` siempre, incluso en
desktop — documentado ya por el propio `implementer`), lo cual explica por
qué ni el QA manual ni el test nuevo lo agarraron: el `implementer` nunca
pudo probar el tier `full` con navegador real en este entorno, y el test
`describe("chooseGridDims")` solo cubre `n=80,100,120` — los 3 valores del
tier `full` que, por coincidencia, **sí** dan spread bajo (`[4,4,5]`
spread 1, `[4,5,5]` spread 1, `[4,5,6]` spread 2). El test pasa en verde
mientras esconde el problema en el resto del rango — mismo patrón de
"solo se prueban los casos fáciles" que esta pasada pedía explícitamente no
repetir, solo que esta vez apareció en el tier `full` en lugar de en la
cámara de desktop.

**Nota menor, no bloqueante:** `chooseGridDims()` siempre devuelve
`[a,b,c]` ordenado ascendente y `generateCubePositions()` los asigna
posicionalmente `[kx,ky,kz]` — es decir, el eje X siempre recibe la
dimensión más chica y el eje Z siempre la más grande, de forma
determinística (no aleatoria). No es un bug en sí mismo, pero significa que
cuando sí hay spread alto, siempre se alarga en la misma dirección (Z,
profundidad) — algo a tener en cuenta si se ajusta el criterio de
desempate.

## `selectFinalLockCorners()` con caja no-cúbica (checkpoint 3)

Confirmado por lectura de código (no hacía falta test adicional): los 8
corners siguen siendo exactamente las 8 esquinas de la caja
(`extremeCount === 3` en los 3 ejes, sin importar si `kx≠ky≠kz`), y la
selección de 4 por paridad
(`(x>cx)+(y>cy)+(z>cz)` par) es una propiedad combinatoria de cualquier
caja rectangular con centroide bien definido, no depende de que los 3 ejes
sean iguales — sigue siendo, geométricamente, siempre exactamente 4 de los
8 esquinas, formando un subconjunto tipo tetraedro regular (ninguna
comparte arista con otra) incluso cuando la caja está alargada. El Final
Lock no se rompió con este cambio.

## `npm run verify` — resultado (corrido por mí, independiente)

```
> npm run lint    → limpio, sin errores
> npm run build   → ✓ Compiled successfully, 26 rutas generadas, sin errores SSR
> npm run test    → 7 archivos de test, 90 tests, todos verdes
> check-sdd-state → ✓ single active feature: project-hero-lego-animation (in_review)
                    ✓ all spec_ready+ features have requirements/design/tasks on disk
                    ✓ feature_list.json is consistent with docs/specs.md
```

## Corrección de documentación (checkpoint 6 de la tarea)

Confirmé con `git diff 830327a 0542a9c -- progress/impl_project-hero-lego-animation.md`
que la corrección de las líneas que antes decían "same clean non-overlapping
grid" **sí quedó escrita en el archivo real** (no solo mencionada en el
mensaje del commit) — se agregaron dos bloques `**Correction (2026-08-06,
3rd reopen...)**` inline sobre los bullets de `prefers-reduced-motion` y
"Mobile/reduced tier" que aclaran explícitamente que "no overlap" y
"fullness" son propiedades distintas y que la caracterización anterior
estaba incompleta — sin borrar el texto original (consistente con la
convención de este repo de dejar historial).

## Motivo del rechazo (resumen para el `implementer`)

1. **No es un rechazo del bug 3 original** — esa ruta (`prefers-reduced-motion`,
   `n` bajo del tier `reduced`) está arreglada y la verifiqué yo mismo con
   navegador real.
2. **Es un rechazo por un problema nuevo, real, introducido por este mismo
   fix**: para ~54% del rango `n∈[80,120]` (tier `full`), `chooseGridDims()`
   elige una caja claramente alargada (spread 3-4, ej. `[3,4,7]` para
   `n=81`) porque el desempate por spread solo actúa en empates exactos de
   `waste`, que casi nunca ocurren. Confirmado con screenshot propio
   (`review_C_n81_reducedmotion_canvas_8s.png`): la forma se lee como
   filas/losa, no como cubo — contradice la metáfora central de la feature
   ("un cubo perfecto", `requirements.md` línea 10).
3. **El test nuevo no protege contra esto** porque solo prueba 3 valores del
   tier `full` (`80,100,120`) que, por coincidencia, no caen en el rango
   degenerado. Sugerencia (no obligatoria, a criterio del `implementer`):
   o bien cambiar el criterio de selección para ponderar `waste` y `spread`
   juntos (no como desempate estricto), o ampliar el test a
   `it.each` sobre **todo** el rango entero de cada tier
   (`30..40` y `80..120`) afirmando `spread <= 2` (o el umbral visual que
   se decida) para cada uno, no solo 6 valores sueltos.
4. Todo lo demás de esta pasada (checkpoints 1-6 de `CHECKPOINTS.md`,
   `npm run verify`, corrección de documentación, Final Lock, regresión de
   bugs 1/2) está en orden — no hace falta repetir ese trabajo, solo
   corregir el criterio de `chooseGridDims()` para el tier `full` y ampliar
   la cobertura de test antes de la próxima pasada.
