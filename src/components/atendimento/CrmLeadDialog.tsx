import { useState, useEffect } from "react";
import { Building2, User, Mail, Phone, DollarSign, StickyNote, Save, Trash2, Tag } from "lucide-react";
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
import { CrmLead, STAGES } from "@/hooks/useCrmLeads";

interface CrmLeadDialogProps {
  lead: CrmLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<CrmLead>) => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
}

export function CrmLeadDialog({ lead, open, onOpenChange, onSave, onDelete, isNew }: CrmLeadDialogProps) {
  const [form, setForm] = useState({
    source: "Manual",
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    value_ps: 0,
    value_mrr: 0,
    stage: "standby",
    notes: "",
  });

  useEffect(() => {
    if (lead && !isNew) {
      setForm({
        source: lead.source || "Manual",
        company_name: lead.company_name || "",
        contact_name: lead.contact_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        value_ps: lead.value_ps || 0,
        value_mrr: lead.value_mrr || 0,
        stage: lead.stage || "standby",
        notes: lead.notes || "",
      });
    } else if (isNew) {
      setForm({ source: "Manual", company_name: "", contact_name: "", email: "", phone: "", value_ps: 0, value_mrr: 0, stage: "standby", notes: "" });
    }
  }, [lead, isNew, open]);

  const handleSave = () => {
    if (!form.company_name.trim()) return;
    onSave({ ...form });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
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
              <Label>Etapa</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Empresa</Label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Nome da empresa" />
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
            <Button onClick={handleSave} disabled={!form.company_name.trim()}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
