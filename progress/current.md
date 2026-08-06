# Current session state

- **Feature:** project-hero-lego-animation (REABIERTA por segunda vez —
  llegó a `done`, el usuario reportó que se veía mal, se reabrió, se
  corrigieron 2 bugs, `reviewer` RECHAZÓ la segunda pasada por un tercer
  bug — ver `progress/review_project-hero-lego-animation.md`, sección
  "Segunda pasada (2026-08-06, reapertura post-`done`)", especialmente
  "Hallazgo nuevo — el cubo queda incompleto...")
- **Status:** in_progress
- **Started:** 2026-08-06
- **Role active:** implementer (invocado para el bug 3 abajo)
- **Next step:** implementer corrige el bug 3, verifica con navegador real
  específicamente en `prefers-reduced-motion` Y en el extremo bajo de cada
  tier (no solo la narrativa completa en desktop, que es donde la cámara
  disimula el problema por oclusión — ver por qué abajo), deja capturas de
  evidencia, corrige la caracterización incorrecta en
  `progress/impl_project-hero-lego-animation.md` (líneas ~435-452 decían
  "clean" sobre capturas que en realidad mostraban huecos). Luego: leader
  mueve a `in_review`, reviewer valida de nuevo (tercera pasada).

## Bugs 1 y 2 — YA CORREGIDOS, no los toques

Ver commits `3758211` (studs faltantes por mergeGeometries no-indexado) y
`f3a9c47` (solapamiento por CELL_UNIT uniforme + tamaño de pieza variable —
el implementer lo resolvió fijando todas las piezas a `"2x2"`). Ambos
verificados visualmente y confirmados por `reviewer` en su segunda pasada.
El trade-off de perder variedad de tamaño de pieza (todas `"2x2"` ahora)
queda pendiente de una decisión del usuario aparte — no es parte de esta
reapertura, no lo reviertas ni lo "arregles" por tu cuenta.

## Bug 3 (NUEVO) — el cubo queda incompleto/fragmentado en `n` bajo de cada tier

El fix del bug 2 elimina el solapamiento, pero `generateCubePositions()` en
`lib/lego/layout.ts` tiene un problema estructural distinto que nunca se
detectó hasta la revisión del reviewer: usa `k = Math.max(3,
Math.ceil(Math.cbrt(n)))` para elegir el lado de una grilla **cúbica
perfecta** (`k×k×k`), y luego recorta esa grilla a exactamente `n` celdas.
El problema es matemático, no de la lógica de recorte en sí: para `n=30`
(el extremo bajo del tier `reduced`, que es exactamente lo que dispara
`prefers-reduced-motion` — ver nota de hardware abajo), no existe un `k`
entero tal que `k³` esté cerca de 30: `k=3` da 27 (insuficiente, hace falta
al menos 30), así que hay que usar `k=4` (64) — y quedan **34 celdas vacías
de 64 (53% vacío)**. El reviewer confirmó cuantitativamente:

```
n=30  k=4 grid=64  filled=30  fillRatio=46.9%   ← el peor caso, tier reduced
n=35  k=4 grid=64  filled=35  fillRatio=54.7%
n=40  k=4 grid=64  filled=40  fillRatio=62.5%
n=80  k=5 grid=125 filled=80  fillRatio=64.0%
n=100 k=5 grid=125 filled=100 fillRatio=80.0%
n=120 k=5 grid=125 filled=120 fillRatio=96.0%
```

Con tan poco relleno, no importa qué tan inteligente sea el criterio de
qué celdas exactas se recortan (el bug 2 ya mejoró eso) — la forma
resultante se ve fragmentada: el reviewer vio (y yo confirmé mirando
`after_reduced-motion_8s.png`, que ya existía como evidencia de la pasada
anterior sin que nadie notara el problema) una estructura partida en dos
mitades separadas por un hueco central, con piezas de esquina sueltas
flotando sin contacto visible. Esto pasa en la rama `prefers-reduced-motion`
(coloca las piezas directo en la posición final, cámara fija — R18,
**obligatoria**, no un caso opcional) y en el tier mobile/reducido.

**Por qué la narrativa completa en desktop se ve bien pese a compartir la
misma función**: al terminar, la cámara queda en `autoRotate` desde un
ángulo de tres cuartos que oculta buena parte de los huecos interiores por
oclusión (las piezas del frente tapan los huecos de atrás). La rama
`reducedMotion` usa un ángulo fijo mucho más frontal que expone el problema
sin filtro. Por eso el QA anterior (incluido el mío) no lo detectó — solo
se había mirado la narrativa completa en desktop.

