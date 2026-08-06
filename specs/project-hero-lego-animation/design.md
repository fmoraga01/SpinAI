# Design — Escena 3D cinemática de bloques LEGO en el hero de la home

## Alcance de esta spec (Fase 1) vs. Fase 2

Esta spec cubre **Fase 1**: layout correcto (texto izquierda / escena
derecha, responsive), la narrativa completa de 3 escenas (flotando → señal
→ ensamblaje) de punta a punta con una coreografía de cámara/iluminación
creíble, usando `InstancedMesh` + GSAP + splines Catmull-Rom, y el Final
Lock de las 4 esquinas como clímax emocional explícito (no es opcional:
sin él la pieza no se siente terminada). Se permite simplificar detalles
finos de pulido cinematográfico — en particular, el HDRI es un
`RoomEnvironment` / environment map genérico de Three.js, no uno de
estudio custom-producido.

**Fase 2 (fuera de alcance de esta spec, feature futura separada)**:
afinar timing exacto, materiales/reflejos más ricos, pulido de curvas de
easing más allá de los presets estándar de GSAP.

## Nuevas dependencias

```json
"dependencies": {
  "three": "^0.170.0",
  "gsap": "^3.12.5"
},
"devDependencies": {
  "@types/three": "^0.170.0"
}
```

**Por qué acá sí y en las 5 features de animación CSS previas no**: esas
5 features (`changelog-empty-state-animation`,
`schedule-content-animation`, `template-editor-content-animation`,
`members-panel-content-animation`, `project-detail-content-animation`)
animan aparición/reordenamiento de contenido DOM ya existente —
transiciones CSS (`opacity`/`transform`) bastan, y traer una librería para
eso habría sido sobre-ingeniería. Esta feature es fundamentalmente
distinta: requiere WebGL (render 3D real, cámara en perspectiva, PBR,
`InstancedMesh` para 80–120 objetos), que no existe en CSS/DOM. Three.js
es la única opción razonable para eso en el ecosistema web. GSAP se agrega
porque orquestar decenas de piezas en timelines secuenciales/paralelos con
easing, stagger y callbacks a mano sobre `requestAnimationFrame` puro es
exactamente el problema que GSAP resuelve bien (y es lo que pide el brief
explícitamente); reimplementarlo a mano sería más código y más frágil que
la dependencia. Costo de bundle: `three` (~600KB min, tree-shakeable
parcialmente) y `gsap` core (~30KB min) se cargan **solo** en la home, vía
`next/dynamic({ ssr: false })` (ver "Arquitectura de módulos"), nunca en
el bundle compartido ni en otras páginas — costo acotado a una sola ruta.

## Conflicto de tema dark/light — resuelto

El resto del sitio usa dark theme (`--color-bg: #08090f`,
`--color-text-primary: #FFFFFF`, etc., definidos en `app/globals.css`). El
brief pide un fondo de estudio infinito muy claro (`#F6F7F9`). Aplicar eso
a toda la sección `<section>` rompería el dark theme de `Nav` y de la
columna de texto.

**Decisión**: el fondo claro de estudio vive únicamente dentro del propio
lienzo de la escena 3D — el `<canvas>` de Three.js y un contenedor
(`LegoHeroScene` wrapper `<div>`) con `border-radius`/`border` a modo de
"marco de vitrina", usando `var(--color-surface-elevated)` /
`var(--color-border)` para el marco (consistente con el resto del sitio)
y `#F6F7F9` como `scene.background` / color del `renderer.setClearColor`
**dentro del canvas únicamente**. El `<section>` que contiene todo sigue
en `var(--color-bg)`; la columna de texto sigue en blanco/gris claro sobre
fondo oscuro, sin cambios. Esto se lee como una "vitrina de producto" flotando
sobre fondo oscuro — coherente con "premium studio" del brief sin romper
el tema del sitio.

**Alternativa descartada**: cambiar el fondo de toda la sección hero a
claro — descartado porque rompe la identidad visual de `Nav` (que no
cambia entre páginas) y de el resto de la home más abajo si se agregara
contenido después; el brief pide "infinite studio background" para la
escena, no para el sitio entero.

## Arquitectura de módulos

