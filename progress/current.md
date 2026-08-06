# Current session state

- **Feature:** project-hero-lego-animation (REABIERTA por cuarta vez — bugs
  1, 2 y "el caso peor de bug 3" (`n=30`, `prefers-reduced-motion`) ya
  corregidos y confirmados por navegador real en 2 pasadas de `reviewer`
  distintas. `reviewer` rechazó la tercera pasada por un caso de borde
  específico de `chooseGridDims()` que **no** afecta la ruta crítica que
  originó el bug, pero sí una porción grande del tier `full` — ver
  `progress/review_project-hero-lego-animation.md`, tercera sección
  fechada.)
- **Status:** in_progress
- **Started:** 2026-08-06
- **Role active:** implementer (invocado para el bug 4 abajo)
- **Next step:** implementer aplica el algoritmo YA ESPECIFICADO abajo
  (no hace falta redisear nada, ya está prototipado y verificado por fuerza
  bruta en este mismo mensaje), agrega el test de regresión de rango
  completo que pide el reviewer, verifica con navegador el caso `n=81`
  específico que encontró el reviewer, y listo — no debería hacer falta
  otra iteración de diseño. Luego: leader mueve a `in_review`, reviewer
  valida (cuarta pasada, debería ser la última).

## Bugs 1, 2 y 3 (caso crítico) — YA CORREGIDOS, no los toques

- Bug 1 (studs faltantes): commit `3758211`.
- Bug 2 (solapamiento, piezas unificadas a `"2x2"`): commit `f3a9c47`.
- Bug 3, caso crítico (`n=30` + `prefers-reduced-motion` fragmentado):
  commit `0542a9c`, introduce `chooseGridDims()` en `lib/lego/layout.ts`.
  **Este mecanismo general es el correcto** — el problema no es el enfoque,
  es un detalle de la función de selección (ver abajo). Confirmado en
  navegador real, de forma independiente, por 2 pasadas de `reviewer`
  distintas (la del rechazo anterior Y esta última) que la ruta
  `prefers-reduced-motion` con `n=30` ya se ve sólida, sin fragmentación.

## Bug 4 (NUEVO, acotado) — `chooseGridDims()` degenera para ~54% del rango del tier `full`

**Causa raíz exacta** (diagnóstico del `reviewer`, ya verificado por mí con
un script standalone — ver más abajo, no hace falta redescubrirlo):
`chooseGridDims()` actual usa el "spread" (diferencia entre la dimensión
más grande y la más chica) solo como **desempate** cuando el desperdicio
(`waste = product - n`) da EXACTAMENTE igual entre dos combinaciones — pero
eso casi nunca pasa para un `n` real, así que en la práctica el desempate
nunca se activa y la función siempre devuelve la caja de desperdicio mínimo
sin importar qué tan alargada quede. Ejemplo confirmado con navegador real
por el reviewer: `n=81` (dentro del rango 80-120 del tier `full`) da
`[3,4,7]` (spread=4, una caja claramente alargada, no un cubo) en vez de
algo razonablemente cúbico. El reviewer verificó por fuerza bruta que esto
pasa en **22 de los 41 valores enteros** de `n` en `[80,120]` — no es un
caso aislado.

**Fix — algoritmo exacto a implementar** (ya prototipado y verificado por
fuerza bruta en este mismo diagnóstico, no hace falta diseñar nada nuevo,
solo transcribirlo a `lib/lego/layout.ts` reemplazando la lógica actual de
`chooseGridDims`):

```js
function chooseGridDimsWithCap(n, maxSpread) {
  let best = null, bestWaste = Infinity;
  const upper = Math.ceil(Math.cbrt(n)) + 4; // cota superior de búsqueda, generosa
  for (let kx = 3; kx <= upper; kx++) {
    for (let ky = kx; ky <= upper; ky++) {       // ky >= kx evita permutaciones duplicadas
      for (let kz = ky; kz <= upper; kz++) {     // kz >= ky
        const product = kx * ky * kz;
        if (product < n) continue;
        const spread = kz - kx;                  // kx <= ky <= kz, así que esto ya es max-min
        if (spread > maxSpread) continue;         // FILTRO DURO, no desempate
        const waste = product - n;
        if (waste < bestWaste) { bestWaste = waste; best = [kx, ky, kz]; }
      }
    }
  }
  return best;
}

export function chooseGridDims(n) {
  for (let cap = 1; cap <= 5; cap++) {             // relaja el spread solo si hace falta
    const dims = chooseGridDimsWithCap(n, cap);
    if (dims) return dims;
  }
  // inalcanzable en la práctica para n >= 27 (siempre hay alguna caja con
  // spread <= 5), pero por completitud:
  throw new Error(`chooseGridDims: no valid dims found for n=${n}`);
}
```

