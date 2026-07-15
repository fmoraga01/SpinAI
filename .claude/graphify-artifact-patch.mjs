#!/usr/bin/env node
// Builds a self-contained, Artifact-publishable copy of graphify-out/graph.html:
//   1. Inlines the vis-network library (graph.html loads it from unpkg.com, which
//      Artifacts' strict CSP blocks — no outbound requests are allowed there).
//   2. Adds a collapse toggle for the right-hand sidebar (search/info/legend/stats),
//      since the graph canvas is flex:1 and reclaims the freed width automatically.
//
// Usage: node .claude/graphify-artifact-patch.mjs [inputHtml] [outputHtml]
//   defaults: graphify-out/graph.html -> graphify-out/graph-standalone.html
//
// Re-run this after every `graphify update .` before republishing the Artifact —
// graphify regenerates graph.html from scratch and knows nothing about this patch.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const inputPath = process.argv[2] ?? "graphify-out/graph.html";
const outputPath = process.argv[3] ?? "graphify-out/graph-standalone.html";

const html = readFileSync(inputPath, "utf8");

const cdnMatch = html.match(
  /<script src="https:\/\/unpkg\.com\/vis-network@([\d.]+)\/standalone\/umd\/vis-network\.min\.js"[\s\S]*?<\/script>/
);
if (!cdnMatch) {
  console.error("Could not find the vis-network CDN <script> tag in", inputPath);
  process.exit(1);
}
const version = cdnMatch[1];

// unpkg.com is blocked by this environment's network policy; the npm registry
// isn't, so fetch the exact same version's tarball from there instead.
const workDir = mkdtempSync(path.join(tmpdir(), "vis-network-"));
execFileSync("npm", ["pack", `vis-network@${version}`, "--pack-destination", workDir], { stdio: "ignore" });
execFileSync("tar", ["-xzf", `vis-network-${version}.tgz`, "package/standalone/umd/vis-network.min.js"], {
  cwd: workDir,
  stdio: "ignore",
});
const lib = readFileSync(path.join(workDir, "package/standalone/umd/vis-network.min.js"), "utf8");

let out = html.replace(cdnMatch[0], `<script>\n${lib}\n</script>`);

const cssMarker = "#legend-controls label:hover { color: #e0e0e0; }";
if (!out.includes(cssMarker)) {
  console.error("CSS anchor not found — graphify's template may have changed, review this script.");
  process.exit(1);
}
out = out.replace(
  cssMarker,
  cssMarker +
    `
  #sidebar { transition: width 200ms ease, opacity 200ms ease; }
  #sidebar.collapsed { width: 0; opacity: 0; pointer-events: none; overflow: hidden; }
  #sidebar-toggle {
    position: fixed; top: 12px; right: 12px; z-index: 50;
    width: 30px; height: 30px; border-radius: 6px;
    background: #1a1a2e; border: 1px solid #3a3a5e; color: #e0e0e0;
    cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center;
    transition: border-color 150ms, color 150ms, right 200ms ease;
  }
  #sidebar-toggle:hover { border-color: #4E79A7; color: #fff; }
  #sidebar.collapsed ~ #sidebar-toggle { right: 12px; }
  #sidebar:not(.collapsed) ~ #sidebar-toggle { right: 292px; }`
);

out = out.replace(
  '<div id="graph"></div>',
  '<div id="graph"></div>\n<button id="sidebar-toggle" title="Colapsar panel" onclick="toggleSidebar()">‹</button>'
);

out = out.replace(
  "</body>",
  `<script>
function toggleSidebar() {
  var sb = document.getElementById("sidebar");
  var btn = document.getElementById("sidebar-toggle");
  var collapsed = sb.classList.toggle("collapsed");
  btn.textContent = collapsed ? "›" : "‹";
  btn.title = collapsed ? "Mostrar panel" : "Colapsar panel";
  setTimeout(function () {
    if (typeof network !== "undefined" && network) {
      network.setSize("100%", "100%");
      network.redraw();
    }
  }, 220);
}
</script>
</body>`
);

writeFileSync(outputPath, out);
console.log(`Wrote ${outputPath} (${out.length.toLocaleString()} bytes)`);
