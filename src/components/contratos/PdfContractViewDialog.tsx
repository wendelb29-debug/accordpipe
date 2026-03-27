import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, XCircle, Eye, Copy, User, MapPin, Camera, Link2, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PdfContract, PdfContractSigner, PdfContractHistory } from "@/hooks/usePdfContracts";

const signerStatusConfig: Record<string, { label: string; className: string; emoji: string }> = {
  pendente: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-300", emoji: "🟡" },
  assinado: { label: "Assinado", className: "bg-green-100 text-green-800 border-green-300", emoji: "🟢" },
  recusado: { label: "Recusado", className: "bg-red-100 text-red-800 border-red-300", emoji: "🔴" },
};

interface Props {
  contract: PdfContract | null;
  signers: PdfContractSigner[];
  history: PdfContractHistory[];
  onClose: () => void;
  canManage: boolean;
  onCancel: (id: string) => void;
}

export function PdfContractViewDialog({ contract, signers, history, onClose, canManage, onCancel }: Props) {
  if (!contract) return null;

  const getSigningLink = (token: string) => `${window.location.origin}/assinar-pdf/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getSigningLink(token));
    toast.success("Link copiado!");
  };

  return (
    <Dialog open={!!contract} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            {contract.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status & Info */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className={cn("text-sm", {
              "bg-yellow-100 text-yellow-800 border-yellow-300": contract.status === "pendente",
              "bg-green-100 text-green-800 border-green-300": contract.status === "assinado",
              "bg-red-100 text-red-800 border-red-300": contract.status === "cancelado",
            })}>
              {contract.status === "pendente" ? "🟡 Pendente" : contract.status === "assinado" ? "🟢 Assinado" : "🔴 Cancelado"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Criado em {new Date(contract.created_at).toLocaleDateString("pt-BR")}
              {contract.created_by_name && ` por ${contract.created_by_name}`}
            </span>
          </div>

          {contract.description && (
            <p className="text-sm text-muted-foreground">{contract.description}</p>
          )}

          {/* PDF Viewer */}
          <div className="rounded-lg border overflow-hidden">
            <iframe
              src={contract.pdf_url}
              className="w-full h-[50vh]"
              title="Visualização do contrato PDF"
            />
          </div>

          {/* Signers */}
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

                      {signer.status === "pendente" && contract.status === "pendente" && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button variant="outline" size="sm" className="gap-1 text-xs h-7" onClick={() => copyLink(signer.signing_token)}>
                            <Copy className="h-3 w-3" /> Copiar Link
                          </Button>
                          {signer.email && (
                            <Button variant="outline" size="sm" className="gap-1 text-xs h-7"
                              onClick={() => {
                                const link = getSigningLink(signer.signing_token);
                                window.open(`https://wa.me/?text=${encodeURIComponent(`Olá ${signer.name}, segue o link para assinatura do contrato "${contract.name}": ${link}`)}`, "_blank");
                              }}
                            >
                              <Send className="h-3 w-3" /> WhatsApp
                            </Button>
                          )}
                        </div>
                      )}

                      {signer.status === "assinado" && signer.signed_at && (
                        <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
                          <p>Assinado em: {new Date(signer.signed_at).toLocaleString("pt-BR")}</p>
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

          {/* Cancel Button */}
          {canManage && contract.status === "pendente" && (
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => onCancel(contract.id)}>
                Cancelar Contrato
              </Button>
            </div>
          )}

          {/* History */}
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
