# Design — Cambiar los valores de `projects.status` a etapa de ciclo de vida

Feature id: `project-status-values-rename`.

## Enfoque general

Cambio puramente de **vocabulario/semántica**, no de estructura de datos:
la columna `projects.status` sigue siendo `text not null` con un `check` de
3 valores. Lo que cambia es (a) cuáles son esos 3 valores permitidos, (b)
el significado que comunican (etapa de ciclo de vida en vez de
salud/riesgo), y (c) todo el código/UI que hoy asume el vocabulario viejo.

El trabajo se divide en tres partes independientes que `implementer` puede
hacer en secuencia sin bloquearse entre sí:

1. Migración SQL (datos reales en Supabase dev).
2. Rename de tipo/constante/componente + los 3 valores de código en todo
   el codebase (TypeScript, sin tocar Supabase).
3. Actualización de tests.

## 1. Migración SQL

Archivo nuevo: `supabase/migrations/20260729180000_cambiar_valores_status_projects.sql`
(nunca se edita `20260729120000_mover_status_a_projects.sql`, ya aplicada).

```sql
-- Cambia el significado de los 3 valores de projects.status: de
-- "salud/riesgo" (on_track/at_risk/delayed, semáforo verde/ámbar/rojo) a
-- "etapa del ciclo de vida del proyecto" (desarrollo/piloto/produccion).
-- Decisión explícita del usuario, 2026-07-29 — ver
-- specs/project-status-values-rename/requirements.md (R1-R4).
--
-- No se toca la estructura de la columna (sigue siendo `text not null`);
-- solo cambia qué valores acepta la constraint, más los datos de las 3
-- filas reales que existen hoy en este entorno.
--
-- Secuencia obligatoria: la constraint vieja (projects_status_check)
-- rechaza cualquier valor fuera de ('on_track','at_risk','delayed'), así
-- que hay que eliminarla ANTES de actualizar las filas a los valores
-- nuevos. Si se intentara agregar la constraint nueva antes del update,
-- Postgres la validaría contra los datos existentes y fallaría mientras
-- alguna fila todavía diga 'on_track'.

-- 1. Eliminar la constraint vieja.
alter table projects drop constraint projects_status_check;

-- 2. Actualizar las 3 filas reales existentes en este entorno, por id
-- exacto (no por name, para ser robusto ante un rename futuro del
-- proyecto). Mapeo confirmado explícitamente por el usuario — ver
-- requirements.md.
update projects set status = 'desarrollo'
where id = 'b19cbec7-1786-47e9-a51a-bd3fa376b5fb'; -- Asistente de ventas Easy 2.0

update projects set status = 'piloto'
where id = 'fcc466f1-c6e3-4f53-bf44-4797aa48816f'; -- Probador Virtual

update projects set status = 'desarrollo'
where id = '887b9ea4-c746-4f93-9773-ef26c007d490'; -- Asesor de proyectos

-- 3. Agregar la constraint nueva — recién ahora que las 3 filas existentes
-- ya cumplen el dominio nuevo.
alter table projects
  add constraint projects_status_check check (status in ('desarrollo', 'piloto', 'produccion'));

-- No se toca RLS: sin cambios de policy, este cambio es de valores de
-- datos y de constraint, no de acceso.
```

Nota para `implementer`: si al momento de aplicar la migración existiera
algún proyecto nuevo (creado después de escribir esta spec) con `status`
todavía en el dominio viejo, el `add constraint` del paso 3 fallará contra
esa fila — comportamiento correcto y deseado (mejor fallar la migración
que dejar datos inconsistentes), no un caso a silenciar. Si eso ocurre, el
humano decide el mapeo para ese proyecto nuevo antes de re-aplicar; no es
una decisión que el agente deba inventar.

## 2. Rename de tipo/constante/componente

### `lib/types.ts`

```ts
export type ProjectStatus = "desarrollo" | "piloto" | "produccion";
```

