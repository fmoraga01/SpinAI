# Current session state

- **Feature:** project-hero-lego-animation (REABIERTA — había llegado a `done`
  el 2026-08-06, el usuario reportó "se ve mal la implementacion" y QA visual
  real en navegador confirmó bugs genuinos)
- **Status:** in_progress
- **Started:** 2026-08-06 (reabierta el mismo día tras QA visual real)
- **Role active:** implementer (invocado para el bug 2 abajo)
- **Next step:** implementer corrige el bug del cubo (ver "Bug 2" abajo), deja
  documentado en `progress/impl_project-hero-lego-animation.md` qué algoritmo
  usó, y **verifica el resultado con una captura de pantalla real** (ver
  "Cómo hacer QA visual real" abajo — ya no hay excusa de "sandbox sin
  navegador", se puede). Luego: leader mueve a `in_review`, reviewer valida
  (incluyendo correr el script de captura y mirar las imágenes, no solo leer
  código), y solo entonces vuelve a `done`.

## Contexto: por qué se reabrió

El reviewer había aprobado la feature el 2026-08-06 pero con una nota
explícita de que el sandbox de esa sesión no tenía navegador/GPU, así que
todo lo visual se validó solo por lectura de código. El usuario probó la
implementación real y dijo que se veía mal. En ESTA sesión sí fue posible
levantar Chromium vía Playwright (preinstalado en el entorno, ver
"Cómo hacer QA visual real" abajo) contra `npm run dev`, así que se pudo
diagnosticar con evidencia visual real en vez de suposiciones.

## Bug 1 — YA CORREGIDO (verificado visualmente)

`app/components/lego/bricks.ts`, función `buildBrickGeometry()`:
`THREE.BufferGeometryUtils.mergeGeometries()` fallaba en **cada** pieza
(confirmado por `console.error` real en el navegador:
`"All geometries must have compatible attributes; make sure index attribute
exists among all geometries, or in none of them"`). Causa raíz:
`RoundedBoxGeometry` (three.js) es **no indexada** (`this.index = null`,
confirmado leyendo su fuente en `node_modules/three/examples/jsm/geometries/
RoundedBoxGeometry.js`), mientras que los `CylinderGeometry` de los studs sí
son indexados por defecto — el merge fallaba silenciosamente y el fallback
(`if (!merged) return body`) devolvía solo el cuerpo, sin studs. Resultado:
todas las piezas se veían como bloques lisos sin los tacos característicos
de LEGO — muy probablemente la primera razón visible de "se ve mal".

Fix aplicado: `.toNonIndexed()` en el body (si tenía index) y en cada stud
antes de fusionar, para que todos los inputs de `mergeGeometries` acuerden
en indexado/no-indexado. Verificado con captura de pantalla real: los studs
ahora aparecen correctamente en cada pieza. Comentario del código que decía
"esto no puede pasar acá" corregido también (era incorrecto — pasaba
siempre).

## Bug 2 — SIN CORREGIR, es la tarea de esta reapertura

El cubo final ensamblado **no es un cubo**: es una masa de piezas
superpuestas y desordenadas, visualmente aplanada/escalonada. Confirmado con
capturas a los 30s, 45s y 60s tras cargar la home — los 3 frames son
prácticamente idénticos entre sí (la escena ya se asentó, no es que siga
ensamblando lentamente). Mismo problema visible en el modo
`prefers-reduced-motion` (coloca las piezas directo en la posición final,
usa la misma función) y en el tier mobile/reducido (mismo algoritmo, menos
piezas, mismo solape) — confirmado por separado con capturas en esos 2
modos también.

**Causa raíz**: `generateCubePositions()` en `lib/lego/layout.ts` (función
`buildFullGrid`, línea ~99-119) usa un único `CELL_UNIT = 1.3` uniforme para
espaciar la grilla en los 3 ejes (X, Y, Z) — cada celda de la grilla es la
posición de UNA pieza completa, sin importar su tamaño. Pero
`BRICK_SIZE_DEFS` en `app/components/lego/bricks.ts` define piezas con
huella muy variable: `2x4` mide 4 studs × 0.8 = **3.2 unidades de ancho**,
muy por encima del espaciado de celda de 1.3. Como la asignación de tamaño
de pieza (`pickBrickSize()`) es independiente de la posición de grilla, una
pieza grande asignada a una celda invade masivamente el espacio de sus
celdas vecinas — el resultado es una maraña de piezas solapadas, no un cubo
limpio con gaps pequeños entre piezas que no se tocan (contradice R15 de
`requirements.md` y el brief original: "Tiny gaps between bricks remain
visible... geometry feels engineered with extreme precision").

**Qué hace falta** (a criterio de `implementer`, documentar el enfoque
elegido en `progress/impl_project-hero-lego-animation.md`, igual que las
demás decisiones abiertas de esta spec): rediseñar cómo se relaciona el
tamaño de una pieza con el espacio que ocupa en la grilla final, para que
piezas vecinas no se solapen y los gaps sean chicos y consistentes.  Dos
direcciones razonables (no excluyentes, elegir la que dé mejor resultado
visual real, no solo en teoría):

1. **Espaciado de celda no uniforme por eje**: separar el espaciado
   horizontal (X/Z, debe acomodar la huella más grande, ~3.2-3.4 con un gap
   chico) del espaciado vertical (Y, debe acomodar la altura de pieza,
   ~0.6-0.8 con un gap chico) — dos constantes en vez de un solo
   `CELL_UNIT`. Cuidado: esto puede dejar mucho espacio vacío alrededor de
   piezas chicas (`plate1x1`, `1x2`) si todas comparten el mismo tamaño de
   celda que las grandes — puede hacer falta variar además el tamaño de
   celda según el tamaño de pieza asignado a esa celda específica (grilla
   no uniforme), no un valor fijo global.
2. **Simplificar a un tamaño de pieza fijo por rol en la grilla**: en vez de
   asignar tamaño de pieza aleatoriamente e independiente de la posición,
   atar el tamaño de pieza al tamaño de celda (p. ej. todas las piezas de
   la grilla final usan huella `2x2`, y la variedad de tamaños del brief
   queda solo para la fase flotante/decorativa) — más simple de
   implementar correctamente, aunque pierde algo de la variedad de tamaños
   que pedía el brief para el cubo terminado.

**Requisito de aceptación no negociable**: después del fix, sacar una
captura de pantalla real (ver método abajo) del cubo ya asentado (esperar
~60s desde que carga la home) y confirmar a simple vista que se ve como un
cubo reconocible, con piezas que NO se solapan entre sí y gaps chicos y
parejos — no alcanza con que el código "parezca" correcto o que los tests
Vitest de `layout.test.ts` sigan pasando (esos tests validan la lógica de
capas/conteo, no el resultado visual de solape). Si `layout.test.ts`
necesita un test nuevo para esto (p. ej. que ninguna pieza cuyo bounding box
real —según su footprint asignado— se superponga con el de otra pieza en la
misma capa/vecindad), agregarlo, pero el criterio final es la captura de
pantalla.

## Cómo hacer QA visual real en este entorno (nuevo — antes se asumía que no se podía)

Chromium + Playwright vienen preinstalados
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), pero **no** como paquete npm
del proyecto — hay que importarlo por ruta absoluta:
`/opt/node22/lib/node_modules/playwright` (CommonJS `require`, no ESM
`import` — ESM no respeta `NODE_PATH` para esto). Ejecutable de Chromium:
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (el nombre exacto de la
carpeta puede variar, `find /opt/pw-browsers/chromium* -iname chrome -type
f` para confirmar). Lanzar con
`args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-webgl",
"--ignore-gpu-blocklist"]` para que WebGL funcione en software rendering.

El sitio entero está detrás de un `PinGate` (`app/components/PinGate.tsx`,
gatea TODO en `app/layout.tsx`, no solo rutas específicas) — sin PIN no se
ve nada. Para levantar un dev server local **solo para QA, nunca commitear
esto ni usarlo contra datos reales**: arrancar `npm run dev` con
`PIN=<algo-local-de-prueba> JWT_SECRET=<algo-local-de-prueba>` como env vars
del proceso (nunca en `.env` ni commiteado), después loguearse en la página
con Playwright rellenando `input[type="password"]` con ese mismo PIN y
haciendo click en el botón "Entrar". **Cuidado con el puerto 3000
"fantasma"**: si un `npm run dev` anterior sigue vivo (aunque el `kill` del
wrapper npm no haya matado al proceso `next-server` hijo), un nuevo `npm run
dev` puede saltar silenciosamente al puerto 3001 o el `curl` de verificación
puede pegarle al servidor viejo (con el PIN viejo) sin que se note — antes
de lanzar, confirmar `lsof -ti:3000 -sTCP:LISTEN` vacío, y si no lo está,
matar por PID explícito (no solo el wrapper de npm) y esperar a que el
puerto quede libre antes de relanzar.

Para ver el cubo ya asentado hace falta esperar ~20-25s desde que arranca la
narrativa (flotando 3s + señal 2s + ensamblaje + Final Lock) — tomar
capturas a varios tiempos (ej. 30s, 45s, 60s) y comparar que sean
consistentes entre sí confirma que ya terminó de animar, no que sigue en
progreso.

No se tocó Supabase/PIN real de ningún entorno — el PIN/JWT_SECRET de
prueba solo existieron como env vars del proceso `npm run dev` efímero de
esta sesión, nunca se escribieron a disco ni se commitearon.
