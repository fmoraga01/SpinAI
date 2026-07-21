# Checkpoints

Criteria for "the state is correct" at each stage of the SDD process defined
in `docs/specs.md`. `reviewer` checks these before moving a feature to
`done`; anyone can run the automatable ones manually at any time.

## Before `spec_ready`

- [ ] `specs/<feature>/requirements.md` exists, requirements are numbered
      (`R1`, `R2`, ...) and each is a single verifiable EARS sentence
- [ ] `specs/<feature>/design.md` exists and lists at least the alternatives
      that were discarded, not just the chosen approach
- [ ] `specs/<feature>/tasks.md` exists as a discrete, ordered checklist
- [ ] `feature_list.json` entry for the feature is `spec_ready`
- [ ] Human has explicitly approved the spec (not just "looks fine" in
      passing — an actual go-ahead)

## Before `in_review`

- [ ] Every task in `tasks.md` is checked off (`[x]`)
- [ ] `npm run verify` passes (runs `lint` + `build` + `test` + `check-sdd-state`
      — see below; run the pieces individually only if you need to debug a
      failure)
- [ ] If the feature added/changed logic in `lib/`, there is a real Vitest
      test for it (`lib/**/*.test.ts`) — this is no longer optional now that
      Vitest exists; see the traceability section in `docs/specs.md`
- [ ] `progress/impl_<feature>.md` exists and lists, for every `R<n>`:
      the file(s) changed and how it was verified (automated test path or
      manual QA note — see the traceability section in `docs/specs.md`)
- [ ] If `app/components/*.tsx` changed, the `design-check` skill was run
      and its findings addressed or explicitly accepted
- [ ] `feature_list.json` entry is `in_progress` → moved to `in_review`

`npm run check-sdd-state` (part of `verify`) only catches two things
mechanically: more than one feature `in_progress`/`in_review` at once, and a
`spec_ready`+ feature missing one of its three spec files. It does not
replace the judgment calls above — a human/reviewer still has to actually
read the spec and the diff.

## Before `done`

- [ ] `progress/review_<feature>.md` exists with a pass/fail per checkpoint
      above and an explicit approval verdict
- [ ] No `R<n>` is missing a verification entry
- [ ] Only one feature is `in_progress` or `in_review` at a time across
      `feature_list.json`
- [ ] `progress/history.md` has a new entry summarizing the feature

## Before merging `dev → main`

Unchanged from `AGENTS.md`: explicit human approval after the feature has
been used on `dev`. SDD's `spec_ready` gate does not replace this — it comes
earlier, on the spec, not on the merge.
