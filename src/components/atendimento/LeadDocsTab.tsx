import { useState, useEffect } from "react";
import { Paperclip, Upload, Trash2, Eye, Download, Loader2, FileText, CreditCard, MapPin, Building2, FileSignature, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { downloadSignedContractPdf } from "@/lib/generateSignedContractPdf";
import { generateContractPdf } from "@/lib/generateContractPdf";
import type { CrmLead } from "@/hooks/useCrmLeads";

interface LeadDocsTabProps {
  lead: CrmLead;
}

interface LeadDoc {
  id: string;
  lead_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_path: string;
  file_size: number | null;
  uploaded_by_name: string | null;
  created_at: string;
}

interface SignedContract {
  id: string;
  code: string;
  signature_status: string;
  signed_at: string | null;
  validation_code: string | null;
  document_hash: string | null;
  pdf_url: string | null;
  pdf_assinado_url: string | null;
  created_at: string;
  contract_content: string | null;
  company_id: string;
  signer_name: string | null;
  signer_document: string | null;
  signature_photo_url: string | null;
}

interface SignedPdfContract {
  id: string;
  name: string;
  status: string;
  pdf_assinado_url: string | null;
  pdf_url: string;
  validation_code: string | null;
  document_hash: string | null;
  created_at: string;
}

const DOC_TYPES = [
  { key: "cnh", label: "CNH", icon: CreditCard, description: "Carteira Nacional de Habilitação" },
  { key: "cnpj", label: "CNPJ", icon: Building2, description: "Cartão CNPJ ou Contrato Social" },
  { key: "comprovante_endereco", label: "Comprovante de Endereço", icon: MapPin, description: "Conta de luz, água ou telefone" },
  { key: "rg", label: "RG", icon: FileText, description: "Registro Geral" },
  { key: "outro", label: "Outro", icon: Paperclip, description: "Outros documentos" },
];

export function LeadDocsTab({ lead }: LeadDocsTabProps) {
  const { profile } = useAuth();
  const [docs, setDocs] = useState<LeadDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([]);
  const [signedPdfContracts, setSignedPdfContracts] = useState<SignedPdfContract[]>([]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lead_documents")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setDocs((data as LeadDoc[]) || []);
    }
    setLoading(false);
  };

  const fetchSignedContracts = async () => {
    const { data: signedContractsData } = await supabase
      .from("contracts")
      .select("id, code, signature_status, signed_at, validation_code, document_hash, pdf_url, pdf_assinado_url, created_at, contract_content, company_id, signer_name, signer_document, signature_photo_url")
      .eq("lead_id", lead.id)
      .eq("signature_status", "signed");
    setSignedContracts((signedContractsData as unknown as SignedContract[]) || []);

    const { data: pdfContracts } = await supabase
      .from("pdf_contracts")
      .select("id, name, status, pdf_assinado_url, pdf_url, validation_code, document_hash, created_at")
      .eq("servidor_id", lead.servidor_id)
      .eq("status", "concluido");
    setSignedPdfContracts((pdfContracts as SignedPdfContract[]) || []);
  };

  useEffect(() => {
    fetchDocs();
    fetchSignedContracts();
  }, [lead.id]);

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `lead-docs/${lead.id}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("contract-pdfs")
        .upload(filePath, file, { contentType: file.type });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("contract-pdfs").getPublicUrl(filePath);

      const { error: insertErr } = await (supabase as any).from("lead_documents").insert({
        lead_id: lead.id,
        servidor_id: lead.servidor_id,
        doc_type: docType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_path: filePath,
        file_size: file.size,
        uploaded_by_name: profile?.name || null,
        uploaded_by_user_id: profile?.user_id || null,
      } as any);
      if (insertErr) throw insertErr;

      toast.success("Documento enviado!");
      await fetchDocs();
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    }
    setUploading(null);
  };

  const handleDelete = async (doc: LeadDoc) => {
    await supabase.storage.from("contract-pdfs").remove([doc.file_path]);
    await (supabase as any).from("lead_documents").delete().eq("id", doc.id);
    toast.success("Documento removido!");
    await fetchDocs();
  };

  const getDocsForType = (type: string) => docs.filter((d) => d.doc_type === type);

  const handleViewSignedPdf = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSignedPdf = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDownloadClientContract = async (contract: SignedContract) => {
    try {
      // Fetch signers from contract_signatures
      const { data: signers } = await supabase
        .from("contract_signatures")
        .select("*")
        .eq("contract_id", contract.id);

      const signerList = (signers && signers.length > 0)
        ? signers.filter((s: any) => s.signed_at).map((s: any) => ({
            id: s.id,
            name: s.signer_name || "—",
            role: s.signer_role || "signatário",
            email: null,
            document: s.signer_document,
            signed_at: s.signed_at,
            ip: s.signer_ip,
            signature_photo_url: s.signature_photo_url,
          }))
        : [{
            name: contract.signer_name || lead.company_name,
            role: "signatário",
            document: contract.signer_document,
            signed_at: contract.signed_at,
            ip: null,
            signature_photo_url: contract.signature_photo_url,
          }];

      // Get company name
      const { data: company } = await supabase
        .from("companies")
        .select("razao_social")
        .eq("id", contract.company_id)
        .single();

      const companyName = company?.razao_social || lead.company_name;

      // Use existing pdf_url or generate from content
      let pdfUrl = "";
      let tempUrl: string | null = null;

      if (contract.pdf_url) {
        pdfUrl = contract.pdf_url;
      } else if (contract.contract_content) {
        const basePdfBlob = generateContractPdf({
          content: contract.contract_content,
          code: contract.code,
          companyName,
        });
        tempUrl = URL.createObjectURL(basePdfBlob);
        pdfUrl = tempUrl;
      } else {
        toast.error("Conteúdo do contrato não disponível");
        return;
      }

      await downloadSignedContractPdf({
        pdfUrl,
        code: contract.code,
        companyName,
        documentHash: contract.document_hash || "",
        validationCode: contract.validation_code || "",
        signedAt: contract.signed_at || new Date().toISOString(),
        signers: signerList,
        validationUrl: `${window.location.origin}/validar-documento/${contract.validation_code || ""}`,
      });

      if (tempUrl) URL.revokeObjectURL(tempUrl);
      toast.success("Contrato assinado baixado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao baixar contrato: " + (err?.message || ""));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasSignedContracts = signedContracts.length > 0 || signedPdfContracts.length > 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Paperclip className="h-4 w-4" /> Documentos do Lead
      </h3>

      {/* Signed Contracts Section */}
      {hasSignedContracts && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <FileSignature className="h-3.5 w-3.5" /> Contratos Assinados
          </h4>

          {signedContracts.map((contract) => (
            <Card key={contract.id} className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{contract.code} — {lead.company_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {contract.signed_at && (
                          <span>Assinado em {new Date(contract.signed_at).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                      {contract.validation_code && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Shield className="h-3 w-3" /> Código: {contract.validation_code}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-0">
                      Assinado
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDownloadClientContract(contract)}
                      title="Visualizar contrato assinado"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleDownloadClientContract(contract)}
                      title="Baixar contrato assinado"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {signedPdfContracts.map((contract) => {
            const pdfUrl = contract.pdf_assinado_url || contract.pdf_url;
            return (
              <Card key={contract.id} className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{contract.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Concluído em {new Date(contract.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        {contract.validation_code && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Shield className="h-3 w-3" /> Código: {contract.validation_code}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-0">
                        Assinado
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleViewSignedPdf(pdfUrl)}
                        title="Visualizar contrato"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDownloadSignedPdf(pdfUrl, `${contract.name}.pdf`)}
                        title="Baixar contrato"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-3">
        {DOC_TYPES.map((dt) => {
          const typeDocs = getDocsForType(dt.key);
          const Icon = dt.icon;
          return (
            <Card key={dt.key} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{dt.label}</p>
                      <p className="text-xs text-muted-foreground">{dt.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {typeDocs.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {typeDocs.length} arquivo{typeDocs.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <label>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(dt.key, f);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        asChild
                        disabled={uploading === dt.key}
                      >
                        <span>
                          {uploading === dt.key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="h-3 w-3" />
                          )}
                          Upload
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {typeDocs.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {typeDocs.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{doc.file_name}</p>
                          <p className="text-muted-foreground">
                            {doc.uploaded_by_name || "—"} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                            <a href={doc.file_url} download={doc.file_name}>
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