(reemplaza `export type HealthStatus = "on_track" | "at_risk" |
"delayed";`; el campo `status: HealthStatus` de `Project` pasa a `status:
ProjectStatus`.)

### `lib/projects.ts`

- Import cambia de `HealthStatus` a `ProjectStatus`.
- `ProjectRow.status: ProjectStatus`.
- `export const VALID_STATUSES: ProjectStatus[] = ["desarrollo", "piloto", "produccion"];`
- `ProjectFormValues.status: ProjectStatus`.

### `app/proyectos/HealthBadge.tsx` → `app/proyectos/StatusBadge.tsx`

Archivo renombrado (no solo contenido editado — el import path cambia en
los dos consumidores). Contenido:

```tsx
import { ProjectStatus } from "@/lib/types";

const CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  desarrollo: { label: "Desarrollo", color: "#94A3B8", bg: "#94A3B815", border: "#94A3B833" },
  piloto:     { label: "Piloto",     color: "#2C40FF", bg: "#2C40FF15", border: "#2C40FF33" },
  produccion: { label: "Producción", color: "#22C55E", bg: "#22C55E15", border: "#22C55E33" },
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  desarrollo: CONFIG.desarrollo.label,
  piloto: CONFIG.piloto.label,
  produccion: CONFIG.produccion.label,
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  // ... resto sin cambios, solo el nombre del componente y del tipo.
}
```

### `app/proyectos/ProjectDrawer.tsx` y `ProjectCard.tsx`

Solo el import (`import HealthBadge from "./HealthBadge"` →
`import StatusBadge from "./StatusBadge"`) y el nombre de componente en el
JSX (`<HealthBadge status={...} />` → `<StatusBadge status={...} />`). Sin
otros cambios — estos dos archivos no conocían los valores de `status`
directamente, solo pasaban `project.status` como prop.

### `app/proyectos/ProjectForm.tsx`

- Import de `HealthStatus` → `ProjectStatus`, de `HEALTH_STATUS_LABELS` →
  `PROJECT_STATUS_LABELS` desde `./StatusBadge`.
- `HEALTH_STATUS_OPTIONS` → renombrar a `PROJECT_STATUS_OPTIONS` (mismo
  patrón: `Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus,
  string][]`).
- El `<select>` de "Estado" en sí no cambia de estructura, solo las
  opciones que renderiza.

### Rutas API (`app/api/proyectos/route.ts`, `app/api/proyectos/[id]/route.ts`)

Ninguna referencia directa al tipo `HealthStatus`/`ProjectStatus` — ambas
solo importan `VALID_STATUSES` de `lib/projects.ts` y hacen
`VALID_STATUSES.includes(status)`. No requieren edición de código, el
cambio de dominio de valores les llega gratis vía R7. Confirmado por grep
antes de escribir esta spec (`route.ts` y `[id]/route.ts` no mencionan
`HealthStatus` en ningún punto).

## 3. Paleta de colores del badge — razonamiento (R9)

**Descartado**: mantener el esquema verde/ámbar/rojo (`on_track` → verde,
`at_risk` → ámbar, `delayed` → rojo). Ese esquema comunica *riesgo*
("todo bien" / "cuidado" / "mal"), y con la nueva semántica los tres
valores ya no son alternativas mutuamente excluyentes de "qué tan bien va"
sino **puntos de una misma progresión secuencial** (desarrollo → piloto →
producción). Usar rojo para "Desarrollo" implicaría (incorrectamente) que
un proyecto recién empezado está "mal", lo cual es información falsa.

**Elegido**: paleta de progresión de tres pasos, sin connotación de
riesgo:
- `desarrollo` → gris neutro (`#94A3B8`, ya usado en el repo como
  `--color-tertiary`-ish para texto secundario) — etapa inicial, "en
  construcción", sin urgencia ni alarma.
