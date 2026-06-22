"use client";

import { useRef, useEffect } from "react";

const TOKEN_LABELS = [
  "→", "◎", "01", "10", "∇", "λ", "∑", "⊕", "∞",
  "T+1", "n", "∅", "⟩", "⟨", "AI", "LLM", "ctx",
  "emb", "attn", "0.7", "1.0", "res",
];

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

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

interface Props {
  accent?: string;
  variant?: "tokens" | "grid" | "none";
}

export default function SlideBackground({ accent = "#2C40FF", variant = "tokens" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokensRef = useRef<Token[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const [r, g, b] = hexToRgb(accent);

    function resize() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      if (variant === "tokens" && tokensRef.current.length === 0) {
        tokensRef.current = makeTokens(28, W, H);
      }
    }

    resize();

    function frameTokens() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const tokens = tokensRef.current;
      const CONNECTION_DIST = 140;

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

      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          const a = tokens[i];
          const bk = tokens[j];
          const dx = a.x - bk.x;
          const dy = a.y - bk.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const strength = (1 - dist / CONNECTION_DIST) * 0.12;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(bk.x, bk.y);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${strength})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      ctx.font = "500 10px 'Inter', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const H_TOKEN = 18;
      const RADIUS = 4;

      for (const t of tokens) {
        const { x, y, w, text, alpha } = t;
        const half = w / 2;
        ctx.beginPath();
        ctx.roundRect(x - half, y - H_TOKEN / 2, w, H_TOKEN, RADIUS);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`;
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(x - half, y - H_TOKEN / 2, w, H_TOKEN, RADIUS);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 1.6})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 2.2})`;
        ctx.fillText(text, x, y);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(frameTokens);
    }

    function frameGrid() {
      if (!canvas) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const CELL = 48;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.07)`;
      ctx.lineWidth = 0.5;

      for (let x = 0; x <= W; x += CELL) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += CELL) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // dot at every intersection
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.18)`;
      for (let x = 0; x <= W; x += CELL) {
        for (let y = 0; y <= H; y += CELL) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    if (variant === "tokens") {
      rafRef.current = requestAnimationFrame(frameTokens);
    } else if (variant === "grid") {
      frameGrid();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [accent, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  if (variant === "none") return null;

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
