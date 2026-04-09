import { useState, useEffect, useCallback } from "react";
import {
  Plus, Loader2, MoreVertical, ThumbsUp, ThumbsDown,
  Eye, Trash2, FileSpreadsheet, DollarSign, Clock,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/hooks/useCrmLeads";
import { toast } from "sonner";

const fmtCur = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground", icon: Clock },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: FileSpreadsheet },
  approved: { label: "Aprovada", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  rejected: { label: "Reprovada", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

interface ProposalItem {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  tipo: string;
}

interface Proposal {
  id: string;
  titulo: string;
  descricao: string | null;
  valor: number;
  status: string;
  item_id: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_by_name: string | null;
  created_at: string;
  proposal_items?: ProposalItem | null;
}

interface Props {
  lead: CrmLead;
  addActivity?: (data: any) => Promise<any>;
}

export function LeadPropostasTabNew({ lead, addActivity }: Props) {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formItem, setFormItem] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formValue, setFormValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Approve/Reject confirm
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "reject"; proposal: Proposal } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // View
  const [viewProposal, setViewProposal] = useState<Proposal | null>(null);

  const servidorId = companyId || lead.servidor_id;

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("proposals")
      .select("*, proposal_items(id, nome, descricao, valor, tipo)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });
    setProposals((data as any) || []);
    setLoading(false);
  }, [lead.id]);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("proposal_items")
      .select("*")
      .eq("servidor_id", servidorId)
      .eq("ativo", true)
      .order("nome");
    setItems((data as any) || []);
  }, [servidorId]);

  useEffect(() => {
    fetchProposals();
    fetchItems();
  }, [fetchProposals, fetchItems]);

  const handleItemSelect = (itemId: string) => {
    setFormItem(itemId);
    const item = items.find((i) => i.id === itemId);
    if (item) {
      setFormTitle(item.nome);
      setFormDesc(item.descricao || "");
      setFormValue(String(item.valor));
    }
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) return toast.error("Informe o título da proposta");
    setSaving(true);
    const { error } = await supabase.from("proposals").insert({
      servidor_id: servidorId,
      lead_id: lead.id,
      item_id: formItem || null,
      titulo: formTitle.trim(),
      descricao: formDesc.trim() || null,
      valor: parseFloat(formValue) || 0,
      status: "draft",
      created_by_user_id: profile?.user_id,
      created_by_name: profile?.name,
    });
    setSaving(false);
    if (error) return toast.error("Erro ao criar proposta");
    toast.success("Proposta criada!");
    setCreateOpen(false);
    setFormItem("");
    setFormTitle("");
    setFormDesc("");
    setFormValue("");
    fetchProposals();
    addActivity?.({ type: "proposal", title: `Proposta "${formTitle}" criada` });
  };

  const handleApproveReject = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    const { type, proposal } = confirmAction;
    const newStatus = type === "approve" ? "approved" : "rejected";
    const { error } = await supabase
      .from("proposals")
      .update({
        status: newStatus,
        ...(type === "approve"
          ? { approved_by_name: profile?.name, approved_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", proposal.id);
    setActionLoading(false);
    if (error) return toast.error("Erro ao atualizar proposta");
    toast.success(type === "approve" ? "Proposta aprovada!" : "Proposta reprovada");
    setConfirmAction(null);
    fetchProposals();
    addActivity?.({
      type: "proposal_status",
      title: `Proposta "${proposal.titulo}" ${type === "approve" ? "aprovada" : "reprovada"}`,
    });
  };

  const handleDelete = async (proposal: Proposal) => {
    const { error } = await supabase.from("proposals").delete().eq("id", proposal.id);
    if (error) return toast.error("Erro ao excluir proposta");
    toast.success("Proposta excluída");
    fetchProposals();
    addActivity?.({ type: "proposal_delete", title: `Proposta "${proposal.titulo}" excluída` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Propostas</h3>
          <p className="text-xs text-muted-foreground">{proposals.length} proposta(s)</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nova Proposta
        </Button>
      </div>

      {/* List */}
      {proposals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma proposta</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Crie a primeira proposta para esta oportunidade</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {proposals.map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.draft;
            const Icon = cfg.icon;
            return (
              <Card key={p.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">{p.titulo}</span>
                        <Badge variant="outline" className={cn("text-[10px] gap-1 font-medium", cfg.color)}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                      </div>
                      {p.descricao && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.descricao}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> {fmtCur(p.valor)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {fmtDate(p.created_at)}
                        </span>
                        {p.created_by_name && <span>por {p.created_by_name}</span>}
                      </div>
                      {p.status === "approved" && p.approved_by_name && (
                        <p className="text-[10px] text-green-600 dark:text-green-400">
                          Aprovada por {p.approved_by_name} em {p.approved_at ? fmtDate(p.approved_at) : ""}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setViewProposal(p)}>
                          <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                        </DropdownMenuItem>
                        {p.status === "draft" && (
                          <>
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "approve", proposal: p })}>
                              <ThumbsUp className="h-3.5 w-3.5 mr-2" /> Aprovar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setConfirmAction({ type: "reject", proposal: p })}>
                              <ThumbsDown className="h-3.5 w-3.5 mr-2" /> Reprovar
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(p)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" /> Nova Proposta
            </DialogTitle>
            <DialogDescription>Crie uma proposta para esta oportunidade</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Item / Produto</Label>
              <Select value={formItem} onValueChange={handleItemSelect}>
                <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.nome} — {fmtCur(i.valor)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Nome da proposta" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} placeholder="Detalhes..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor (R$)</Label>
              <Input type="number" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Gerar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewProposal} onOpenChange={() => setViewProposal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Detalhes da Proposta</DialogTitle>
          </DialogHeader>
          {viewProposal && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Título</span>
                  <p className="font-medium">{viewProposal.titulo}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Valor</span>
                  <p className="font-medium text-primary">{fmtCur(viewProposal.valor)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge variant="outline" className={cn("text-xs", statusConfig[viewProposal.status]?.color)}>
                    {statusConfig[viewProposal.status]?.label}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Criada em</span>
                  <p>{fmtDate(viewProposal.created_at)}</p>
                </div>
              </div>
              {viewProposal.descricao && (
                <div>
                  <span className="text-xs text-muted-foreground">Descrição</span>
                  <p className="text-sm mt-1">{viewProposal.descricao}</p>
                </div>
              )}
              {viewProposal.proposal_items && (
                <div>
                  <span className="text-xs text-muted-foreground">Item vinculado</span>
                  <p className="text-sm mt-1">
                    {(viewProposal.proposal_items as any).nome} — {fmtCur((viewProposal.proposal_items as any).valor)}
                  </p>
                </div>
              )}
              {viewProposal.approved_by_name && (
                <div>
                  <span className="text-xs text-muted-foreground">Aprovada por</span>
                  <p className="text-sm mt-1">{viewProposal.approved_by_name} em {viewProposal.approved_at ? fmtDate(viewProposal.approved_at) : ""}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Confirm */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {confirmAction?.type === "approve" ? (
                <><ThumbsUp className="h-4 w-4 text-green-500" /> Aprovar Proposta</>
              ) : (
                <><ThumbsDown className="h-4 w-4 text-red-500" /> Reprovar Proposta</>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "approve"
                ? `Deseja aprovar a proposta "${confirmAction?.proposal.titulo}"?`
                : `Deseja reprovar a proposta "${confirmAction?.proposal.titulo}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>Cancelar</Button>
            <Button
              size="sm"
              variant={confirmAction?.type === "approve" ? "default" : "destructive"}
              onClick={handleApproveReject}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {confirmAction?.type === "approve" ? "Confirmar Aprovação" : "Confirmar Reprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
