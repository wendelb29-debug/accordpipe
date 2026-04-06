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

interface TemplateField {
  id: string;
  field_type: string;
  label: string | null;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  page: number;
}

interface Props {
  contractId: string;
  pdfUrl: string;
  currentSignerId: string;
  onFieldClick: (field: SignField) => void;
  signedFieldIds: string[];
}

const fmtCur = (v: number, cur = "BRL") => v.toLocaleString("pt-BR", { style: "currency", currency: cur });

export function PdfSigningOverlay({ contractId, pdfUrl, currentSignerId, onFieldClick, signedFieldIds }: Props) {
  const [fields, setFields] = useState<SignField[]>([]);
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([]);
  const [serverData, setServerData] = useState<any>(null);
  const [contractMeta, setContractMeta] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const scale = 1.2;

  useEffect(() => {
    const load = async () => {
      // Load signing fields
      const { data: signFields } = await supabase
        .from("pdf_contract_fields")
        .select("*")
        .eq("contract_id", contractId);
      if (signFields) setFields(signFields as SignField[]);

      // Load contract to get servidor_id and signer info
      const { data: contract } = await supabase
        .from("pdf_contracts")
        .select("*")
        .eq("id", contractId)
        .single();

      if (!contract) return;
      setContractMeta(contract);

      // Load server/company data
      if (contract.servidor_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("*")
          .eq("id", contract.servidor_id)
          .single();
        if (company) setServerData(company);

        // Load template fields from company_contract_template_fields
        const { data: templates } = await supabase
          .from("company_contract_templates")
          .select("id")
          .eq("company_id", contract.servidor_id)
          .limit(1);

        if (templates && templates.length > 0) {
          const { data: tFields } = await supabase
            .from("company_contract_template_fields")
            .select("*")
            .eq("template_id", templates[0].id);
          if (tFields) setTemplateFields(tFields as TemplateField[]);
        }
      }

      // Load signer details for client data resolution
      const { data: signers } = await supabase
        .from("pdf_contract_signers")
        .select("*")
        .eq("contract_id", contractId)
        .order("sign_order", { ascending: true });

      if (signers && signers.length > 0) {
        // Store first signer as the primary client for field resolution
        setContractMeta((prev: any) => ({ ...prev, primarySigner: signers[0], allSigners: signers }));
      }
    };
    load();
  }, [contractId]);

  const resolveTemplateFieldValue = useCallback((fieldType: string): string => {
    const srv = serverData;
    const signer = contractMeta?.primarySigner;
    const srvAddr = srv ? [srv.endereco, srv.numero && `nº ${srv.numero}`, srv.bairro, srv.cidade && srv.estado && `${srv.cidade}/${srv.estado}`, srv.cep && `CEP: ${srv.cep}`].filter(Boolean).join(", ") : "";

    switch (fieldType) {
      // Servidor fields
      case "servidor_logo": return srv?.brand_logo_url || "";
      case "servidor_empresa": return srv?.razao_social || srv?.nome_fantasia || "";
      case "servidor_cnpj": {
        if (!srv) return "";
        const parts = [
          srv.razao_social || srv.nome_fantasia || "",
          srv.cnpj ? `inscrita no CNPJ/MF sob o nº ${srv.cnpj}` : "",
          [srv.endereco, srv.numero && `nº ${srv.numero}`, srv.complemento, srv.bairro, srv.cep && `CEP: ${srv.cep}`, srv.cidade && srv.estado && `${srv.cidade}-${srv.estado}`].filter(Boolean).join(", "),
          srv.email ? `e-mail ${srv.email}` : "",
          srv.telefone ? `telefone ${srv.telefone}` : "",
        ].filter(Boolean);
        return parts.length > 0 ? `${parts[0]}, ${parts.slice(1).join(", ")}.` : "";
      }
      case "servidor_endereco": return srvAddr;
      case "servidor_email": return srv?.email || "";

      // Client fields
      case "cnpj_cpf": return signer?.cpf_cnpj || "";
      case "empresa": {
        const nome = signer?.name || "";
        const doc = signer?.cpf_cnpj || "";
        const addr = signer?.address || "";
        const email = signer?.email || "";
        const tel = signer?.phone || "";
        const parts = [
          nome,
          doc ? `inscrito(a) no CPF/CNPJ sob o nº ${doc}` : "",
          addr ? `com endereço em ${addr}` : "",
          email ? `e-mail ${email}` : "",
          tel ? `telefone ${tel}` : "",
        ].filter(Boolean);
        return parts.length > 0 ? `${parts[0]}, ${parts.slice(1).join(", ")}.` : "";
      }
      case "nome_cliente": return signer?.name || "";
      case "cliente_email": return signer?.email || "";
      case "cliente_telefone": return signer?.phone || "";
      case "cliente_cep": return signer?.address || "";
      case "cliente_endereco": return signer?.address || "";
      case "cliente_numero": return "";
      case "cliente_complemento": return "";

      // Contract fields
      case "data": return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      case "assinatura": return "______________________________";
      case "plano": return "";
      case "clausula": return "";
      case "campo_proposta": return "";
      case "valor_ps": return "";
      case "valor_mrr": return "";

      default: return "";
    }
  }, [serverData, contractMeta]);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    setCanvasSize({ width: canvas.width, height: canvas.height });
  }, []);

  const pageFields = fields.filter(f => f.page === currentPage);
  const myFields = pageFields.filter(f => f.signer_id === currentSignerId);
  const otherFields = pageFields.filter(f => f.signer_id !== currentSignerId);
  const pageTemplateFields = templateFields.filter(f => f.page === currentPage);

  // Filter out template fields that are signature-type (handled by signing fields)
  const dataTemplateFields = pageTemplateFields.filter(f => f.field_type !== "assinatura");

  if (fields.length === 0 && templateFields.length === 0) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <iframe src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`} className="w-full h-[60vh] rounded-lg" title="Contrato" style={{ border: "none" }} />
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

          {/* Template data fields (read-only, filled with resolved values) */}
          {dataTemplateFields.map(field => {
            const value = resolveTemplateFieldValue(field.field_type);
            const isLogo = field.field_type === "servidor_logo";
            if (!value) return null;
            return (
              <div
                key={`tmpl-${field.id}`}
                className="absolute overflow-hidden flex items-center pointer-events-none"
                style={{
                  left: field.pos_x * scale,
                  top: field.pos_y * scale,
                  width: field.width * scale,
                  height: field.height * scale,
                  fontSize: Math.min(field.height * 0.55, 13),
                  background: "transparent",
                }}
              >
                {isLogo && value ? (
                  <img src={value} alt="Logo" className="h-full w-auto object-contain" />
                ) : (
                  <span className="whitespace-pre-wrap leading-tight" style={{ color: "#000", fontSize: field.field_type === "campo_proposta" || field.field_type === "clausula" ? 8 : 11, lineHeight: "1.3" }}>
                    {value}
                  </span>
                )}
              </div>
            );
          })}

          {/* Other signers' fields */}
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

          {/* Current signer's fields */}
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
