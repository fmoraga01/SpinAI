# Review — schedule-content-animation

## Verdict

**APPROVED**

Ready to move to `done`. All "Before `in_review`" checkpoints pass; the
implementer-flagged edge case (drag/entrance-animation opacity overlap) is
within the literal scope of R5 and is explicitly documented and accepted in
both `design.md` and the impl doc, not silently ignored.

## Checkpoints ("Before `in_review`")

1. **All tasks in `tasks.md` checked off** — PASS. All 6 tasks are `[x]`.

2. **`npm run verify` passes** — PASS. Ran the full pipeline myself
   (`node_modules` was not installed in this environment, so I ran
   `npm install` first, then `npm run verify`):
   - `lint` (eslint) — exit 0, no findings.
   - `build` (`next build`, Turbopack) — compiled successfully, TypeScript
     check passed, all 14 pages generated. The only warning ("Failed to find
     font override values for font `Bitcount Grid Double`") is pre-existing
     and unrelated to this change.
   - `test` (`vitest run`) — 1 file, 5 tests, all passing (existing `lib/`
     tests; none touched by this feature).
   - `check-sdd-state` — ✓ single active feature (`schedule-content-animation`,
     `in_review`), ✓ all spec_ready+ features have their three spec files, ✓
     `feature_list.json` consistent.

3. **Vitest test for changed `lib/` logic** — N/A (justified). This feature
   only changed `app/components/Schedule.tsx` (a presentational component);
   no `lib/` logic was added or modified, so the "real Vitest test" clause
   does not apply. Confirmed via `git show 325a555 --stat`: the only source
   file changed is `Schedule.tsx`.

4. **`progress/impl_<feature>.md` has a verification entry for every `R<n>`**
   — PASS. Entries exist for R1–R6, all flagged honestly as code-path/
   CSS-cascade reasoning (no live browser available in this environment) rather
   than overclaimed visual checks. I verified each claim against the actual
   diff (`git show 325a555 -- app/components/Schedule.tsx`) plus
   `useReducedMotion.ts`, `Drawer.tsx`, and `lib/storage.ts`, and every
   reasoning step holds:
   - **R1** (one-time, no loop): `animation: "scheduleRowIn 220ms ease-in-out
     backwards"` set on each row's outer `<div>` (both lists), no
     `animation-iteration-count` (defaults to 1). Cannot loop. Confirmed.
   - **R2** (stagger 30ms×index, cap 240ms, per-list): `upcoming.map((a, i))`
     and `past.map((a, i))` each supply their own 0-indexed `i`;
     `animationDelay: ${Math.min(i, 8) * 30}ms` computed independently per
     branch → "Anteriores" row 0 starts at 0ms regardless of upcoming count;
     `Math.min(i, 8)` caps at 240ms for i≥8. Matches literally.
   - **R3** (220ms, ease-in-out, single unit on the row not children): value
     matches literally; `ease-in-out` is the standard curve (no spring/
     overshoot). `animation`/`animationDelay` appear only on each row's outer
     `<div>`; no child (number span, avatar tile, text, "Lámina" button) has
     any `animation` property — confirmed by reading the full row JSX for both
     branches.
   - **R4** (no motion under reduced-motion, incl. first paint):
     `usePrefersReducedMotion()`'s `useSyncExternalStore` server snapshot
     returns `true` (`useReducedMotion.ts` line 15, unchanged), so first-paint
     HTML has `prefersReducedMotion === true`; the gate
     `...(prefersReducedMotion ? {} : {...})` then contributes an empty object
     and neither `animation` nor `animationDelay` is present — rows render at
     final opacity/position. Correct.
   - **R5** (existing 150ms transition untouched; entrance must not re-trigger
     from drag state): the `transition: "opacity 150ms, border-color 150ms,
     background 150ms"` line is byte-for-byte unchanged and in its original
     position (the new spread is added *after* it). `animation`/
     `animationDelay` values depend only on `prefersReducedMotion` and the
     row's static list index `i` — neither changes on drag/over/leave/drop — so
     drag-state re-renders reapply an identical `animation` string, which does
     not restart a CSS animation. Satisfied. (See "Edge case" below for the
     opacity-overlap nuance.)
   - **R6** (no replay for surviving `assignment.id`; only genuinely new rows
     animate): verified end-to-end from three files —
     `Drawer.tsx` line 232 renders `<Schedule ... />` with **no `key`** prop,
     so `Schedule` re-renders in place on `onRefresh()` rather than
     remounting; `lib/storage.ts` `swapAssignmentMembers` only `.update()`s
     `member_id`/`member_name` on the two existing rows (`.in("id",[idA,idB])`)
     — it never inserts a row and never changes `id` or `date`, so each row's
     list position `i` (and thus its computed `animationDelay`) is unchanged
     across the swap; both `.map`s use `key={a.id}` (unchanged), so React keeps
     the same DOM node → the CSS animation, which only fires on node creation,
     does not replay. A row with a genuinely new `id` gets a fresh node and
     animates once. Correct, and it falls out of existing structure with no
     new "seen" flag/effect.

5. **`design-check` run and findings addressed if `app/components/*.tsx`
   changed** — PASS. Only `app/components/Schedule.tsx` changed under
   `app/components/`. `.claude/skills/design-check` exists; the impl doc records
   a run with no findings. Verified against the diff: the additions are one
   import, one hook call, one `<style>` whose `@keyframes` uses only
   `opacity`/`transform`, and the `animation`/`animationDelay` properties — no
   hex color, no `border-radius`, no `fontSize`, no `boxShadow` introduced. "No
   findings" is accurate, not a rubber stamp.

6. **`feature_list.json` has only this one feature `in_progress`/`in_review`**
   — PASS. Two entries: `changelog-empty-state-animation` is `done`;
   `schedule-content-animation` is the only `in_review`. Corroborated by
   `check-sdd-state`.

## Edge case flagged by the implementer — evaluated

- **Drag / entrance-animation opacity overlap (upcoming rows).** Upcoming rows
  set `opacity: isDragging ? 0.4 : ...` on the row itself, and the entrance
  keyframe also drives `opacity` (0→1). Per the CSS cascade, while the entrance
  animation is active (≤ 220ms + up to 240ms delay = ~460ms worst case after
  that row's mount) it owns `opacity`, so a drag started *within* that window
  would not visibly show the 0.4 dim until the animation ends; `border-color`
  and `background` drag feedback (not in the keyframe) still update immediately,
  and drop/swap still functions. **Assessment: acceptable, no change required.**
  R5 as written requires only that (a) the existing `transition` string be left
  untouched and (b) the entrance animation not *re-trigger* from drag-state
  changes — both hold. R5 does not require the drag dim to be visible during the
  entrance window. The behavior is transient, bounded, non-erroring, requires a
  deliberate drag within ~460ms of mount, and is explicitly documented and
  accepted in `design.md`'s "Non-interference" section and the impl doc — i.e.
  explicitly accepted, not silently ignored (CHECKPOINTS item 5).

- **"Anteriores" section-level `opacity: 0.45` during the entrance window.**
  The `0.45` lives on the parent wrapper (`<div className="space-y-2"
  style={{ opacity: 0.45 }}>`, line 242, unchanged); each row animates its
  *own* opacity 0→1 nested inside it. Nested opacity composes multiplicatively,
  so a row peaks at an effective 0.45 and the section stays dimmed throughout —
  the 0.45 is not "masked" or overridden by the entrance animation. Impl doc's
  reasoning is correct.

- **Reduced-motion path (R4)** and **swapped rows not replaying (R5/R6)** —
  both hold as detailed under checkpoint 4 above.

## Additional notes

- The impl commit (`325a555`) is the tip of `origin/dev`/`dev`/HEAD, so the
  diff was reviewed via `git show 325a555 -- app/components/Schedule.tsx`; it
  matches the impl doc 1:1 with no undisclosed changes. Only source file
  touched is `Schedule.tsx` (+ spec/progress docs).
- The empty-state branch (`assignments.length === 0`, lines 66–121) is
  untouched; the `<style>` tag sits in the populated return at line 126, after
  the early return — scope respected.
- The one logged deviation (gating the two properties via a single
  `...(cond ? {} : {...})` spread instead of two ternaries) is functionally
  identical and does not affect any requirement.
