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
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      onCanvasReady?.(canvas);
    };
    renderPage();
  }, [pdf, currentPage, scale]);

  return <canvas ref={canvasRef} className="block" />;
}
