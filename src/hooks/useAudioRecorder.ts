import { useCallback, useEffect, useRef, useState } from "react";

interface RecorderState {
  isRecording: boolean;
  duration: number;
  levels: number[];
  error: string | null;
}

interface RecorderResult {
  blob: Blob;
  url: string;
  duration: number;
  mime: string;
  levels: number[];
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    duration: 0,
    levels: [],
    error: null,
  });

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const levelsRef = useRef<number[]>([]);

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearInterval(timerRef.current);
    rafRef.current = null;
    timerRef.current = null;
    try { analyserRef.current?.disconnect(); } catch { /* noop */ }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const pickMime = (): string => {
    const opts = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"];
    for (const m of opts) {
      // @ts-ignore
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(m)) return m;
    }
    return "audio/webm";
  };

  const stop = useCallback((): Promise<RecorderResult | null> => {
    return new Promise((resolve) => {
      const mr = mediaRef.current;
      if (!mr) { resolve(null); return; }
      const finalize = () => {
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const url = URL.createObjectURL(blob);
        const levels = [...levelsRef.current];
        setState({ isRecording: false, duration, levels, error: null });
        teardown();
        resolve({ blob, url, duration, mime, levels });
      };
      if (mr.state === "inactive") return finalize();
      mr.onstop = finalize;
      try { mr.stop(); } catch { finalize(); }
    });
  }, [teardown]);

  const start = useCallback(async (): Promise<boolean> => {
    setState((s) => ({ ...s, error: null }));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;

      const mime = pickMime();
      const mr = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64_000 });
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.start(250);
      startedAtRef.current = Date.now();
      levelsRef.current = [];

      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startedAtRef.current) / 1000;
        setState((s) => ({ ...s, duration: elapsed }));
        if (elapsed >= 300) {
          stop();
        }
      }, 200);

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let lastSample = 0;

      const loop = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (now - lastSample > 80) {
          lastSample = now;
          levelsRef.current.push(Math.min(1, rms * 1.6));
          setState((s) => ({ ...s, levels: [...levelsRef.current] }));
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      setState({ isRecording: true, duration: 0, levels: [], error: null });
      return true;
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Permissão de microfone negada"
        : err?.message || "Erro ao acessar o microfone";
      setState({ isRecording: false, duration: 0, levels: [], error: msg });
      teardown();
      return false;
    }
  }, [teardown, stop]);

  const cancel = useCallback(() => {
    const mr = mediaRef.current;
    try { mr?.stop(); } catch { /* noop */ }
    teardown();
    setState({ isRecording: false, duration: 0, levels: [], error: null });
  }, [teardown]);

  return { ...state, start, stop, cancel };
}
