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

// ─── Neural Network (Default) ─────────────────────────────────────────────────

const NN_LAYERS = [5, 8, 6, 9, 6, 4];
const NODE_R = 4;

interface Particle {
  x: number; y: number; vx: number; vy: number;
  text: string; w: number;
  alpha: number; alphaDir: number; alphaSpeed: number;
}

interface NNNode {
  x: number; y: number;
  activation: number;
  idlePhase: number;
}

interface NNPulse {
  layer: number; fromIdx: number; toIdx: number;
  t: number; speed: number;
}

function buildNNNodes(W: number, H: number): NNNode[][] {
  const xStart = W * 0.05;
  const xEnd = W * 0.97;
  const xStep = (xEnd - xStart) / (NN_LAYERS.length - 1);
  return NN_LAYERS.map((count, li) => {
    const x = xStart + li * xStep;
    const spacing = H / (count + 1);
    return Array.from({ length: count }, (_, ni) => ({
      x, y: spacing * (ni + 1),
      activation: 0,
      idlePhase: Math.random() * Math.PI * 2,
    }));
  });
}

function drawNNFrame(
  ctx: CanvasRenderingContext2D, dpr: number,
  canvas: HTMLCanvasElement,
  nodes: NNNode[][], pulses: NNPulse[],
  dt: number, time: number,
  r: number, g: number, b: number,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  if (!nodes.length) { ctx.restore(); return; }

  // Update pulses & activate destination nodes
  for (const p of pulses) p.t = Math.min(1, p.t + dt * p.speed);
  for (const p of pulses.filter(p => p.t >= 1)) {
    nodes[p.layer + 1][p.toIdx].activation = 1;
  }
  pulses.splice(0, pulses.length, ...pulses.filter(p => p.t < 1));

  // Decay activations
  for (const layer of nodes)
    for (const n of layer)
      n.activation = Math.max(0, n.activation - dt * 1.8);

  // Edges
  for (let li = 0; li < nodes.length - 1; li++) {
    for (const a of nodes[li]) {
      for (const bk of nodes[li + 1]) {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bk.x, bk.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.055)`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }

  // Pulses
  for (const p of pulses) {
    const from = nodes[p.layer][p.fromIdx];
    const to = nodes[p.layer + 1][p.toIdx];
    const px = from.x + (to.x - from.x) * p.t;
    const py = from.y + (to.y - from.y) * p.t;

    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.12 + (1 - Math.abs(p.t - 0.5) * 2) * 0.2})`;
    ctx.lineWidth = 0.8; ctx.stroke();

    const grd = ctx.createRadialGradient(px, py, 0, px, py, 10);
    grd.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();

    ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.min(255, r + 116)},${Math.min(255, g + 116)},255,1)`;
    ctx.fill();
  }

  // Nodes
  for (const layer of nodes) {
    for (const n of layer) {
      const idle = 0.5 + 0.5 * Math.sin(time * 0.6 + n.idlePhase);
      const act = n.activation;
      const glow = act + idle * 0.15;
      const nr = NODE_R + act * 2.5;

      if (glow > 0.05) {
        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 22);
        halo.addColorStop(0, `rgba(${r},${g},${b},${glow * 0.35})`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(n.x, n.y, 22, 0, Math.PI * 2); ctx.fill();
      }

      ctx.beginPath(); ctx.arc(n.x, n.y, nr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.1 + glow * 0.25})`; ctx.fill();

      ctx.beginPath(); ctx.arc(n.x, n.y, nr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.22 + glow * 0.55})`;
      ctx.lineWidth = 0.8 + act * 0.8; ctx.stroke();
    }
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
    alpha: 0.15 + Math.random() * 0.2,
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
    if (n.alpha > 0.38) { n.alpha = 0.38; n.alphaDir = -1; }
    if (n.alpha < 0.10) { n.alpha = 0.10; n.alphaDir = 1; }
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
        const str = (1 - dist / CONN) * 0.18 + fireBoost;
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
      ctx.strokeStyle = `rgba(${r},${g},${b},${n.fireAlpha * 0.5})`;
      ctx.lineWidth = 1; ctx.stroke();
    }

    ctx.beginPath(); ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill();
  }

  ctx.restore();
}

// ─── Particle Constellation (Blueprint) ──────────────────────────────────────

interface Attractor {
  x: number; y: number; vx: number; vy: number;
  ax: number; ay: number; // sinusoidal offset angles
}

interface CParticle {
  x: number; y: number; vx: number; vy: number;
  alpha: number; alphaDir: number; alphaSpeed: number;
}

function makeAttractors(count: number, W: number, H: number): Attractor[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
    ax: Math.random() * Math.PI * 2, ay: Math.random() * Math.PI * 2,
  }));
}

function makeCParticles(count: number, W: number, H: number): CParticle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    alpha: 0.1 + Math.random() * 0.2,
    alphaDir: Math.random() > 0.5 ? 1 : -1,
    alphaSpeed: 0.001 + Math.random() * 0.001,
  }));
}

let attractors: Attractor[] = [];
let cParticles: CParticle[] = [];
let constellationReady = false;

function drawConstellation(
  ctx: CanvasRenderingContext2D, dpr: number,
  canvas: HTMLCanvasElement,
  r: number, g: number, b: number,
): void {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;

  if (!constellationReady) {
    attractors = makeAttractors(4, W, H);
    cParticles = makeCParticles(55, W, H);
    constellationReady = true;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save(); ctx.scale(dpr, dpr);

  // Move attractors along slow sinusoidal paths
  for (const a of attractors) {
    a.ax += 0.003; a.ay += 0.002;
    a.x += Math.cos(a.ax) * 0.4;
    a.y += Math.sin(a.ay) * 0.35;
    if (a.x < 0) a.x = W; if (a.x > W) a.x = 0;
    if (a.y < 0) a.y = H; if (a.y > H) a.y = 0;
  }

  const GRAVITY = 0.012;
  const MAX_SPEED = 1.2;
  const CONN_DIST = 160;

  // Update particles — attracted to nearest attractor
  for (const p of cParticles) {
    let nearestDist = Infinity;
    let nearestA = attractors[0];
    for (const a of attractors) {
      const dx = a.x - p.x, dy = a.y - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; nearestA = a; }
    }

    const dx = nearestA.x - p.x, dy = nearestA.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Attraction weakens at very close range to avoid clustering
    const force = dist > 20 ? GRAVITY : 0;
    p.vx += (dx / dist) * force;
    p.vy += (dy / dist) * force;

    // Soft speed cap
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > MAX_SPEED) { p.vx = (p.vx / speed) * MAX_SPEED; p.vy = (p.vy / speed) * MAX_SPEED; }

    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
    if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

    p.alpha += p.alphaDir * p.alphaSpeed;
    if (p.alpha > 0.35) { p.alpha = 0.35; p.alphaDir = -1; }
    if (p.alpha < 0.08) { p.alpha = 0.08; p.alphaDir = 1; }
  }

  // Draw connections between close particles
  for (let i = 0; i < cParticles.length; i++) {
    for (let j = i + 1; j < cParticles.length; j++) {
      const a = cParticles[i], bk = cParticles[j];
      const dx = a.x - bk.x, dy = a.y - bk.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONN_DIST) {
        const str = (1 - dist / CONN_DIST) * 0.18;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(bk.x, bk.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${str})`;
        ctx.lineWidth = 0.6; ctx.stroke();
      }
    }
  }

  // Draw particles
  for (const p of cParticles) {
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`; ctx.fill();
  }

  ctx.restore();
}

// ─── Synaptic Flow (Warm) ─────────────────────────────────────────────────────

const MATH_SYMBOLS = [
  "🍺", "🍻", "🥂", "🍷", "🥃", "🍾", "🍺", "🍻", "🥂", "🍺",
  "🍻", "🥃", "🍾", "🍷", "🍺", "🍻", "🥂", "🍺", "🥃", "🍻",
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
        const str = (1 - dist / CONN) * 0.6;
        const mx = (a.x + bk.x) / 2 + (Math.random() - 0.5) * 20;
        const my = (a.y + bk.y) / 2 + (Math.random() - 0.5) * 20;
        ctx.beginPath(); ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, bk.x, bk.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},${str})`;
        ctx.lineWidth = 0.9; ctx.stroke();
      }
    }
  }

  // Symbols — no pill, just glowing text
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const t of particles) {
    const { x, y, text, alpha } = t;
    ctx.font = `18px serif`;

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
  variant?: "tokens" | "neural" | "constellation" | "synaptic";
}

