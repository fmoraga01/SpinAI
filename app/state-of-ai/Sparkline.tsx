"use client";

import { useState } from "react";

const MARK = "#2C40FF";

export interface SparklinePoint {
  value: number;
  label: string;
  partial?: boolean; // período todavía en curso — el valor no es comparable 1:1 con los cerrados
}

export default function Sparkline({
  points, width = 250, height = 32, ariaLabel,
}: { points: SparklinePoint[]; width?: number; height?: number; ariaLabel?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const coords = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  const linePath = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${coords.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} L0,${height} Z`;
  const lastSegment = coords.slice(-3).map((p) => `${p.x},${p.y}`).join(" ");
  const last = coords[coords.length - 1];
  const lastIsPartial = points[points.length - 1].partial === true;
  const active = hovered !== null ? coords[hovered] : null;

  const xTranslate = hovered === 0 ? "0%" : hovered === points.length - 1 ? "-100%" : "-50%";

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role={ariaLabel ? "img" : "presentation"}
        aria-hidden={ariaLabel ? undefined : true}
        aria-label={ariaLabel}
        style={{ display: "block", overflow: "visible" }}
      >
        <path d={areaPath} fill={MARK} opacity={0.08} />
        <polyline points={linePath} fill="none" stroke="var(--color-border-bright)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <polyline
          points={lastSegment}
          fill="none"
          stroke={MARK}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={lastIsPartial ? "1 4" : undefined}
          opacity={lastIsPartial ? 0.6 : 1}
        />
        <circle cx={last.x} cy={last.y} r={5} fill="var(--color-surface-elevated)" />
        <circle cx={last.x} cy={last.y} r={3.5} fill={MARK} opacity={lastIsPartial ? 0.6 : 1} />
        {active && hovered !== points.length - 1 && (
          <>
            <circle cx={active.x} cy={active.y} r={5} fill="var(--color-surface-elevated)" />
            <circle cx={active.x} cy={active.y} r={3.5} fill={MARK} />
          </>
        )}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={12}
            fill="transparent"
            tabIndex={0}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          />
        ))}
      </svg>
      {active && hovered !== null && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            left: `${(active.x / width) * 100}%`,
            top: active.y,
            transform: `translate(${xTranslate}, calc(-100% - 8px))`,
            padding: "5px 9px",
            background: "#1A1D2E",
            border: "1px solid var(--color-border-bright)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 16px -6px rgba(0,0,0,0.6)",
            fontSize: 11,
            fontWeight: 500,
            color: "#fff",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          <strong style={{ fontVariantNumeric: "tabular-nums" }}>{points[hovered].value}</strong>{" "}
          <span style={{ textTransform: "capitalize", color: "var(--color-tertiary)" }}>{points[hovered].label}</span>
          {points[hovered].partial && <span style={{ color: "var(--color-tertiary)" }}> (parcial)</span>}
        </div>
      )}
    </div>
  );
}
