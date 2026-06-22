"use client";

import { useRef, useEffect } from "react";

// ─── Shared helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ─── Tokens (Default) ────────────────────────────────────────────────────────

const TOKEN_LABELS = [
  "→", "◎", "01", "10", "∇", "λ", "∑", "⊕", "∞",
  "T+1", "n", "∅", "⟩", "⟨", "AI", "LLM", "ctx",
  "emb", "attn", "0.7", "1.0", "res",
];

interface Particle {
  x: number; y: number; vx: number; vy: number;
  text: string; w: number;
  alpha: number; alphaDir: number; alphaSpeed: number;
}

function makeTokens(count: number, W: number, H: number): Particle[] {
  return Array.from({ length: count }, () => {
    const text = TOKEN_LABELS[Math.floor(Math.random() * TOKEN_LABELS.length)];
    const speed = 0.12 + Math.random() * 0.18;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      text, w: text.length * 8 + 20,
      alpha: 0.08 + Math.random() * 0.14,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      alphaSpeed: 0.0004 + Math.random() * 0.0006,
    };
  });
}

function drawTokens(
  ctx: CanvasRenderingContext2D, dpr: number,
  canvas: HTMLCanvasElement, tokens: Particle[],
  r: number, g: number, b: number,
): void {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  const CONN = 140;
  for (const t of tokens) {
    t.x += t.vx; t.y += t.vy;
    if (t.x < -80) t.x = W + 40; if (t.x > W + 80) t.x = -40;
    if (t.y < -40) t.y = H + 20; if (t.y > H + 40) t.y = -20;
    t.alpha += t.alphaDir * t.alphaSpeed;
    if (t.alpha > 0.22) { t.alpha = 0.22; t.alphaDir = -1; }
    if (t.alpha < 0.04) { t.alpha = 0.04; t.alphaDir = 1; }
  }

  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      const a = tokens[i], b2 = tokens[j];
      const dx = a.x - b2.x, dy = a.y - b2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONN) {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${(1 - dist / CONN) * 0.12})`;
        ctx.lineWidth = 0.6; ctx.stroke();
      }
    }
  }

  ctx.font = "500 10px 'Inter', monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const t of tokens) {
    const { x, y, w, text, alpha } = t;
    const half = w / 2;
    ctx.beginPath(); ctx.roundRect(x - half, y - 9, w, 18, 4);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.35})`; ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - half, y - 9, w, 18, 4);
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 1.6})`; ctx.lineWidth = 0.7; ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 2.2})`; ctx.fillText(text, x, y);
  }
  ctx.restore();
}

// ─── Neural Pulse (Minimal) ───────────────────────────────────────────────────

interface Neuron {
  x: number; y: number;
  alpha: number; alphaDir: number; alphaSpeed: number;
  fireTimer: number; firing: boolean; fireAlpha: number;
}

function makeNeurons(count: number, W: number, H: number): Neuron[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    alpha: 0.05 + Math.random() * 0.1,
    alphaDir: Math.random() > 0.5 ? 1 : -1,
    alphaSpeed: 0.0002 + Math.random() * 0.0003,
    fireTimer: Math.random() * 400,
    firing: false, fireAlpha: 0,
  }));
}

