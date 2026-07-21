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
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `progress/impl_<feature>.md` exists and lists, for every `R<n>`:
      the file(s) changed and how it was verified (automated test path or
      manual QA note — see the traceability section in `docs/specs.md`)
- [ ] If `app/components/*.tsx` changed, the `design-check` skill was run
      and its findings addressed or explicitly accepted
- [ ] `feature_list.json` entry is `in_progress` → moved to `in_review`

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
