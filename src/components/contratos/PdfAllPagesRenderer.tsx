import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PageSize {
  width: number;
  height: number;
}

interface Props {
  pdfUrl: string;
  scale?: number;
  onTotalPages?: (total: number) => void;
  onPageSizes?: (sizes: PageSize[]) => void;
}

export function PdfAllPagesRenderer({ pdfUrl, scale = 1.2, onTotalPages, onPageSizes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadPdf = async () => {
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        onTotalPages?.(doc.numPages);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };
    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdf || numPages === 0) return;
    let cancelled = false;

    const renderAll = async () => {
      const sizes: PageSize[] = [];
      const containerWidth = containerRef.current?.clientWidth || 600;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        const page = await pdf.getPage(i);
        const baseViewport = page.getViewport({ scale: 1 });

        // CSS size: fit the container width (cap to scale*baseWidth to avoid blowing up huge pages)
        const cssScale = Math.min(scale, (containerWidth - 16) / baseViewport.width);
        const cssViewport = page.getViewport({ scale: cssScale });

        // Render at devicePixelRatio for crisp HiDPI output, then downscale via CSS
        const renderViewport = page.getViewport({ scale: cssScale * dpr });

        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;
        canvas.style.maxWidth = "100%";
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
        sizes.push({ width: cssViewport.width, height: cssViewport.height });
      }
      if (!cancelled) onPageSizes?.(sizes);
    };


    renderAll();
    return () => { cancelled = true; };
  }, [pdf, numPages, scale]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 w-full">
      {Array.from({ length: numPages }, (_, i) => (
        <canvas
          key={i}
          ref={(el) => { canvasRefs.current[i] = el; }}
          className="block shadow-lg max-w-full"
        />
      ))}
    </div>
  );
}
