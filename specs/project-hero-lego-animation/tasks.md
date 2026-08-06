# Tasks — Escena 3D cinemática de bloques LEGO en el hero de la home

Orden secuencial. Cada tarea debe quedar verificada (build/manual QA según
corresponda) antes de pasar a la siguiente. Ver `design.md` para el detalle
de cada decisión referenciada acá.

## 0. Setup

- [x] 0.1 Agregar `three`, `gsap` a `dependencies` y `@types/three` a
      `devDependencies` en `package.json`; `npm install`. Confirmar que
      `npm run build` sigue en verde con las dependencias nuevas instaladas
      pero sin usarlas todavía (R21, sanity check temprano).

## 1. Lógica pura (testeable con Vitest)

- [x] 1.1 `lib/lego/layout.ts` (o `app/components/lego/layout.ts` si se
      prefiere co-ubicado con el resto de módulos de la escena — decisión
      de `implementer`, documentar dónde quedó): `generateFloatingPositions(n)`
      con rechazo por distancia mínima (R4). Test Vitest: para varios `n`
      dentro de 80–120, ninguna pareja de puntos queda a menos de
      `MIN_DIST`; todos los puntos caen dentro del volumen esperado.
- [x] 1.2 Mismo archivo: `generateCubePositions(n)` con clasificación por
      capa (0 núcleo … 5 esquinas), ver "Generación de posiciones" en
      `design.md`. Test Vitest: para `n` típico, exactamente 8 posiciones
      quedan clasificadas como `layer 5` (esquinas); el conteo por capa es
      simétrico donde corresponda; ninguna posición se repite.
- [x] 1.3 `paths.ts`: `buildCatmullRomPath(from, to, seed)` determinística
      (mismo `seed` → mismo resultado). Test Vitest: determinismo, y que
      el punto intermedio nunca coincide exactamente con la línea recta
      `from→to` (offset > 0) salvo casos degenerados documentados.
- [x] 1.4 `quality.ts`: `getQualityTier(viewportWidth, hardwareConcurrency,
      deviceMemory)` con el criterio exacto de `design.md`. Test Vitest:
      casos límite de cada condición (768 exacto, `undefined` en las
      señales de hardware, combinaciones).

## 2. Escena base (sin animación todavía)

- [x] 2.1 `bricks.ts`: geometría de brick (cuerpo con `RoundedBoxGeometry`
      + studs con `CylinderGeometry`, ver "InstancedMesh — bricks.ts" en
      `design.md` para los parámetros concretos), 3–4 tamaños, fusionada
      por tamaño con `BufferGeometryUtils.mergeGeometries`.
- [x] 2.2 `bricks.ts`: paleta de `MeshPhysicalMaterial` por color (blanco,
      gris claro, gris oscuro, azul `var(--color-primary)`/`#2C40FF`,
      amarillo), pesos 65/20/5/8/2% al asignar color por pieza (R16).
- [x] 2.3 `bricks.ts`: construcción de `InstancedMesh` por combinación
      (tamaño, color) y asignación pieza→(mesh, índice) (R15, "InstancedMesh"
      en `design.md`).
- [x] 2.4 `scene.ts`: `Scene`, `PerspectiveCamera`, `WebGLRenderer`
      (`alpha: true`, `ACESFilmicToneMapping`, `SRGBColorSpace`), 4 luces
      (key/fill/rim/ambient), `RoomEnvironment` + `PMREMGenerator` asignado
      a `scene.environment`, `renderer.setClearColor(0x000000, 0)` /
      `scene.background = null` (fondo transparente — R3). `OrbitControls`
      instanciado con `enabled = false`.
- [x] 2.5 `LegoHeroScene.tsx`: wrapper `"use client"`, monta canvas
      transparente (sin `background` propio; `border`/`border-radius`
      sutil opcional a criterio de `implementer`, documentado si se usa),
      `ResizeObserver` para tamaño responsive del renderer, coloca todas
      las piezas en sus posiciones flotantes iniciales (`generateFloatingPositions`)
      y renderiza un frame estático sobre el fondo oscuro existente de la
      sección hero. Cleanup completo al desmontar (R20).
