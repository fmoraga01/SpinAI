# Current session state

- **Feature:** project-hero-lego-animation (REABIERTA por tercera vez —
  bugs 1 y 2 ya corregidos y verificados, `reviewer` había rechazado la
  segunda pasada por un tercer bug de relleno de grilla incompleto — ver
  `progress/review_project-hero-lego-animation.md`. En esta tercera pasada
  el `implementer` corrigió el bug 3, verificado con navegador real en las
  3 rutas obligatorias.)
- **Status:** in_progress
- **Started:** 2026-08-06
- **Role active:** ninguno — implementer terminó su parte, listo para que
  `leader` mueva a `in_review` e invoque a `reviewer` (tercera pasada).
- **Next step:** `leader` mueve `project-hero-lego-animation` a `in_review`
  y despacha `reviewer` para validar el fix del bug 3 con navegador real
  (no confiar solo en lo escrito acá — ver instrucción de "no repetir el
  patrón" abajo).

## Bugs 1 y 2 — YA CORREGIDOS, no los toques

Ver commits `3758211` (studs faltantes por mergeGeometries no-indexado) y
`f3a9c47` (solapamiento por CELL_UNIT uniforme + tamaño de pieza variable —
el implementer lo resolvió fijando todas las piezas a `"2x2"`). Ambos
verificados visualmente y confirmados por `reviewer` en su segunda pasada.

## Bug 3 — CORREGIDO esta pasada (2026-08-06, tercera reapertura)

**Causa raíz** (diagnóstico completo del `reviewer` en la pasada anterior,
confirmado): `generateCubePositions()` en `lib/lego/layout.ts` forzaba una
grilla cúbica perfecta `k×k×k` (`k = max(3, ceil(cbrt(n)))`) y la recortaba
a `n` celdas. Para `n=30` (extremo bajo del tier `reduced`, que es
exactamente lo que dispara `prefers-reduced-motion` en este sandbox, ya que
`navigator.hardwareConcurrency=4` activa tier `reduced` incluso en viewport
ancho de escritorio) no había `k` entero cuyo cubo estuviera cerca de 30:
`k=3`→27 (insuficiente), `k=4`→64 (46.9% de relleno tras recortar a 30). El
cubo se veía fragmentado en dos mitades con esquinas sueltas — más visible
en la rama `prefers-reduced-motion` (cámara fija, frontal, sin oclusión) que
en la narrativa completa de desktop (cámara `autoRotate` de tres cuartos
oculta los huecos por oclusión).

**Fix implementado**: nueva función `chooseGridDims(n)` en
`lib/lego/layout.ts` reemplaza el único `k` por 3 dimensiones enteras
`[kx, ky, kz]` (cada una `>= 3`), buscando la combinación con producto
`>= n` y menor desperdicio (`product - n`), desempatando por menor
diferencia entre la dimensión más grande y la más chica (para que siga
leyéndose como cubo, no como caja alargada). `buildFullGrid()` y la
clasificación de capas interiores (`interiorLayerOf`) se actualizaron para
usar centros por eje en vez de un único centro escalar. Los 8 corners siguen
siendo las 8 esquinas de la caja — `selectFinalLockCorners()` no necesitó
cambios.

Fill ratios antes/después (ver tabla completa y detalle en
`progress/impl_project-hero-lego-animation.md`, sección "Bug 3"):

```
n=30  antes 46.9% (4×4×4=64)  → después 83.3% (3×3×4=36)
n=35  antes 54.7%              → después 97.2% (3×3×4=36)
n=40  antes 62.5%              → después 88.9% (3×3×5=45)
n=80  antes 64.0%              → después 100.0% (4×4×5=80)
n=100 antes 80.0%              → después 100.0% (4×5×5=100)
n=120 antes 96.0%              → después 100.0% (4×5×6=120)
```

**Verificación con navegador real** (Playwright + Chromium, PIN gate
bypasseado con env vars locales, mecánica completa documentada en
`progress/impl_project-hero-lego-animation.md`), las 3 rutas obligatorias:

1. `prefers-reduced-motion` activado, desktop, `n=30` forzado (worst case,
   vía `Math.random` sobreescrito a 0 después del login) — cubo sólido y
   reconocible, sin fragmentación, sin esquinas sueltas. Idéntico entre 8s y
   14s (asentado). Esta era la prueba más importante, la que expuso el bug
   — confirmada arreglada.
2. Extremo bajo del tier `reduced` (`n=30` forzado), narrativa completa
   normal, desktop — caja sólida y densa desde la cámara `autoRotate`, sin
   huecos visibles, consistente entre 35s y 50s.
3. Narrativa completa desktop, `n` natural (sin forzar) — este sandbox cae
   naturalmente en tier `reduced` por `hardwareConcurrency=4` — resultado
   igual de sólido, sin regresión.

**Tests**: `lib/lego/layout.test.ts` ganó un `describe("chooseGridDims")`
con guardas de regresión (fill ratio `> 80%`, dimensiones `>= 3`, spread
`<= 2` entre dimensiones) para `n` en `[30, 35, 40, 80, 100, 120]`, además
de los tests preexistentes de bug 1/2 (no-overlap, corners, etc.) que
siguen pasando sin cambios. `npm run verify` (lint + build + vitest 90 tests
+ check-sdd-state) en verde.

**Corrección de documentación**: se corrigió la caracterización incorrecta
en `progress/impl_project-hero-lego-animation.md` (antes decía "clean
non-overlapping grid" sobre capturas que en realidad mostraban el cubo
fragmentado — el problema era que "sin solape" y "relleno completo" son
propiedades distintas y se habían conflado). Ver esa sección para el texto
corregido y la nueva sección fechada "Bug 3" con el detalle completo.

## Trade-off pendiente de decisión del usuario (no lo resuelvas vos)

El fix del bug 2 (commit `f3a9c47`) unificó todas las piezas a tamaño
`"2x2"`, perdiendo la variedad (`2x4`/`1x2`/`plate1x1`) que `design.md`
había fijado como decisión definitiva. `reviewer` dio su opinión técnica
(el resultado visual es limpio, es una simplificación honesta y bien
documentada, pero es una reducción real de fidelidad frente a lo aprobado)
sin tomar la decisión. Esto se le va a presentar al usuario junto con el
resultado final de esta reapertura — no es parte de lo que hay que
resolver acá, y no se relaciona con el bug 3.

## Nota de entorno para QA visual (para vos y para sesiones futuras)

Instrucciones completas de cómo levantar un navegador real (Playwright +
Chromium preinstalado, cómo esquivar el `PinGate` con un PIN de prueba
solo-local, cuidado con el puerto 3000 fantasma) siguen documentadas en
`progress/impl_project-hero-lego-animation.md`. Dato nuevo de esta pasada:
`PinGate` no renderiza nada hasta que resuelve su fetch a
`/api/auth/check` — un `waitForTimeout` fijo corto después de `page.goto()`
antes de buscar el input del PIN es propenso a race conditions; mejor usar
`waitFor({ state: "visible" })` explícito sobre el input o sobre contenido
ya autenticado. También: sobreescribir `Math.random` vía
`page.addInitScript()` *antes* del primer login rompe el click del botón
"Entrar" (el POST a `/api/auth` nunca se dispara) — hay que loguearse
primero sin el override, y recién después registrar el override y hacer
`page.reload()` (la cookie de sesión sobrevive el reload).