function drawNeural(
  ctx: CanvasRenderingContext2D, dpr: number,
  canvas: HTMLCanvasElement, neurons: Neuron[],
  r: number, g: number, b: number,
): void {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(dpr, dpr);

  for (const n of neurons) {
    n.alpha += n.alphaDir * n.alphaSpeed;
    if (n.alpha > 0.15) { n.alpha = 0.15; n.alphaDir = -1; }
    if (n.alpha < 0.03) { n.alpha = 0.03; n.alphaDir = 1; }
    n.fireTimer--;
    if (n.fireTimer <= 0 && !n.firing) {
      n.firing = true; n.fireAlpha = 0.7;
      n.fireTimer = 200 + Math.random() * 600;
    }
    if (n.firing) {
      n.fireAlpha -= 0.012;
      if (n.fireAlpha <= 0) { n.fireAlpha = 0; n.firing = false; }
    }
  }

  // Connections — only between nearby neurons, glow when either is firing
  const CONN = 180;
  for (let i = 0; i < neurons.length; i++) {
    for (let j = i + 1; j < neurons.length; j++) {
      const a = neurons[i], bk = neurons[j];
      const dx = a.x - bk.x, dy = a.y - bk.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONN) {
        const fireBoost = Math.max(a.fireAlpha, bk.fireAlpha) * 0.3;
        const str = (1 - dist / CONN) * 0.06 + fireBoost;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bk.x, bk.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${str})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }

  // Neurons
  for (const n of neurons) {
    const alpha = n.alpha + (n.firing ? n.fireAlpha * 0.6 : 0);

    // Outer glow ring when firing
    if (n.firing && n.fireAlpha > 0.1) {
      const ringR = 6 + (0.7 - n.fireAlpha) * 18;
      ctx.beginPath(); ctx.arc(n.x, n.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${n.fireAlpha * 0.25})`;
      ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.beginPath(); ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill();
  }

  ctx.restore();
}

// ─── Radar Scan (Blueprint) ───────────────────────────────────────────────────

interface RadarPulse { x: number; y: number; radius: number; alpha: number; }

let radarY = 0;
const radarPulses: RadarPulse[] = [];

function drawRadar(
  ctx: CanvasRenderingContext2D, dpr: number,
  canvas: HTMLCanvasElement,
  r: number, g: number, b: number,
): void {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(dpr, dpr);

  const CELL = 52;
  const SCAN_SPEED = 0.6;
  const SCAN_BAND = 60;

  radarY = (radarY + SCAN_SPEED) % (H + SCAN_BAND);

  // Grid lines
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += CELL) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.06)`; ctx.stroke();
  }
  for (let y = 0; y <= H; y += CELL) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.06)`; ctx.stroke();
  }

  // Static dots at intersections
  for (let x = 0; x <= W; x += CELL) {
    for (let y = 0; y <= H; y += CELL) {
      ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.14)`; ctx.fill();
    }
  }

  // Spawn pulses when scan passes an intersection
  for (let x = 0; x <= W; x += CELL) {
    for (let y = 0; y <= H; y += CELL) {
      const dist = radarY - y;
      if (dist >= 0 && dist < SCAN_SPEED + 1) {
        if (Math.random() > 0.35) {
          radarPulses.push({ x, y, radius: 0, alpha: 0.7 });
        }
      }
    }
  }

  // Scan band gradient
  const grad = ctx.createLinearGradient(0, radarY - SCAN_BAND, 0, radarY);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.6, `rgba(${r},${g},${b},0.04)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0.12)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, radarY - SCAN_BAND, W, SCAN_BAND);

  // Scan leading edge
  ctx.beginPath(); ctx.moveTo(0, radarY); ctx.lineTo(W, radarY);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`; ctx.lineWidth = 1; ctx.stroke();

  // Pulses
  for (let i = radarPulses.length - 1; i >= 0; i--) {
    const p = radarPulses[i];
    p.radius += 0.8; p.alpha -= 0.012;
    if (p.alpha <= 0) { radarPulses.splice(i, 1); continue; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${p.alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
  }

  ctx.restore();
}

// ─── Synaptic Flow (Warm) ─────────────────────────────────────────────────────

const MATH_SYMBOLS = [
  "∑", "∫", "∂", "∇", "σ", "μ", "α", "β", "ε", "θ",
  "π", "λ", "ω", "⊗", "‖·‖", "ŷ", "x̂", "∞", "Δ", "ℝ",
];

function makeSynaptic(count: number, W: number, H: number): Particle[] {
  return Array.from({ length: count }, () => {
    const text = MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)];
    const speed = 0.06 + Math.random() * 0.10;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      text, w: text.length * 10 + 16,
      alpha: 0.06 + Math.random() * 0.12,
      alphaDir: Math.random() > 0.5 ? 1 : -1,
      alphaSpeed: 0.0003 + Math.random() * 0.0004,
    };
  });
}

function drawSynaptic(
  ctx: CanvasRenderingContext2D, dpr: number,
  canvas: HTMLCanvasElement, particles: Particle[],
  r: number, g: number, b: number,
): void {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(dpr, dpr);

  const CONN = 160;
  for (const t of particles) {
    t.x += t.vx; t.y += t.vy;
    if (t.x < -60) t.x = W + 30; if (t.x > W + 60) t.x = -30;
    if (t.y < -40) t.y = H + 20; if (t.y > H + 40) t.y = -20;
    t.alpha += t.alphaDir * t.alphaSpeed;
    if (t.alpha > 0.22) { t.alpha = 0.22; t.alphaDir = -1; }
    if (t.alpha < 0.04) { t.alpha = 0.04; t.alphaDir = 1; }
  }

  // Synaptic connections — curved lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i], bk = particles[j];
      const dx = a.x - bk.x, dy = a.y - bk.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONN) {
        const str = (1 - dist / CONN) * 0.1;
        const mx = (a.x + bk.x) / 2 + (Math.random() - 0.5) * 20;
        const my = (a.y + bk.y) / 2 + (Math.random() - 0.5) * 20;
        ctx.beginPath(); ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, bk.x, bk.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${str})`;
        ctx.lineWidth = 0.6; ctx.stroke();
      }
    }
  }

  // Symbols — no pill, just glowing text
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const t of particles) {
    const { x, y, text, alpha } = t;
    const size = 13 + Math.floor(Math.random() * 0); // stable per particle
    ctx.font = `500 ${size}px serif`;

    // Soft glow
    ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 1.5})`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 2.5})`;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  accent?: string;
  variant?: "tokens" | "neural" | "radar" | "synaptic";
}

export default function SlideBackground({ accent = "#2C40FF", variant = "tokens" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const neuronsRef = useRef<Neuron[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const [r, g, b] = hexToRgb(accent);

    // Reset state on variant change
    particlesRef.current = [];
    neuronsRef.current = [];
    radarPulses.length = 0;
    radarY = 0;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if ((variant === "tokens") && particlesRef.current.length === 0)
        particlesRef.current = makeTokens(28, W, H);
      if (variant === "neural" && neuronsRef.current.length === 0)
        neuronsRef.current = makeNeurons(30, W, H);
      if (variant === "synaptic" && particlesRef.current.length === 0)
        particlesRef.current = makeSynaptic(22, W, H);
    }

    resize();

    function loop() {
      if (!canvas) return;
      if (variant === "tokens")
        drawTokens(ctx, dpr, canvas, particlesRef.current, r, g, b);
      else if (variant === "neural")
        drawNeural(ctx, dpr, canvas, neuronsRef.current, r, g, b);
      else if (variant === "radar")
        drawRadar(ctx, dpr, canvas, r, g, b);
      else if (variant === "synaptic")
        drawSynaptic(ctx, dpr, canvas, particlesRef.current, r, g, b);
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [accent, variant]); // eslint-disable-line react-hooks/exhaustive-deps

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
