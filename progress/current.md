# Current session state

- **Feature:** rich-text-formatting-proyectos
- **Status:** spec_ready
- **Started:** 2026-07-30
- **Role active:** none (waiting on human approval gate)
- **Next step:** Human reviews `specs/rich-text-formatting-proyectos/{requirements,design,tasks}.md`
  and `feature_list.json`. On explicit approval, `leader` sets status to
  `in_progress` and invokes `implementer` to work through `tasks.md`
  top to bottom (T1-T10). Nothing has been implemented yet — spec only.

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
