import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream: MediaStream | null;
  bars?: number;
  className?: string;
}

/**
 * Visualizador de ondas sonoras estilo WhatsApp.
 * Recebe um MediaStream ativo e renderiza barras verticais animadas
 * com a cor primária do tema (hsl(var(--primary))).
 */
export function AudioVisualizer({ stream, bars = 28, className }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();
    ctxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);

    // Resolve the primary color from the theme (HSL token)
    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue("--primary").trim() || "220 90% 56%";
    const color = `hsl(${primary})`;

    const draw = () => {
      analyser.getByteFrequencyData(data);
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx2d.scale(dpr, dpr);
      }
      ctx2d.clearRect(0, 0, w, h);

      const step = Math.floor(data.length / bars) || 1;
      const barW = Math.max(2, (w - (bars - 1) * 2) / bars);
      ctx2d.fillStyle = color;

      for (let i = 0; i < bars; i++) {
        const v = data[i * step] / 255;
        const barH = Math.max(2, v * h * 0.95);
        const x = i * (barW + 2);
        const y = (h - barH) / 2;
        ctx2d.beginPath();
        const r = barW / 2;
        ctx2d.roundRect(x, y, barW, barH, r);
        ctx2d.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { source.disconnect(); } catch { /* noop */ }
      try { analyser.disconnect(); } catch { /* noop */ }
      audioCtx.close().catch(() => undefined);
      ctxRef.current = null;
    };
  }, [stream, bars]);

  return <canvas ref={canvasRef} className={className} />;
}
