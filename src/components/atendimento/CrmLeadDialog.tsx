import { useState, useEffect } from "react";
import { Building2, User, Mail, Phone, DollarSign, StickyNote, Save, Trash2, Tag, Loader2, AlertCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CrmLead, STAGES, DynamicStage } from "@/hooks/useCrmLeads";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface CrmLeadDialogProps {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<CrmLead>) => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
  dynamicStages?: DynamicStage[];
  stagesLoading?: boolean;
}

function formatSla(stage: DynamicStage): string {
  if (!stage.sla_days || stage.sla_days <= 0) return "";
  if (stage.sla_days < 1) {
    const hours = Math.round(stage.sla_days * 24);
    return `${hours}h`;
  }
  const days = Math.round(stage.sla_days);
  return `${days}d`;
}

export function CrmLeadDialog({ lead, open, onOpenChange, onSave, onDelete, isNew, dynamicStages, stagesLoading }: CrmLeadDialogProps) {
  const { profile } = useAuth();
  const { workspaceId } = useWorkspace();
  const [teamMembers, setTeamMembers] = useState<{ user_id: string; name: string }[]>([]);

  useEffect(() => {
    if (!workspaceId || !open) return;
    const fetchTeam = async () => {
      const { data } = await supabase.rpc("get_workspace_team_members", {
        p_workspace_id: workspaceId
      });
      if (data) setTeamMembers(data as any);
    };
    fetchTeam();
  }, [workspaceId, open]);

  // Always use the workspace's configured kanban columns.
  // Only fall back to legacy STAGES when the caller did not provide dynamicStages at all.
  const stages: DynamicStage[] = dynamicStages !== undefined
    ? dynamicStages
    : STAGES.map(s => ({ id: s.id, title: s.title, daysLimit: s.daysLimit, color: s.color }));

  const hasStages = stages.length > 0;
  const initialStage = stages[0]?.id || "";

  const [form, setForm] = useState({
    source: lead?.source || "Manual",
    company_name: lead?.company_name || "",
    contact_name: lead?.contact_name || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    value_ps: lead?.value_ps || 0,
    value_mrr: lead?.value_mrr || 0,
    stage: lead?.stage || initialStage,
    notes: lead?.notes || "",
    assigned_to_user_id: lead?.assigned_to_user_id || profile?.user_id || "",
  });

  useEffect(() => {
    if (lead) {
      setForm({
        source: lead.source || "Manual",
        company_name: lead.company_name || "",
        contact_name: lead.contact_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        value_ps: lead.value_ps || 0,
        value_mrr: lead.value_mrr || 0,
        stage: lead.stage || initialStage,
        notes: lead.notes || "",
        assigned_to_user_id: lead.assigned_to_user_id || "",
      });
    } else {
      setForm({
        source: "Manual",
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        value_ps: 0,
        value_mrr: 0,
        stage: initialStage,
        notes: "",
        assigned_to_user_id: profile?.user_id || "",
      });
    }
  }, [lead, initialStage, profile?.user_id]);

  const handleSave = () => {
    onSave(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nova Oportunidade" : "Editar Oportunidade"}</DialogTitle>
          <DialogDescription>
            {isNew ? "Preencha os dados da nova oportunidade" : "Atualize os dados desta oportunidade"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Origem</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Ex: Facebook Ads" />
            </div>
            <div className="space-y-2">
              <Label>Etapa do Funil</Label>
              {stagesLoading ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
                </div>
              ) : !hasStages ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md text-sm text-destructive bg-destructive/5">
                  <AlertCircle className="h-3.5 w-3.5" /> Crie colunas no workspace
                </div>
              ) : (
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => {
                      const sla = formatSla(s);
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-2">
                            {s.rawColor && (
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.rawColor }}
                              />
                            )}
                            <span>{s.title}</span>
                            {sla && (
                              <span className="text-[10px] text-muted-foreground ml-1">({sla})</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Empresa</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Responsável</Label>
              <Select 
                value={form.assigned_to_user_id} 
                onValueChange={(val) => setForm({ ...form, assigned_to_user_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.length > 0 ? (
                    teamMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value={profile?.user_id || "me"}>{profile?.name || "Eu"}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Contato</Label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Nome do contato" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor P&S</Label>
              <Input type="number" value={form.value_ps} onChange={(e) => setForm({ ...form, value_ps: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" /> Valor MRR</Label>
              <Input type="number" value={form.value_mrr} onChange={(e) => setForm({ ...form, value_mrr: Number(e.target.value) })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notas</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Observações..." />
          </div>

          {lead && !isNew && (
            <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
              <p>Criado em: {new Date(lead.created_at).toLocaleString("pt-BR")}</p>
              <p>Atualizado em: {new Date(lead.updated_at).toLocaleString("pt-BR")}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {!isNew && onDelete && lead ? (
            <Button variant="destructive" onClick={() => { onDelete(lead.id); onOpenChange(false); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.company_name.trim() || !form.stage}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