export default function SlideBackground({ accent = "#2C40FF", variant = "tokens" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const neuronsRef = useRef<Neuron[]>([]);
  const nnNodesRef = useRef<NNNode[][]>([]);
  const nnPulsesRef = useRef<NNPulse[]>([]);
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
    nnNodesRef.current = [];
    nnPulsesRef.current = [];
    constellationReady = false;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (variant === "tokens")
        nnNodesRef.current = buildNNNodes(W, H);
      if (variant === "neural" && neuronsRef.current.length === 0)
        neuronsRef.current = makeNeurons(30, W, H);
      if (variant === "constellation")
        constellationReady = false;
      if (variant === "synaptic" && particlesRef.current.length === 0)
        particlesRef.current = makeSynaptic(22, W, H);
    }

    resize();

    let lastTime = -1;
    let spawnTimer = 0;

    function loop(time: number) {
      if (!canvas) return;
      const dt = lastTime < 0 ? 0 : Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (variant === "tokens") {
        // Spawn pulses
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const layer = Math.floor(Math.random() * (NN_LAYERS.length - 1));
          nnPulsesRef.current.push({
            layer,
            fromIdx: Math.floor(Math.random() * NN_LAYERS[layer]),
            toIdx: Math.floor(Math.random() * NN_LAYERS[layer + 1]),
            t: 0, speed: 0.45 + Math.random() * 0.35,
          });
          if (Math.random() > 0.5) {
            const layer2 = Math.floor(Math.random() * (NN_LAYERS.length - 1));
            nnPulsesRef.current.push({
              layer: layer2,
              fromIdx: Math.floor(Math.random() * NN_LAYERS[layer2]),
              toIdx: Math.floor(Math.random() * NN_LAYERS[layer2 + 1]),
              t: 0, speed: 0.45 + Math.random() * 0.35,
            });
          }
          spawnTimer = 0.2 + Math.random() * 0.35;
        }
        drawNNFrame(ctx, dpr, canvas, nnNodesRef.current, nnPulsesRef.current, dt, time / 1000, r, g, b);
      } else if (variant === "neural")
        drawNeural(ctx, dpr, canvas, neuronsRef.current, r, g, b);
      else if (variant === "constellation")
        drawConstellation(ctx, dpr, canvas, r, g, b);
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
