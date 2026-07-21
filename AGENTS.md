# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en este
> repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que
> necesites cuando lo necesites (divulgación progresiva).

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 1. Antes de empezar (obligatorio)

1. Lee `progress/current.md` para entender en qué estado quedó la última sesión.
2. Lee `feature_list.json`. Toda feature nueva (`"sdd": true`) pasa por
   **Spec Driven Development** — ver `docs/specs.md` y §3 de este archivo.
3. Lee `docs/specs.md` antes de tocar cualquier spec o feature `sdd: true`.

## 2. Mapa del repositorio

| Archivo / carpeta            | Qué contiene                                                                | Cuándo leerlo |
|------------------------------|-----------------------------------------------------------------------------|---------------|
| `feature_list.json`          | Lista de tareas con estado (`pending` / `spec_ready` / `in_progress` / `done` / `blocked`) | Siempre, al empezar |
| `progress/current.md`        | Estado de la sesión actual                                                  | Siempre, al empezar |
| `progress/history.md`        | Bitácora append-only de sesiones anteriores                                 | Si necesitas contexto histórico |
| `specs/<feature>/`           | `requirements.md` + `design.md` + `tasks.md` (Kiro-style)                   | Antes de implementar cualquier feature con `"sdd": true` |
| `docs/architecture.md`       | Qué significa "hacer un buen trabajo" en este proyecto                      | Antes de implementar |
| `docs/specs.md`              | Proceso SDD: EARS notation, los 3 archivos, puerta de aprobación humana     | Antes de redactar o leer un spec |
| `CHECKPOINTS.md`             | Criterios objetivos de "estado final correcto"                              | Para auto-evaluarte |
| `.claude/agents/`            | Definiciones de subagentes (`leader`, `spec_author`, `implementer`, `reviewer`) | Si orquestas trabajo |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de varias tareas en la misma sesión.
- **No declares una tarea `done` sin pruebas verdes.
- **No saltes la fase de spec.** Toda feature con `"sdd": true` debe pasar
  por `spec_author` y obtener aprobación humana antes de tocar código.
- **No saltes la puerta de aprobación humana.** El leader detiene el flujo
  en `spec_ready` y espera.
- **Documenta lo que haces** en `progress/current.md` mientras trabajas, no al final.
- **Deja el repositorio limpio** antes de cerrar la sesión (ver §5).
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.

## 4. Flujo de trabajo (SDD - Spec-Driven Development)
Las features nuevas siguen el proceso definido en `docs/specs.md`: una spec
en `specs/<feature>/` (requirements/design/tasks) con aprobación humana
explícita antes de escribir código, luego implementación y review por roles
separados (`.claude/agents/leader.md`, `spec-author.md`, `implementer.md`,
`reviewer.md`). Este gate de spec es independiente del gate `dev → main` de
arriba — no lo reemplaza. Ver `docs/specs.md` para el proceso completo y
`CHECKPOINTS.md` para los criterios de "listo".

## 5. Cierre de sesión (lifecycle)

Antes de terminar:

1. Si la tarea está acabada: marca `status: "done"` en `feature_list.json`.
2. Mueve el resumen de `progress/current.md` al final de `progress/history.md`.
3. Vacía `progress/current.md` dejando solo la plantilla.
4. No dejes archivos temporales, ni `print()` de debug, ni TODOs sin contexto.

## 6. Si te bloqueas

- Relee la sección relevante de `docs/`.
- Si la herramienta no hace lo que esperas, **no inventes un workaround**:
  documenta el bloqueo en `progress/current.md` y para la sesión.


# Git workflow: dev → aprobación → prod

Todo cambio (features, fixes, copy, config) se desarrolla y commitea primero en la rama `dev`. Nunca se hace push ni merge directo a `main` sin que el usuario lo haya probado en `dev` y haya dado su aprobación explícita para pasar a producción.

- **`dev` es la rama de partida por defecto.** Al iniciar cualquier sesión nueva de trabajo en este repo, hacer checkout/fetch de `dev` (no `main`) antes de empezar a trabajar, salvo que el usuario indique explícitamente otra rama. Si el harness o el entorno asigna una rama de sesión distinta, sincronizar esa rama con `dev` al terminar (fast-forward), como se viene haciendo.
- Todo commit nuevo va a `dev`, sin excepción — incluidos cambios "menores" como texto o estilos.
- No mergear `dev` → `main` de forma proactiva. Esperar una confirmación explícita del usuario (ej. "pásalo a prod", "mergea a main") antes de tocar `main`.
- Si por error algo llega a `main` sin pasar por este flujo, revertirlo y rehacerlo correctamente por `dev`.


