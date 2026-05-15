"use client";

import { useRef, useEffect } from "react";

const TOKEN_LABELS = [
  "→", "◎", "01", "10", "∇", "λ", "∑", "⊕", "∞",
  "T+1", "n", "∅", "⟩", "⟨", "AI", "LLM", "ctx",
  "emb", "attn", "0.7", "1.0", "res",
];

const PRIMARY = "#2C40FF";

interface Token {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  w: number;
  alpha: number;
  alphaDir: number;
  alphaSpeed: number;
}

function makeTokens(count: number, W: number, H: number): Token[] {
  return Array.from({ length: count }, () => {
    const text = TOKEN_LABELS[Math.floor(Math.random() * TOKEN_LABELS.length)];
    const w = text.length * 8 + 20;
    const speed = 0.12 + Math.random() * 0.18;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      text,
      w,
      alpha: 0.08 + Math.random() * 0.14,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      alphaSpeed: 0.0004 + Math.random() * 0.0006,
    };
  });
}

export default function SlideBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokensRef = useRef<Token[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      if (tokensRef.current.length === 0) {
        tokensRef.current = makeTokens(28, W, H);
      }
    }

    resize();

    function frame() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const tokens = tokensRef.current;
      const CONNECTION_DIST = 140;

      // Update positions
      for (const t of tokens) {
        t.x += t.vx;
        t.y += t.vy;
        if (t.x < -80) t.x = W + 40;
        if (t.x > W + 80) t.x = -40;
        if (t.y < -40) t.y = H + 20;
        if (t.y > H + 40) t.y = -20;

        t.alpha += t.alphaDir * t.alphaSpeed;
        if (t.alpha > 0.22) { t.alpha = 0.22; t.alphaDir = -1; }
        if (t.alpha < 0.04) { t.alpha = 0.04; t.alphaDir = 1; }
      }

      // Draw connections (attention lines)
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const a = tokens[i];
          const b = tokens[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const strength = (1 - dist / CONNECTION_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(44, 64, 255, ${strength})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // Draw tokens
      ctx.font = "500 10px 'Inter', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const H_TOKEN = 18;
      const RADIUS = 4;

      for (const t of tokens) {
        const { x, y, w, text, alpha } = t;
        const half = w / 2;

        // Background pill
        ctx.beginPath();
        ctx.roundRect(x - half, y - H_TOKEN / 2, w, H_TOKEN, RADIUS);
        ctx.fillStyle = `rgba(44, 64, 255, ${alpha * 0.35})`;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.roundRect(x - half, y - H_TOKEN / 2, w, H_TOKEN, RADIUS);
        ctx.strokeStyle = `rgba(44, 64, 255, ${alpha * 1.6})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();

        // Text
        ctx.fillStyle = `rgba(44, 64, 255, ${alpha * 2.2})`;
        ctx.fillText(text, x, y);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
