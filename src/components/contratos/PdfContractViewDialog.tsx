import { useEffect, useState } from "react";
import {
  CheckCircle2, Clock, XCircle, Eye, Copy, User, MapPin, Send,
  Shield, Download, Hash, Globe, MessageSquare, Award, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildSignedPdfBlob } from "@/lib/buildSignedPdfBlob";
import { PdfSigningOverlay } from "./PdfSigningOverlay";
import { PdfAllPagesRenderer } from "./PdfAllPagesRenderer";
import type { PdfContract, PdfContractSigner, PdfContractHistory } from "@/hooks/usePdfContracts";

const signerStatusConfig: Record<string, { label: string; className: string; emoji: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-300", emoji: "🟡" },
  assinado: { label: "Assinado", className: "bg-green-100 text-green-800 border-green-300", emoji: "🟢" },
  recusado: { label: "Recusado", className: "bg-red-100 text-red-800 border-red-300", emoji: "🔴" },
};

interface Props {
  contract: (PdfContract & { document_hash?: string; validation_code?: string }) | null;
  signers: PdfContractSigner[];
  history: PdfContractHistory[];
  onClose: () => void;
  canManage: boolean;
  onCancel: (id: string) => void;
}

export function PdfContractViewDialog({ contract, signers: initialSigners, history, onClose, canManage, onCancel }: Props) {
  const [currentContract, setCurrentContract] = useState<Props["contract"]>(contract);
  const [signers, setSigners] = useState(initialSigners);
  const [signedFieldIds, setSignedFieldIds] = useState<string[]>([]);

  useEffect(() => {
    setCurrentContract(contract);
  }, [contract]);

  useEffect(() => {
    setSigners(initialSigners);
  }, [initialSigners]);

  useEffect(() => {
    if (!currentContract?.id) return;

    const channel = supabase
      .channel(`pdf-contract-live-${currentContract.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pdf_contract_signers", filter: `contract_id=eq.${currentContract.id}` },
        (payload) => {
          const updated = payload.new as any;
          setSigners((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
          if (updated.status === "assinado") {
            toast.success(`${updated.name} assinou o contrato!`);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pdf_contracts", filter: `id=eq.${currentContract.id}` },
        (payload) => {
          const updatedContract = payload.new as any;
          setCurrentContract((prev) => (prev ? { ...prev, ...updatedContract } : updatedContract));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentContract?.id]);

  useEffect(() => {
    if (!currentContract?.id) return;

    const refreshContract = async () => {
      const { data } = await supabase
        .from("pdf_contracts")
        .select("*")
        .eq("id", currentContract.id)
        .single();

      if (data) {
        setCurrentContract((prev) => (prev ? { ...prev, ...(data as any) } : (data as any)));
      }
    };

    if (signers.length > 0 && signers.every((signer) => signer.status === "assinado")) {
      void refreshContract();
    }
  }, [currentContract?.id, signers]);

  useEffect(() => {
    if (!currentContract?.id) {
      setSignedFieldIds([]);
      return;
    }

    const loadSignedFields = async () => {
      const { data } = await supabase
        .from("pdf_contract_fields")
        .select("id")
        .eq("contract_id", currentContract.id)
        .eq("value", "signed");

      setSignedFieldIds((data || []).map((field: any) => field.id));
    };

    void loadSignedFields();

    const channel = supabase
      .channel(`pdf-contract-fields-${currentContract.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pdf_contract_fields", filter: `contract_id=eq.${currentContract.id}` },
        () => {
          void loadSignedFields();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentContract?.id]);

  if (!currentContract) return null;

  const getSigningLink = (token: string) => `${window.location.origin}/assinar-pdf/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getSigningLink(token));
    toast.success("Link copiado!");
  };

  const isSigned = currentContract.status === "assinado";
  const signedCount = signers.filter((s) => s.status === "assinado").length;
  const progressPercent = signers.length > 0 ? (signedCount / signers.length) * 100 : 0;
  const previewPdfUrl = currentContract.pdf_assinado_url || currentContract.pdf_url;

  const sendWhatsApp = (signer: PdfContractSigner) => {
    const link = getSigningLink(signer.signing_token);
    const message = `Olá, ${signer.name}! 👋\n\nSeu contrato "${currentContract.name}" está pronto para assinatura.\n\n👉 Assine aqui:\n${link}\n\nÉ rápido e pode ser feito pelo celular.\n\nSe tiver dúvidas, estou à disposição!`;
    window.open(`https://wa.me/${signer.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const sendAllWhatsApp = () => {
    const pendingSigners = signers.filter((s) => s.status === "pendente" && s.phone);
    if (pendingSigners.length === 0) {
      toast.error("Nenhum contratante pendente com telefone cadastrado.");
      return;
    }
    pendingSigners.forEach((s, i) => {
      setTimeout(() => sendWhatsApp(s), i * 1000);
    });
    toast.success(`Enviando para ${pendingSigners.length} contratante(s)...`);
  };

  const handleDownloadSignedPdf = async () => {
    try {
      if (currentContract.pdf_assinado_url) {
        const response = await fetch(currentContract.pdf_assinado_url);
        if (!response.ok) {
          throw new Error("Falha ao baixar o PDF assinado");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentContract.name}_assinado.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("PDF assinado baixado com sucesso!");
        return;
      }

      if (!currentContract.document_hash || !currentContract.validation_code) {
        toast.error("Documento sem dados de validação");
        return;
      }

      const blob = await buildSignedPdfBlob({
        contract: currentContract,
        signers,
        companyName: currentContract.created_by_name || "Empresa",
        validationUrl: `${window.location.origin}/validar-documento/${currentContract.validation_code}`,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentContract.name}_assinado.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF com comprovante de assinatura baixado!");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível baixar o PDF assinado.");
    }
  };

  const copyValidationLink = () => {
    if (!currentContract.validation_code) return;
    const link = `${window.location.origin}/validar-documento/${currentContract.validation_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de validação copiado!");
  };

  return (
    <Dialog open={!!currentContract} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {currentContract.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className={cn("text-sm", {
              "bg-yellow-100 text-yellow-800 border-yellow-300": currentContract.status === "pendente",
              "bg-green-100 text-green-800 border-green-300": currentContract.status === "assinado",
              "bg-red-100 text-red-800 border-red-300": currentContract.status === "cancelado",
            })}>
              {currentContract.status === "pendente" ? "🟡 Pendente" : currentContract.status === "assinado" ? "🟢 Assinado" : "🔴 Cancelado"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Criado em {new Date(currentContract.created_at).toLocaleDateString("pt-BR")}
              {currentContract.created_by_name && ` por ${currentContract.created_by_name}`}
            </span>
          </div>

          {currentContract.description && (
            <p className="text-sm text-muted-foreground">{currentContract.description}</p>
          )}

          {signers.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{signedCount} de {signers.length} assinatura(s)</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          )}

          {canManage && currentContract.status === "pendente" && signers.some((s) => s.status === "pendente" && s.phone) && (
            <Button onClick={sendAllWhatsApp} variant="outline" className="w-full gap-2">
              <MessageSquare className="h-4 w-4" />
              Enviar para todos via WhatsApp ({signers.filter((s) => s.status === "pendente" && s.phone).length})
            </Button>
          )}

          {isSigned && currentContract.document_hash && currentContract.validation_code && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm text-foreground">Validade Jurídica</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Documento assinado digitalmente com validade jurídica, conforme a Medida Provisória nº 2.200-2/2001.
                </p>
                <div className="grid gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground break-all">Hash: {currentContract.document_hash.slice(0, 32)}...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono text-muted-foreground">Código: {currentContract.validation_code}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={copyValidationLink}>
                    <Copy className="h-3 w-3" /> Link de Validação
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={handleDownloadSignedPdf}>
                    <Download className="h-3 w-3" /> Baixar PDF Assinado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border overflow-hidden bg-muted/20">
            {previewPdfUrl ? (
              currentContract.pdf_assinado_url ? (
                <div className="p-4">
                  <PdfAllPagesRenderer pdfUrl={previewPdfUrl} scale={1.2} />
                </div>
              ) : (
                <PdfSigningOverlay
                  contractId={currentContract.id}
                  pdfUrl={currentContract.pdf_url}
                  currentSignerId=""
                  onFieldClick={() => undefined}
                  signedFieldIds={signedFieldIds}
                />
              )
            ) : (
              <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
                PDF do contrato indisponível.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Contratantes ({signers.length})</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {signers.map((signer) => {
                const cfg = signerStatusConfig[signer.status] || signerStatusConfig.pendente;
                return (
                  <Card key={signer.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{signer.name}</span>
                        </div>
                        <Badge variant="outline" className={cn("text-xs", cfg.className)}>
                          {cfg.emoji} {cfg.label}
                        </Badge>
                      </div>
                      {signer.cpf_cnpj && <p className="text-xs font-mono text-muted-foreground">{signer.cpf_cnpj}</p>}
                      {signer.email && <p className="text-xs text-muted-foreground">{signer.email}</p>}

                      {signer.status === "pendente" && currentContract.status === "pendente" && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => copyLink(signer.signing_token)}>
                            <Copy className="h-3 w-3" /> Link
                          </Button>
                          {signer.phone && (
                            <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => sendWhatsApp(signer)}>
                              <Send className="h-3 w-3" /> WhatsApp
                            </Button>
                          )}
                        </div>
                      )}

                      {signer.status === "assinado" && signer.signed_at && (
                        <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                          <p>Assinado em: {new Date(signer.signed_at).toLocaleString("pt-BR")}</p>
                          {signer.signer_ip && <p>IP: {signer.signer_ip}</p>}
                          {signer.signature_address && (
                            <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {signer.signature_address}</p>
                          )}
                          {signer.signature_photo_url && (
                            <div className="pt-1">
                              <img src={signer.signature_photo_url} alt="Foto" className="w-16 h-16 rounded-md border object-cover" />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {canManage && currentContract.status === "pendente" && (
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => onCancel(currentContract.id)}>
                Cancelar Contrato
              </Button>
            </div>
          )}

          {history.length > 0 && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Histórico</h3>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="text-foreground">{h.description || h.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString("pt-BR")}
                        {h.created_by_name && ` · ${h.created_by_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
