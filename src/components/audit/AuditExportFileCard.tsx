import { useState } from "react";
import { FileText, Download, Loader2, Shield } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";

interface ExportFile {
  path: string;
  filename: string;
  size: number;
  mime_type: string;
  sha256: string;
}

const FORMAT_STYLES: Record<string, { tag: string; color: string; bg: string; border: string }> = {
  "text/csv":                                                          { tag: "CSV", color: "#10b981", bg: "rgba(16,185,129,.06)",  border: "rgba(16,185,129,.2)" },
  "application/pdf":                                                   { tag: "PDF", color: "#f43f5e", bg: "rgba(244,63,94,.06)",   border: "rgba(244,63,94,.2)" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { tag: "XLSX",color: "#10b981", bg: "rgba(16,185,129,.06)",  border: "rgba(16,185,129,.2)" },
  "application/vnd.ms-excel":                                          { tag: "XLS", color: "#10b981", bg: "rgba(16,185,129,.06)",  border: "rgba(16,185,129,.2)" },
  "application/json":                                                  { tag: "JSON",color: "#a78bfa", bg: "rgba(167,139,250,.06)", border: "rgba(167,139,250,.2)" },
  "application/zip":                                                   { tag: "ZIP", color: "#94a3b8", bg: "rgba(148,163,184,.06)", border: "rgba(148,163,184,.2)" },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AuditExportFileCard({ file }: { file: ExportFile }) {
  const { getExportDownloadUrl } = useAuditLog();
  const [loading, setLoading] = useState(false);
  const style = FORMAT_STYLES[file.mime_type] || FORMAT_STYLES["application/zip"];

  const handleDownload = async () => {
    setLoading(true);
    try {
      const url = await getExportDownloadUrl(file.path);
      if (!url) throw new Error("URL não gerada");
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download iniciado");
    } catch (err: any) {
      toast.error("Erro ao baixar", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mt-2.5 flex items-center gap-2.5 p-2.5 px-3 rounded-xl border"
      style={{ background: style.bg, borderColor: style.border }}
    >
      <div
        className="relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: style.color + "30" }}
      >
        <FileText className="w-4 h-4" style={{ color: style.color }} />
        <span
          className="absolute -bottom-1 -right-1 text-[8px] font-extrabold px-1 py-0.5 rounded text-white"
          style={{ background: style.color, letterSpacing: ".04em" }}
        >
          {style.tag}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold text-foreground truncate">
          {file.filename}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10.5px] font-mono text-muted-foreground">
            {formatSize(file.size)}
          </span>
          <span
            className="text-[10px] font-mono text-muted-foreground/70"
            title={`SHA-256: ${file.sha256}`}
          >
            SHA · {file.sha256.slice(0, 8)}...
          </span>
          <span className="text-[9.5px] text-emerald-600 font-semibold inline-flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" />
            Arquivo permanente
          </span>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="h-9 px-3.5 rounded-lg text-white text-[11.5px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition"
        style={{ background: style.color }}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        Baixar
      </button>
    </div>
  );
}
