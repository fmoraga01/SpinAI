import { SlideFont } from "./types";

export interface FontConfig {
  label: string;
  sample: string;
  titleFamily: string;
  bodyFamily: string;
  titleWeight: number;
  titleTracking: string;
  bodyWeight: number;
  titleSize?: string;
  numberSize?: string;
  bodySize?: string;
  syntaxTitle?: string;
  syntaxNumber?: string;
  syntaxPalette?: string[];
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
    syntaxTitle: "#DCDCAA",
    syntaxNumber: "#B5CEA8",
    syntaxPalette: ["#9CDCFE", "#CE9178", "#C586C0", "#4EC9B0"],
  },
  serif: {
    label: "Innovadora",
    sample: "Aa",
    titleFamily: "var(--font-honk), 'Honk', sans-serif",
    bodyFamily: "var(--font-honk), 'Honk', sans-serif",
    titleWeight: 400,
    titleTracking: "0em",
    bodyWeight: 400,
    titleSize: "52px",
    numberSize: "clamp(38px, 4.5vw, 56px)",
    bodySize: "clamp(22px, 2.6vw, 32px)",
  },
  impact: {
    label: "Retro-digital",
    sample: "Aa",
    titleFamily: "var(--font-retro), 'Bitcount Grid Double', monospace",
    bodyFamily: "var(--font-retro), 'Bitcount Grid Double', monospace",
    titleWeight: 400,
    titleTracking: "0em",
    bodyWeight: 400,
    titleSize: "53px",
    numberSize: "clamp(38px, 4.5vw, 56px)",
    bodySize: "clamp(22px, 2.6vw, 32px)",
  },
};

export const FONT_ORDER: SlideFont[] = ["sans", "mono", "serif", "impact"];
