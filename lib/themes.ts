import { SlideTheme } from "./types";

export interface ThemeConfig {
  label: string;
  bg: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  cardBg: string;
  cardBorder: string;
  titleColor: string;
  textColor: string;
  textSecondary: string;
  animVariant: "tokens" | "neural" | "constellation" | "synaptic";
  badgeText: string;
}

export const THEMES: Record<SlideTheme, ThemeConfig> = {
  default: {
    label: "Predeterminado",
    bg: "#0d0f1a",
    accent: "#2C40FF",
    accentBg: "#2C40FF15",
    accentBorder: "#2C40FF33",
    cardBg: "#111827",
    cardBorder: "#1f2333",
    titleColor: "#ffffff",
    textColor: "#f3f4f6",
    textSecondary: "#9ca3af",
    animVariant: "tokens",
    badgeText: "#fff",
  },
  minimal: {
    label: "Minimalista",
    bg: "#050505",
    accent: "#e5e7eb",
    accentBg: "#ffffff08",
    accentBorder: "#ffffff22",
    cardBg: "#0f0f0f",
    cardBorder: "#1f1f1f",
    titleColor: "#ffffff",
    textColor: "#e5e7eb",
    textSecondary: "#9ca3af",
    animVariant: "neural",
    badgeText: "#111827",
  },
  blueprint: {
    label: "CoE AI",
    bg: "#060f1e",
    accent: "#38BDF8",
    accentBg: "#38BDF808",
    accentBorder: "#38BDF833",
    cardBg: "#0a1628",
    cardBorder: "#1a3050",
    titleColor: "#f0f9ff",
    textColor: "#e0f2fe",
    textSecondary: "#7dd3fc",
    animVariant: "constellation",
    badgeText: "#fff",
  },
  warm: {
    label: "HenryStyle",
    bg: "#0c0800",
    accent: "#F59E0B",
    accentBg: "#F59E0B08",
    accentBorder: "#F59E0B33",
    cardBg: "#140e00",
    cardBorder: "#2a1f00",
    titleColor: "#fffbeb",
    textColor: "#fef3c7",
    textSecondary: "#d97706",
    animVariant: "synaptic",
    badgeText: "#fff",
  },
};

export const THEME_ORDER: SlideTheme[] = ["default", "minimal", "blueprint", "warm"];
