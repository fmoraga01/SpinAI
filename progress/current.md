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

**[2026-08-06] Revisión post primera lectura del usuario** — pidió dos
ajustes antes de aprobar, ya aplicados a los tres documentos:

1. **Una sola fase, no dos**: se eliminó el framing "Fase 1 / Fase 2
   futura" de los tres archivos. Esta feature se implementa completa en
   una sola pasada. Lo que estaba en el bucket "Fase 2" se resolvió así:
   timing/easing de `timeline.ts` ya eran valores concretos (se aclaró que
   SON la implementación final, no un borrador); materiales/reflejos se
   comprometieron a valores definitivos (`RoundedBoxGeometry` para bevels
   reales, `clearcoat: 0.6`/`clearcoatRoughness: 0.15` explícitos, no 0);
   `RoomEnvironment` genérico (vs. HDRI custom) se reencuadró como
   decisión técnica permanente y justificada, no un recorte temporal;
   interactividad más allá de `OrbitControls` queda "fuera de alcance" a
   secas (nunca estuvo pedida, no es una fase futura).
2. **Fondo transparente, no "estudio claro contenido en el canvas"**: el
   usuario reemplazó explícitamente esa parte del brief original. Nueva
   decisión: `WebGLRenderer({ alpha: true })` +
   `renderer.setClearColor(0x000000, 0)`, sin `scene.background` propio —
   las piezas flotan directamente sobre `var(--color-bg)` (fondo oscuro
   existente de la sección hero), sin ningún panel/marco claro. R3 de
   `requirements.md` reescrito; `scene.environment` (reflejos PBR) no se
   ve afectado, es independiente del clear color.

Decisiones que se mantienen sin cambios:
- Nuevas dependencias: `three` + `@types/three` + `gsap` (justificado:
  primera vez que se necesita WebGL/3D real en el repo).
- Narrativa completa de 3 escenas + Final Lock de 4 esquinas (clímax, no
  opcional), `InstancedMesh`, splines Catmull-Rom.
- Fallback mobile/gama baja: misma narrativa con menos piezas (30-40 vs
  80-120) y sin efectos costosos, no imagen estática — criterio en
  `quality.ts` (viewport <768px, `hardwareConcurrency`, `deviceMemory`).
- `prefers-reduced-motion`: cubo ya ensamblado, estático, sin órbita
  automática, `OrbitControls` habilitado de inmediato.

Ver `specs/project-hero-lego-animation/requirements.md` (R1-R21) para el
detalle completo. Sigue en `spec_ready`, esperando aprobación humana —
`implementer` no ha sido invocado.
