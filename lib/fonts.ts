import { SlideFont } from "./types";

export interface FontConfig {
  label: string;
  sample: string;
  titleFamily: string;
  bodyFamily: string;
  titleWeight: number;
  titleTracking: string;
  bodyWeight: number;
}

export const FONTS: Record<SlideFont, FontConfig> = {
  sans: {
    label: "Neutro",
    sample: "Aa",
    titleFamily: "var(--font-inter), Inter, sans-serif",
    bodyFamily: "var(--font-inter), Inter, sans-serif",
    titleWeight: 700,
    titleTracking: "-0.02em",
    bodyWeight: 500,
  },
  mono: {
    label: "Técnica",
    sample: "Aa",
    titleFamily: "var(--font-mono), 'JetBrains Mono', monospace",
    bodyFamily: "var(--font-mono), 'JetBrains Mono', monospace",
    titleWeight: 700,
    titleTracking: "-0.01em",
    bodyWeight: 500,
  },
  serif: {
    label: "Editorial",
    sample: "Aa",
    titleFamily: "var(--font-serif), 'Playfair Display', Georgia, serif",
    bodyFamily: "var(--font-inter), Inter, sans-serif",
    titleWeight: 700,
    titleTracking: "0em",
    bodyWeight: 400,
  },
  impact: {
    label: "Impacto",
    sample: "Aa",
    titleFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
    bodyFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
    titleWeight: 700,
    titleTracking: "-0.03em",
    bodyWeight: 700,
  },
};

export const FONT_ORDER: SlideFont[] = ["sans", "mono", "serif", "impact"];