```
app/components/
  LegoHeroScene.tsx          # "use client" — wrapper: mide contenedor, decide
                              # calidad (ver Fallback), monta/desmonta la
                              # escena Three.js, expone <canvas> + marco visual
  lego/
    scene.ts                 # crea Scene, PerspectiveCamera, WebGLRenderer,
                              # luces, OrbitControls (disabled inicialmente),
                              # environment map (RoomEnvironment)
    bricks.ts                 # geometría de un brick LEGO (BufferGeometry
                              # reusable: cuerpo + studs), creación del
                              # InstancedMesh, paleta de materiales por color
    layout.ts                 # PURA — genera posiciones flotantes iniciales
                              # (no colisionantes) y posiciones finales del
                              # cubo (grid 3D con jerarquía núcleo→esquinas);
                              # candidata a Vitest (ver Verificación)
    paths.ts                  # PURA — dado inicio/fin de una pieza, genera
                              # los puntos de control de la curva Catmull-Rom
                              # (paso intermedio con offset/curvatura
                              # aleatoria por pieza); candidata a Vitest
    timeline.ts                # construye el GSAP timeline maestro:
                              # Escena1 → Escena2 (señal) → Escena3
                              # (jerarquía por grupos) → Final Lock → onda
                              # final → habilita OrbitControls
    quality.ts                 # PURA — decide "quality tier" (full/reduced)
                              # a partir de viewport width + hardwareConcurrency
                              # / deviceMemory; candidata a Vitest
```

`app/page.tsx` importa `LegoHeroScene` vía `next/dynamic`:

```tsx
const LegoHeroScene = dynamic(() => import("./components/LegoHeroScene"), {
  ssr: false,
  loading: () => <div style={{ /* placeholder del mismo tamaño, fondo #F6F7F9 */ }} />,
});
```

**Por qué `next/dynamic({ ssr: false })` y no un `useEffect` que monte
Three.js dentro de un componente renderizado normalmente**: el repo no
tiene un precedente de carga diferida de librerías client-only (se revisó
— no hay ningún otro `next/dynamic` en el código actual), así que se usa
el mecanismo estándar de Next.js para este caso exacto (evitar que
`import "three"` se evalúe durante el build/SSR, que rompería `next
build` — R21). `LegoHeroScene.tsx` en sí también es `"use client"` con
todo el trabajo de Three.js dentro de un único `useEffect` (mount) con
cleanup (R20), igual patrón que `AnimatedGrid.tsx` ya usa para su canvas
2D (`useEffect` + `return () => cleanup`).

## `app/page.tsx` — cambios de layout

- Se retira `<AnimatedGrid />` de `app/page.tsx` (import y uso). No se
  toca `AnimatedGrid.tsx` ni su uso en `app/state-of-ai/page.tsx`.
- La sección hero pasa de una columna centrada con fondo full-bleed a un
  grid de 2 columnas:

```tsx
<div className="max-w-6xl mx-auto px-6 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
     style={{ minHeight: "calc(100vh - 60px)", paddingTop: 80, paddingBottom: 80 }}>
  <div> {/* columna existente: HeroChip, h1, p, HomeCTAs — sin cambios internos */} </div>
  <LegoHeroScene />
</div>
```

  `grid-cols-1 md:grid-cols-2` es el mismo breakpoint `md:` (768px) que ya
  usa el resto del repo (p. ej. `ProjectCard`/grid de `/proyectos` en
  `project-status-tracking`), no se inventa un breakpoint nuevo (R1/R2).
  En mobile la escena queda debajo del texto en el flujo normal del
  documento (`grid-cols-1`), sin `position: absolute` (a diferencia del
  `AnimatedGrid` actual, que sí era absoluto de fondo — ya no aplica
  porque la escena ahora es contenido, no fondo).

## Generación de posiciones — `layout.ts`

**Posiciones flotantes iniciales**: se genera un array de N puntos (N =
`quality.brickCount`, 80–120 en tier full) dentro de una esfera/elipsoide
de radio ~6 unidades centrada en el origen, usando rechazo por distancia
mínima (Poisson-disc simplificado: se genera un candidato aleatorio, se
rechaza y regenera si está a menos de `MIN_DIST` de cualquier punto ya
aceptado, hasta un máximo de intentos) — esto garantiza R4 (no
colisionantes) de forma barata sin un solver físico real.

