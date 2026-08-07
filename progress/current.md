# Current session state

- **Feature:** project-hero-lego-animation (REABIERTA por sexta vez — el
  usuario mandó una segunda captura de su propio navegador tras el fix de
  cámara de la pasada anterior: "la animacion se sigue viendo fuera de su
  canvas, con una especie de zoom", adjuntando una imagen de referencia de
  cómo debería verse y una captura real de `spinai-dev.vercel.app` donde
  el cubo se ve claramente recortado por el borde inferior/derecho del
  contenedor)
- **Status:** in_review
- **Started:** 2026-08-06
- **Role active:** ninguno — el fix de esta pasada lo apliqué yo
  directamente (leader), con evidencia de medición exacta (no una
  corazonada), pero corresponde igual una revisión independiente dado el
  historial de esta feature.
- **Next step:** `reviewer` valida el fix del canvas (bug 6) de forma
  independiente, con navegador real simulando una pantalla retina
  (`deviceScaleFactor: 2` en Playwright — la condición real que expuso el
  bug, que ningún QA anterior de esta feature había probado).

## Bugs 1-5 — YA CORREGIDOS, confirmados por reviewer en pasadas anteriores, no tocados en esta

Ver `progress/review_project-hero-lego-animation.md` (5 secciones fechadas)
y `progress/impl_project-hero-lego-animation.md` para el detalle de cada
uno. El bug 5 (distancia de cámara) de la pasada inmediatamente anterior
seguía siendo un problema real y válido — mejoró el encuadre — pero no era
la causa completa de lo que el usuario reportó la segunda vez.

## Bug 6 (NUEVO) — el `<canvas>` de Three.js nunca fijaba su tamaño CSS, desbordando su contenedor en cualquier pantalla retina/HiDPI

**Por qué el fix de cámara (bug 5) no fue suficiente**: ese fix resolvía
que el contenido de la escena (nube flotando, cubo) cupiera dentro del
frustum de la cámara — un problema real, ya corregido. Pero había un
SEGUNDO problema, independiente y más grave: el propio elemento
`<canvas>` que crea Three.js se estaba renderizando en un tamaño CSS más
grande que su contenedor DOM, así que aunque la cámara encuadrara bien el
contenido *dentro* del canvas, el canvas mismo se salía del marco visible
(el `border` del contenedor) — exactamente lo que muestra la segunda
captura del usuario: el cubo recortado por el borde inferior/derecho del
recuadro.

**Diagnóstico con medición exacta** (no una corazonada — se reprodujo
primero, se midió, después se corrigió y se volvió a medir): en
`app/components/lego/scene.ts`, la función `resize()` llamaba a
`renderer.setSize(width, height, false)` — el tercer parámetro
(`updateStyle`) en `false` le dice a Three.js que NUNCA fije el `style.width`/
`style.height` CSS del `<canvas>`, solo sus atributos HTML `width`/`height`
(que sí incluyen el `devicePixelRatio` multiplicado, para que el
renderizado sea nítido en pantallas de alta densidad). Sin ninguna regla
CSS que dijera lo contrario (no había ninguna — se confirmó por grep), el
`<canvas>` sin `style.width`/`height` explícito usa sus propios atributos
`width`/`height` como su tamaño CSS por defecto — es decir, en cualquier
pantalla con `devicePixelRatio > 1` (cualquier laptop/monitor retina, muy
común), el canvas se dibujaba literalmente más grande que su contenedor.

Reproducido en este sandbox simulando una pantalla retina real
(`deviceScaleFactor: 2` en el contexto de Playwright — algo que NINGÚN
QA anterior de esta feature había probado, todo el QA previo corrió a
`deviceScaleFactor: 1` por defecto): contenedor de 532×532 CSS px,
canvas renderizado a 795×795 CSS px — un desborde real y medible, no una
percepción visual.

**Fix**: cambiar `renderer.setSize(width, height, false)` a
`renderer.setSize(width, height, true)` en `resize()`. Con `updateStyle:
true`, Three.js fija explícitamente `canvas.style.width`/`height` al
tamaño CSS deseado, independiente del `devicePixelRatio` (que sigue
afectando solo la resolución interna de renderizado, para mantener la
nitidez en retina). Verificado tras el fix: mismo escenario retina,
canvas ahora en 530×530 CSS px dentro de un contenedor de 532×532 — la
diferencia de 2px es solo el `border` del contenedor, prácticamente
exacto.

**Verificación con navegador real** (Playwright + Chromium, PIN de prueba
solo-local, mismo método de siempre):
1. Retina simulada (`deviceScaleFactor: 2`) + tier `reduced` natural de
   este sandbox — nube flotando y cubo final, ambos contenidos
   perfectamente dentro del borde del contenedor, sin recorte. El cubo se
   arma correctamente (grilla limpia, sin solape, sin huecos) por los
   ~55s.
2. Retina simulada + tier `full` forzado — canvas correctamente
   dimensionado (530×530 en 532×532) igual que en el caso anterior. Nota
   aparte no relacionada al bug: al combinar retina simulada + tier
   `full` (100+ piezas, sombras, environment map) en este sandbox
   específico (renderizado por software vía Swiftshader, sin GPU real),
   la narrativa de ensamblaje se ve anormalmente lenta/estancada incluso
   después de 120s — se investigó y se descartó como un bug de código:
   con retina simulada pero SIN forzar el tier `full` (dejando el tier
   `reduced` natural de este sandbox), la misma combinación retina
   completa la narrativa con normalidad en ~55s. La lentitud aparece
   específicamente al combinar la resolución x2 de retina con el peso
   completo del tier `full` (más piezas + sombras + reflejos) en
   renderizado por software — un artefacto de este sandbox de pruebas sin
   aceleración de GPU real, no algo que un navegador real (con GPU) vaya
   a experimentar. Coherente con la propia captura del usuario, que
   mostraba piezas correctamente estructuradas en un patrón de grilla
   (no una masa amorfa), solo con el problema de recorte por el canvas
   — confirma que en su navegador real la narrativa sí progresa
   normalmente.

**Tests**: no aplica lógica pura nueva testeable (cambio de un booleano en
una llamada a la API de Three.js) — `npm run verify` (lint + build + 86
tests vitest + check-sdd-state) corrido y en verde, sin regresión.

## Trade-off pendiente de decisión del usuario (sigue sin resolver, no relacionado a este bug)

El fix del bug 2 unificó todas las piezas del cubo a tamaño `"2x2"`,
perdiendo la variedad de tamaños original. Sigue pendiente.

## Archivos cambiados esta pasada

`app/components/lego/scene.ts` (una sola línea: el tercer argumento de
`renderer.setSize()`, con comentario explicando la causa raíz).
