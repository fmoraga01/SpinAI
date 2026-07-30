import { describe, expect, it } from "vitest";
import { renderFormattedText } from "./richText";

// Conjunto fijo y cerrado de etiquetas que el parser puede emitir (R16).
// Incluye "br": design.md especifica que las líneas consecutivas de cita se
// unen con un <br> literal hardcodeado por el propio parser (nunca derivado
// de texto del usuario) — misma garantía de seguridad que el resto del set
// fijo, aunque R16 no lo liste explícitamente por nombre.
const ALLOWED_TAGS = new Set(["strong", "em", "u", "s", "ul", "ol", "li", "blockquote", "br"]);

function tagsIn(html: string): string[] {
  const matches = html.matchAll(/<\/?([a-zA-Z0-9]+)/g);
  return [...matches].map((m) => m[1].toLowerCase());
}

describe("renderFormattedText", () => {
  it("negrita: envuelve **texto** en <strong>", () => {
    expect(renderFormattedText("**hola**")).toBe("<strong>hola</strong>");
  });

  it("cursiva: envuelve *texto* en <em>", () => {
    expect(renderFormattedText("*hola*")).toBe("<em>hola</em>");
  });

  it("subrayado: envuelve ++texto++ en <u> (convención propia, no HTML crudo)", () => {
    expect(renderFormattedText("++hola++")).toBe("<u>hola</u>");
  });

  it("tachado: envuelve ~~texto~~ en <s>", () => {
    expect(renderFormattedText("~~hola~~")).toBe("<s>hola</s>");
  });

  it("lista con viñeta: agrupa líneas '- ' consecutivas en un solo <ul>", () => {
    expect(renderFormattedText("- uno\n- dos")).toBe("<ul><li>uno</li><li>dos</li></ul>");
  });

  it("lista numerada: agrupa líneas '1. ' consecutivas en un solo <ol>", () => {
    expect(renderFormattedText("1. uno\n1. dos")).toBe("<ol><li>uno</li><li>dos</li></ol>");
  });

  it("cita: agrupa líneas '> ' consecutivas en un solo <blockquote>", () => {
    expect(renderFormattedText("> uno\n> dos")).toBe("<blockquote>uno<br>dos</blockquote>");
  });

  it("texto plano sin marcadores: devuelve el texto escapado, sin etiquetas nuevas (R14)", () => {
    expect(renderFormattedText("hola mundo")).toBe("hola mundo");
    expect(renderFormattedText("línea 1\nlínea 2")).toBe("línea 1\nlínea 2");
  });

  it("combinación de negrita + cursiva en la misma línea", () => {
    expect(renderFormattedText("**negrita** y *cursiva*")).toBe(
      "<strong>negrita</strong> y <em>cursiva</em>"
    );
  });

  it("marcador desbalanceado no lanza excepción y muestra los asteriscos literales (R19)", () => {
    expect(() => renderFormattedText("**sin cerrar")).not.toThrow();
    expect(renderFormattedText("**sin cerrar")).toBe("**sin cerrar");
  });

  it("<script>alert(1)</script> sale completamente escapado, sin etiqueta <script> real (R15)", () => {
    const out = renderFormattedText("<script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("</script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("<img src=x onerror=alert(1)> sale completamente escapado, sin etiqueta <img> real (R15)", () => {
    const out = renderFormattedText("<img src=x onerror=alert(1)>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });

  it("intento de inyección combinado con marcadores de formato reales sigue sin producir etiquetas ajenas al set fijo", () => {
    const out = renderFormattedText("**<img src=x onerror=alert(1)>**");
    expect(tagsIn(out).every((tag) => ALLOWED_TAGS.has(tag))).toBe(true);
    expect(out).toBe("<strong>&lt;img src=x onerror=alert(1)&gt;</strong>");
  });

  it("nunca emite ninguna etiqueta fuera del set fijo de R16, sobre una combinación de los 7 tipos de formato", () => {
    const raw = [
      "**negrita** *cursiva* ++subrayado++ ~~tachado~~",
      "- viñeta uno",
      "- viñeta dos",
      "1. numerada uno",
      "1. numerada dos",
      "> cita uno",
      "> cita dos",
      "<script>alert(document.cookie)</script>",
    ].join("\n");
    const out = renderFormattedText(raw);
    const tags = tagsIn(out);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.every((tag) => ALLOWED_TAGS.has(tag))).toBe(true);
    expect(out).not.toContain("<script>");
  });
});
