"use client";

import { useEffect, useRef } from "react";

// Layer sizes: input → hidden layers → output
const LAYERS = [5, 8, 6, 9, 6, 4];
const NODE_R = 4;

interface NodeState {
  x: number;
  y: number;
  activation: number; // 0–1, fades out after a pulse arrives
  idlePhase: number;  // for subtle breathing animation
}

interface Pulse {
  layer: number;   // source layer index
  fromIdx: number;
  toIdx: number;
  t: number;       // 0→1 travel progress
  speed: number;
}

export default function AnimatedGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    let W = 0, H = 0;
    let nodes: NodeState[][] = [];
    let pulses: Pulse[] = [];
    let rafId: number;
    let lastTime = -1;
    let spawnTimer = 0;

    function buildNodes() {
      pulses = [];
      const layerCount = LAYERS.length;
      const xStart = W * 0.28;
      const xEnd = W * 0.97;
      const xStep = (xEnd - xStart) / (layerCount - 1);

      nodes = LAYERS.map((count, li) => {
        const x = xStart + li * xStep;
        const spacing = H / (count + 1);
        return Array.from({ length: count }, (_, ni) => ({
          x,
          y: spacing * (ni + 1),
          activation: 0,
          idlePhase: Math.random() * Math.PI * 2,
        }));
      });
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      buildNodes();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawnPulse() {
      const layer = Math.floor(Math.random() * (LAYERS.length - 1));
      const fromIdx = Math.floor(Math.random() * LAYERS[layer]);
      const toIdx = Math.floor(Math.random() * LAYERS[layer + 1]);
      pulses.push({ layer, fromIdx, toIdx, t: 0, speed: 0.45 + Math.random() * 0.35 });
    }

    function frame(time: number) {
      if (lastTime < 0) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      if (!nodes.length) { ctx.restore(); rafId = requestAnimationFrame(frame); return; }

      // Spawn pulses
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnPulse();
        if (Math.random() > 0.5) spawnPulse(); // occasional double burst
        spawnTimer = 0.2 + Math.random() * 0.35;
      }

      // Update pulses & trigger node activations
      for (const p of pulses) p.t = Math.min(1, p.t + dt * p.speed);
      for (const p of pulses.filter(p => p.t >= 1)) {
        nodes[p.layer + 1][p.toIdx].activation = 1;
      }
      pulses = pulses.filter(p => p.t < 1);

      // Decay activations
      for (const layer of nodes) {
        for (const n of layer) {
          n.activation = Math.max(0, n.activation - dt * 1.8);
        }
      }

      // ── Draw edges ──────────────────────────────────────────────────────────
      for (let li = 0; li < nodes.length - 1; li++) {
        for (const a of nodes[li]) {
          for (const b of nodes[li + 1]) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = "rgba(44,64,255,0.055)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // ── Draw pulses ──────────────────────────────────────────────────────────
      for (const p of pulses) {
        const from = nodes[p.layer][p.fromIdx];
        const to = nodes[p.layer + 1][p.toIdx];
        const px = from.x + (to.x - from.x) * p.t;
        const py = from.y + (to.y - from.y) * p.t;

        // Highlight the edge being traversed
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = `rgba(44,64,255,${0.12 + (1 - Math.abs(p.t - 0.5) * 2) * 0.2})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Outer glow
        const grd = ctx.createRadialGradient(px, py, 0, px, py, 10);
        grd.addColorStop(0, "rgba(44,64,255,0.55)");
        grd.addColorStop(1, "rgba(44,64,255,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,180,255,1)";
        ctx.fill();
      }

      // ── Draw nodes ──────────────────────────────────────────────────────────
      const t = time / 1000;
      for (const layer of nodes) {
        for (const n of layer) {
          const idle = 0.5 + 0.5 * Math.sin(t * 0.6 + n.idlePhase); // 0–1 breathing
          const act = n.activation;
          const glow = act + idle * 0.15;
          const r = NODE_R + act * 2.5;

          // Activation glow halo
          if (glow > 0.05) {
            const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 22);
            halo.addColorStop(0, `rgba(44,64,255,${glow * 0.35})`);
            halo.addColorStop(1, "rgba(44,64,255,0)");
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
            ctx.fill();
          }

          // Node fill
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(44,64,255,${0.1 + glow * 0.25})`;
          ctx.fill();

          // Node border
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(44,64,255,${0.22 + glow * 0.55})`;
          ctx.lineWidth = 0.8 + act * 0.8;
          ctx.stroke();
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
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
          "linear-gradient(to left, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to left, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.4) 60%, transparent 100%)",
        pointerEvents: "none",
      }}
    />
  );
}