**Posiciones finales (cubo)**: el cubo final es una rejilla 3D de
`k × k × k` posiciones de brick (k derivado de N, p. ej. N≈100 → k=5,
125 slots, se usan ~100 y el resto quedan vacíos o se ajusta N al cubo
perfecto más cercano — decisión de `implementer`: **N se ajusta a
`k^3`** para que el cubo quede perfecto, no al revés, ya que R4 solo pide
"entre 80 y 120", y k=5 → 125 está fuera de rango pero k=4→64 está debajo;
por eso el cubo final **no necesariamente usa todas las piezas en una
rejilla completa uniforme**: se modela como capas concéntricas (núcleo →
capas → caras → bordes → esquinas) sobre una rejilla de `4×4×4` a
`5×5×5` recortada a exactamente N piezas, priorizando mantener simetría
visual antes que llenar cada celda; el criterio exacto de recorte queda a
criterio de `implementer` dentro del rango 80–120, documentado en
`progress/impl_project-hero-lego-animation.md`). Cada posición final se
clasifica en una de 6 capas jerárquicas según su distancia al centro de
la rejilla en coordenadas discretas (Chebyshev distance desde el centro):
0 = núcleo, 1 = capas internas, 2 = bloques estructurales grandes
(posiciones intermedias con mayor "masa" visual — se asignan a geometrías
de brick más grandes, ver `bricks.ts`), 3 = caras externas (`x`, `y` o `z`
en el extremo de la rejilla pero no arista), 4 = bordes (dos coordenadas
en el extremo), 5 = esquinas (las 8 posiciones con las 3 coordenadas en el
extremo — de estas 8, las **4 designadas para el Final Lock** son un
subconjunto fijo elegido por diagonal opuesta, ver "Final Lock").

`layout.ts` exporta `generateFloatingPositions(n: number): Vector3Tuple[]`
y `generateCubePositions(n: number): { position: Vector3Tuple; layer: 0|1|2|3|4|5 }[]`
como funciones puras (sin dependencia de `THREE.*`, trabajan con tuplas
`[number, number, number]` — el mapeo a `THREE.Vector3` ocurre en
`scene.ts`/`bricks.ts`) para que sean testeables con Vitest sin mockear
WebGL.

## Trayectorias — `paths.ts`

`buildCatmullRomPath(from: Vector3Tuple, to: Vector3Tuple, seed: number): Vector3Tuple[]`
— pura. Genera 2–3 puntos de control intermedios entre `from` y `to`,
desplazados perpendicularmente a la línea recta `from→to` por un offset
pseudoaleatorio (determinístico a partir de `seed`, para que la spec sea
testeable sin `Math.random()` no determinístico), de forma que ninguna
pieza viaje en línea recta (R8) y que trayectorias de piezas cercanas no
se crucen de forma evidente (offset perpendicular acotado a un radio
pequeño relativo a la distancia total del viaje, para que las curvas
"weave" sin visualmente intersectarse). El array de puntos resultante se
pasa a `new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))`
dentro de `scene.ts`/`timeline.ts` — `paths.ts` en sí no importa `three`.

## `InstancedMesh` — `bricks.ts`

80–120 piezas con 3–4 variantes de tamaño (brick 2×2, 2×4, 1×2, plate
1×1 — proporciones LEGO reales aproximadas) y un puñado de colores fijos
(blanco, gris claro, gris oscuro, azul `#2C40FF`, amarillo). En vez de
120 `Mesh` individuales (costoso: 120 draw calls), se usa **un
`THREE.InstancedMesh` por combinación (tamaño, color)** — con 4 tamaños ×
5 colores = hasta 20 `InstancedMesh`, cada uno con `count` = número de
piezas de esa combinación (la mayoría de combinaciones tendrán pocas
instancias, dado el peso 65/20/5/8/2% de la paleta). Esto mantiene el
draw-call count bajo (~20, no 120) sin perder la capacidad de mover/rotar
cada instancia individualmente vía `setMatrixAt(index, matrix)` en cada
frame durante el viaje, y `instanceMatrix.needsUpdate = true` tras
actualizar. La asignación pieza→(tamaño, color, InstancedMesh, índice)
ocurre una vez al construir la escena y se guarda en un array paralelo de
"estado de pieza" (posición actual, posición objetivo, curva, progreso
0–1) que el loop de animación de GSAP actualiza.

