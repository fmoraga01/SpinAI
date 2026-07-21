# Review — template-editor-content-animation

## Verdict

**APPROVED**

Ready to move to `done`. All "Before `in_review`" checkpoints pass. The one
implementer-flagged deviation (a typo in `design.md`'s reduced-motion prose)
is correctly resolved in code and honestly documented — see below for why it
does not need a `design.md` edit to approve this feature, plus a
non-blocking suggestion.

## Checkpoints ("Before `in_review`")

1. **All tasks in `tasks.md` checked off** — PASS. All 8 tasks are `[x]`
   (verified by reading `specs/template-editor-content-animation/tasks.md`
   directly, not just the impl doc's claim).

2. **`npm run verify` passes** — PASS. Ran it myself (`node_modules` was
   already installed in this environment):
   - `lint` (eslint) — exit 0, no findings.
   - `build` (`next build`, Turbopack) — compiled successfully, TypeScript
     check passed, all 14 pages generated. The only warning ("Failed to find
     font override values for font `Bitcount Grid Double`") is pre-existing
     and unrelated to this change.
   - `test` (`vitest run`) — 1 file, 5 tests, all passing (existing `lib/`
     tests; none touched by this feature).
   - `check-sdd-state` — single active feature
     (`template-editor-content-animation`, `in_review`), all `spec_ready+`
     features have their three spec files, `feature_list.json` consistent.

3. **Vitest test for changed `lib/` logic** — N/A (justified). This feature
   only changed `app/components/TemplateEditor.tsx` (a presentational
   component); confirmed via `git show 45bfd1d --stat` and
   `git show daea385 --stat` that no `lib/` file was touched by either
   implementation commit. The "real Vitest test" clause does not apply.

4. **`progress/impl_template-editor-content-animation.md` has a verification
   entry for every `R<n>`** — PASS. Entries exist for R1–R7, all honestly
   flagged as code-path/diff reasoning (no live browser in this
   environment) rather than overclaimed visual checks. I independently
   verified each against the actual current file
   (`app/components/TemplateEditor.tsx`) and `app/components/Drawer.tsx`:
   - **R1** (one-time entrance, no loop) — confirmed: `animation:
     "templateEditorSectionIn 260ms ease-in-out backwards"` on each of the
     eight section wrappers, no `animation-iteration-count` anywhere in the
     file (defaults to 1). Cannot loop.
   - **R2** (30ms × index stagger, badge=0 ... actions=7, top-to-bottom) —
     confirmed: the eight call sites in JSX order are
     `sectionMotionStyle(0, ...)` through `sectionMotionStyle(7, ...)` in
     exactly the order badge → Título → TimingSection → AgendaEditor →
     ThemePicker → FontPicker → SizePicker → actions row, producing delays
     `0/30/60/90/120/150/180/210ms`.
   - **R3** (200–500ms, standard curve, single unit per section, not inner
     controls) — confirmed: `260ms` is in-band, `ease-in-out` has no
     bounce/spring. Grepped the whole file for `animation` — it appears only
     in `sectionMotionStyle` (used on the 8 wrappers) and the unrelated,
     pre-existing `spin` keyframe in the `loading || presenting` branch. No
     agenda row, drag handle, swatch, or action button has its own
     `animation` property.
   - **R4** (no motion under reduced-motion, incl. first paint) —
     confirmed: `usePrefersReducedMotion()` is called unconditionally before
     the `if (loading || presenting)` early return (line 605), satisfying
     React's rules of hooks; its SSR snapshot (`useReducedMotion.ts`)
     defaults to `true`, so `sectionMotionStyle(n, prefersReducedMotion)`
     returns `{}` on first paint and whenever the OS reports
     `prefers-reduced-motion: reduce`.
   - **R5** (no control's interactivity gated on animation state) —
     confirmed by re-reading the diff myself
     (`git diff origin/main -- app/components/TemplateEditor.tsx`): the only
     properties the diff introduces are `animation`/`animationDelay` (plus
     the `<style>` keyframes body, which itself sets only
     `opacity`/`transform`). Grepped the diff for `pointer-events`,
     `disabled`, `visibility`, `display` — zero matches. The pre-existing
     `disabled={saving}` on the Guardar button is untouched by this diff and
     gated on save-in-flight state, not animation state. Since
     `opacity`/`transform`/`animation` never affect hit-testing, focus, or
     the accessibility tree, R5 holds by construction, matching both
     `design.md`'s and the impl doc's reasoning.
   - **R6** (no replay on ordinary re-render within the same mount) —
     confirmed: none of `title`/`agendaItems`/`timingEnabled`/
     `totalMinutes`/`theme`/`font`/`size`/`saving`/`saved`/`error` state
     changes touch `loading`, `presenting`, or any `key` on
     `TemplateEditor` itself; the `space-y-6` subtree (and every section
     wrapper) is created exactly once, on the render where `loading` first
     flips to `false`, and a CSS `animation` does not restart on a
     same-node re-render (recomputing/reapplying an identical `animation`
     string does not force `animation-name` through `none`).
   - **R7** (full replay on remount) — confirmed directly in
     `app/components/Drawer.tsx`: `TemplateEditor` is rendered only inside
     `editingAssignment ? <TemplateEditor key={editorKey} .../> : (...)`
     (lines 201–208). Setting `editingAssignment` back to `null` unmounts
     it entirely, and setting it again mounts a fresh instance whose
     `loading` state machine reruns from scratch. Separately,
     `PresentationView`'s `onClose` handler (line 249) does
     `setPresentingTemplate(null); setEditorKey((k) => k + 1);` — the
     `editorKey` bump is used as `TemplateEditor`'s `key` prop, which per
     React's reconciliation rules forces a full unmount/remount regardless
     of any other prop, replaying the entrance animation. Both mechanisms
     are pre-existing in `Drawer.tsx` and untouched by this feature's diff.

5. **`design-check` run and findings addressed if `app/components/*.tsx`
   changed** — PASS. Only `app/components/TemplateEditor.tsx` changed under
   `app/components/` (confirmed via `git show 45bfd1d --stat` /
   `git show daea385 --stat`, and `git diff origin/main --stat -- app/components/`).
   `.claude/skills/design-check/SKILL.md` exists; the impl doc records a run
   against `git diff origin/main -- app/components/'*.tsx'` with no
   findings. Independently verified against the diff: the only additions are
   one import, one module-level helper, one hook call, one `<style>` tag
   whose `@keyframes` body uses only `opacity`/`transform`, eight
   `sectionMotionStyle(...)` call sites, and five new wrapper `<div>`s — no
   hardcoded hex color, no hardcoded `border-radius`, no `fontSize` change,
   no custom `boxShadow`. "No findings" is accurate.

6. **`feature_list.json` has only this one feature `in_progress`/`in_review`**
   — PASS. Three entries: `changelog-empty-state-animation` and
   `schedule-content-animation` are `done`; `template-editor-content-animation`
   is the only `in_review`/`in_progress` entry. Corroborated by
   `check-sdd-state`.

## Deviation flagged by the implementer — evaluated

`design.md`'s "Reduced motion" section states "`!prefersReducedMotion` is
passed in as `reduced`" — taken literally this would invert R4 (motion would
play only when reduced-motion is requested). The implementer correctly
identified this as inconsistent with the helper's own documented contract
(`reduced === true` → `{}`, no motion) two paragraphs earlier in the same
doc, and implemented — and I confirmed in the current file — the only
variant consistent with both the helper's contract and R4:
`sectionMotionStyle(n, prefersReducedMotion)` at all eight call sites, no
negation. This also matches the established precedent in `Schedule.tsx`
(`prefersReducedMotion ? {} : {...}`, same direction).

**Assessment: correct call, no code change needed, no `design.md` edit
required to approve.** This is prose-only, self-contradicting text in a
spec that has already served its purpose (guiding an implementation that
turned out correct); `design.md` is a point-in-time design record, not
living documentation that must be kept byte-perfect after the fact, and
`CHECKPOINTS.md` does not ask reviewers to re-edit approved specs.
Recommendation (non-blocking, does not gate this approval): the leader could
fix that one sentence in `design.md` in the same close-out commit as a
courtesy to future readers who might otherwise copy the wrong direction from
it, but this is optional polish, not a review blocker.

## Additional check performed beyond the impl doc's own claims

- **Tailwind `space-y-6` interaction with the newly inserted `<style>` tag**
  (not raised by the implementer): the new `<style>{\`@keyframes
  templateEditorSectionIn ...\`}</style>` is inserted as the *first* child
  of `<div className="space-y-6">`, ahead of the "Reunión asignada" badge,
  which was previously the first child. I checked whether this could add
  unwanted spacing before the badge. Inspected the actual compiled Tailwind
  v4 output (`.next/static/chunks/*.css`): the generated rule is
  `:where(.space-y-6>:not(:last-child))` applying `margin-block-end` (not
  `margin-top`) to every non-last child. Since `<style>` elements are
  `display: none` per the HTML5 UA stylesheet, they generate no box and
  their `margin-block-end` has no visual effect; the badge's non-last-child
  status (and thus its own margin-bottom) is unchanged from before this
  feature. Confirmed no spacing regression. `design.md`'s own reasoning for
  "spacing is visually identical to today" cites an outdated `> * + *`
  margin-top mental model (Tailwind v3-style) rather than the actual v4
  `:not(:last-child)`/`margin-block-end` mechanism, but its conclusion holds
  for the reason above. Not a functional issue; noted here for completeness,
  not a blocker.

## Additional notes

- The implementation commits (`45bfd1d`, `daea385`) plus the closing commit
  (`93d3a97`, `in_progress → in_review`) are the tip of the current branch;
  `app/components/TemplateEditor.tsx` as it stands on disk matches the impl
  doc's description 1:1, with no undisclosed changes (verified via
  `git diff origin/main -- app/components/TemplateEditor.tsx` read in full).
- The `loading || presenting` spinner branch (lines 725–732, its own
  `@keyframes spin`) is byte-for-byte unchanged.
- `AgendaEditor`'s internal `dragIndex`/`dragOver`-driven `opacity`/`outline`
  styling on its rows is unchanged and untouched by the new entrance
  animation — it participates in the top-level stagger exactly once, as
  documented.
- `Drawer.tsx` is unchanged by this feature's diff (confirmed via
  `git show 45bfd1d --stat` / `git show daea385 --stat`, neither touches
  it); its pre-existing `editingAssignment`/`editorKey` mount structure is
  what makes R7 hold, exactly as `design.md` predicted.
