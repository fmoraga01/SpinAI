# Current session state

- **Feature:** template-editor-content-animation
- **Status:** in_review
- **Started:** 2026-07-21
- **Role active:** reviewer
- **Next step:** reviewer validates the implementation against CHECKPOINTS.md and requirement traceability (R1-R7) in progress/impl_template-editor-content-animation.md, writes progress/review_template-editor-content-animation.md. Special attention to R5 (interactivity must never be blocked by the entrance animation) and R7 (entrance animation must replay on every fresh mount — reopen after close, and after returning from the presentation view). If approved, leader moves status to done and updates progress/history.md; if rejected, leader moves status back to in_progress with a note on what needs fixing.

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
