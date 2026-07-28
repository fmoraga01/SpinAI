# Current session state

- **Feature:** project-status-tracking
- **Status:** spec_ready
- **Started:** 2026-07-28
- **Role active:** spec-author (done) — awaiting human approval
- **Next step:** Human review/approval of `specs/project-status-tracking/`
  (requirements.md, design.md, tasks.md). Once approved explicitly, `leader`
  sets status to `in_progress` and invokes `implementer`. Do not proceed to
  implementation without that explicit approval.

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
