// Mapeo de creatorSlug (Artificial Analysis) al slug del icono correspondiente
// en simple-icons (cdn.simpleicons.org/{slug}/{color}). Si un lab no está acá,
// se intenta usar su propio slug tal cual antes de caer al fallback de iniciales.
export const COMPANY_LOGO_SLUGS: Record<string, string> = {
  openai: "openai",
  google: "google",
  "google-deepmind": "google",
  deepmind: "google",
  anthropic: "anthropic",
  meta: "meta",
  "meta-ai": "meta",
  "meta-llama": "meta",
  mistral: "mistralai",
  mistralai: "mistralai",
  "mistral-ai": "mistralai",
  xai: "xai",
  "x-ai": "xai",
  deepseek: "deepseek",
  alibaba: "alibabacloud",
  qwen: "alibabacloud",
  amazon: "amazon",
  microsoft: "microsoft",
  nvidia: "nvidia",
  ibm: "ibm",
  perplexity: "perplexity",
  cohere: "cohere",
  bytedance: "bytedance",
};

export function companyLogoUrl(creatorSlug: string | null, color = "ffffff"): string | null {
  if (!creatorSlug) return null;
  const iconSlug = COMPANY_LOGO_SLUGS[creatorSlug] ?? creatorSlug;
  return `https://cdn.simpleicons.org/${iconSlug}/${color}`;
}
