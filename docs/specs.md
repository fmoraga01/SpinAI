# Spec-Driven Development (SDD) at SpinAI

This defines how features move from idea to `main` in this repo, adapted from
[betta-tech/harness-sdd](https://github.com/betta-tech/harness-sdd) to a
single-maintainer Next.js project with no existing test suite. It complements
— does not replace — the branch flow in `AGENTS.md`
(`dev → aprobación → main`) and the style guide in `CONTRIBUTING.md`.

## Why

The repo, not the chat, is the system of record. A feature's requirements,
design decisions, task list, and progress live on disk so any agent (or
human) can pick the work back up with zero prior context.

## Roles

Four roles, defined as project subagents in `.claude/agents/`. No role
approves its own output.

| Role | File | Responsibility |
|---|---|---|
| `leader` | `.claude/agents/leader.md` | Owns `feature_list.json`, moves features between statuses, invokes the other three roles in order, keeps `progress/history.md` |
| `spec-author` | `.claude/agents/spec-author.md` | Writes `requirements.md`, `design.md`, `tasks.md` for a feature |
| `implementer` | `.claude/agents/implementer.md` | Executes `tasks.md`, writes `progress/impl_<feature>.md` |
| `reviewer` | `.claude/agents/reviewer.md` | Validates traceability and checkpoints, writes `progress/review_<feature>.md` |

## Feature lifecycle

```
pending → spec_ready → in_progress → in_review → done
              ▲                                     
        human approval gate                         
        (spec must be approved                      
        before any code is written)                 
```

Statuses live in `feature_list.json`. Only **one** feature may be
`in_progress` or `in_review` at a time — this keeps context focused and
matches how a small, single-maintainer project actually works.

1. **`pending`** — feature exists as an entry in `feature_list.json`, nothing
   written yet.
2. **`spec_ready`** — `spec-author` has written all three documents in
   `specs/<feature>/`. **Human approval gate**: the requirements, design, and
   task list are reviewed and explicitly approved before anything moves to
   `in_progress`. This is separate from, and happens earlier than, the
   `dev → main` approval gate in `AGENTS.md`.
3. **`in_progress`** — `leader` hands the approved spec to `implementer`,
   which works through `tasks.md` top to bottom, checking items off.
4. **`in_review`** — `reviewer` checks the work against `CHECKPOINTS.md` and
   the requirement traceability described below.
5. **`done`** — reviewer approved. Code merges to `dev` per the normal
   workflow, gets used for a while, and only moves to `main` once the human
   gives explicit production approval — unchanged from `AGENTS.md`.

## Spec documents (`specs/<feature>/`)

- **`requirements.md`** — [EARS notation](https://alistairmavin.com/ears/),
  numbered `R1`, `R2`, etc. Each requirement should be a single verifiable
  sentence (e.g. *"WHEN a member has no email THEN the system SHALL exclude
  them from the notification recipient list."*).
- **`design.md`** — the technical approach and, importantly, the
  alternatives that were considered and discarded, with a one-line reason
  each. Keep it proportional to the feature — a small UI tweak doesn't need
  a page of design notes.
- **`tasks.md`** — a discrete, ordered checklist. Each task should be small
  enough that `implementer` can complete and verify it before moving to the
  next.

## Traceability: requirement → verification

Every `R<n>` must map to a verification step, but **the kind of verification
depends on what the requirement touches** — this repo has no test suite yet
(see the phased rollout in the proposal), so traceability starts hybrid
rather than 100% automated:

- **Logic in `lib/`** (data fetching, parsing, pure functions) — once Vitest
  is introduced, these get a real automated test. Until then, or for
  requirements outside `lib/`, use the manual path below.
- **UI/components** — a manual QA checklist step, documented in
  `progress/impl_<feature>.md` with what was checked and the outcome. If the
  change touches `app/components/*.tsx`, also run the `design-check` skill
  and note its result.
- **Cron/API routes** — manual verification steps (e.g. hitting the route
  locally, checking logs), documented the same way.

`reviewer` rejects the review if any `R<n>` has no traceability entry at
all — automated or manual.

## Gates, explicitly

There are exactly two human approval gates in this process, and they answer
different questions:

1. **`spec_ready` gate** — "is this the right thing to build, built the
   right way?" Approved before code exists.
2. **`dev → main` gate** (from `AGENTS.md`, unchanged) — "has this been used
   and is it safe for production?" Approved after the feature is `done` and
   has lived on `dev` for a while.

## References

- Code style — `CONTRIBUTING.md`
- "Is the state correct?" criteria — `CHECKPOINTS.md`
- High-level architecture map — `docs/architecture.md`
- Feature registry — `feature_list.json`
