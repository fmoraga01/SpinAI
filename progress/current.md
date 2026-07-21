# Current session state

- **Feature:** _(ninguna activa)_
- **Status:** —
- **Started:** —
- **Role active:** —
- **Next step:** No hay feature en curso. `members-panel-content-animation` cerró en `done` (2026-07-21) y quedó mergeada en `dev`; ver progress/history.md. La promoción a `main` está pendiente de aprobación explícita del usuario. El `leader` reemplaza este bloque al arrancar la próxima feature.

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
