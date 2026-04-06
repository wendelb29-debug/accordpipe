import { useState, useEffect, useCallback } from "react";
import {
  Plus, Copy, CheckCircle2, Clock, User, UserPlus, Link2,
  Loader2, Trash2, MessageSquare, Shield, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ClientContractSigner {
  id: string;
  contract_id: string;
  name: string;
  email: string | null;
  signer_type: string;
  is_required: boolean;
  status: string;
  sign_order: number;
  signing_token: string;
  signed_at: string | null;
  signer_ip: string | null;
  signer_document: string | null;
  signature_photo_url: string | null;
  signature_address: string | null;
  signature_latitude: number | null;
  signature_longitude: number | null;
  created_at: string;
}

const signerTypeLabels: Record<string, string> = {
  cliente: "Cliente",
  vendedor: "Vendedor",
  testemunha: "Testemunha",
  diretor: "Diretor",
  ceo: "CEO",
};

const signerTypeColors: Record<string, string> = {
  cliente: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  vendedor: "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
  testemunha: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  diretor: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  ceo: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800",
};

interface ContractSignersManagerProps {
  contractId: string;
  contractStatus: string;
  clientName: string;
  clientCpf?: string | null;
  onAllSigned?: () => void;
}

export function ContractSignersManager({
  contractId,
  contractStatus,
  clientName,
  clientCpf,
  onAllSigned,
}: ContractSignersManagerProps) {
  const { profile } = useAuth();
  const [signers, setSigners] = useState<ClientContractSigner[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  // New signer form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDocument, setNewDocument] = useState("");
  const [newType, setNewType] = useState("testemunha");
  const [newRequired, setNewRequired] = useState(false);
  const [adding, setAdding] = useState(false);

  const isPending = contractStatus === "pendente";

  const fetchSigners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_contract_signers")
      .select("*")
      .eq("contract_id", contractId)
      .order("sign_order", { ascending: true });
    if (!error) setSigners((data as ClientContractSigner[]) || []);
    setLoading(false);
  }, [contractId]);

  // Auto-create default signers (client + vendedor) if none exist
  const ensureDefaultSigners = useCallback(async () => {
    if (signers.length > 0 || !isPending) return;

    const defaultSigners = [
      {
        contract_id: contractId,
        name: clientName || "Cliente",
        email: null,
        signer_type: "cliente",
        is_required: true,
        sign_order: 1,
        signer_document: clientCpf || null,
      },
      {
        contract_id: contractId,
        name: profile?.name || "Vendedor",
        email: profile?.email || null,
        signer_type: "vendedor",
        is_required: true,
        sign_order: 2,
      },
    ];

    const { error } = await supabase
      .from("client_contract_signers")
      .insert(defaultSigners as any);

    if (!error) {
      await fetchSigners();
    }
  }, [contractId, clientName, clientCpf, profile, signers.length, isPending, fetchSigners]);

  useEffect(() => {
    fetchSigners();
  }, [fetchSigners]);

  useEffect(() => {
    if (!loading && signers.length === 0 && isPending) {
      ensureDefaultSigners();
    }
  }, [loading, signers.length, isPending, ensureDefaultSigners]);

  // Check if all required signed
  useEffect(() => {
    if (signers.length === 0) return;
    const requiredSigners = signers.filter(s => s.is_required);
    const allRequiredSigned = requiredSigners.every(s => s.status === "assinado");
    if (allRequiredSigned && requiredSigners.length > 0 && onAllSigned) {
      onAllSigned();
    }
  }, [signers, onAllSigned]);

  const handleAddSigner = async () => {
    if (!newName.trim()) {
      toast.error("Preencha o nome do signatário");
      return;
    }
    if (newEmail.trim()) {
      const exists = signers.find(s => s.email?.toLowerCase() === newEmail.trim().toLowerCase());
      if (exists) {
        toast.error("Este e-mail já está na lista");
        return;
      }
    }
    setAdding(true);
    try {
      const maxOrder = signers.reduce((max, s) => Math.max(max, s.sign_order), 0);
      const { error } = await supabase.from("client_contract_signers").insert({
        contract_id: contractId,
        name: newName.trim(),
        email: newEmail.trim() || null,
        signer_type: newType,
        is_required: newRequired,
        sign_order: maxOrder + 1,
        signer_document: newDocument.trim() || null,
      } as any);
      if (error) throw error;
      toast.success("Signatário adicionado!");
      setNewName("");
      setNewEmail("");
      setNewDocument("");
      setNewType("testemunha");
      setNewRequired(false);
      setAddOpen(false);
      await fetchSigners();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    }
    setAdding(false);
  };

  const handleDeleteSigner = async (id: string, type: string) => {
    if (type === "cliente" || type === "vendedor") {
      toast.error("Não é possível remover o cliente ou vendedor");
      return;
    }
    const { error } = await supabase
      .from("client_contract_signers")
      .delete()
      .eq("id", id);
    if (!error) {
      toast.success("Signatário removido");
      await fetchSigners();
    }
  };

  const getSigningLink = (token: string) => {
    return `${window.location.origin}/assinar/${token}`;
  };

  const handleCopyLink = (token: string, name: string) => {
    navigator.clipboard.writeText(getSigningLink(token));
    toast.success(`Link copiado para ${name}!`);
  };

  const handleSendWhatsApp = (token: string, name: string, phone?: string) => {
    const link = getSigningLink(token);
    const message = `Olá ${name},\nsegue o link para assinatura do contrato:\n\n${link}\n\nApós assinar, o sistema confirmará automaticamente.`;
    const cleanPhone = (phone || "").replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Stats
  const totalSigners = signers.length;
  const signedCount = signers.filter(s => s.status === "assinado").length;
  const requiredCount = signers.filter(s => s.is_required).length;
  const requiredSignedCount = signers.filter(s => s.is_required && s.status === "assinado").length;
  const progress = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0;
  const allRequiredSigned = requiredCount > 0 && requiredSignedCount === requiredCount;

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-primary" /> Assinaturas
        </h3>
        {isPending && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddOpen(true)}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar assinante
          </Button>
        )}
      </div>

      {/* Progress */}
      {totalSigners > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {signedCount} de {totalSigners} assinaturas concluídas
            </span>
            <span className={cn(
              "font-semibold",
              allRequiredSigned ? "text-green-600" : "text-amber-600"
            )}>
              {allRequiredSigned ? "✅ Todos obrigatórios assinaram" : `⏳ ${requiredCount - requiredSignedCount} obrigatório(s) pendente(s)`}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Signers list */}
      {signers.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum signatário cadastrado</p>
      ) : (
        <div className="space-y-2">
          {signers.map((signer) => {
            const isSigned = signer.status === "assinado";
            const typeColor = signerTypeColors[signer.signer_type] || signerTypeColors.testemunha;
            return (
              <Card key={signer.id} className={cn(
                "border-l-4 transition-all",
                isSigned
                  ? "border-l-green-500"
                  : "border-l-amber-400"
              )}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isSigned ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-foreground truncate">{signer.name}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-5 shrink-0", typeColor)}>
                          {signerTypeLabels[signer.signer_type] || signer.signer_type}
                        </Badge>
                        {signer.is_required && (
                          <Badge variant="outline" className="text-[10px] h-5 border-destructive/40 text-destructive shrink-0">
                            <Shield className="h-2.5 w-2.5 mr-0.5" /> Obrigatório
                          </Badge>
                        )}
                      </div>
                      {signer.email && (
                        <p className="text-[11px] text-muted-foreground ml-6 truncate">{signer.email}</p>
                      )}
                      {signer.signer_document && (
                        <p className="text-[11px] font-mono text-muted-foreground ml-6">{signer.signer_document}</p>
                      )}
                      {isSigned && signer.signed_at && (
                        <p className="text-[11px] text-green-600 ml-6">
                          ✅ Assinado em {new Date(signer.signed_at).toLocaleString("pt-BR")}
                        </p>
                      )}
                      {!isSigned && (
                        <button
                          onClick={() => handleCopyLink(signer.signing_token, signer.name)}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline ml-6 cursor-pointer"
                        >
                          <Link2 className="h-3 w-3" /> Link para assinatura
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isSigned && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopyLink(signer.signing_token, signer.name)}
                            title="Copiar link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSendWhatsApp(signer.signing_token, signer.name)}
                            title="Enviar via WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          {signer.signer_type !== "cliente" && signer.signer_type !== "vendedor" && isPending && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSigner(signer.id, signer.signer_type)}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                      {signer.signature_photo_url && (
                        <img
                          src={signer.signature_photo_url}
                          alt="Foto"
                          className="h-8 w-8 rounded object-cover border"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Signer Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Adicionar Assinante
            </DialogTitle>
            <DialogDescription>Preencha os dados da pessoa que irá assinar o contrato</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Nome completo *</Label>
              <Input
                placeholder="Nome do signatário"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input
                placeholder="000.000.000-00"
                value={newDocument}
                onChange={(e) => setNewDocument(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="testemunha">Testemunha</SelectItem>
                  <SelectItem value="diretor">Diretor</SelectItem>
                  <SelectItem value="ceo">CEO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={newRequired} onCheckedChange={setNewRequired} />
              <Label className="text-xs">Assinatura obrigatória</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAddSigner}
              disabled={adding || !newName.trim()}
              className="gap-2"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
