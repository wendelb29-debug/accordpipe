import { useEffect, useRef } from "react";

/**
 * Animated constellation background (same as Accord Stack inbox empty state).
 * Renders connected moving dots over a faint dotted grid.
 */
export function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const lerp = (a: number[], b: number[], t: number) =>
      a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const getColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      return {
        blue: isDark ? [59, 130, 246] : [37, 99, 235],
        purple: [139, 92, 246] as number[],
        dotAlpha: isDark ? 0.10 : 0.16,
        lineAlpha: isDark ? 0.30 : 0.38,
        ptAlphaMin: isDark ? 0.30 : 0.40,
        ptAlphaMax: isDark ? 0.70 : 0.80,
      };
    };

    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const { width, height } = p.getBoundingClientRect();
      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    const c = getColors();
    const pts = Array.from({ length: 85 }, () => {
      const p = canvas.parentElement;
      const W = p?.offsetWidth || 800;
      const H = p?.offsetHeight || 600;
      const t = Math.random();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.42,
        vy: (Math.random() - 0.5) * 0.42,
        r: Math.random() * 1.8 + 0.9,
        t,
        a: c.ptAlphaMin + Math.random() * (c.ptAlphaMax - c.ptAlphaMin),
      };
    });

    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const W = p.offsetWidth, H = p.offsetHeight;
      const { blue, purple, dotAlpha, lineAlpha } = getColors();
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = `rgba(122,63,242,${dotAlpha})`;
      for (let x = 18; x < W; x += 36)
        for (let y = 18; y < H; y += 36) {
          ctx.beginPath();
          ctx.arc(x, y, 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 150) {
            const col = lerp(lerp(blue, purple, a.t), lerp(blue, purple, b.t), 0.5);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1 - d / 150) * lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const pt of pts) {
        pt.x += pt.vx; pt.y += pt.vy;
        if (pt.x < 0 || pt.x > W) pt.vx *= -1;
        if (pt.y < 0 || pt.y > H) pt.vy *= -1;
        const col = lerp(blue, purple, pt.t);
        // soft glow
        const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, pt.r * 4);
        glow.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${pt.a * 0.55})`);
        glow.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * 4, 0, Math.PI * 2);
        ctx.fill();
        // core dot
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${pt.a})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    resize(); draw();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
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
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        display: "block",
      }}
      aria-hidden
    />
  );
}
