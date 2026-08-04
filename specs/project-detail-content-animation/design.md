# Design — project-detail-content-animation

## Contexto (research citada, no re-derivada)

Research reunida antes de escribir esta spec:

- **Duración**: 100–300ms es el rango habitual para fades/reveals de
  contenido; Material Design recomienda ~100ms para fades puros y ~240ms
  para movimiento. — [Executing UX Animations: Duration and Motion
  Characteristics — NN/G](https://www.nngroup.com/articles/animation-duration/),
  [UI/UX Evolution 2026 — Primotech](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/)
- **Easing**: `ease-out` para elementos que *entran* a la pantalla,
  `ease-in` para los que salen, `ease-in-out` para transiciones entre
  estados de un mismo elemento ya visible. — misma fuente NN/G.
- **Stagger**: 30–60ms de offset entre elementos de una lista es el rango
  más citado (un caso de Airbnb reporta +30% de comprensión con offsets de
  30–60ms); un rango más amplio, citado en otras fuentes, es 40–120ms.
- **Principio general**: el motion debe ser sutil y con propósito (guiar
  atención, no decorar); no más de ~2 efectos distintos por pantalla;
  respetar siempre `prefers-reduced-motion`.

**Conclusión**: los valores ya establecidos en este repo (`220ms`,
stagger `30ms`, cap en índice `8`, `translateY(4px)`) caen dentro de los
rangos que la research recomienda — no hay motivo para inventar un tercer
set de números para una quinta feature del mismo tipo. La única tensión
real es el easing: la research recomienda `ease-out` puro para entradas,
mientras las cuatro specs previas usan `ease-in-out`. Esta spec mantiene
`ease-in-out`, por la misma razón que las cuatro specs previas priorizaron
cada vez que compararon alternativas: una sola "voz visual" de motion en
todo el producto vale más que una desviación de un paso de curva que, en la
práctica, para una duración tan corta (`220ms`) y un desplazamiento tan
sutil (`4px`), es visualmente casi imperceptible frente a `ease-out` — ver
"Alternativas consideradas y descartadas" más abajo para el registro
explícito de esta decisión.

## Approach

Two files change: `app/proyectos/ProjectDrawer.tsx` (Blocks 0–4, see
requirements.md) and `app/proyectos/ProjectTimeline.tsx` (Block 5's own
internal empty-state-or-rows tier). Both use the same mechanism the four
prior features established: a CSS `@keyframes` entrance, defined via an
inline `<style>` tag, applied through small helper functions that compute
`animation` + `animationDelay` from a fixed or per-row index, gated by
`usePrefersReducedMotion()`.

**Keyframe** (added to `ProjectDrawer.tsx`'s existing `<style>` tag — the
one that already carries the `.proyecto-rich-text` rules — and, identically,
to `ProjectTimeline.tsx`'s own existing `<style>` tag, since these two files
already duplicate the `.proyecto-rich-text` block between them today; this
feature's keyframe follows that same, already-present duplication pattern
rather than introducing a new one):

```css
@keyframes proyectoDetailIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

**`ProjectDrawer.tsx`** — one helper, for the five block indices it owns
(0–4; index 5 is `ProjectTimeline`'s own concern):

```ts
function blockMotionStyle(index: number, reduced: boolean): React.CSSProperties {
  if (reduced) return {};
  return {
    animation: "proyectoDetailIn 220ms ease-in-out backwards",
    animationDelay: `${index * 30}ms`,
  };
}
```

Called with `0` (`firstUpdateError`), `1` (merged into *both* the "Resumen
de la iniciativa" label and the rich-text summary div — see "Scope
decision" below for why two elements share one call instead of a wrapping
div), `2` (metadata line), `3` (avance header row), and `4` (a new wrapping
`<div>` placed around the existing `<AddUpdateForm .../>` call — see below
for why the wrapper, not a prop, was chosen).

`usePrefersReducedMotion()` (from
`app/state-of-ai/useReducedMotion.ts`, imported via the `@/` alias exactly
as the four prior features do) is called once at the top of `ProjectDrawer`,
alongside its existing `useState` calls. The resulting `reduced` boolean is
threaded into `ProjectTimeline` as a new prop (see next section) rather than
having `ProjectTimeline` call the hook a second time — one source of truth
for the whole view.

**`ProjectTimeline.tsx`** — a new `reduced: boolean` prop added to `Props`,
and two local helpers mirroring `ProjectDrawer`'s, both hardcoding the fact
that this component is always Block 5 (it has exactly one call site):

```ts
function emptyStateMotionStyle(reduced: boolean): React.CSSProperties {
  if (reduced) return {};
  return { animation: "proyectoDetailIn 220ms ease-in-out backwards", animationDelay: "150ms" };
}

function rowMotionStyle(index: number, reduced: boolean): React.CSSProperties {
  if (reduced) return {};
  return {
    animation: "proyectoDetailIn 220ms ease-in-out backwards",
    animationDelay: `${(6 + Math.min(index, 8)) * 30}ms`,
  };
}
```

`emptyStateMotionStyle` is merged into the empty-state `<div>`'s existing
`style` (the early-return branch when `groups.length === 0`).
`rowMotionStyle(gi, reduced)` is merged into each row's outer
`<div key={group.key} style={{ display: "flex", gap: 20 }}>` — the element
that already wraps *both* the timeline dot/rail and the week's content
column — so the dot and its content fade in together as one unit (R4),
never separately.

The `150ms` in `emptyStateMotionStyle` and the `6 +` in `rowMotionStyle`
are both `(5 + 1) * 30ms` — i.e. Block 5's own base delay (`5 * 30 = 150ms`)
plus one more `30ms` step before the first row/empty-state content starts,
the same "+1 anchor" reasoning `members-panel-content-animation`'s
`rowMotionStyle` used for its own list block (there, block index `1`
anchored row 0 at `(1+0)*30 = 30ms`; here, block index `5` anchors row 0 at
`(6+0)*30 = 180ms`). This keeps a block's first piece of nested content
never starting before the block's own entrance would have, which is the
same invariant the precedent established, just re-derived for this file's
own fixed index rather than copied verbatim (the constant differs because
this block's fixed position in *this* view differs from `MembersPanel`'s).

## Scope decision: Block 1 as two elements sharing one delay, not one wrapper (R3)

The "Resumen de la iniciativa" label and its rich-text body are two
existing sibling elements (`<p>` then `<div className="proyecto-rich-text"
...>`), with no wrapping element between them and Block 2 today. Two ways
to satisfy R3 ("single visual unit, no sub-stagger"):

1. **Chosen**: apply `blockMotionStyle(1, reduced)` to *both* elements
   directly, unchanged otherwise. Since both share the exact same
   `animation`/`animationDelay`, they visually fade in at the same instant —
   indistinguishable from a single fused block — with zero DOM changes.
2. **Discarded**: wrap both in a new `<div>` and animate the wrapper
   instead. Functionally identical outcome, but adds a DOM node and a
   `style={{ display: undefined }}`-shaped question (does the wrapper need
   `display: contents` or does it change flow layout?) for literally no
   visual benefit over option 1. Not proportional.

Block 3 (the avance header) is already a single existing `<div>` wrapping
its label and button, so no such choice is needed there — `blockMotionStyle
(3, reduced)` merges directly into that div's existing `style` object.

## Scope decision: wrapping `<AddUpdateForm />`, not a new prop on it (Block 4)

`AddUpdateForm.tsx` currently has no `style` prop and is called from exactly
one place. Two ways to give it an entrance:

1. **Chosen**: wrap its existing call site in `ProjectDrawer.tsx` —
   `{addingUpdate && (<div style={blockMotionStyle(4, reduced)}><AddUpdateForm
   .../></div>)}` — zero changes to `AddUpdateForm.tsx` itself.
2. **Discarded**: add a `style?: React.CSSProperties` prop to
   `AddUpdateForm` and merge it into its `<form>`'s own style. Rejected:
   widens that component's public API for a single call site, for a purely
   cosmetic concern that belongs to the caller's layout, not the form's own
   contract — the wrapping-div approach used for Block 4 keeps that
   boundary clean, the same reasoning `rich-text-formatting-proyectos`
   applied when it kept formatting logic out of the plain `<textarea>`
   components it touched.

## Scope decision: threading `reduced` as a prop into `ProjectTimeline`, not a second hook call

`ProjectTimeline.tsx` is already `"use client"` and could call
`usePrefersReducedMotion()` itself, exactly as each of the four prior
features' single top-level component did. This feature spans two files
instead of one, so there's a genuine choice: thread the boolean down, or
subscribe twice.

- **Chosen**: `ProjectDrawer` calls the hook once and passes `reduced` as a
  new prop to `<ProjectTimeline updates={...} onEdit={...} onDelete={...}
  reduced={reduced} />`. One source of truth for the whole view; avoids two
  independent `matchMedia` listeners mounting/unmounting in sync for no
  reason.
- **Discarded**: have `ProjectTimeline` call
  `usePrefersReducedMotion()` itself. Would work identically in practice
  (the hook is cheap and side-effect-free), but two subscriptions to the
  same OS setting for one view is unnecessary duplication once the value is
  already available one component up — and `ProjectDrawer` already needs
  it for Blocks 0–4, so it's already computed there.

## Scope decision: Block 5's own index (`5`) hardcoded inside `ProjectTimeline.tsx`, not passed as a prop

`ProjectTimeline` has exactly one call site, always at the same fixed
position (Block 5) within `ProjectDrawer`'s view content. A `baseIndex`
prop would be more "correct" in the abstract, but would be unused
generality for a component that is never rendered anywhere else in the
codebase today (confirmed: `ProjectTimeline` is only imported by
`ProjectDrawer.tsx`). Hardcoding `150ms`/`6 +` directly, with a comment
citing this reasoning, keeps the diff smaller and the numbers traceable to
requirements.md's own fixed block list, at the (currently theoretical) cost
of needing a follow-up edit in `ProjectTimeline.tsx` too if `ProjectDrawer`
ever reorders its blocks.

## Non-blocking interactivity (R8)

Same reasoning as all four prior specs: the only CSS properties this
feature touches are `opacity`, `transform`, `animation`, and
`animation-delay`. `pointer-events`, `disabled` (beyond the pre-existing,
unrelated empty-field gates on `AddUpdateForm`'s submit button and
`ProjectTimeline`'s save/edit buttons), `visibility`, and `display` are
never set by this feature and are never conditioned on animation state. A
row at `opacity: 0` during its stagger delay is still fully clickable and
focusable — the hover-revealed edit/delete actions, the inline edit fields,
and the "Agregar avance" button all remain responsive the instant the view
renders, regardless of whether their block's or row's fade has visually
finished. Manual QA in `tasks.md` includes acting on a control immediately
after the view renders, per the same pattern the four prior specs' QA used.

## Replay behavior (R9, R10)

Verified directly against `ProjectDrawer.tsx`'s existing control flow (not
assumed):

- **No replay on same-branch updates (R9)** — `handleAddUpdate`,
  `handleEditUpdate`, and `handleDeleteUpdate` all call `setProject(...)`
  (and, for the two update-mutating ones, `onUpdated(...)`) without ever
  touching `formMode`, `loading`, or `error` — the view branch's condition
  (`formMode === "view" && !loading && !error && project !== null`) stays
  `true` throughout, so React reconciles Blocks 1/2/3/5 in place rather than
  unmounting them; their `animation` inline-style value is unchanged across
  the re-render, so nothing re-triggers it. `ProjectTimeline`'s rows are
  each `key={update.id}` (via `group.key`), so a pre-existing row's DOM node
  survives an update/delete of a *different* row, and only `handleAddUpdate`
  introduces a genuinely new `update.id` — the one row that plays R4's
  entrance on that occurrence. Block 0 (`firstUpdateError`) and Block 4
  (`AddUpdateForm`) are conditionally rendered (`{cond && (...)}`); when
  either flips from absent to present within an already-mounted view
  branch, that specific block's own `<p>`/`<div>` is a new DOM node and
  plays its entrance once — but this does not touch any sibling block,
  since each conditional's JSX is independent of the others.
- **Full replay on view-branch remount (R10)** — three distinct paths in
  `ProjectDrawer.tsx` all route back through the *same* view-branch JSX
  position after having left it, which is exactly the condition that forces
  React to mount a fresh subtree there:
  1. **Closed → open**: `isOpen` flips `false → true`; the `useEffect` on
     `isOpen` sets `mounted` back to `true`, and `if (!mounted) return
     null;` had previously unmounted everything, including the view
     branch.
  2. **Project A → project B while the drawer stays open**: the
     `useEffect` on `[projectId, mode]` unconditionally does
     `setFormMode("view"); setLoading(true);` before the new `loadProject`
     call resolves — this flips the render to the loading-spinner branch
     (a different JSX position from the view branch) for at least one
     render, so the *previous* project's view-branch subtree unmounts; when
     `loadProject` resolves, `loading` becomes `false` again and a *new*
     view-branch subtree mounts for project B.
  3. **Returning to view mode from create/edit**: `handleFormSubmit` calls
     `setFormMode("view")` only after `createProject`/`updateProject`
     resolves — before that, `formMode === "form"` renders `ProjectForm`
     instead, a different JSX position again, so switching back to `"view"`
     mounts a fresh view-branch subtree.

  In all three cases, Blocks 0–5 (whichever are present on that mount)
  play their full entrance again, exactly as on the very first time that
  project's detail was shown — no extra `key` prop or remount plumbing is
  needed anywhere, this falls directly out of `ProjectDrawer`'s existing
  four-way branch structure (form / loading / error-or-null / view).

## Reduced motion (R7)

Reuse `usePrefersReducedMotion()` from
`app/state-of-ai/useReducedMotion.ts` exactly as all four prior features
established (cross-folder import via the `@/` alias, not relocated to
`lib/` — not re-litigated a fifth time). Called once in `ProjectDrawer`
(already `"use client"`), threaded into `ProjectTimeline` as the `reduced`
prop described above. The hook's SSR default of `true` means the first
server-rendered paint already has no motion, satisfying R7's first-paint
clause with no extra work.

## Alternatives considered and discarded

- **Chosen**: one `@keyframes proyectoDetailIn`, one duration/easing/
  translate value set (`220ms`/`ease-in-out`/`4px`), applied via
  `blockMotionStyle` (fixed indices 0–4, `ProjectDrawer.tsx`) and
  `emptyStateMotionStyle`/`rowMotionStyle` (Block 5's own tier,
  `ProjectTimeline.tsx`), reusing the prior features' exact numeric values
  verbatim rather than deriving a fifth set. Minimal new code, one visual
  "voice" across the whole `/proyectos` surface (the summary/timeline are
  already visually adjacent to `Schedule`/`MembersPanel` in the same
  product), small diff.
- **Discarded — `ease-out` instead of `ease-in-out`, per the research's
  literal recommendation for entrances**: considered seriously (see
  "Contexto" above) and rejected specifically for *this* feature because
  breaking the established curve would mean `/proyectos`' own detail view
  animates with a visibly different feel from `Schedule`'s and
  `MembersPanel`'s content one tab away in the same drawer family, for a
  difference that, at `220ms`/`4px`, is at the edge of perceptible even in
  a side-by-side comparison. If a future feature revisits this tradeoff
  for the whole product, it should do so once, deliberately, and update all
  five specs' curve together — not have this fifth feature quietly fork it.
- **Discarded — a second, heavier value set for Blocks 0–4** (e.g.
  `template-editor-content-animation`'s `260ms`/`6px`), mirroring how that
  feature's larger sections differed from `Schedule`'s rows: rejected
  because Blocks 0–4 here (an error line, a label+paragraph, a metadata
  line, a header row, a small form) are closer in visual weight to
  `MembersPanel`'s small form/footer blocks than to `TemplateEditor`'s
  genuinely larger sections — reusing the lighter/faster value set keeps
  proportion, as `members-panel-content-animation`'s design.md already
  argued for its own, similarly-sized blocks.
- **Discarded — animating `ProjectTimeline`'s populated rows as one lump**
  instead of per-row: rejected for the same reason
  `schedule-content-animation`'s and `members-panel-content-animation`'s
  design docs give — several distinct rows appearing in one simultaneous
  flash reads as more abrupt than a gentle stagger, and would erase the
  fact that each row is its own independently-editable/deletable unit.
- **Discarded — excluding `ProjectTimeline`'s empty state**: unlike
  `schedule-content-animation` (which explicitly excluded its own empty
  state as out of scope), this feature includes it, for the same reasoning
  `members-panel-content-animation`'s design.md gives for its own list-or-
  empty-state block: it is one of the six fixed blocks this feature already
  animates as a matter of course (Block 5), and a project can easily and
  routinely have zero weekly updates (right after creation, before the
  first "Agregar avance") — leaving it un-animated would mean Block 5
  sometimes animates and sometimes silently doesn't, which reads as an
  unfinished entrance rather than a deliberate scope line.
- **Discarded — excluding Block 0 (`firstUpdateError`) and/or Block 4
  (`AddUpdateForm`) as "too conditional/rare to bother with"**: rejected
  per R2's explicit requirement that a block's delay depend only on its
  fixed position, not its frequency of appearance — and because excluding
  them would require a special-case branch in `blockMotionStyle`'s caller
  for no proportional benefit; applying the same one-line helper call
  everywhere is simpler than special-casing two blocks out.
- **Discarded — gate control interactivity on animation completion**:
  directly violates R8 and the forms-UX reasoning
  `template-editor-content-animation`'s and `members-panel-content-
  animation`'s design docs already laid out; rejected outright.
- **Discarded — Tailwind's built-in `animate-*` utilities**: same
  reasoning as all four prior specs — no shipped utility matches a
  fade+translate entrance, and a custom one means extending the *global*
  theme in `app/globals.css` for two components' effect.
- **Discarded — a JS animation library (Framer Motion, react-spring,
  etc.)**: still no animation library in `package.json`; disproportionate
  new dependency weight for a CSS-achievable fade, same reasoning as all
  four prior specs.
- **Discarded — `useEffect`-toggled transition class per block/row**: would
  need each block/row to start in a "pre-enter" state and flip a class
  after mount, adding an extra render pass and per-item timers on top —
  meaningfully more moving parts than a static `animationDelay` computed
  from each block's fixed index or each row's own `.map()` index.

## Touches

No Supabase schema, auth, or cron surface — purely a client-side
presentational change confined to `app/proyectos/ProjectDrawer.tsx` and
`app/proyectos/ProjectTimeline.tsx`, reusing the existing
`app/state-of-ai/useReducedMotion.ts` hook. One new prop
(`reduced: boolean`) added to `ProjectTimeline`'s existing `Props`
interface. No new dependencies, no new design tokens, no changes to
`app/proyectos/page.tsx`, `ProjectForm.tsx`, `AddUpdateForm.tsx`, or
`WeeklyUpdateFields.tsx`.
