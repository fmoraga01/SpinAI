# Requirements — Escena 3D cinemática de bloques LEGO en el hero de la home

## Contexto

`app/page.tsx` (Home) hoy renderiza `<AnimatedGrid />` (canvas 2D, red
neuronal animada) como fondo full-bleed detrás de una columna de texto
centrada (chip + headline + subtítulo + CTAs). Esta feature reemplaza esa
animación, solo en la home, por una escena 3D en Three.js: bloques
tipo LEGO que empiezan flotando desconectados y terminan ensamblándose en
un cubo perfecto — metáfora de "orden emergiendo de colaboración
coordinada" (agentes/orquestación). El bloque de texto existente pasa al
costado izquierdo; la escena 3D ocupa el costado derecho.

`AnimatedGrid.tsx` **no se elimina ni se modifica**: sigue en uso con
`variant="background"` en `app/state-of-ai/page.tsx` (`intensity={0.2}`).
Solo se retira su uso (`<AnimatedGrid />`, variant `"hero"` por defecto) de
`app/page.tsx`.

## Requisitos (EARS)

### Layout

- **R1**: WHEN se renderiza la home (`app/page.tsx`) THEN el sistema SHALL
  mostrar el bloque de texto existente (chip `HeroChip`, headline,
  subtítulo, `HomeCTAs`) en el costado izquierdo de la sección hero y la
  escena 3D en el costado derecho, en viewports de escritorio (≥768px de
  ancho, mismo breakpoint `md:` que usa el resto del repo vía Tailwind).
- **R2**: WHEN el viewport es angosto (<768px, breakpoint `md:`) THEN el
  sistema SHALL apilar el bloque de texto y la escena 3D en una sola
  columna (texto arriba, escena abajo), sin solaparse ni recortar contenido.
