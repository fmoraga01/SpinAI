# Current session state

- **Feature:** template-editor-content-animation
- **Status:** in_progress
- **Started:** 2026-07-21
- **Role active:** implementer
- **Next step:** implementer executes specs/template-editor-content-animation/tasks.md (8 tasks, target file app/components/TemplateEditor.tsx), documents manual QA with R1-R7 traceability in progress/impl_template-editor-content-animation.md, and runs lint/build. Once all tasks are [x], leader moves status to in_review and hands off to reviewer.

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
