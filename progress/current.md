# Current session state

- **Feature:** project-hero-lego-animation (reabierta el 2026-08-06 tras QA
  visual real, dos bugs encontrados — ver detalle abajo)
- **Status:** in_progress (implementer terminó su parte; falta que `leader`
  mueva a `in_review` e invoque a `reviewer` — no lo hago yo mismo)
- **Role active:** ninguno (implementer terminó, esperando handoff)
- **Next step:** `leader` mueve `project-hero-lego-animation` a `in_review`
  en `feature_list.json` e invoca a `reviewer`. `reviewer` debería levantar
  el navegador otra vez y confirmar por su cuenta (no solo confiar en las
  capturas ya tomadas) — instrucciones exactas de cómo hacerlo están en
  `progress/impl_project-hero-lego-animation.md`, sección "How QA was done"
  (nueva, dentro de la sección fechada "Post-`done` bugfixes").

## Qué se hizo en esta sesión (bug 2 — cubo con piezas solapadas)

Bug 1 (studs faltantes) ya estaba corregido y verificado en una sesión
previa (commit `3758211`), no se tocó de nuevo.

Bug 2 (el cubo final era una masa de piezas solapadas, no un cubo limpio)
corregido: causa raíz era `CELL_UNIT` único en `lib/lego/layout.ts` sin
relación con el tamaño real de pieza asignado por `pickBrickSize()` en
`app/components/lego/bricks.ts` — piezas grandes (`2x4`, 3.2 unidades de
ancho) invadían el espacio de celdas vecinas espaciadas solo 1.3 unidades.

**Fix elegido**: tamaño de pieza fijo (`"2x2"`) para todas las piezas del
cubo final (opción 2 de las dos planteadas al reabrir la feature), combinado
con espaciado de grilla separado por eje (`CELL_UNIT_XZ` vs `CELL_UNIT_Y`,
ya que incluso con un solo tamaño de pieza su huella horizontal y su altura
son distintas). Detalle completo, con el razonamiento de por qué se
descartó preservar variedad de tamaños, en
`progress/impl_project-hero-lego-animation.md`, sección fechada "Post-`done`
bugfixes (2026-08-06 reapertura)".

**Verificación real en navegador** (Playwright + Chromium, instrucciones de
cómo hacerlo en un sandbox así quedaron documentadas en esa misma sección
del impl doc): se reprodujo el bug "antes" (`git stash` del fix, misma
sesión de `npm run dev`), se confirmó visualmente el solape reportado por el
usuario, y se confirmó "después" (fix aplicado) que el cubo se ve limpio,
reconocible, sin piezas solapadas y con gaps chicos y parejos — en modo
normal (desktop), `prefers-reduced-motion`, y el tier mobile/reducido
(390px viewport). Capturas guardadas bajo el scratchpad de esta sesión (no
committeadas al repo, son evidencia de QA efímera).

**Tests**: `lib/lego/layout.test.ts` ganó un test nuevo de no-solape
(bounding-box AABB de cada par de piezas asignadas, para n en ambos tiers)
además de la verificación visual — `npm run verify` corrido completo y en
verde (lint, build, 72 tests Vitest, check-sdd-state).

## Pendiente / observación para `reviewer` (no bloqueante, no es parte del bug 2 asignado)

En las capturas "after" (desktop y mobile) el cubo se ve recortado por los
bordes del `<canvas>` en algunos frames (algunas piezas de la fila
superior/izquierda quedan justo en el borde) — parece un tema de framing de
cámara/FOV en `app/components/lego/scene.ts`, no relacionado a la causa raíz
del bug 2 (espaciado de grilla). No se tocó porque está fuera del alcance
específico de esta reapertura (el criterio de aceptación era "cubo
reconocible, sin solape, gaps chicos y parejos", que sí se cumple) — queda
como nota para que `reviewer`/el usuario decidan si vale la pena un ajuste
de cámara en una pasada futura.
