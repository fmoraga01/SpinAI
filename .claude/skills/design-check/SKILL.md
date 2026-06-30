---
name: design-check
description: Review changed React components in SpinAI for design-token consistency against app/globals.css (colors, border-radius, font sizes, shadows). Use when the user asks to check design consistency, review UI changes for style drift, or runs /design-check.
---

# Design Consistency Check

Reviews recently changed `.tsx` files under `app/components/` against the design
tokens defined in `app/globals.css`, and reports drift without fixing it
automatically. This is a read-only report — never edit files as part of this
skill unless the user explicitly asks you to apply a specific fix afterward.

## Scope to review

Parse `args` for an explicit git range or file list (e.g. `HEAD~3..HEAD`,
`app/components/Schedule.tsx`). If no `args` given, default to the diff between
`origin/main` and the current working tree (uncommitted + committed-but-unpushed
changes): `git diff origin/main -- app/components/'*.tsx'`. If that is empty,
fall back to the last commit on `main`: `git diff HEAD~1..HEAD -- app/components/'*.tsx'`.

Only look at `.tsx` files under `app/components/`. Ignore everything else.

## Reference tokens

Read `app/globals.css` fresh each run (don't assume the token list below is
exhaustive or current) — at minimum it defines:

- `--color-primary` (#2C40FF)
- `--color-tertiary`, `--color-text-primary`, `--color-text-secondary`
- `--color-border`, `--color-border-bright`
- `--color-surface`, `--color-surface-elevated`
- `--radius-md`
- `--shadow-glow-sm`

## What to flag

1. **Hex color bypassing an existing token** — a literal hex value that matches
   (or is extremely close to) a token's color but doesn't use `var(--token)`.
   Example: `color: "#2C40FF"` instead of `color: "var(--color-primary)"`.
   **Exception:** the established alpha-suffix pattern (`"#2C40FF11"`,
   `"#2C40FF22"`, `"#2C40FF44"`, etc.) is intentional shorthand for
   transparency and is fine — do not flag it.
2. **New hex color with no matching token** — a color that doesn't correspond
   to anything in `globals.css`, suggesting an ad-hoc choice rather than reuse
   of the existing palette.
3. **Hardcoded border-radius** instead of `var(--radius-md)`.
4. **`fontSize` outside the established scale** — the codebase consistently
   uses values in the 10–15px range for UI chrome (labels, badges, buttons);
   flag outliers that don't look like an intentional heading/display size.
5. **Custom `boxShadow` on primary/active elements** instead of
   `var(--shadow-glow-sm)` — e.g. a hand-rolled glow on a CTA button or active
   state.

When in doubt about whether something is intentional (e.g. a one-off marketing
section that legitimately needs a unique look), say so in the finding instead
of asserting it's wrong.

## Output format

For each finding:

```
<file>:<line> — <what's wrong>
  found:     <literal value>
  suggested: <token to use instead>
```

If there are no findings, say so briefly — don't pad the report. Do not modify
any files. If the user wants the fixes applied after seeing the report, that's
a separate, explicit follow-up action.