**Geometría del brick**: una función `buildBrickGeometry(size)` que
combina un `THREE.BoxGeometry` (con bevels vía `THREE.BoxGeometry` +
ligera normal-smoothing, o `RoundedBoxGeometry` de
`three/examples/jsm/geometries/RoundedBoxGeometry.js` si el bundle lo
justifica — decisión de `implementer`, documentar cuál se usó) para el
cuerpo, más `THREE.CylinderGeometry` de baja resolución (8–12 segmentos,
no 32 — no se necesita más para el tamaño en pantalla) para los studs
superiores, fusionados en un único `BufferGeometry` por tamaño (usando
`BufferGeometryUtils.mergeGeometries`) para que cada `InstancedMesh` siga
siendo una sola geometría con una sola llamada de instancia por objeto.

**Material**: `THREE.MeshPhysicalMaterial` (PBR) con `roughness` bajo
(~0.25–0.35), `clearcoat` leve para el brillo de plástico ABS, sin
`map`/texturas de suciedad (R15). Un `Map<string, MeshPhysicalMaterial>`
por color, reusado entre `InstancedMesh` de distinto tamaño pero mismo
color.

## Iluminación y cámara — `scene.ts`

- Key light: `THREE.DirectionalLight` intensidad alta, posición
  elevada-lateral, `castShadow` con `PCFSoftShadowMap` (sombra de
  contacto suave, sin piso visible — la sombra cae sobre un
  `THREE.ShadowMaterial` transparente o se omite del todo si el costo no
  se justifica en Fase 1; decisión de `implementer`, con nota si se
  simplifica).
- Fill light: `THREE.DirectionalLight` intensidad baja, lado opuesto.
- Rim light: `THREE.DirectionalLight` o `THREE.SpotLight` intensidad baja
  desde atrás/arriba, para separar el cubo del fondo claro.
- Ambient: `THREE.AmbientLight` o `THREE.HemisphereLight` intensidad baja.
- Environment map: `RoomEnvironment` de
  `three/examples/jsm/environments/RoomEnvironment.js` +
  `PMREMGenerator`, asignado a `scene.environment` (no a
  `scene.background`, que se mantiene en el color de estudio plano
  `#F6F7F9`) — este es el sustituto simplificado del "HDRI de estudio
  custom" que el brief pide y que Fase 1 explícitamente no produce a
  medida (ver "Alcance").
- `THREE.PerspectiveCamera(fov≈35–40, aspect, near, far)`, posición
  inicial elevada (`y > 0`) mirando al origen, controlada por GSAP durante
  las Escenas 1–3 (`camera.position` animado en un timeline de órbita
  lenta con `Math.sin/cos` sobre un radio fijo, o un tween GSAP de
  `theta`), y por `THREE.OrbitControls` (deshabilitado — `enabled =
  false`) hasta que el timeline llega al final (R14), momento en el que
  `controls.enabled = true` y el timeline dejar de tocar `camera.position`
  directamente (para no pelear con el input del usuario).
- Tone mapping: `renderer.toneMapping = THREE.ACESFilmicToneMapping`,
  `renderer.outputColorSpace = THREE.SRGBColorSpace`, luces con
  `renderer.physicallyCorrectLights = true` (o el flag equivalente vigente
  en la versión de `three` instalada — verificar en changelog al fijar
  versión, dado que esta API se renombró entre versiones de three.js;
  documentar en `progress/impl_project-hero-lego-animation.md` cuál se
  usó).

## GSAP timeline maestro — `timeline.ts`

Un único `gsap.timeline({ paused: true })` (controlado manualmente, no
autoplay descontrolado — se llama `.play()` tras el primer frame montado)
con las siguientes fases, en orden, usando labels de GSAP para que cada
fase sea legible:

1. **`floating` (~3s, R5)**: no es un tween de posición (las piezas ya
   están en su posición flotante desde la construcción de la escena) —
   es una fase de **espera coreografiada**: durante este tramo, un loop de
   `requestAnimationFrame` (fuera del timeline de GSAP, corriendo en
   paralelo, ya que es una animación continua/idle, no una transición de
   A a B) aplica rotación lenta por eje propio + drift sinusoidal por
   pieza usando `idlePhase`/velocidad individual guardada por pieza
   (mismo patrón de `idlePhase` que ya usa `AnimatedGrid.tsx` para su
   "breathing" — reutilizar la idea, no el código, porque acá es 3D). La
   cámara orbita lentamente vía un tween GSAP de un ángulo `theta` sobre
   `~3s` con `ease: "none"` (velocidad constante durante el orbit, ya que
   es idle, no una transición dramática).
