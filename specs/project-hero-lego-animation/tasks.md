# Tasks — Escena 3D cinemática de bloques LEGO en el hero de la home

Orden secuencial. Cada tarea debe quedar verificada (build/manual QA según
corresponda) antes de pasar a la siguiente. Ver `design.md` para el detalle
de cada decisión referenciada acá.

## 0. Setup

- [ ] 0.1 Agregar `three`, `gsap` a `dependencies` y `@types/three` a
      `devDependencies` en `package.json`; `npm install`. Confirmar que
      `npm run build` sigue en verde con las dependencias nuevas instaladas
      pero sin usarlas todavía (R21, sanity check temprano).

## 1. Lógica pura (testeable con Vitest)

- [ ] 1.1 `lib/lego/layout.ts` (o `app/components/lego/layout.ts` si se
      prefiere co-ubicado con el resto de módulos de la escena — decisión
      de `implementer`, documentar dónde quedó): `generateFloatingPositions(n)`
      con rechazo por distancia mínima (R4). Test Vitest: para varios `n`
      dentro de 80–120, ninguna pareja de puntos queda a menos de
      `MIN_DIST`; todos los puntos caen dentro del volumen esperado.
- [ ] 1.2 Mismo archivo: `generateCubePositions(n)` con clasificación por
      capa (0 núcleo … 5 esquinas), ver "Generación de posiciones" en
      `design.md`. Test Vitest: para `n` típico, exactamente 8 posiciones
      quedan clasificadas como `layer 5` (esquinas); el conteo por capa es
      simétrico donde corresponda; ninguna posición se repite.
- [ ] 1.3 `paths.ts`: `buildCatmullRomPath(from, to, seed)` determinística
      (mismo `seed` → mismo resultado). Test Vitest: determinismo, y que
      el punto intermedio nunca coincide exactamente con la línea recta
      `from→to` (offset > 0) salvo casos degenerados documentados.
- [ ] 1.4 `quality.ts`: `getQualityTier(viewportWidth, hardwareConcurrency,
      deviceMemory)` con el criterio exacto de `design.md`. Test Vitest:
      casos límite de cada condición (768 exacto, `undefined` en las
      señales de hardware, combinaciones).

## 2. Escena base (sin animación todavía)

- [ ] 2.1 `bricks.ts`: geometría de brick (cuerpo con `RoundedBoxGeometry`
      + studs con `CylinderGeometry`, ver "InstancedMesh — bricks.ts" en
      `design.md` para los parámetros concretos), 3–4 tamaños, fusionada
      por tamaño con `BufferGeometryUtils.mergeGeometries`.
- [ ] 2.2 `bricks.ts`: paleta de `MeshPhysicalMaterial` por color (blanco,
      gris claro, gris oscuro, azul `var(--color-primary)`/`#2C40FF`,
      amarillo), pesos 65/20/5/8/2% al asignar color por pieza (R16).
- [ ] 2.3 `bricks.ts`: construcción de `InstancedMesh` por combinación
      (tamaño, color) y asignación pieza→(mesh, índice) (R15, "InstancedMesh"
      en `design.md`).
- [ ] 2.4 `scene.ts`: `Scene`, `PerspectiveCamera`, `WebGLRenderer`
      (`alpha: true`, `ACESFilmicToneMapping`, `SRGBColorSpace`), 4 luces
      (key/fill/rim/ambient), `RoomEnvironment` + `PMREMGenerator` asignado
      a `scene.environment`, `renderer.setClearColor(0x000000, 0)` /
      `scene.background = null` (fondo transparente — R3). `OrbitControls`
      instanciado con `enabled = false`.
- [ ] 2.5 `LegoHeroScene.tsx`: wrapper `"use client"`, monta canvas
      transparente (sin `background` propio; `border`/`border-radius`
      sutil opcional a criterio de `implementer`, documentado si se usa),
      `ResizeObserver` para tamaño responsive del renderer, coloca todas
      las piezas en sus posiciones flotantes iniciales (`generateFloatingPositions`)
      y renderiza un frame estático sobre el fondo oscuro existente de la
      sección hero. Cleanup completo al desmontar (R20).
- [ ] 2.6 `app/page.tsx`: retirar `<AnimatedGrid />`, cambiar el layout a
      grid 2 columnas (`grid-cols-1 md:grid-cols-2`), texto a la izquierda
      sin cambios internos, `<LegoHeroScene />` a la derecha vía
      `next/dynamic({ ssr: false })` con placeholder de carga (R1, R2).
      Confirmar `AnimatedGrid.tsx` y su uso en `app/state-of-ai/page.tsx`
      quedan intactos.
- [ ] 2.7 `npm run build` en verde (R21) — confirmar que no hay evaluación
      de `three`/`gsap` en el servidor (revisar output de build, no debe
      haber errores de `window is not defined` ni similares).
- [ ] 2.8 Manual QA: abrir la home en desktop y en un viewport angosto
      (DevTools responsive, <768px) — layout correcto en ambos (R1, R2),
      resto de la página en dark theme intacto (R3), piezas visibles
      flotando estáticas con el canvas transparente sobre el fondo oscuro
      existente de la sección.

## 3. Escena 1 — Flotando

- [ ] 3.1 Loop de rotación/drift idle por pieza (rotación propia +
      derivación sinusoidal, velocidad/fase individual) corriendo en
      paralelo al timeline de GSAP (R5).
- [ ] 3.2 Órbita lenta de cámara durante ~3s inicial (tween GSAP de
      `theta`, `ease: "none"`).
