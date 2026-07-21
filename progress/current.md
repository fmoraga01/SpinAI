# Current session state

- **Feature:** changelog-empty-state-animation
- **Status:** spec_ready — awaiting human approval
- **Started:** 2026-07-21
- **Role active:** none (waiting on human)
- **Next step:** human reviews specs/changelog-empty-state-animation/{requirements,design,tasks}.md; once explicitly approved, leader moves status to in_progress and invokes implementer.

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
