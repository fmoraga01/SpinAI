# Current session state

- **Feature:** members-panel-content-animation
- **Status:** spec_ready
- **Started:** 2026-07-21
- **Role active:** — (esperando aprobación humana)
- **Next step:** Spec completa en specs/members-panel-content-animation/{requirements.md,design.md,tasks.md} (R1–R9). Esperando aprobación humana explícita del spec antes de pasar a `in_progress` e invocar `implementer`. `leader` no actúa más sobre esta feature hasta recibir esa aprobación.

When `leader` starts a feature, this file gets replaced with:

```markdown
# Current session state

- **Feature:** <feature-id>
- **Status:** in_progress | in_review
- **Started:** YYYY-MM-DD
- **Role active:** spec-author | implementer | reviewer
- **Next step:** <what happens next and who does it>
```

This file always reflects the *single* active feature (see the one-feature-
at-a-time rule in `docs/specs.md`). Once a feature reaches `done`, its entry
is cleared from here and summarized in `progress/history.md`.
