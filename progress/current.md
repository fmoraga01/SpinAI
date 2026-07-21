# Current session state

- **Feature:** schedule-content-animation
- **Status:** pending → writing spec
- **Started:** 2026-07-21
- **Role active:** spec-author
- **Next step:** spec-author writes requirements.md/design.md/tasks.md, then leader stops for human approval of the spec (spec_ready gate) before any code is written.

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
