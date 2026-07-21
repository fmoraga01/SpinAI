<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git workflow: dev → aprobación → prod

Todo cambio (features, fixes, copy, config) se desarrolla y commitea primero en la rama `dev`. Nunca se hace push ni merge directo a `main` sin que el usuario lo haya probado en `dev` y haya dado su aprobación explícita para pasar a producción.

- **`dev` es la rama de partida por defecto.** Al iniciar cualquier sesión nueva de trabajo en este repo, hacer checkout/fetch de `dev` (no `main`) antes de empezar a trabajar, salvo que el usuario indique explícitamente otra rama. Si el harness o el entorno asigna una rama de sesión distinta, sincronizar esa rama con `dev` al terminar (fast-forward), como se viene haciendo.
- Todo commit nuevo va a `dev`, sin excepción — incluidos cambios "menores" como texto o estilos.
- No mergear `dev` → `main` de forma proactiva. Esperar una confirmación explícita del usuario (ej. "pásalo a prod", "mergea a main") antes de tocar `main`.
- Si por error algo llega a `main` sin pasar por este flujo, revertirlo y rehacerlo correctamente por `dev`.

# Spec-Driven Development (SDD)

Las features nuevas siguen el proceso definido en `docs/specs.md`: una spec
en `specs/<feature>/` (requirements/design/tasks) con aprobación humana
explícita antes de escribir código, luego implementación y review por roles
separados (`.claude/agents/leader.md`, `spec-author.md`, `implementer.md`,
`reviewer.md`). Este gate de spec es independiente del gate `dev → main` de
arriba — no lo reemplaza. Ver `docs/specs.md` para el proceso completo y
`CHECKPOINTS.md` para los criterios de "listo".