La diferencia clave con la versión actual: el `spread` es un **filtro
duro** (candidatos con spread mayor al cap actual se descartan
directamente, no se los compara), y solo si NINGÚN candidato cumple el cap
actual se relaja el cap e intenta de nuevo — así el desperdicio mínimo se
minimiza *dentro* del conjunto de cajas razonablemente cúbicas, no en el
conjunto de todas las cajas posibles.

**Verificado por fuerza bruta** (corrido ahora mismo, antes de reabrir la
feature, para no mandar a `implementer` a redescubrir esto):

```
n=30  → [3,3,4] waste=6  spread=1 fill=83.3%
n=35  → [3,3,4] waste=1  spread=1 fill=97.2%
n=40  → [3,4,4] waste=8  spread=1 fill=83.3%
n=80  → [4,4,5] waste=0  spread=1 fill=100%
n=81  → [4,5,5] waste=19 spread=1 fill=81.0%   ← el caso que rompía antes, ahora spread=1
n=100 → [4,5,5] waste=0  spread=1 fill=100%
n=120 → [5,5,5] waste=5  spread=0 fill=96.0%

peor spread en TODO n de [80,120]: 1
peor spread en TODO n de [30,40]: 1
peor fill en TODO n de [80,120]: 80.8% (n=101)
peor fill en TODO n de [30,40]: 77.1% (n=37)
```

Con este algoritmo, el spread nunca pasa de 1 en ningún `n` de cualquiera
de los 2 tiers (`[30,40]` reduced, `[80,120]` full) — muy por debajo del
`spread=4` que rompía el caso `n=81` con el algoritmo anterior.

**Requisito de test (esto fue lo que faltó la vez pasada — no repetirlo)**:
el test de regresión anterior solo cubría `n ∈ {30,35,40,80,100,120}`
(6 valores puntuales, justo los que el reviewer notó que "esquivaban" el
bug por casualidad). Esta vez el test tiene que iterar **todo el rango
entero** de cada tier, no una muestra: `for (let n = 30; n <= 40; n++)` y
`for (let n = 80; n <= 120; n++)`, afirmando para cada uno que
`spread <= 1` (o el bound que quede tras implementar el algoritmo de
arriba) y `fill >= 0.75` (holgado respecto al 77.1% peor caso medido
arriba, para no ser frágil ante redondeos). Sin este test de rango
completo, un caso de borde como `n=81` puede volver a pasar
desapercibido — exactamente lo que pasó en la pasada anterior.

**Verificación con navegador real, requisito no negociable**: probar
específicamente `n=81` (el caso concreto que encontró el reviewer, forzado
en tier `full` — instrucciones de cómo forzar `n`/tier y esquivar el
`PinGate` ya documentadas en `progress/impl_project-hero-lego-animation.md`)
y confirmar que ya no se ve como una caja alargada. No hace falta repetir
todo el QA de las 3 pasadas anteriores (`prefers-reduced-motion` en `n=30`
ya está confirmado 2 veces por reviewers independientes) — alcanza con
confirmar este caso puntual más una mirada rápida a la narrativa completa
normal para descartar regresión.

## Trade-off pendiente de decisión del usuario (no lo resuelvas vos, no relacionado a este bug)

El fix del bug 2 (commit `f3a9c47`) unificó todas las piezas a tamaño
`"2x2"`, perdiendo la variedad (`2x4`/`1x2`/`plate1x1`) que `design.md`
había fijado como decisión definitiva. Pendiente de presentárselo al
usuario junto con el resultado final, una vez que esta feature quede
técnicamente aprobada.

## Nota de entorno para QA visual

Instrucciones completas (Playwright + Chromium preinstalado, cómo esquivar
`PinGate`, cómo forzar `n`/tier, cuidado con el puerto 3000 fantasma) están
en `progress/impl_project-hero-lego-animation.md`. Este sandbox reporta
`navigator.hardwareConcurrency=4`, que dispara tier `reduced` incluso en
viewport de escritorio ancho — para probar el tier `full` hace falta forzar
`hardwareConcurrency`/`deviceMemory` vía `addInitScript` (ya documentado).
