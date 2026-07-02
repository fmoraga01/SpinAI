<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Git workflow: dev → aprobación → prod

Todo cambio (features, fixes, copy, config) se desarrolla y commitea primero en la rama `dev`. Nunca se hace push ni merge directo a `main` sin que el usuario lo haya probado en `dev` y haya dado su aprobación explícita para pasar a producción.

- Todo commit nuevo va a `dev`, sin excepción — incluidos cambios "menores" como texto o estilos.
- No mergear `dev` → `main` de forma proactiva. Esperar una confirmación explícita del usuario (ej. "pásalo a prod", "mergea a main") antes de tocar `main`.
- Si por error algo llega a `main` sin pasar por este flujo, revertirlo y rehacerlo correctamente por `dev`.
