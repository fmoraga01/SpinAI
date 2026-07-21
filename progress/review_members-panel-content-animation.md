# Review — members-panel-content-animation

## Verdict

**APPROVED**

Ready to move to `done`. All "Before `in_review`" checkpoints pass on
independent re-verification (not just trusting the implementer's report).
The diff is minimal, matches `design.md` and the impl doc verbatim, and
none of R1–R9 has a gap.

## Checkpoints ("Before `in_review`")

1. **All tasks in `tasks.md` checked off** — PASS. Read
   `specs/members-panel-content-animation/tasks.md` directly: all 10 tasks
   are `[x]`.

2. **`npm run verify` passes** — PASS. Ran it myself (`node_modules` already
   installed):
   - `lint` (eslint) — exit 0, no findings.
   - `build` (`next build`, Turbopack) — compiled successfully, TypeScript
     check passed, all 14 pages generated. Same pre-existing, unrelated
     warning as prior features ("Failed to find font override values for
     font `Bitcount Grid Double`").
   - `test` (`vitest run`) — 1 file, 5 tests, all passing (pre-existing
     `lib/` tests; nothing new needed since this feature touches no `lib/`
     logic).
   - `check-sdd-state` — single active feature
     (`members-panel-content-animation`, `in_review`), all `spec_ready+`
     features have their three spec files, `feature_list.json` consistent.

3. **Vitest test for changed `lib/` logic** — N/A, justified. `git diff
   origin/main -- app/components/MembersPanel.tsx` confirms the only file
   under active development is a presentational component; no `lib/` file
   is touched. No test gap.

4. **`progress/impl_members-panel-content-animation.md` has a verification
   entry for every `R<n>`** — PASS. Entries exist for R1–R9, honestly
   flagged throughout as code-path/diff reasoning (no live browser in this
   environment), not overclaimed as visually observed. I independently
   re-verified each against the current `app/components/MembersPanel.tsx`
   and `app/components/Drawer.tsx`:
   - **R1** (one-time entrance, no loop) — confirmed: `animation:
     "membersPanelIn 220ms ease-in-out backwards"` on the form's own
     `<form>`, the list-or-empty-state block's own wrapper (empty-state
     `<div>` or each row's `<li>`), and the footer's own `<div>`; no
     `animation-iteration-count` anywhere in the file, defaults to `1`.
   - **R2** (`30ms * index` stagger, form=0/list=1/footer=2, top-to-bottom)
     — confirmed: `blockMotionStyle(0, ...)` on the `<form>`,
     `blockMotionStyle(1, ...)` on the empty-state `<div>`,
     `blockMotionStyle(2, ...)` on the footer `<div>` — delays `0/30/60ms`
     in exactly the fixed JSX order form → list-or-empty → footer.
   - **R3** (empty state as a single visual unit, no sub-stagger between
     heading/description) — confirmed: `blockMotionStyle(1, ...)` is merged
     onto the empty-state `<div>` only; the two `<p>` children have no
     `animation`/`animationDelay` of their own (diff shows zero changed
     lines inside them).
   - **R4** (per-row `(1 + min(index, 8)) * 30ms` stagger) — confirmed:
     `members.map((m, index) => ...)` yields the array index,
     `rowMotionStyle(index, prefersReducedMotion)` merged into each
     `<li key={m.id}>`'s `style`, literally computing
     `(1 + Math.min(index, 8)) * 30}ms` — row 0 starts at `30ms` (anchored
     to the list block's own base delay), row 8+ caps at `270ms`. Formula
     is byte-identical across `design.md`, `tasks.md`, and the code — the
     `+1` offset (list block never starts before its own `30ms`, rows start
     from there) is applied consistently, not just described.
   - **R5** (`220ms` ease-in-out, single unit per block/row, never
     sub-staggered on inner controls) — confirmed: `220ms`/`ease-in-out` is
     the literal, only value used in both helpers (no bounce/spring).
     Re-read the full diff myself (`git diff origin/main -- app/components/
     MembersPanel.tsx`): `animation`/`animationDelay` appear on exactly
     three places — the `<form>`, the empty-state `<div>` (or, when
     populated, each `<li>`), and the footer `<div>` — and nowhere else. No
     `animation` on either "Agregar" `<input>`, the submit `<button>`, a
     row's toggle button/name button/email button/delete button, or either
     footer `<span>`.
   - **R6** (reduced motion: full opacity/final position, no delay,
     including first paint) — confirmed: `usePrefersReducedMotion()`'s SSR
     fallback is `true` (per `app/state-of-ai/useReducedMotion.ts`, reused
     unmodified), so the very first server-rendered paint already has
     `prefersReducedMotion === true`; every `blockMotionStyle`/
     `rowMotionStyle` call then returns `{}` — no `animation`/
     `animationDelay` property at all.
   - **R7** (no control's interactivity gated on animation state — form
     inputs/submit button; each row's toggle, click-to-edit name/email,
     delete/confirm button) — independently re-grepped the whole file for
     `pointer-events`, `visibility`, `display:`, `disabled` (see below) and
     re-read the full diff line-by-line myself: the only CSS properties
     introduced anywhere are `opacity`/`transform` (inside the `<style>`
     keyframes body) and `animation`/`animationDelay` (on the three
     block-tier wrappers and the row `<li>`). Every interactive descendant
     — the two "Agregar" `<input>`s, the submit `<button disabled=
     {!name.trim()}>` (pre-existing, unrelated, untouched by this diff —
     confirmed zero changed lines inside that element), the toggle
     `<button onClick={() => onToggle(m.id)}>`, the click-to-edit name/email
     `<button>`s and their `autoFocus`/`onBlur`/`onKeyDown` inline-edit
     inputs, and the delete/confirm `<button onClick={() =>
     handleRemove(m.id)}>` with its two-step `confirmRemove` flow and
     `setTimeout(..., 3000)` — has zero prop changes in the diff. None of
     these controls' interactivity is gated on any animation-derived state;
     `opacity`/`transform`/`animation` never affect hit-testing, focus
     order, or the accessibility tree, so R7 holds by construction, exactly
     as claimed.
   - **R8** (no replay within one mounted instance; only a newly-added row
     via `onAdd` plays its entrance) — confirmed: every `<li key={m.id}>`
     keeps its pre-existing `key`, untouched by this diff; `Drawer.tsx`'s
     handlers (`onAdd`/`onToggle`/`onRemove`/`onUpdateEmail`/
     `onUpdateName`) all await their `lib/storage.ts` call then call
     `refresh()`, which only does `setData(await loadData())` — it never
     remounts `MembersPanel` (no `key` on the `<MembersPanel .../>` call
     site). React reconciles every surviving row's `<li>` to its existing
     DOM node across that re-render, so the CSS `animation` (which only
     fires on node creation) does not replay even though
     `rowMotionStyle(index, ...)` is recomputed identically on every
     render. The form and footer are unconditionally rendered in the same
     tree position on every render, so they're reconciled too. No
     "seen"/`useEffect` replay-guard mechanism was introduced anywhere —
     confirmed by reading the full diff, which adds no hooks beyond the
     single `usePrefersReducedMotion()` call.
   - **R9** (full replay on remount when switching drawer tabs away and
     back to "equipo") — independently confirmed by reading
     `app/components/Drawer.tsx` directly (lines 209–220): `MembersPanel`
     is rendered only inside `{drawer === "equipo" && (<MembersPanel
     .../>)}`, with no `key` prop, and `Drawer.tsx` has zero diff versus
     `origin/main` (`git diff origin/main --stat` shows only
     `app/components/MembersPanel.tsx` plus spec/progress files changed).
     Switching the drawer away from "equipo" removes `MembersPanel` from the
     tree entirely; switching back mounts a wholly fresh instance with new
     DOM nodes for all three blocks and every row, so R1–R5 replay in full.
     Matches `design.md`'s description exactly.

5. **`design-check` run and findings addressed if `app/components/*.tsx`
   changed** — PASS. Only `app/components/MembersPanel.tsx` changed under
   `app/components/` (confirmed via `git diff origin/main --stat`). The
   skill (`.claude/skills/design-check/SKILL.md`) exists; the impl doc
   records a run against the diff with no findings (no hardcoded hex color,
   no hardcoded `border-radius`, no `fontSize` change, no custom
   `boxShadow` introduced). Independently re-checked the diff myself: the
   only additions are one import, two module-level helpers, one hook call,
   one `<style>` tag whose `@keyframes` body sets only `opacity`/
   `transform`, four `blockMotionStyle`/`rowMotionStyle` call sites, and a
   `.map()` signature change to yield `index` — no new color/radius/shadow/
   font token surface. "No findings" is accurate.

6. **`feature_list.json` has only this one feature `in_progress`/
   `in_review`** — PASS. Four entries: `changelog-empty-state-animation`,
   `schedule-content-animation`, `template-editor-content-animation` are
   all `done`; `members-panel-content-animation` is the only
   `in_review`/`in_progress` entry. Corroborated by `check-sdd-state`.

## Code-vs-doc consistency (special attention per task brief)

- **Two-level stagger formula** — `blockMotionStyle(index, reduced) =>
  index * 30ms` and `rowMotionStyle(index, reduced) => (1 + Math.min(index,
  8)) * 30ms` in the code are byte-identical to `design.md`'s helper
  signatures/bodies and to `tasks.md`'s task 2 wording. Not just described
  consistently — the actual source in `app/components/MembersPanel.tsx`
  lines 16–30 is the same code.
- **R7 non-blocking interactivity** — re-verified directly against the real
  diff (not the impl doc's claim about it): `git diff origin/main --
  app/components/MembersPanel.tsx` shows the *only* style properties
  touched anywhere are `opacity`/`transform` (keyframes body) and
  `animation`/`animationDelay` (four call sites). No `pointer-events`, no
  new `disabled` condition (the existing `disabled={!name.trim()}` on the
  submit button is untouched — zero diff lines inside that element), no
  `visibility`, no `display` toggling tied to animation state anywhere,
  including the form, the toggle button, the inline name/email edit
  affordances, and the two-step delete/confirm button.
- **R8 no-replay mechanism** — confirmed `key={m.id}` is untouched on every
  `<li>` (present before and after the diff, same value), and no
  "seen"/`useEffect`/remount-trick was added — `rowMotionStyle`/
  `blockMotionStyle` are pure functions of `(index, reduced)` with no
  internal state, ref, or side effect of their own.
- **R9 remount mechanism** — confirmed in `Drawer.tsx` itself (unchanged by
  this feature): `{drawer === "equipo" && (<MembersPanel .../>)}`, no
  `key` prop. `design.md`'s description of this mechanism matches the
  actual file exactly.

## Additional notes

- `git log --oneline` for this feature: `3da3234` (spec_ready → in_progress)
  → `b1f5ad0` (WIP 8/10 tasks) → `97cfcf4` (tasks 9-10/10) → `71c30bb`
  (in_progress → in_review). `app/components/MembersPanel.tsx` on disk
  matches the impl doc's description 1:1, with no undisclosed changes.
- The implementer's progress doc is candid throughout about the lack of a
  live browser in this environment ("Not visually confirmed") rather than
  overclaiming manual QA — consistent with the pattern already accepted for
  the three prior `done` features in this series.
- Non-goals from `requirements.md` (existing `transition-all duration-150`
  on rows, border-color transitions on inputs, submit-button disabled
  logic, the two-step delete confirmation, click-to-edit pattern, and
  `Drawer.tsx` itself) are all confirmed byte-for-byte unchanged by the
  diff.
