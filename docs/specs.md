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

## Alcance: qué necesita spec y qué no

No todo cambio es una "feature". Este proceso completo (`feature_list.json` +
specs + los cuatro roles) aplica cuando el cambio:

- agrega comportamiento nuevo visible para quien usa la app, o
- toca lógica de negocio de forma no trivial, o
- va a tomar más de una sentada de trabajo.

**No** lo necesita — y va directo por el flujo normal de `CONTRIBUTING.md`
(rama, commit, `npm run verify` si aplica, merge a `dev`) — un cambio que es:

- reversible en un solo commit, y
- sin comportamiento nuevo: copy, config, un typo, un ajuste de estilo, un
  fix de una línea, un bump de dependencia sin cambio de comportamiento.

Estos cambios **no crean entrada en `feature_list.json`** ni pasan por
`spec-author` / `implementer` / `reviewer`. Siguen pasando, igual que
cualquier otro cambio, por el gate `dev → main` de `AGENTS.md` — ese gate
nunca se salta.

Si no es obvio en qué categoría cae un pedido, quien orquesta (`leader`, o
el agente que esté atendiendo el pedido) pregunta al humano en vez de
asumir. Una instrucción explícita del humano ("esto es un ajuste menor, sin
spec" / "quiero que esto pase por SDD igual") siempre gana sobre este
criterio por defecto.

## Roles

Four roles, defined as project subagents in `.claude/agents/`. No role
approves its own output.

| Role | File | Model | Responsibility |
|---|---|---|---|
| `leader` | `.claude/agents/leader.md` | Sonnet | Owns `feature_list.json`, moves features between statuses, invokes the other three roles in order, keeps `progress/history.md` |
| `spec-author` | `.claude/agents/spec-author.md` | Opus | Writes `requirements.md`, `design.md`, `tasks.md` for a feature |
| `implementer` | `.claude/agents/implementer.md` | Sonnet | Executes `tasks.md`, writes `progress/impl_<feature>.md` |
| `reviewer` | `.claude/agents/reviewer.md` | Opus | Validates traceability and checkpoints, writes `progress/review_<feature>.md` |

Model choice per role is set in each agent's frontmatter (`model:`), not
decided ad hoc per invocation. `leader`/`implementer` run on Sonnet — good
enough for triage and well-scoped implementation once a spec exists.
`spec-author`/`reviewer` run on Opus — mistakes in requirements/design
compound downstream, and an independent review is only as good as the
reasoning behind it, so both get the stronger model.

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
depends on what the requirement touches**:

- **Logic in `lib/`** (data fetching, parsing, pure functions) — a real
  Vitest test, in `lib/**/*.test.ts` (run via `npm run test`, or as part of
  `npm run verify`). This is no longer optional for `lib/` changes — Vitest
  is set up (see `vitest.config.ts`) and `lib/sizes.ts` has the first
  example test. If a pure helper isn't exported yet (e.g. a private mapper
  function like `rowToNewsItem` in `lib/news.ts`), export it rather than
  skipping the test — don't leave `lib/` logic untested because of a missing
  `export`.
- **UI/components** — a manual QA checklist step, documented in
  `progress/impl_<feature>.md` with what was checked and the outcome. If the
  change touches `app/components/*.tsx`, also run the `design-check` skill
  and note its result. Vitest does not cover components yet — that's a
  later-phase decision (React Testing Library + jsdom), not assumed here.
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

## Verification

`npm run verify` is the one command that stands in for `init.sh` in the
original harness-sdd design — run it before moving a feature to
`in_review`:

```
npm run verify
  → npm run lint            (eslint)
  → npm run build            (next build — also runs the TS check)
  → npm run test              (vitest run, scoped to lib/**/*.test.ts)
  → npm run check-sdd-state    (scripts/check-sdd-state.mjs)
```

`check-sdd-state` only catches process mistakes mechanically — more than one
feature `in_progress`/`in_review` at once, or a `spec_ready`+ feature
missing a spec file. It's a safety net, not a substitute for `reviewer`
actually reading the spec and the diff.

## References

- Code style — `CONTRIBUTING.md`
- "Is the state correct?" criteria — `CHECKPOINTS.md`
- High-level architecture map — `docs/architecture.md`
- Feature registry — `feature_list.json`
- Verification entry point — `npm run verify` / `vitest.config.ts` /
  `scripts/check-sdd-state.mjs`
