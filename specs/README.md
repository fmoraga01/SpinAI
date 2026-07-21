# specs/

One directory per feature going through the SDD process defined in
`docs/specs.md`. Directory name matches the feature's `id` in
`feature_list.json`.

```
specs/<feature-id>/
├── requirements.md   # EARS notation, numbered R1, R2, ...
├── design.md         # technical approach + discarded alternatives
└── tasks.md          # ordered implementation checklist
```

## `feature_list.json` entry schema

```json
{
  "id": "kebab-case-id",
  "title": "Human-readable title",
  "status": "pending | spec_ready | in_progress | in_review | done",
  "created": "YYYY-MM-DD",
  "spec_dir": "specs/<feature-id>/"
}
```

Full lifecycle, roles, and gate definitions: see `docs/specs.md`.
Progress tracking during and after implementation: see `progress/`.