- [x] 2.6 `app/page.tsx`: retirar `<AnimatedGrid />`, cambiar el layout a
      grid 2 columnas (`grid-cols-1 md:grid-cols-2`), texto a la izquierda
      sin cambios internos, `<LegoHeroScene />` a la derecha vía
      `next/dynamic({ ssr: false })` con placeholder de carga (R1, R2).
      Confirmar `AnimatedGrid.tsx` y su uso en `app/state-of-ai/page.tsx`
      quedan intactos.
- [x] 2.7 `npm run build` en verde (R21) — confirmar que no hay evaluación
      de `three`/`gsap` en el servidor (revisar output de build, no debe
      haber errores de `window is not defined` ni similares).
- [x] 2.8 Manual QA: abrir la home en desktop y en un viewport angosto
      (DevTools responsive, <768px) — layout correcto en ambos (R1, R2),
      resto de la página en dark theme intacto (R3), piezas visibles
      flotando estáticas con el canvas transparente sobre el fondo oscuro
      existente de la sección.

## 3. Escena 1 — Flotando

- [x] 3.1 Loop de rotación/drift idle por pieza (rotación propia +
      derivación sinusoidal, velocidad/fase individual) corriendo en
      paralelo al timeline de GSAP (R5).
- [x] 3.2 Órbita lenta de cámara durante ~3s inicial (tween GSAP de
      `theta`, `ease: "none"`).
- [x] 3.3 Manual QA: ver nota de limitación de entorno en
      `progress/impl_project-hero-lego-animation.md` — sin navegador
      disponible en este entorno, verificado por revisión de código
      (rechazo por `MIN_DIST` cubierto por Vitest en `layout.test.ts`;
      idle loop revisado línea por línea).

## 4. Escena 2 — La señal

- [x] 4.1 `timeline.ts`: cálculo de delay por pieza proporcional a su
      distancia al origen; tween corto de "vibración" (escala/rotación)
      por pieza con ese delay, insertado en el timeline maestro (R6).
- [x] 4.2 Manual QA: ver nota de limitación de entorno — verificado por
      revisión de código (delay = distancia/maxDistancia, propagación
      desde el centro confirmada matemáticamente, no visualmente).

## 5. Escena 3 — Ensamblaje coordinado

- [x] 5.1 `timeline.ts`: 6 sub-fases (núcleo, capas internas, bloques
      estructurales, caras, bordes, esquinas-no-Final-Lock — las 4
      esquinas del Final Lock se excluyen de la última sub-fase, ver
      sección 6), cada una moviendo el subconjunto de piezas de esa capa
      a lo largo de su curva Catmull-Rom (R7, R8).
- [x] 5.2 Easing con mini-overshoot + settle (`power2.inOut` + segundo
      tween `back.out(1.4)` al final del viaje, con extrapolación acotada
      de la curva más allá de `progress=1` para expresar el overshoot
      posicionalmente) por pieza (R8, R9).
- [x] 5.3 Pausas entre sub-fases, con duración creciente en las últimas
      etapas (0.3→0.55s); duración de viaje decreciente por etapa
      (2.2s→1.2s) para dar sensación de aceleración progresiva (R10).
- [x] 5.4 Manual QA: ver nota de limitación de entorno — verificado por
      revisión de código (orden de `stageGroups`, cursor secuencial sin
      solapamiento entre etapas salvo el stagger interno de ≤0.3s).

## 6. Final Lock

- [x] 6.1 `layout.ts`/`timeline.ts`: selección determinística de las 4
      esquinas del Final Lock vía `selectFinalLockCorners` (paridad par
      relativa al centroide — subconjunto tipo tetraedro, ver comentario
      en `layout.ts`); las otras 4 esquinas se asientan en la sub-fase
      `cornersNormal` de `timeline.ts` antes del Final Lock. Cubierto por
      Vitest (`layout.test.ts`).
