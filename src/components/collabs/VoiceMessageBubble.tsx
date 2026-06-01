import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

interface VoiceMessageBubbleProps {
  url: string;
  duration?: number;
  levels?: number[];
  tone?: "mine" | "other";
}

const BAR_COUNT = 34;

function fmt(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function deriveBars(levels?: number[]): number[] {
  if (levels && levels.length > 0) {
    const out: number[] = [];
    const step = levels.length / BAR_COUNT;
    for (let i = 0; i < BAR_COUNT; i++) {
      const idx = Math.floor(i * step);
      out.push(Math.max(0.18, Math.min(1, levels[idx] ?? 0.2)));
    }
    return out;
  }
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const x = i / BAR_COUNT;
    return 0.35 + Math.sin(x * Math.PI * 3) * 0.25 + (i % 3 === 0 ? 0.15 : 0);
  });
}

export function VoiceMessageBubble({ url, duration, levels, tone = "other" }: VoiceMessageBubbleProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  const [rate, setRate] = useState<1 | 1.5 | 2>(1);

  const bars = deriveBars(levels);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onMeta = () => { if (isFinite(a.duration) && a.duration > 0) setTotal(a.duration); };
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      try {
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  };

  const onBarsClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * total;
    setCurrent(a.currentTime);
  };

  const progress = total > 0 ? current / total : 0;
  const accent = tone === "mine" ? "#10b981" : "#059669";
  const bgPlay = "#10b981";

  return (
    <div className="flex items-center gap-3 min-w-[240px] max-w-[300px] py-1">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white shadow-sm hover:opacity-95 active:scale-95 transition"
        style={{ background: bgPlay }}
        aria-label={playing ? "Pausar" : "Reproduzir"}
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="flex items-center gap-[2px] h-7 cursor-pointer"
          onClick={onBarsClick}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={total || 0}
          aria-valuenow={current}
        >
          {bars.map((v, i) => {
            const filled = i / BAR_COUNT < progress;
            const h = Math.max(4, v * 24);
            return (
              <span
                key={i}
                className="rounded-full"
                style={{
                  width: 2.5,
                  height: h,
                  background: filled ? accent : "rgba(0,0,0,0.18)",
                  transition: "background .15s",
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10.5px] text-gray-500 tabular-nums">
            {fmt(playing || current > 0 ? current : total)}
          </span>
          <button
            onClick={() => setRate(rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1)}
            className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 px-1.5 py-0.5 rounded bg-gray-100"
          >
            {rate}×
          </button>
        </div>
      </div>
    </div>
  );
}
