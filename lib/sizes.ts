import { SlideSize } from "./types";

export interface SizeConfig {
  label: string;
  key: string;
  titleScale: number;
  numberScale: number;
  bodyScale: number;
}

export const SIZES: Record<SlideSize, SizeConfig> = {
  sm: { label: "Compacto", key: "S", titleScale: 0.78, numberScale: 0.78, bodyScale: 0.78 },
  md: { label: "Normal",   key: "M", titleScale: 1.00, numberScale: 1.00, bodyScale: 1.00 },
  lg: { label: "Grande",   key: "L", titleScale: 1.25, numberScale: 1.25, bodyScale: 1.25 },
};

export const SIZE_ORDER: SlideSize[] = ["sm", "md", "lg"];

function scaleClamp(clampStr: string, factor: number): string {
  return clampStr.replace(
    /clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px\s*\)/,
    (_, min, vw, max) =>
      `clamp(${Math.round(parseFloat(min) * factor)}px, ${(parseFloat(vw) * factor).toFixed(2)}vw, ${Math.round(parseFloat(max) * factor)}px)`
  );
}

function scalePx(pxStr: string, factor: number): string {
  return pxStr.replace(/^([\d.]+)px$/, (_, n) => `${Math.round(parseFloat(n) * factor)}px`);
}

export function scaleSize(value: string, factor: number): string {
  if (value.startsWith("clamp(")) return scaleClamp(value, factor);
  if (value.endsWith("px")) return scalePx(value, factor);
  return value;
}
# test Tue Jun 23 21:22:22 UTC 2026
