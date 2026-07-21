# Current session state

- **Feature:** _(ninguna activa)_
- **Status:** —
- **Started:** —
- **Role active:** —
- **Next step:** No hay feature en curso. `schedule-content-animation` cerró en `done` (2026-07-21) y se promovió a `main`; ver progress/history.md. El `leader` reemplaza este bloque al arrancar la próxima feature.

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