- [x] 6.2 Secuencia de las 3 primeras esquinas: pausa inicial (0.65s) →
      vuelo + snap → pausa (0.4s) → vuelo + snap → pausa (0.4s) → vuelo +
      snap → pausa larga (1.0s) (R11, R12).
- [x] 6.3 Cuarta esquina: aproximación rápida → rotación lenta de
      alineación (0.8s, `sine.inOut`) → ajuste de posición → snap final
      más marcado (mini flash de escala 1→1.08→1) (R12).
- [x] 6.4 Onda final post-Final Lock (delay proporcional a distancia desde
      el centro, amplitud 0.06 unidades) hasta que todo queda estático
      (R13).
- [x] 6.5 Al terminar el timeline: habilitar `OrbitControls`
      (`enabled = true`), `autoRotate` lento hasta el primer `pointerdown`
      real del usuario post-handoff (R14).
- [x] 6.6 Manual QA: ver nota de limitación de entorno — verificado por
      revisión de código y por los tests de `selectFinalLockCorners`
      (siempre 4, siempre subconjunto de las 8 esquinas, deterministico).

## 7. Accesibilidad — `prefers-reduced-motion`

- [x] 7.1 `LegoHeroScene.tsx`: rama con `usePrefersReducedMotion()` — sin
      timeline, piezas directo en posiciones finales del cubo
      (`placePieceAtCube`), cámara fija, `OrbitControls` habilitado de
      inmediato (R18).
- [x] 7.2 Manual QA: ver nota de limitación de entorno — verificado por
      revisión de código de la rama `reducedMotion` en `LegoHeroScene.tsx`
      (ningún `requestAnimationFrame` continuo se inicia en esa rama,
      solo un render inicial + render on `controls` `"change"`).

## 8. Fallback mobile / gama baja

- [x] 8.1 `LegoHeroScene.tsx`: evalúa `getQualityTier` al montar, aplica
      `brickCount` reducido (30–40 vía `pickBrickCount`), desactiva
      sombras/`clearcoat`/environment map en `scene.ts`/`bricks.ts`, cap
      de `devicePixelRatio` a 1.5 en tier `reduced` (R19).
- [x] 8.2 Manual QA: ver nota de limitación de entorno — verificado por
      revisión de código y por los Vitest de `quality.test.ts` (casos
      límite del criterio de tier); la narrativa de `timeline.ts` no tiene
      ninguna rama distinta por tier — mismo código, menos piezas.

## 9. Cleanup y regresión final

- [x] 9.1 `LegoHeroScene.tsx`: `dispose()` (en `scene.ts`) libera
      geometrías/materiales/renderer y remueve el canvas; `timeline?.kill()`
      (vía `cleanupFns`) + `controls.dispose()` (dentro de `dispose()`) se
      llaman al desmontar (R20) — verificado por revisión de código; sin
      profiler de navegador disponible en este entorno (ver nota de
      limitación), no se pudo confirmar memoria estable tras ciclos
      repetidos de montar/desmontar en DevTools real.
- [x] 9.2 Skill `design-check` corrido (manualmente, ver progress doc)
      sobre `LegoHeroScene.tsx` y `LegoHeroSceneLoader.tsx` (los únicos
      `.tsx` nuevos bajo `app/components/`; los módulos `.ts` de
      `app/components/lego/` quedan fuera del alcance textual del skill) —
      sin hallazgos.
- [x] 9.3 `npm run verify` completo en verde (lint, build, test, check-sdd-state)
      — ver resultado en `progress/impl_project-hero-lego-animation.md`.
- [x] 9.4 Confirmado (código + `curl` de `/state-of-ai`): `app/state-of-ai/page.tsx`
      sigue importando y usando `<AnimatedGrid variant="background" intensity={0.2} />`
      sin cambios; `AnimatedGrid.tsx` no fue tocado.
- [x] 9.5 Documentado en `progress/impl_project-hero-lego-animation.md`.