2. **`signal` (~2s, R6)**: `gsap.to()` por pieza con `delay` proporcional
   a `distance(piece.position, origin) / maxDistance * signalDuration`
   (propagación desde el centro), cada uno un tween corto (~150–250ms) de
   escala/rotación (la "vibración") antes de iniciar su viaje — implementado
   como un `gsap.timeline()` anidado por pieza, insertado en el timeline
   maestro en la posición `"signal"` con offset `"<"`/valor de `delay`
   calculado (GSAP soporta arrays de delays por target vía
   `stagger: { each, from: "center", grid: ... }` si la geometría lo
   permite, o delays explícitos por pieza si no — decisión de
   `implementer`, documentar cuál).
3. **`assembly` (R7, R8, R9, R10)**: 6 sub-fases (una por `layer` 0–5 de
   `generateCubePositions`), cada una un `gsap.timeline()` anidado
   insertado con un label propio (`core`, `innerLayers`, `structural`,
   `faces`, `edges` — nota: `corners` (layer 5) se maneja aparte, ver
   Final Lock, no acá). Cada pieza dentro de una sub-fase anima su
   `progress` (0→1) a lo largo de su curva Catmull-Rom vía
   `gsap.to(pieceState, { progress: 1, duration: 1.2–2.2 (decreciendo por
   etapa para dar sensación de aceleración, R10), ease: "power2.inOut",
   onUpdate: () => sampleCurveAndSetMatrix(piece) })`, con overshoot
   logrado encadenando un segundo tween corto `ease: "back.out(1.4)"` al
   llegar a `progress ≈ 0.92` (mini-overshoot + settle, R8/R9) en vez de
   confiar solo en `power2.inOut`. Entre cada sub-fase se inserta un
   `gsap.timeline().to({}, { duration: 0.3–0.6 })` (pausa vacía, R10) que
   crece levemente en las últimas etapas para dar la sensación de "small
   pauses separate major construction stages".
