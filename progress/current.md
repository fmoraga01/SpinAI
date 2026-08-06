# Current session state

- **Feature:** project-hero-lego-animation
- **Status:** spec_ready
- **Started:** 2026-08-06
- **Role active:** none — waiting on human approval
- **Next step:** Human review/approval of `specs/project-hero-lego-animation/`
  (requirements.md, design.md, tasks.md). Once approved explicitly, `leader`
  sets status to `in_progress` and invokes `implementer`. Do not start
  implementation without that explicit approval.

## Resumen para quien apruebe

Spec para reemplazar `<AnimatedGrid />` en `app/page.tsx` (hero de la home)
por una escena 3D en Three.js de bloques LEGO que empiezan flotando
desconectados y terminan ensamblándose en un cubo perfecto (metáfora de
orden emergiendo de colaboración coordinada). Layout: texto existente
(chip/headline/subtítulo/CTAs) a la izquierda, escena 3D a la derecha,
responsive (apilado en mobile, breakpoint `md:` existente). `AnimatedGrid.tsx`
no se toca — sigue en uso en `app/state-of-ai/page.tsx`.

Decisiones clave en `design.md` (todas sujetas a esta aprobación):
- Nuevas dependencias: `three` + `@types/three` + `gsap` (justificado:
  primera vez que se necesita WebGL/3D real en el repo, las 5 features de
  animación CSS previas no lo necesitaban).
- Conflicto dark/light: el fondo claro de estudio (`#F6F7F9`) del brief
  queda contenido solo dentro del canvas/marco de la escena, el resto de
  la página sigue en dark theme.
- Fase 1 (esta spec): layout + narrativa completa de 3 escenas + Final
  Lock de 4 esquinas (clímax, no opcional). Fase 2 (fuera de alcance,
  futura spec separada): pulido fino de timing/materiales/easing, HDRI
  custom.
- Fallback mobile/gama baja: misma narrativa de 3 escenas con menos piezas
  (30-40 vs 80-120) y sin efectos costosos, no imagen estática — criterio
  de detección en `quality.ts` (viewport <768px, `hardwareConcurrency`,
  `deviceMemory`).
- `prefers-reduced-motion`: cubo ya ensamblado, estático, sin órbita
  automática, `OrbitControls` habilitado de inmediato.

Ver `specs/project-hero-lego-animation/requirements.md` (R1-R21) para el
detalle completo.