- [ ] 3.3 Manual QA: confirmar que ninguna pieza colisiona visualmente
      con otra durante ~10s de observación libre de la fase idle (antes
      de conectar la Escena 2, correr esta fase en loop temporalmente
      para poder observarla) y que el movimiento se siente ingrávido, no
      mecánico.

## 4. Escena 2 — La señal

- [ ] 4.1 `timeline.ts`: cálculo de delay por pieza proporcional a su
      distancia al origen; tween corto de "vibración" (escala/rotación)
      por pieza con ese delay, insertado en el timeline maestro (R6).
- [ ] 4.2 Manual QA: la propagación se percibe como una onda desde el
      centro hacia afuera, no simultánea ni aleatoria.

## 5. Escena 3 — Ensamblaje coordinado

- [ ] 5.1 `timeline.ts`: 5 sub-fases (núcleo, capas internas, bloques
      estructurales, caras, bordes — esquinas se maneja en la sección 6,
      Final Lock), cada una moviendo el subconjunto de piezas de esa capa
      a lo largo de su curva Catmull-Rom (R7, R8).
- [ ] 5.2 Easing con mini-overshoot + settle (`power2.inOut` + segundo
      tween `back.out` al final del viaje) por pieza (R8, R9).
- [ ] 5.3 Pausas entre sub-fases, con duración creciente en las últimas
      etapas; duración de viaje decreciente por etapa para dar sensación
      de aceleración progresiva (R10).
- [ ] 5.4 Manual QA: el orden núcleo→capas→estructurales→caras→bordes es
      perceptible a simple vista viendo la animación completa una vez;
      hay pausas claras entre etapas, no velocidad constante.

## 6. Final Lock

- [ ] 6.1 `layout.ts`/`timeline.ts`: selección determinística de las 4
      esquinas del Final Lock (subconjunto fijo de las 8 posiciones
      `layer 5`); las otras 4 esquinas se asientan en la sub-fase normal
      de bordes/esquinas restante antes del Final Lock.
- [ ] 6.2 Secuencia de las 3 primeras esquinas: pausa inicial → vuelo +
      snap → pausa → vuelo + snap → pausa → vuelo + snap → pausa larga
      (R11, R12, timings exactos de `design.md`).
- [ ] 6.3 Cuarta esquina: rotación lenta de alineación → ajuste de
      posición → snap final más marcado (mini flash de escala) (R12).
- [ ] 6.4 Onda final post-Final Lock (`stagger` desde el centro, amplitud
      mínima) hasta que todo queda estático (R13).
- [ ] 6.5 Al terminar el timeline: habilitar `OrbitControls`
      (`enabled = true`), `autoRotate` lento hasta el primer `pointerdown`
      del usuario (R14).
- [ ] 6.6 Manual QA: ver la secuencia completa del Final Lock al menos 3
      veces (recargar la página), confirmar que se siente como el clímax
      — pausas perceptibles, snap final más marcado que los anteriores, y
      que después de eso se puede arrastrar el cubo con el mouse.

## 7. Accesibilidad — `prefers-reduced-motion`

- [ ] 7.1 `LegoHeroScene.tsx`: rama con `usePrefersReducedMotion()` — sin
      timeline, piezas directo en posiciones finales del cubo, cámara fija,
      `OrbitControls` habilitado de inmediato (R18).
- [ ] 7.2 Manual QA: activar "reducir movimiento" en el sistema operativo,
      recargar la home — se ve el cubo ya armado, estático, sin animación
      de cámara automática, y se puede rotar manualmente con el mouse.

## 8. Fallback mobile / gama baja

- [ ] 8.1 `LegoHeroScene.tsx`: evaluar `getQualityTier` al montar, aplicar
      `brickCount` reducido (30–40), desactivar sombras/`clearcoat`/
      environment map, cap de `devicePixelRatio` en tier `reduced` (R19).
- [ ] 8.2 Manual QA: viewport angosto (<768px) o simular
      `navigator.hardwareConcurrency` bajo en DevTools — confirmar que la
      misma narrativa de 3 escenas + Final Lock corre completa, con menos
      piezas y sin efectos costosos, sin caer a una imagen estática.

## 9. Cleanup y regresión final

- [ ] 9.1 `LegoHeroScene.tsx`: confirmar que `dispose()` libera
      geometrías/materiales/renderer y que `timeline.kill()` +
      `controls.dispose()` se llaman al desmontar (R20) — verificar
      navegando fuera de la home y de vuelta varias veces sin fugas
      visibles (memoria estable en el profiler de DevTools tras 5 ciclos
      de montar/desmontar).
- [ ] 9.2 Correr el skill `design-check` sobre `LegoHeroScene.tsx` y
      cualquier otro archivo bajo `app/components/*.tsx` tocado (regla de
      `docs/specs.md` para cambios en `app/components/*`).
- [ ] 9.3 `npm run verify` completo en verde (lint, build, test — incluye
      los Vitest de la sección 1 —, check-sdd-state).
- [ ] 9.4 Confirmar en el navegador que `app/state-of-ai/page.tsx` sigue
      mostrando `AnimatedGrid` sin cambios (regresión de la única otra
      consumidora del componente que se está retirando de la home).
- [ ] 9.5 Documentar en `progress/impl_project-hero-lego-animation.md`:
      decisiones de `implementer` dejadas abiertas en `design.md` (criterio
      exacto de recorte del cubo a N piezas, valores concretos elegidos
      dentro de los rangos de duración del timeline GSAP, resultado de
      cada manual QA de las secciones 2–8) y el resultado de `npm run verify`.
