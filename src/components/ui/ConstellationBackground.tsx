import { useEffect, useRef } from "react";

/**
 * Animated constellation background (blue/violet dots + connecting lines).
 * Place inside a relatively positioned parent — it absolutely fills it.
 */
export function ConstellationBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        blue: isDark ? [37, 99, 235] : [59, 130, 246],
        purple: [122, 63, 242] as number[],
        dotAlpha: isDark ? 0.12 : 0.09,
        lineAlpha: isDark ? 0.22 : 0.13,
        ptAlphaMin: isDark ? 0.25 : 0.14,
        ptAlphaMax: isDark ? 0.65 : 0.4,
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
    const pts = Array.from({ length: 70 }, () => {
      const p = canvas.parentElement;
      const W = p?.offsetWidth || 1000;
      const H = p?.offsetHeight || 700;
      const t = Math.random();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.8 + 0.8,
        t,
        a: c.ptAlphaMin + Math.random() * (c.ptAlphaMax - c.ptAlphaMin),
      };
    });

    const draw = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const W = p.offsetWidth;
      const H = p.offsetHeight;
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
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            const col = lerp(lerp(blue, purple, a.t), lerp(blue, purple, b.t), 0.5);
            ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1 - d / 130) * lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        const col = lerp(blue, purple, p.t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.a})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

export default ConstellationBackground;
