import { useState, useEffect, useCallback } from "react";
import { FileSignature, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PdfRenderer } from "./PdfRenderer";

interface SignField {
  id: string;
  field_type: string;
  label: string | null;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  page: number;
  signer_id: string | null;
  signer_color: string | null;
  value: string | null;
}

interface Props {
  contractId: string;
  pdfUrl: string;
  currentSignerId: string;
  onFieldClick: (field: SignField) => void;
  signedFieldIds: string[];
}

export function PdfSigningOverlay({ contractId, pdfUrl, currentSignerId, onFieldClick, signedFieldIds }: Props) {
  const [fields, setFields] = useState<SignField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const scale = 1.2;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("pdf_contract_fields")
        .select("*")
        .eq("contract_id", contractId);
      if (data) setFields(data as SignField[]);
    };
    load();
  }, [contractId]);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setCanvasSize({ width: canvas.width, height: canvas.height });
  }, []);

  const pageFields = fields.filter(f => f.page === currentPage);
  const myFields = pageFields.filter(f => f.signer_id === currentSignerId);
  const otherFields = pageFields.filter(f => f.signer_id !== currentSignerId);

  if (fields.length === 0) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <iframe src={pdfUrl} className="w-full h-[60vh] rounded-lg" title="Contrato" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto overflow-auto rounded-lg border bg-muted/20" style={{ maxHeight: "65vh" }}>
        <div className="relative inline-block" style={{ width: canvasSize.width || "auto", height: canvasSize.height || "auto" }}>
          <PdfRenderer
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            onTotalPages={setTotalPages}
            scale={scale}
            onCanvasReady={handleCanvasReady}
          />

          {otherFields.map(field => {
            const isSigned = signedFieldIds.includes(field.id);
            return (
              <div
                key={field.id}
                className="absolute rounded-md border-2 border-dashed flex items-center justify-center pointer-events-none opacity-50"
                style={{
                  left: field.pos_x,
                  top: field.pos_y,
                  width: field.width,
                  height: field.height,
                  borderColor: field.signer_color || "#9ca3af",
                  backgroundColor: isSigned ? `${field.signer_color || "#9ca3af"}20` : `${field.signer_color || "#9ca3af"}10`,
                }}
              >
                {isSigned ? (
                  <CheckCircle className="h-4 w-4" style={{ color: field.signer_color || "#9ca3af" }} />
                ) : (
                  <span className="text-[9px] font-medium" style={{ color: field.signer_color || "#9ca3af" }}>
                    {field.label || "Assinatura"}
                  </span>
                )}
              </div>
            );
          })}

          {myFields.map(field => {
            const isSigned = signedFieldIds.includes(field.id);
            return (
              <button
                key={field.id}
                disabled={isSigned}
                onClick={() => !isSigned && onFieldClick(field)}
                className={cn(
                  "absolute rounded-md border-2 flex items-center justify-center transition-all",
                  isSigned
                    ? "border-solid cursor-default"
                    : "border-dashed cursor-pointer hover:shadow-lg hover:scale-[1.02] animate-pulse"
                )}
                style={{
                  left: field.pos_x,
                  top: field.pos_y,
                  width: field.width,
                  height: field.height,
                  borderColor: field.signer_color || "#3b82f6",
                  backgroundColor: isSigned ? `${field.signer_color || "#3b82f6"}20` : `${field.signer_color || "#3b82f6"}15`,
                }}
              >
                {isSigned ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <CheckCircle className="h-4 w-4" style={{ color: field.signer_color || "#3b82f6" }} />
                    <span className="text-[9px] font-bold" style={{ color: field.signer_color || "#3b82f6" }}>Assinado</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    <FileSignature className="h-5 w-5" style={{ color: field.signer_color || "#3b82f6" }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: field.signer_color || "#3b82f6" }}>
                      Assine Aqui
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm rounded-md border disabled:opacity-30 hover:bg-accent transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm rounded-md border disabled:opacity-30 hover:bg-accent transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}