**Dirección de fix recomendada** (a criterio de `implementer`, documentar
el enfoque elegido y por qué en `progress/impl_project-hero-lego-animation.md`,
sección nueva fechada): **dejar de exigir una grilla perfectamente cúbica
(`k×k×k`) como base**. En vez de eso, buscar las 3 dimensiones enteras
`(kx, ky, kz)`, cada una ≥ 3, cuyo producto sea ≥ `n` y lo más cercano
posible a `n` (minimizar el desperdicio), con una restricción de que las 3
dimensiones no difieran demasiado entre sí (para que siga leyéndose como un
cubo, no como una caja obviamente alargada — p. ej. que ninguna dimensión
difiera de otra en más de 1 o 2). Ejemplos concretos que resuelven los
casos límite de arriba con relleno cercano al 100%:
- `n=30` → `3×3×4=36` (83% relleno, muy por encima del 46.9% actual)
- `n=35` → `3×3×4=36` (97%)
- `n=40` → `3×4×4=48` (83%) o `3×3×5=45` (89%) — el que se vea mejor
- `n=80` → `4×4×5=80` (100%, exacto)
- `n=100` → `4×5×5=100` (100%, exacto)
- `n=120` → `4×5×6=120` (100%, exacto) o `5×5×5=125` recortado a 120 (96%)

Esto es un cambio estructural en `buildFullGrid()`/`generateCubePositions()`
(pasar de un solo `k` a `kx`/`ky`/`kz`), no un ajuste de una constante — va
a tocar también `interiorLayerOf` (el centro ya no es `(k-1)/2` único, son 3
centros por eje) y la clasificación de capas por `extremeCount`. Los 8
"corners" siguen siendo las 8 esquinas de la caja (sea cúbica o no), así que
el Final Lock no debería verse afectado en su lógica, solo en las
coordenadas concretas.

**Alternativa que NO recomiendo pero dejo mencionada por si la de arriba
resulta más difícil de lo esperado**: en vez de cambiar la forma de la
grilla base, cambiar el criterio de qué celdas se recortan de la grilla
`k×k×k` ya sobredimensionada (ej. "las N-8 celdas más cercanas al centro,
más las 8 esquinas siempre"), pero el reviewer y yo coincidimos en que esto
no ataca la causa raíz (con solo 47% de relleno disponible, cualquier
selección va a dejar mucho vacío) — solo lo vale intentar si la opción de
caja no-cúbica resulta inviable por algún motivo que no anticipamos.

**Requisito de aceptación no negociable**: no alcanza con arreglar el caso
de desktop/narrativa completa (ese ya se veía bien, por la oclusión de
cámara). Verificar con navegador real, específicamente:
1. `prefers-reduced-motion` activado (viewport desktop) — esto es lo que
   expuso el bug, es la prueba más importante.
2. El extremo bajo del tier `reduced` (`n` cerca de 30 — recordá que en
   este sandbox el propio Chromium reporta `hardwareConcurrency=4`, lo que
   dispara tier `reduced` incluso en viewport ancho de escritorio, ver nota
   abajo — no hace falta simular mobile para ver el tier reducido acá).
3. La narrativa completa en desktop sigue viéndose bien (no debería
   romperse, pero confirmalo).

Sacá capturas de las 3 rutas y guardalas en tu scratchpad (no las
commitees). Corregí también la caracterización incorrecta en
`progress/impl_project-hero-lego-animation.md` (líneas ~435-452 describían
capturas con huecos visibles como "clean non-overlapping grid" — o dejalas
corregidas si las nuevas capturas post-fix sí lo confirman).

## Nota de entorno para QA visual (para vos y para sesiones futuras)

Instrucciones completas de cómo levantar un navegador real acá (Playwright
+ Chromium preinstalado, cómo esquivar el `PinGate` con un PIN de prueba
solo-local, cuidado con el puerto 3000 fantasma) siguen documentadas en
`progress/impl_project-hero-lego-animation.md`. Dato nuevo que aportó
`reviewer`: este sandbox reporta `navigator.hardwareConcurrency=4` y
`navigator.deviceMemory=8` — con el criterio de `lib/lego/quality.ts`
(`hardwareConcurrency <= 4` dispara tier `reduced`), **cualquier QA visual
hecho en este entorno corre en tier `reduced` aunque el viewport sea ancho
de escritorio**. Tenelo en cuenta al interpretar lo que ves — no asumas que
estás viendo el tier `full` solo porque el viewport es de 1440px.

## Trade-off pendiente de decisión del usuario (no lo resuelvas vos)

El fix del bug 2 (commit `f3a9c47`) unificó todas las piezas a tamaño
`"2x2"`, perdiendo la variedad (`2x4`/`1x2`/`plate1x1`) que `design.md`
había fijado como decisión definitiva. `reviewer` dio su opinión técnica
(el resultado visual es limpio, es una simplificación honesta y bien
documentada, pero es una reducción real de fidelidad frente a lo aprobado)
sin tomar la decisión. Esto se lo voy a presentar al usuario junto con el
resultado final de esta reapertura — no es parte de lo que tenés que
resolver en esta pasada, y no lo relaciones con el bug 3.
