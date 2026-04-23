import { useEffect } from "react";
import { X, Download } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  fileName?: string;
  createdAt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, fileName, createdAt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const r = await fetch(src);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `imagem-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank", "noopener,noreferrer");
    }
  };

  const time = createdAt
    ? new Date(createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="min-w-0 text-white">
          <p className="text-sm font-medium truncate">{fileName || "Imagem"}</p>
          {time && <p className="text-[11px] text-white/70">{time}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            aria-label="Baixar imagem"
            title="Baixar"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <Download size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Fechar"
            title="Fechar (Esc)"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <img
        src={src}
        alt={fileName || "imagem"}
        className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
