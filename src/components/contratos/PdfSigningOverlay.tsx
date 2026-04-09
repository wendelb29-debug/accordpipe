import { useState, useEffect, useCallback } from "react";
import { FileSignature, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { PdfAllPagesRenderer } from "./PdfAllPagesRenderer";

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
  const [totalPages, setTotalPages] = useState(1);
  const [pageSizes, setPageSizes] = useState<{ width: number; height: number }[]>([]);
  const [signerDetails, setSignerDetails] = useState<Record<string, any>>({});
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
          if (tFields) setTemplateFields(tFields.map((f: any) => ({ ...f, field_type: f.field_type === "servidor_empresa" ? "empresa" : f.field_type })) as TemplateField[]);
        }
      }

      // Load signer details for signature stamp rendering
      const { data: signers } = await supabase
        .from("pdf_contract_signers")
        .select("*")
        .eq("contract_id", contractId)
        .order("sign_order", { ascending: true });

      const signerMap: Record<string, any> = {};
      if (signers) {
        for (const s of signers) {
          signerMap[s.id] = s;
        }
        setContractMeta((prev: any) => ({ ...prev, primarySigner: signers[0], allSigners: signers }));
      }
      setSignerDetails(signerMap);
    };
    load();
  }, [contractId]);

  const resolveTemplateFieldValue = useCallback((fieldType: string): string => {
    const srv = serverData;
    const signer = contractMeta?.primarySigner;
    const srvAddr = srv ? [srv.endereco, srv.numero && `nº ${srv.numero}`, srv.bairro, srv.cidade && srv.estado && `${srv.cidade}/${srv.estado}`, srv.cep && `CEP: ${srv.cep}`].filter(Boolean).join(", ") : "";

    switch (fieldType) {
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
      case "data": return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      case "assinatura": return "______________________________";
      case "plano": return "";
      case "clausula": return "";
      case "campo_proposta": return "";
      case "valor_ps": return "";
      case "valor_mrr": return "";
      case "codigo_contrato": return contractMeta?.name || "";
      default: return "";
    }
  }, [serverData, contractMeta]);

  const orderedSigners = [...(contractMeta?.allSigners || [])].sort((a: any, b: any) => a.sign_order - b.sign_order);
  const hasContractSignatureFields = fields.some(f => f.field_type === "signature");

  const resolveSignatureSigner = useCallback((field: SignField, pageSignatureFields: SignField[]) => {
    if (field.signer_id && signerDetails[field.signer_id]) return signerDetails[field.signer_id];
    const fieldIndex = pageSignatureFields.findIndex(candidate => candidate.id === field.id);
    return fieldIndex >= 0 ? orderedSigners[fieldIndex] : null;
  }, [signerDetails, orderedSigners]);

  const isSignatureFieldSigned = useCallback((field: SignField, pageSignatureFields: SignField[]) => {
    const signer = resolveSignatureSigner(field, pageSignatureFields);
    return signedFieldIds.includes(field.id) || Boolean(signer?.status === "assinado" && signer?.signed_at);
  }, [resolveSignatureSigner, signedFieldIds]);

  // Compute the vertical offset for each page (sum of all previous page heights + gap)
  const PAGE_GAP = 16; // matches gap-4 = 1rem = 16px
  const pageOffsets = pageSizes.reduce<number[]>((acc, size, i) => {
    if (i === 0) {
      acc.push(0);
    } else {
      acc.push(acc[i - 1] + pageSizes[i - 1].height + PAGE_GAP);
    }
    return acc;
  }, []);

  const hasAnyFields = fields.length > 0 || templateFields.length > 0;

  const renderDefaultSignatureStamps = (pageNum: number) => {
    if (hasAnyFields) return null;
    if (pageNum !== totalPages || totalPages === 0) return null;
    const pageSize = pageSizes[pageNum - 1];
    if (!pageSize) return null;
    const yOffset = pageOffsets[pageNum - 1] ?? 0;
    const stampW = 220 * scale;
    const stampH = 60 * scale;
    const gap = 10 * scale;
    const startYFromBottom = 140 * scale;

    return (
      <div key={`default-stamps-${pageNum}`}>
        {orderedSigners.map((signer: any, idx: number) => {
          const isSigned = signer?.status === "assinado" && signer?.signed_at;
          const yPos = pageSize.height - startYFromBottom + (stampH + gap) * idx;
          return (
            <div
              key={`default-sig-${signer.id}`}
              className="absolute overflow-hidden pointer-events-none"
              style={{
                left: 40 * scale,
                top: yOffset + yPos,
                width: stampW,
                height: stampH,
              }}
            >
              {isSigned ? (
                <div className="h-full w-full rounded-md border border-primary/30 bg-primary/5 p-1 flex items-center gap-2">
                  {signer.signature_photo_url && (
                    <img src={signer.signature_photo_url} alt="Foto" className="h-full w-auto rounded object-cover shrink-0" style={{ maxWidth: "35%" }} />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate text-[8px] font-bold text-primary">Assinado Digitalmente</span>
                    </div>
                    <span className="truncate text-[7px] font-semibold text-foreground">{signer.name}</span>
                    {signer.cpf_cnpj && <span className="truncate text-[6px] text-muted-foreground">CPF/CNPJ: {signer.cpf_cnpj}</span>}
                    {signer.signed_at && <span className="truncate text-[6px] text-muted-foreground">{new Date(signer.signed_at).toLocaleString("pt-BR")}</span>}
                    {signer.signer_ip && <span className="truncate text-[6px] text-muted-foreground">IP: {signer.signer_ip}</span>}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md">
                  <span className="text-[9px] text-muted-foreground">{signer?.name ? `${signer.name} - Pendente` : "Assinatura"}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPageOverlay = (pageNum: number) => {
    const pageFields_ = fields.filter(f => f.page === pageNum);
    const myFields = pageFields_.filter(f => f.signer_id === currentSignerId);
    const otherFields = pageFields_.filter(f => f.signer_id !== currentSignerId);
    const pageTemplateFields_ = templateFields.filter(f => f.page === pageNum);
    const orderedPageSignatureFields = [...pageFields_.filter(f => f.field_type === "signature")].sort((a, b) => {
      if (a.pos_y !== b.pos_y) return a.pos_y - b.pos_y;
      return a.pos_x - b.pos_x;
    });

    const dataTemplateFields = pageTemplateFields_.filter(f => f.field_type !== "assinatura");
    const signatureTemplateFields = hasContractSignatureFields
      ? []
      : [...pageTemplateFields_.filter(f => f.field_type === "assinatura")].sort((a, b) => {
          if (a.pos_y !== b.pos_y) return a.pos_y - b.pos_y;
          return a.pos_x - b.pos_x;
        });

    const pageSize = pageSizes[pageNum - 1];
    if (!pageSize) return null;
    const yOffset = pageOffsets[pageNum - 1] ?? 0;

    return (
      <div key={`overlay-page-${pageNum}`}>
        {/* Template data fields */}
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
                top: yOffset + field.pos_y * scale,
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

        {/* Signature stamps at template tag positions */}
        {signatureTemplateFields.map((field, idx) => {
          const signer = orderedSigners[idx];
          const isSigned = signer?.status === "assinado" && signer?.signed_at;
          return (
            <div
              key={`sig-tmpl-${field.id}`}
              className="absolute overflow-hidden pointer-events-none"
              style={{
                left: field.pos_x * scale,
                top: yOffset + field.pos_y * scale,
                width: field.width * scale,
                height: field.height * scale,
              }}
            >
              {isSigned ? (
                <div className="h-full w-full rounded-md border border-primary/30 bg-primary/5 p-1 flex items-center gap-2">
                  {signer.signature_photo_url && (
                    <img
                      src={signer.signature_photo_url}
                      alt="Foto"
                      className="h-full w-auto rounded object-cover shrink-0"
                      style={{ maxWidth: "35%" }}
                    />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 shrink-0 text-primary" />
                      <span className="truncate text-[8px] font-bold text-primary">Assinado Digitalmente</span>
                    </div>
                    <span className="truncate text-[7px] font-semibold text-foreground">{signer.name}</span>
                    {signer.cpf_cnpj && <span className="truncate text-[6px] text-muted-foreground">CPF/CNPJ: {signer.cpf_cnpj}</span>}
                    {signer.signed_at && <span className="truncate text-[6px] text-muted-foreground">{new Date(signer.signed_at).toLocaleString("pt-BR")}</span>}
                    {signer.signer_ip && <span className="truncate text-[6px] text-muted-foreground">IP: {signer.signer_ip}</span>}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md">
                  <span className="text-[9px] text-muted-foreground">{signer?.name ? `${signer.name} - Pendente` : "Assinatura"}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Other signers' fields */}
        {otherFields.map(field => {
          const signer = resolveSignatureSigner(field, orderedPageSignatureFields);
          const isSigned = field.field_type === "signature" ? isSignatureFieldSigned(field, orderedPageSignatureFields) : signedFieldIds.includes(field.id);
          return (
            <div
              key={field.id}
              className={cn("absolute rounded-md border-2 flex pointer-events-none", isSigned ? "border-solid items-start p-1" : "border-dashed items-center justify-center opacity-50")}
              style={{
                left: field.pos_x,
                top: yOffset + field.pos_y,
                width: field.width,
                height: field.height,
                borderColor: field.signer_color || "#9ca3af",
                backgroundColor: isSigned ? `${field.signer_color || "#9ca3af"}15` : `${field.signer_color || "#9ca3af"}10`,
              }}
            >
              {isSigned && signer?.status === "assinado" ? (
                <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 shrink-0" style={{ color: field.signer_color || "#16a34a" }} />
                    <span className="text-[8px] font-bold truncate" style={{ color: "#1e40af" }}>Assinado Digitalmente</span>
                  </div>
                  <span className="text-[7px] font-semibold truncate" style={{ color: "#111" }}>{signer.name}</span>
                  {signer.cpf_cnpj && <span className="text-[6px] truncate" style={{ color: "#555" }}>CPF/CNPJ: {signer.cpf_cnpj}</span>}
                  {signer.signed_at && <span className="text-[6px] truncate" style={{ color: "#555" }}>{new Date(signer.signed_at).toLocaleString("pt-BR")}</span>}
                </div>
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
          const signer = resolveSignatureSigner(field, orderedPageSignatureFields);
          const isSigned = field.field_type === "signature" ? isSignatureFieldSigned(field, orderedPageSignatureFields) : signedFieldIds.includes(field.id);
          return (
            <button
              key={field.id}
              disabled={isSigned}
              onClick={() => !isSigned && onFieldClick(field)}
              className={cn(
                "absolute rounded-md border-2 flex transition-all",
                isSigned
                  ? "border-solid cursor-default items-start p-1"
                  : "border-dashed cursor-pointer hover:shadow-lg hover:scale-[1.02] animate-pulse items-center justify-center"
              )}
              style={{
                left: field.pos_x,
                top: yOffset + field.pos_y,
                width: field.width,
                height: field.height,
                borderColor: field.signer_color || "#3b82f6",
                backgroundColor: isSigned ? `${field.signer_color || "#3b82f6"}15` : `${field.signer_color || "#3b82f6"}15`,
              }}
            >
              {isSigned && signer?.status === "assinado" ? (
                <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 shrink-0" style={{ color: "#16a34a" }} />
                    <span className="text-[8px] font-bold truncate" style={{ color: "#1e40af" }}>Assinado Digitalmente</span>
                  </div>
                  <span className="text-[7px] font-semibold truncate" style={{ color: "#111" }}>{signer.name}</span>
                  {signer.cpf_cnpj && <span className="text-[6px] truncate" style={{ color: "#555" }}>CPF/CNPJ: {signer.cpf_cnpj}</span>}
                  {signer.signed_at && <span className="text-[6px] truncate" style={{ color: "#555" }}>{new Date(signer.signed_at).toLocaleString("pt-BR")}</span>}
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
    );
  };

  const totalHeight = pageSizes.reduce((sum, s, i) => sum + s.height + (i < pageSizes.length - 1 ? PAGE_GAP : 0), 0);
  const maxWidth = pageSizes.reduce((max, s) => Math.max(max, s.width), 0);

  return (
    <div className="relative mx-auto overflow-auto rounded-lg border bg-muted/20" style={{ maxHeight: "65vh" }}>
      <div className="relative" style={{ width: maxWidth || "auto", height: totalHeight || "auto", margin: "0 auto" }}>
        <PdfAllPagesRenderer
          pdfUrl={pdfUrl}
          scale={scale}
          onTotalPages={setTotalPages}
          onPageSizes={setPageSizes}
        />

        {/* Overlays for each page */}
        {Array.from({ length: totalPages }, (_, i) => renderPageOverlay(i + 1))}
        {/* Default signature stamps when no fields exist */}
        {Array.from({ length: totalPages }, (_, i) => renderDefaultSignatureStamps(i + 1))}
      </div>
    </div>
  );
}
