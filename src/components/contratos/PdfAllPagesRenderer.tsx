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
      for (let i = 1; i <= numPages; i++) {
        if (cancelled) return;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        sizes.push({ width: viewport.width, height: viewport.height });
      }
      if (!cancelled) onPageSizes?.(sizes);
    };

    renderAll();
    return () => { cancelled = true; };
  }, [pdf, numPages, scale]);

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4">
      {Array.from({ length: numPages }, (_, i) => (
        <canvas
          key={i}
          ref={(el) => { canvasRefs.current[i] = el; }}
          className="block shadow-lg"
        />
      ))}
    </div>
  );
}