- **R3**: WHILE la escena 3D está montada THEN el sistema SHALL renderizar
  el `<canvas>` de la escena con fondo transparente (`alpha: true` en el
  `WebGLRenderer`, sin `scene.background` propio), de forma que las piezas
  LEGO floten y se ensamblen directamente sobre el fondo oscuro existente
  de la sección hero (`var(--color-bg)`), y el resto de la página (`Nav`,
  columna de texto) SHALL mantenerse en el dark theme existente sin
  cambios. **Nota**: el brief original pegado abajo pide un "infinite
  seamless studio background... very light gray (#F6F7F9)" — ese punto
  específico del brief fue reemplazado explícitamente por el usuario tras
  una primera versión de esta spec (que sí lo implementaba contenido
  dentro del canvas); R3 refleja la decisión vigente, no el texto literal
  del brief en ese punto puntual.

### Narrativa (3 escenas)

- **R4**: WHEN la escena 3D se monta por primera vez THEN el sistema SHALL
  generar entre 80 y 120 piezas tipo LEGO (el número exacto puede variar
  por sesión/dispositivo dentro de ese rango) distribuidas en posiciones
  flotantes aleatorias no colisionantes dentro de un volumen acotado.
- **R5**: WHILE la escena está en el estado "flotando" (Escena 1, ~3s)
  THEN cada pieza SHALL rotar lentamente sobre su propio eje y derivar en
  una dirección/velocidad ligeramente distinta a las demás, sin que
  ninguna pieza colisione con otra, y la cámara SHALL orbitar lentamente
  alrededor de la nube de piezas.
- **R6**: WHEN termina la Escena 1 THEN el sistema SHALL iniciar la Escena
  2 ("la señal"): un pulso que se origina en el centro de la escena, donde
  las piezas más cercanas al centro reaccionan primero (una breve
  vibración) y las piezas más lejanas reaccionan con un retardo
  proporcional a su distancia al centro, con una duración total de
  aproximadamente 2s.
- **R7**: WHEN termina la Escena 2 THEN el sistema SHALL iniciar la Escena
  3 ("ensamblaje coordinado"), donde las piezas se mueven en grupos
  siguiendo el orden: núcleo interno → capas internas → bloques
  estructurales grandes → caras externas → bordes → esquinas, sin que dos
  grupos se muevan de forma simultánea de principio a fin (puede haber
  solapamiento parcial en los bordes de cada etapa, pero el orden general
  debe ser perceptible).
- **R8**: WHILE una pieza viaja de su posición flotante a su posición final
  en el cubo THEN el sistema SHALL animar su trayectoria como una curva
  spline Catmull-Rom (no una línea recta), con aceleración suave al
  iniciar, desaceleración al llegar, un leve overshoot antes de asentarse,
  y una rotación gradual durante el viaje.
- **R9**: WHEN una pieza llega a su posición final THEN el sistema SHALL
  producir un "snap" magnético perceptible (cambio de easing/pequeño
  ajuste final de posición-escala) que comunique que la pieza encajó con
  precisión.
- **R10**: WHILE se ensamblan los grupos de piezas (R7) THEN el sistema
  SHALL incluir pausas breves entre etapas mayores de construcción (no
  velocidad constante), de forma que el ritmo general acelere
  gradualmente y transmita anticipación, similar al pacing de un product
  reveal.

### Final Lock (clímax)

- **R11**: WHEN el ensamblaje llega a las últimas 4 piezas de esquina THEN
  el sistema SHALL dejarlas flotando y pausar antes de iniciar su
  secuencia individual.
- **R12**: WHEN se ejecuta el Final Lock THEN el sistema SHALL animar las 4
  esquinas en secuencia, una por una (vuelo + snap + pausa entre cada una,
  con una pausa más larga después de la tercera), y la última pieza SHALL
  rotar lentamente hasta alinearse antes de su snap final.
- **R13**: WHEN la última pieza del Final Lock encaja THEN el sistema SHALL
  propagar una onda de movimiento sutil (casi imperceptible) a través del
  cubo ya completo, tras la cual todas las piezas SHALL quedar
  perfectamente estáticas.
- **R14**: WHEN el cubo está completo (post Final Lock) THEN el sistema
  SHALL mantener la cámara orbitando lentamente alrededor del cubo
  centrado, y (solo entonces) SHALL habilitar controles de órbita
  manuales (`OrbitControls`) para que quien mira la escena pueda rotarla;
  esos controles SHALL estar deshabilitados durante las Escenas 1–3 y el
  Final Lock.

### Materiales, iluminación, cámara

- **R15**: WHEN se renderiza cualquier pieza THEN el sistema SHALL usar un
  material PBR (rugosidad baja/media, reflejos sutiles) consistente con
  plástico ABS de fábrica, sin texturas de suciedad/rayones/huellas.
- **R16**: WHEN se renderiza la escena THEN el sistema SHALL usar una
  paleta de colores limitada a blanco, gris claro, gris oscuro, azul
  profundo (`var(--color-primary)` / `#2C40FF`, mismo token que el resto
  del sitio) y un acento amarillo, con las piezas azules en franca
  minoría respecto del total (bajo volumen, alto contraste) para que
  atraigan la mirada sin dominar la composición.
- **R17**: WHILE la escena está activa THEN el sistema SHALL usar una
  cámara en perspectiva, ligeramente elevada respecto del cubo, con
  movimientos de cámara siempre suaves (sin cambios bruscos de posición o
  ángulo).

### Accesibilidad y rendimiento

- **R18**: WHEN `usePrefersReducedMotion()` (mismo hook que ya usan las 5
  features de animación previas del repo) devuelve `true` THEN el sistema
  SHALL mostrar el cubo ya ensamblado, estático (sin Escenas 1–3 ni Final
  Lock, sin órbita de cámara automática, sin `requestAnimationFrame` de
  animación continua salvo el render inicial), en vez de reproducir la
  narrativa completa.
- **R19**: WHEN el dispositivo se detecta como de gama baja o el viewport
  es angosto (ver criterio exacto en `design.md`) THEN el sistema SHALL
  reproducir la misma narrativa de 3 escenas con un número reducido de
  piezas y sin efectos de reflejo/sombra costosos, en vez de mostrar una
  imagen estática o la escena completa sin ajustar.
- **R20**: WHEN el componente de la escena 3D se desmonta (navegación fuera
  de la home) THEN el sistema SHALL liberar los recursos de Three.js
  (geometrías, materiales, renderer, listeners de resize) sin dejar fugas
  de memoria ni animaciones GSAP corriendo en segundo plano.
- **R21**: WHEN `next build` se ejecuta THEN el sistema SHALL compilar sin
  errores de SSR causados por la escena 3D (el componente que usa Three.js
  SHALL ser client-only, cargado de forma que Three.js nunca se evalúe en
  el servidor).

## Fuera de alcance

Esta feature se implementa completa, de punta a punta, en una sola
pasada — no hay una fase futura separada. Lo que sigue nunca formó parte
de lo pedido (ni por el brief original ni por decisión posterior del
usuario), no es una simplificación de alcance:

- Interactividad más allá de `OrbitControls` post-ensamblaje (p. ej. click
  en una pieza, tooltips, sonido) — el brief no lo pide.
- Tocar `AnimatedGrid.tsx` o su uso en `app/state-of-ai/page.tsx`.

## Verificación

Esta feature es 100% UI/componentes (`app/components/*`, `app/page.tsx`) —
no hay lógica pura nueva en `lib/` que amerite Vitest más allá de, si
`design.md` decide extraer alguna función de generación de posiciones a un
módulo puro y testeable, testearla ahí (a decidir en `design.md`; no es un
requisito obligatorio si toda la lógica queda acoplada a Three.js). La
verificación principal es manual QA documentada en
`progress/impl_project-hero-lego-animation.md`: cada R<n> de layout,
narrativa, Final Lock, accesibilidad y fallback verificado a mano en
navegador (desktop + viewport angosto + `prefers-reduced-motion`
activado), más `npm run build` en verde (R21) y el skill `design-check`
corrido sobre los componentes nuevos en `app/components/*.tsx`.
