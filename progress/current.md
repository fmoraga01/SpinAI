# Current session state

- **Feature:** changelog-empty-state-animation
- **Status:** in_review — implementation done, lint/build pass
- **Started:** 2026-07-21
- **Role active:** reviewer
- **Next step:** reviewer validates against CHECKPOINTS.md and traceability, writes progress/review_changelog-empty-state-animation.md with a verdict.

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