- `piloto` → azul de marca (`#2C40FF`, el mismo `--color-primary` que ya
  usa el resto de la UI para elementos activos/interactivos — botones de
  submit, foco de inputs en `ProjectForm.tsx`) — reutiliza intencionalmente
  el color "activo" existente del sistema visual para la etapa de mayor
  actividad/validación del proyecto.
- `produccion` → verde (`#22C55E`) — se reutiliza el mismo verde que antes
  significaba "on_track", pero con un significado distinto y no
  conflictivo: aquí significa "llegó a destino, está en vivo", no
  "todo anda bien" — sigue siendo una asociación intuitiva y no requiere
  inventar un cuarto color solo para evitar la coincidencia con la paleta
  vieja.

Esta paleta es intencionalmente **secuencial** (intensidad/protagonismo
visual creciente: gris apagado → azul de marca → verde de "logro") en vez
de categórica sin orden, coherente con que los 3 valores representan una
progresión con un orden natural.

## 4. Rename de `HealthStatus`/`HEALTH_STATUS_LABELS`/`HealthBadge.tsx` — decisión (R5, R10)

**Elegido**: renombrar los tres (`HealthStatus` → `ProjectStatus`,
`HealthBadge.tsx` → `StatusBadge.tsx`, `HEALTH_STATUS_LABELS` →
`PROJECT_STATUS_LABELS`).

**Alternativa descartada**: dejar los nombres viejos ("Health...") sin
tocar, cambiando solo los valores del tipo. Descartada porque el nombre
"Health" activamente miente sobre lo que el campo representa ahora
(etapa de ciclo de vida, no salud), y el costo de renombrar es bajo y
acotado — confirmado por grep antes de escribir esta spec: el tipo y el
componente solo se usan en 6 archivos totales
(`lib/types.ts`, `lib/projects.ts`, `HealthBadge.tsx`,
`ProjectForm.tsx`, `ProjectDrawer.tsx`, `ProjectCard.tsx`, más
`lib/projects.test.ts`), y en `ProjectDrawer.tsx`/`ProjectCard.tsx` el
cambio es mecánico (solo el import y el nombre de componente en JSX, no
tocan el tipo `HealthStatus` en absoluto). El beneficio de claridad
(un mantenedor futuro leyendo `ProjectStatus`/`StatusBadge` entiende de
inmediato que es "etapa", no "salud", sin tener que leer el `CONFIG` para
descubrirlo) justifica el diff extra, que es pequeño y no requiere
ningún cambio de lógica, solo de nombres.

## Alternativas descartadas (generales)

- **Agregar los 3 valores nuevos sin eliminar los 3 viejos del `check`**
  (dejar 6 valores válidos, migrar datos "cuando se pueda"). Descartada:
  el pedido es un remplazo semántico completo, no una migración gradual;
  mantener los 6 valores permitiría que código nuevo insertara
  accidentalmente un valor viejo, y complica la UI (¿qué label mostrar
  para `at_risk` si ya no es una opción del `<select>`?).
- **Mantener `VALID_STATUSES` con los 3 valores viejos como alias/mapeo a
  los nuevos** (capa de traducción). Descartada: sobre-ingeniería para un
  dominio de exactamente 3 valores hardcodeados en un solo archivo — no
  hay ningún cliente externo ni integración que dependa de los valores
  viejos, así que no hay necesidad real de retrocompatibilidad.
- **Editar `specs/project-status-field/requirements.md` para que refleje
  los valores nuevos como si siempre hubieran sido así.** Descartada,
  mismo criterio ya establecido en esa spec para las specs anteriores a
  ella: se anota in situ qué cambió y por qué, sin reescribir historia.

## Nota sobre `specs/project-status-field/`

Se agrega una nota breve al final de `requirements.md` y `design.md` de
`project-status-field` (no se reescriben, mismo criterio que esa spec ya
usó con las 4 specs anteriores) señalando que los 3 valores documentados
ahí (`on_track`/`at_risk`/`delayed`) fueron reemplazados por esta spec —
ver sección "Requirements retirados/modificados" en
`requirements.md` de esta feature.
