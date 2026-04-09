import { useState, useEffect, useRef, useCallback } from "react";
import { Paperclip, Upload, Trash2, Eye, Download, Loader2, FileText, CreditCard, MapPin, Building2, FileSignature, CheckCircle2, Shield, User, Plus, ChevronDown, FolderOpen, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSignedContractPdf } from "@/lib/generateSignedContractPdf";
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
  signers: ContractSigner[];
}

interface ContractSigner {
  signer_name: string | null;
  signer_role: string;
  signer_document: string | null;
  signed_at: string | null;
  signer_ip: string | null;
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
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

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

    // Fetch signers for each signed contract (deduplicated by role)
    const contractsWithSigners: SignedContract[] = [];
    for (const contract of (signedContractsData || [])) {
      const { data: sigs } = await supabase
        .from("contract_signatures")
        .select("signer_name, signer_role, signer_document, signed_at, signer_ip, signature_photo_url")
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: true });

      // Deduplicate by signer_role - keep the signed one or latest
      const roleMap = new Map<string, ContractSigner>();
      for (const s of (sigs || []) as any[]) {
        const role = s.signer_role || "signatário";
        const existing = roleMap.get(role);
        if (!existing || (s.signed_at && !existing.signed_at)) {
          roleMap.set(role, {
            signer_name: s.signer_name,
            signer_role: role,
            signer_document: s.signer_document,
            signed_at: s.signed_at,
            signer_ip: s.signer_ip,
            signature_photo_url: s.signature_photo_url,
          });
        }
      }

      contractsWithSigners.push({
        ...(contract as unknown as SignedContract),
        signers: Array.from(roleMap.values()),
      });
    }
    setSignedContracts(contractsWithSigners);

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

  const buildSignedPdfBlob = async (contract: SignedContract): Promise<Blob> => {
    const baseSigner = contract.signers.length > 0
      ? contract.signers.map((s) => ({
          name: s.signer_name || "---",
          role: s.signer_role || "signatario",
          email: null as string | null,
          document: s.signer_document,
          birth_date: null as string | null,
          signed_at: s.signed_at,
          ip: s.signer_ip,
          signature_photo_url: s.signature_photo_url,
        }))
      : [{
          name: contract.signer_name || "---",
          role: "signatario",
          email: null as string | null,
          document: contract.signer_document,
          birth_date: null as string | null,
          signed_at: contract.signed_at,
          ip: null as string | null,
          signature_photo_url: contract.signature_photo_url,
        }];

    // Enrich signers with profile/lead data
    const signers = await Promise.all(
      baseSigner.map(async (s) => {
        const isClient = s.role === "cliente" || s.role === "signatario";
        const isVendor = s.role === "vendedor";

        // For clients, enrich from lead data
        if (isClient && lead) {
          return {
            ...s,
            name: lead.contact_name || s.name,
            email: s.email || lead.email || null,
            document: s.document || lead.documento || null,
            birth_date: s.birth_date,
            company_name: lead.company_name || null,
          };
        }

        // For vendors, enrich from profiles table
        if (isVendor && s.name && s.name !== "---") {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, cpf, birth_date")
            .eq("name", s.name)
            .maybeSingle();
          if (profileData) {
            return {
              ...s,
              email: s.email || (profileData as any).email || null,
              document: s.document || (profileData as any).cpf || null,
              birth_date: (profileData as any).birth_date || null,
            };
          }
        }

        // Fallback: try profile lookup by name
        if (s.name && s.name !== "---") {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, cpf, birth_date")
            .eq("name", s.name)
            .maybeSingle();
          if (profileData) {
            return {
              ...s,
              email: s.email || (profileData as any).email || null,
              document: s.document || (profileData as any).cpf || null,
              birth_date: (profileData as any).birth_date || null,
            };
          }
        }

        return s;
      })
    );

    let pdfUrl = contract.pdf_url || "";
    let tempUrl: string | null = null;

    if (!pdfUrl && contract.contract_content) {
      const basePdfBlob = generateContractPdf({
        content: contract.contract_content,
        code: contract.code,
        companyName: lead.company_name,
      });
      tempUrl = URL.createObjectURL(basePdfBlob);
      pdfUrl = tempUrl;
    }

    if (!pdfUrl) throw new Error("PDF do contrato não disponível");

    try {
      return await generateSignedContractPdf({
        pdfUrl,
        code: contract.code,
        companyName: lead.company_name,
        documentHash: contract.document_hash || "",
        validationCode: contract.validation_code || "",
        signedAt: contract.signed_at || new Date().toISOString(),
        signers,
        validationUrl: `${window.location.origin}/validar-documento/${contract.validation_code || ""}`,
      });
    } finally {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    }
  };

  const handleViewClientContract = async (contract: SignedContract) => {
    setGeneratingPdf(contract.id);
    try {
      const blob = await buildSignedPdfBlob(contract);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PDF");
    }
    setGeneratingPdf(null);
  };

  const handleDownloadClientContract = async (contract: SignedContract) => {
    setGeneratingPdf(contract.id);
    try {
      const blob = await buildSignedPdfBlob(contract);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contract.code}_assinado.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Contrato assinado baixado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao baixar contrato");
    }
    setGeneratingPdf(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // General file upload
  const generalFileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleGeneralUpload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      await handleUpload("outro", file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleGeneralUpload(e.dataTransfer.files);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) handleGeneralUpload(files);
  }, []);

  const hasSignedContracts = signedContracts.length > 0 || signedPdfContracts.length > 0;
  const allDocs = docs;

  return (
    <div className="space-y-6" onPaste={handlePaste}>
      {/* Documentos Gerados Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" /> Documentos Gerados ({signedContracts.length + signedPdfContracts.length})
          </h3>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Gerar Documento
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>

        {hasSignedContracts ? (
          <div className="space-y-2">
            {signedContracts.map((contract) => {
              const isGenerating = generatingPdf === contract.id;
              const roleLabels: Record<string, string> = {
                cliente: "Cliente",
                vendedor: "Vendedor",
                testemunha: "Testemunha",
                diretor: "Diretor/CEO",
              };
              return (
                <Card key={contract.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{contract.code} — {lead.company_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {contract.signed_at && (
                              <span>{new Date(contract.signed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            )}
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                              {contract.signature_status === "signed"
                                ? "Assinado"
                                : `Enviado p/ Assinatura (${contract.signers.filter(s => s.signed_at).length}/${contract.signers.length})`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewClientContract(contract)} disabled={isGenerating} title="Visualizar">
                          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadClientContract(contract)} disabled={isGenerating} title="Baixar">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {signedPdfContracts.map((contract) => {
              const pdfUrl = contract.pdf_assinado_url || contract.pdf_url;
              return (
                <Card key={contract.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{contract.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(contract.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/50 text-green-600 dark:text-green-400">
                              Concluído
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewSignedPdf(pdfUrl)} title="Visualizar">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadSignedPdf(pdfUrl, `${contract.name}.pdf`)} title="Baixar">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-border/50">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p className="text-sm">Nenhum documento gerado ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* General Upload Area */}
      <div>
        <input
          ref={generalFileRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            if (e.target.files) handleGeneralUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onClick={() => generalFileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1.5">
            <Upload className="h-4 w-4" /> Enviar arquivos
          </p>
          <p className="text-xs text-muted-foreground mt-1">Arraste arquivos ou clique para selecionar</p>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">Dica: Cole imagens diretamente com Ctrl+V</p>
      </div>

      {/* Uploaded Files List */}
      {allDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4" /> Arquivos Enviados ({allDocs.length})
          </h3>
          <div className="space-y-2">
            {allDocs.map((doc) => {
              const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.file_name);
              return (
                <Card key={doc.id} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {isImage ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.uploaded_by_name || "—"} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                            {doc.doc_type !== "outro" && (
                              <> • <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">{DOC_TYPES.find(d => d.key === doc.doc_type)?.label || doc.doc_type}</Badge></>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                          <a href={doc.file_url} download={doc.file_name}><Download className="h-3.5 w-3.5" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(doc)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state for files */}
      {allDocs.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="p-8 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum arquivo enviado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
