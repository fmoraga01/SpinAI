# Current session state

- **Feature:** rich-text-formatting-proyectos
- **Status:** in_progress (dejado tal cual por `implementer` — `leader` es
  quien pasa a `in_review`)
- **Started:** 2026-07-30
- **Role active:** implementer — terminó, `tasks.md` T1-T8 y T10 en `[x]`
  (T9, QA manual end-to-end en navegador, queda `[ ]` con nota explícita:
  parcialmente cubierta vía Vitest/lectura de código, sin browser tool/PIN
  real en este sandbox — ver detalle en
  `progress/impl_rich-text-formatting-proyectos.md`).
- **Next step:** listo para pasar a `in_review` — `reviewer` valida contra
  `CHECKPOINTS.md` y la traceability R1-R20 de
  `progress/impl_rich-text-formatting-proyectos.md`. `npm run verify` en
  verde (lint + build + 36 tests + check-sdd-state). Cambios commiteados y
  pusheados a `dev`.

Summary of the spec's key decision (for quick orientation): markdown-style
plain-text syntax edited via a toolbar of buttons wrapping/prefixing the
native `<textarea>` selection (not a WYSIWYG/contentEditable editor), stored
as-is in the existing `text` columns (no schema change), rendered in the
read-only views (`ProjectDrawer.tsx`, `ProjectTimeline.tsx`) through a new
pure parser `lib/richText.ts` that escapes all user text via the existing
`escapeHtml()` before emitting a fixed, parser-controlled set of HTML tags
— never passing raw/unsanitized user-supplied HTML through
`dangerouslySetInnerHTML`. Underline uses a custom `++text++` marker
(no CommonMark/GFM equivalent, and deliberately not raw `<u>` HTML from the
user, to avoid opening any raw-HTML-passthrough exception).
