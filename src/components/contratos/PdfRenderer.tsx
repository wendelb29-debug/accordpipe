import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface Props {
  pdfUrl: string;
  currentPage: number;
  onTotalPages: (total: number) => void;
  scale?: number;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function PdfRenderer({ pdfUrl, currentPage, onTotalPages, scale = 1.2, onCanvasReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        setPdf(doc);
        onTotalPages(doc.numPages);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    };
    loadPdf();
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    const renderPage = async () => {
      const page = await pdf.getPage(currentPage);
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      const cssViewport = page.getViewport({ scale });
      const renderViewport = page.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current!;
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
      onCanvasReady?.(canvas);
    };
    renderPage();
  }, [pdf, currentPage, scale]);


  return <canvas ref={canvasRef} className="block" />;
}
