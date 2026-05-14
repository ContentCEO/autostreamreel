"use client";

import { useEffect, useRef } from "react";

interface Props {
  size?: number;        // px diameter of the canvas (square)
  count?: number;       // number of particles on the sphere
  color?: string;       // base particle color (CSS)
  speaking?: boolean;   // when true, the orb gently breathes faster
  label?: string;       // centered text inside the orb (default "JARVIS")
}

// Canvas-based particle sphere matching the huwprosser reference: cyan-blue
// dots distributed on a sphere surface via Fibonacci spiral, rotating gently
// around Y. No Three.js dependency. Audio reactivity is a hook (`speaking`)
// that we can drive from the boot sequence / TTS playback layer later.
export function JarvisOrb({
  size = 280,
  count = 1200,
  color = "#4DB8FF",
  speaking = false,
  label = "JARVIS",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const speakingRef = useRef<boolean>(speaking);

  useEffect(() => { speakingRef.current = speaking; }, [speaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Fibonacci-sphere distribution — uniform, deterministic.
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < count; i++) {
      const phi   = Math.acos(1 - 2 * (i + 0.5) / count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      points.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
      });
    }

    const cx = size / 2;
    const cy = size / 2;
    const r  = size * 0.36;   // sphere radius in px

    let t = 0;
    function frame() {
      t += 0.005;
      const breathe = speakingRef.current ? 1 + Math.sin(t * 4) * 0.025 : 1 + Math.sin(t * 1.2) * 0.012;
      const radius = r * breathe;
      const yaw    = t * 0.35;
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const tilt = 0.18;             // tiny constant X tilt
      const cosX = Math.cos(tilt), sinX = Math.sin(tilt);

      ctx!.clearRect(0, 0, size, size);

      // Soft inner glow.
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0,    "rgba(77, 184, 255, 0.18)");
      grad.addColorStop(0.55, "rgba(77, 184, 255, 0.06)");
      grad.addColorStop(1,    "rgba(77, 184, 255, 0)");
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx!.fill();

      // Render every particle: rotate, project, scale alpha + size by z.
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        // Yaw around Y.
        const x1 =  p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        // Tilt around X.
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        // Project — orthographic-ish with mild perspective scaling.
        const depth = (z2 + 1) / 2;                     // 0 (back) -> 1 (front)
        const px = cx + x1 * radius;
        const py = cy + y2 * radius;
        const alpha = 0.20 + depth * 0.75;
        const dotR  = 0.6 + depth * 1.0;
        ctx!.fillStyle = color;
        ctx!.globalAlpha = alpha;
        ctx!.beginPath();
        ctx!.arc(px, py, dotR, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size, count, color]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} className="block" />
      {label && (
        <span
          className="absolute inset-0 grid place-items-center pointer-events-none select-none"
          style={{
            fontFamily: 'var(--font-display, "Orbitron", system-ui, sans-serif)',
            fontWeight: 300,
            letterSpacing: "0.32em",
            fontSize: Math.round(size * 0.072),
            color: "rgba(220, 240, 255, 0.78)",
            textShadow: "0 0 8px rgba(77, 184, 255, 0.45)",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