4. **Onda final (R13)**, tras el Final Lock (ver abajo): un
   `gsap.to()` con `stagger: { each: 0.01, from: "center", grid: [k,k,k]
   }` (o equivalente manual) que aplica un desplazamiento mínimo
   (fracción de unidad) + retorno a cada pieza ya asentada, simulando una
   onda que atraviesa el cubo — amplitud pequeña a propósito ("casi
   imperceptible" en el brief).
5. Al terminar el timeline: `controls.enabled = true` (R14), se detiene
   cualquier tween de cámara controlado por GSAP y se deja que
   `OrbitControls` tome el control; opcionalmente se deja un tween de
   auto-rotación muy lenta con `controls.autoRotate = true,
   controls.autoRotateSpeed` bajo, para que "siga orbitando varios
   segundos" (brief) incluso sin interacción del usuario, hasta el primer
   `pointerdown` del usuario sobre el canvas (momento en que se apaga
   `autoRotate` para no pelear con el drag).

## Final Lock — secuencia explícita (R11–R13)

De las 8 posiciones de esquina (`layer === 5`), se eligen **4 fijas** (una
diagonal alterna del cubo: esquinas en índice par de la lista ordenada por
`(x,y,z)` signo, o cualquier criterio determinístico documentado por
`implementer`) como las "4 esquinas del Final Lock"; las otras 4 esquinas
se asientan como parte normal de la sub-fase `assembly` (layer 5, sin
tratamiento especial) **antes** del Final Lock, de forma que al llegar al
Final Lock ya está todo el cubo armado salvo esas 4 piezas designadas.
Timeline explícito (todo dentro de un label `"finalLock"` del timeline
maestro):

```
pausa (0.5–0.8s, "dejar flotando, pausar")
  → esquina 1: vuelo (curva Catmull-Rom corta, ~1s, power2.inOut + mini
    overshoot) → snap (escala/rotación breve "settle", ~150ms)
  → pausa (0.3–0.5s)
  → esquina 2: vuelo → snap
  → pausa (0.3–0.5s)
  → esquina 3: vuelo → snap
  → pausa más larga (0.8–1.2s) — "longer pause" explícito del brief
  → esquina 4 (la final): rotación lenta de alineación (~0.8s, ease
    "sine.inOut", solo rotación, sin traslación grande — ya está cerca)
    → alineación final (pequeño ajuste de posición) → snap final
    (levemente más marcado que los anteriores: mini flash de escala
    1→1.08→1, ~200ms, "satisfying magnetic snap" como clímax)
  → inmediatamente después: onda final (ver arriba, R13)
```

Cada "snap" se implementa como un tween corto adicional encadenado al
final del tween de vuelo (no un evento aparte) para que quede expresado
en el propio timeline de GSAP, no en un callback ad-hoc — mantiene todo
el ritmo auditable/ajustable en un solo lugar (`timeline.ts`).

## `prefers-reduced-motion` (R18)

`LegoHeroScene.tsx` usa `usePrefersReducedMotion()` (mismo hook de
`app/state-of-ai/useReducedMotion.ts`, sin cambios ahí — se reutiliza tal
cual, mismo patrón que las 5 features de animación previas). Si devuelve
`true`:

- Se construye la escena (materiales, luces, cámara) pero las piezas se
  colocan **directamente** en sus posiciones finales del cubo
  (`generateCubePositions`), sin pasar por floating/signal/assembly/Final
  Lock — cero tweens de GSAP, cero timeline.
- La cámara se posiciona en un ángulo fijo (el mismo punto de "reposo"
  post-animación) y **no orbita automáticamente**; `OrbitControls` se
  habilita de inmediato (`enabled = true`) para que quien navega pueda
  seguir explorando el cubo manualmente sin movimiento no solicitado —
  consistente con el criterio de las 5 features previas ("qué se muestra
  en su lugar" no queda sin resolver: se muestra el resultado final,
  estático, interactivo solo bajo input explícito del usuario).
- Se sigue llamando `renderer.render()` una vez (o en cada frame solo si
  `controls.enabled` está en uso activo — con `OrbitControls` normalmente
  ya dispara su propio evento `change` que puede triggerear un render
  puntual en vez de un loop continuo de `requestAnimationFrame`, ahorrando
  batería/CPU cuando nadie interactúa).

**Alternativa descartada**: no mostrar nada (placeholder vacío) —
descartado porque el cubo final es información visual del value
proposition (orden desde colaboración) y omitirla por completo penaliza a
quien tiene `prefers-reduced-motion` activado sin necesidad, cuando el
resultado estático sí es seguro de mostrar.

## Fallback mobile / gama baja (R19)

`quality.ts` exporta `getQualityTier(): "full" | "reduced"`, pura salvo
por leer `window`/`navigator` (se le pasan como parámetros para
mantenerla testeable: `getQualityTier(viewportWidth: number,
hardwareConcurrency: number | undefined, deviceMemory: number | undefined):
"full" | "reduced"`), evaluada una vez al montar `LegoHeroScene.tsx`:

```
reduced SI:
  viewportWidth < 768        // mismo breakpoint md: que el resto del layout (R2)
  O hardwareConcurrency !== undefined && hardwareConcurrency <= 4
  O deviceMemory !== undefined && deviceMemory <= 4     // navigator.deviceMemory,
                                                          // Chrome/Edge only — undefined
                                                          // en Safari/Firefox, se ignora
                                                          // el criterio ahí (no penaliza
                                                          // por falta de soporte de API)
en cualquier otro caso: full
```

En tier `reduced`:
- `brickCount` baja de 80–120 a **30–40** piezas (mismo algoritmo de
  `layout.ts`, solo cambia `n`) — la jerarquía núcleo→esquinas se
  recalcula proporcionalmente sobre el cubo más chico (`k` menor), la
  narrativa de 3 escenas + Final Lock se mantiene intacta (brief: "misma
  narrativa, más liviana", no una versión distinta).
- `renderer.shadowMap.enabled = false` (sin sombras de contacto).
- Sin `clearcoat` en el material (o valor 0) y `roughness` levemente más
  alta — reduce el costo de reflejos.
- `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))` en vez
  de sin cap (evita renderizar a densidad de retina completa en pantallas
  chicas de gama baja).
- El environment map (`RoomEnvironment`) se omite (`scene.environment =
  null`), manteniendo solo las luces direccionales — el mayor costo de un
  environment map es el `PMREMGenerator` inicial + samples de reflejo por
  pixel, no crítico para la narrativa pero sí para FPS en gama baja.

`getQualityTier` se reevalúa solo al montar (no reactivamente en cada
resize) — cambiar de tier a mitad de animación no es un caso soportado en
Fase 1 (si alguien redimensiona la ventana de desktop a un ancho angosto
a mitad de la animación, la escena sigue en el tier con el que arrancó;
suficiente para Fase 1, un resize dinámico completo de calidad queda como
posible ítem de Fase 2 si se vuelve un problema real).

## Ciclo de vida / cleanup (R20)

`LegoHeroScene.tsx`, dentro del único `useEffect` de montaje:

```tsx
useEffect(() => {
  const { renderer, scene, camera, controls, timeline, dispose } = buildScene(container, tier, reducedMotion);
  // ... arranca timeline o modo estático
  return () => {
    timeline?.kill();          // gsap: detiene y limpia todos los tweens activos
    controls?.dispose();
    dispose();                  // recorre geometrías/materiales/InstancedMesh y
                                 // llama geometry.dispose()/material.dispose(),
                                 // renderer.dispose(), quita el <canvas> del DOM,
                                 // desconecta ResizeObserver
  };
}, []);
```

`dispose()` vive en `scene.ts` como función explícita (no confiar en el
garbage collector para recursos de WebGL, que no se liberan solos).

## Alternativas consideradas y descartadas

- **CSS/DOM 3D (`transform: rotate3d` sobre `<div>`s con `perspective`)
  en vez de WebGL real** — descartado: el brief pide PBR, reflejos,
  iluminación de estudio y 80–120 objetos independientes con trayectorias
  spline — inviable con transforms CSS a ese nivel de fidelidad y
  cantidad de objetos sin herramientas 3D reales.
- **React Three Fiber (`@react-three/fiber` + `@react-three/drei`) en vez
  de Three.js "vanilla" + GSAP** — descartado para Fase 1: R3F es
  idiomático en React pero agrega una capa de abstracción/dependencias
  extra (`@react-three/fiber`, `@react-three/drei`, más su propio modelo
  de reconciliación) sobre un problema que es, en esencia, imperativo
  (una escena con un timeline GSAP maestro, no un árbol de componentes
  React que re-renderiza). Vanilla Three.js dentro de un único
  `useEffect` (mismo patrón que `AnimatedGrid.tsx` ya usa para su canvas
  2D) mantiene el codebase consistente con el precedente existente y evita
  dos dependencias adicionales. Puede reconsiderarse en Fase 2 si la
  escena crece en interactividad.
  y complejidad de composición.
- **Física real (`cannon-es`/`rapier`) para las colisiones/drift de la
  Escena 1** — descartado: el brief pide movimiento "elegante", no
  físicamente simulado; un rechazo por distancia mínima (Poisson-disc) +
  drift sinusoidal por pieza logra "no colisionan, se sienten ingrávidas"
  sin el costo de un motor de física completo.
- **HDRI de estudio custom-producido** — descartado para Fase 1 (ver
  "Alcance"): `RoomEnvironment` genérico de Three.js da reflejos
  plausibles de "estudio" sin necesidad de producir/alojar un archivo
  `.hdr` propio; queda como mejora de Fase 2.
- **Cambiar el fondo de toda la sección hero (o de toda la home) a claro**
  para calzar con el brief al pie de la letra — descartado, ver
  "Conflicto de tema dark/light" arriba.
- **Imagen estática o video pre-renderizado como fallback mobile** en vez
  de una escena Three.js simplificada — descartado explícitamente por
  decisión de alcance ya comunicada: mantener la misma narrativa
  interactiva en todos los dispositivos es parte del valor de la pieza: un
  video no se adapta a `prefers-reduced-motion` de forma consistente con
  el resto del sitio y crea una segunda pieza de contenido a mantener.
- **No mostrar nada bajo `prefers-reduced-motion`** — descartado, ver
  sección de esa decisión arriba.
- **Un solo `THREE.Mesh` gigante fusionado (`BufferGeometryUtils.mergeGeometries`
  de todas las piezas en un único mesh) en vez de `InstancedMesh`** —
  descartado: fusionar todo en un mesh estático es más barato en draw
  calls pero pierde la capacidad de mover/rotar piezas individualmente
  durante la animación (cada pieza necesita su propia matriz de
  transformación por frame durante Escenas 2–3) — exactamente el caso de
  uso que `InstancedMesh.setMatrixAt` resuelve.

## Supabase / auth / cron

No aplica — esta feature es puramente de presentación en el cliente, sin
tocar Supabase, autenticación, ni cron jobs.
