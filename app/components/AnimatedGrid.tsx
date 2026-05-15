"use client";

import { useEffect, useRef } from "react";

const CELL_W = 34;
const CELL_H = 26;
const GAP = 4;
const COLS = 16;
const SCAN_LINE_EVERY = 6;

interface Column {
  phase: number;
  speed: number;
  baseHeight: number;
  amplitude: number;
}

export default function AnimatedGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Each column oscillates around a base height (taller on the right)
    const columns: Column[] = Array.from({ length: COLS }, (_, i) => {
      const t = i / (COLS - 1); // 0 = leftmost, 1 = rightmost
      return {
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.45,
        baseHeight: 0.08 + t * t * 0.88, // quadratic — right cols much taller
        amplitude: 0.06 + Math.random() * 0.12,
      };
    });

    let animId: number;
    let w = 0;
    let h = 0;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw(time: number) {
      const elapsed = time / 1000;
      ctx.clearRect(0, 0, w, h);

      const totalCellW = COLS * (CELL_W + GAP) - GAP;
      const startX = w - totalCellW;

      for (let col = 0; col < COLS; col++) {
        const c = columns[col];
        const heightFactor = Math.max(
          0.05,
          Math.min(1, c.baseHeight + Math.sin(elapsed * c.speed + c.phase) * c.amplitude)
        );

        const totalRows = Math.floor(h / (CELL_H + GAP));
        const activeRows = Math.max(1, Math.round(heightFactor * totalRows));
        const x = startX + col * (CELL_W + GAP);

        for (let row = 0; row < activeRows; row++) {
          const y = h - (row + 1) * (CELL_H + GAP);
          if (y < 0) continue;

          // 0 = bottom row, 1 = top row
          const rowRatio = row / activeRows;

          // Base cell color — brighter toward top
          const alpha = 0.18 + rowRatio * 0.55;
          const isHighlight = rowRatio > 0.75;

          if (isHighlight) {
            ctx.fillStyle = `rgba(44, 64, 255, ${alpha + 0.15})`;
          } else {
            // Dark navy base
            const r = Math.round(10 + rowRatio * 20);
            const g = Math.round(16 + rowRatio * 30);
            const b = Math.round(60 + rowRatio * 120);
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          }

          // Cell background
          ctx.beginPath();
          (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, CELL_W, CELL_H, 3);
          ctx.fill();

          // Scan lines (horizontal stripes inside each cell)
          ctx.fillStyle = "rgba(0,0,0,0.28)";
          for (let line = SCAN_LINE_EVERY; line < CELL_H; line += SCAN_LINE_EVERY) {
            ctx.fillRect(x + 1, y + line, CELL_W - 2, 1);
          }

          // Bright border on highlight cells
          if (isHighlight) {
            ctx.strokeStyle = `rgba(44, 64, 255, ${rowRatio * 0.7})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(x, y, CELL_W, CELL_H, 3);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        maskImage:
          "linear-gradient(to left, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.3) 65%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to left, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.3) 65%, transparent 100%)",
        pointerEvents: "none",
      }}
    />
  );
}
