@AGENTS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- graphify-out/ is gitignored and regenerated per environment, not shipped with the repo. At the start of a new session, if graphify-out/graph.json doesn't exist yet, run `graphify update .` once before relying on any of the rules below — otherwise there's nothing to query and codebase exploration silently falls back to raw grep/read.
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- Before publishing graphify-out/graph.html as an Artifact (or re-publishing after `graphify update .` changed it), run `node .claude/graphify-artifact-patch.mjs` first and publish the resulting graphify-out/graph-standalone.html instead. It inlines the vis-network library (graph.html's CDN `<script src>` is blocked by the Artifact sandbox's CSP) and adds a collapsible right-hand sidebar toggle. Republish to the same Artifact URL the user already has rather than minting a new one, unless asked otherwise.

## Feature flags

Flags live in `lib/featureFlags.ts` (`FEATURE_FLAGS` object, one boolean per flag). To show/hide a flagged section, flip its boolean there — that's the only code change needed, since every gate (nav link + the page itself) reads from that same constant.

- `proyectosStatusVisible` (default `false`): gates the "Status de Proyectos" section — the nav link in `app/components/Nav.tsx` and the `/proyectos` page itself (`app/proyectos/page.tsx`, shows "Esta sección no está disponible por el momento." when off). Hidden 2026-07-31, re-shown 2026-07-31 at the user's request (currently `true`). When the user asks to show/activate/hide "Status de Proyectos" (or "proyectos"), set this boolean accordingly, commit straight to `dev` (config change, fast path per `docs/specs.md` — no spec/feature_list.json entry needed), and push. Do not ask the user where the flag lives — this note is the answer.
