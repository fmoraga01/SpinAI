"use client";

import { useRef, useEffect } from "react";

interface Props {
  delay?: number;
}

const FIGURE_H = 28;
const SPEED = 1.4;

function drawRunner(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  phase: number,
  dpr: number
) {
  const s = dpr;
  ctx.save();
  ctx.translate(x * s, baseY * s);
  ctx.strokeStyle = "#2C40FF";
  ctx.lineWidth = 1.8 * s;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#2C40FF";
  ctx.shadowBlur = 6 * s;

  const H = FIGURE_H;
  const headR = 4;
  const lean = 4;

  // Head
  ctx.beginPath();
  ctx.arc(lean, -H, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(lean, -H + headR * 2);
  ctx.lineTo(0, -H * 0.4);
  ctx.stroke();

  // Legs
  const legSwing = Math.sin(phase) * 12;
  const kneeY = -H * 0.2;

  // front leg
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.4);
  ctx.lineTo(legSwing * 0.5, kneeY);
  ctx.lineTo(legSwing, 0);
  ctx.stroke();

  // back leg
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.4);
  ctx.lineTo(-legSwing * 0.5, kneeY);
  ctx.lineTo(-legSwing, 0);
  ctx.stroke();

  // Arms (opposite to legs)
  const armSwing = Math.sin(phase + Math.PI) * 9;
  const shoulderY = -H + headR * 2 + 3;
  ctx.beginPath();
  ctx.moveTo(lean, shoulderY);
  ctx.lineTo(lean + armSwing, shoulderY + 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lean, shoulderY);
  ctx.lineTo(lean - armSwing, shoulderY + 9);
  ctx.stroke();

  ctx.restore();
}

export default function RunningFigure({ delay = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const xRef = useRef(delay * -40);
  const phaseRef = useRef(delay * 2);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    resize();

    function frame() {
      if (!canvas) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Ground line
      ctx.strokeStyle = "#2C40FF22";
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.moveTo(0, (h - 2) * dpr);
      ctx.lineTo(canvas.width, (h - 2) * dpr);
      ctx.stroke();

      xRef.current += SPEED;
      if (xRef.current > w + 20) xRef.current = -20;
      phaseRef.current += 0.18;

      drawRunner(ctx, xRef.current, h - 2, phaseRef.current, dpr);
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
        width: "100%",
        height: FIGURE_H + 8,
        display: "block",
        marginTop: 6,
      }}
    />
  );
}
