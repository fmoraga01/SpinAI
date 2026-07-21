# Current session state

- **Feature:** members-panel-content-animation
- **Status:** spec_ready (pendiente)
- **Started:** 2026-07-21
- **Role active:** spec-author (en curso)
- **Next step:** `spec-author` está escribiendo specs/members-panel-content-animation/{requirements.md,design.md,tasks.md}. Al terminar, `leader` marcará el feature como `spec_ready` en feature_list.json y se detiene — requiere aprobación humana explícita antes de pasar a `in_progress`.

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
