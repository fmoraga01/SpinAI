# Current session state

- **Feature:** rich-text-formatting-proyectos
- **Status:** in_review (veredicto de reviewer: APPROVED, pendiente de que
  `leader`/humano mueva a `done`)
- **Started:** 2026-07-30
- **Role active:** reviewer (terminado)
- **Next step:** `reviewer` aprobó — ver
  `progress/review_rich-text-formatting-proyectos.md` para el detalle
  completo (pass/fail por checkpoint de `CHECKPOINTS.md`, verificación
  independiente de `lib/richText.ts` incluida ejecución manual de casos de
  inyección XSS, `npm run verify` corrido de forma independiente, 36/36
  tests). Único punto no bloqueante: T9 de `tasks.md` (QA end-to-end en
  navegador) queda `[ ]`, mismo bloqueo de sandbox (sin PIN real/browser
  tool) ya aceptado en 4 features previas — debe viajar a
  `progress/history.md` cuando `leader` cierre. `leader`/humano decide mover
  `feature_list.json` a `done` (reviewer no cambia el status él mismo).
  Commit revisado: `8d9ba82` en `dev`.

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
