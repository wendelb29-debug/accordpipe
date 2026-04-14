import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, KanbanSquare, Building2 } from "lucide-react";
import { InboxContact } from "@/hooks/useWhatsAppInbox";

interface CreateDemandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: InboxContact;
  companyId: string;
  lastMessages: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  color: string | null;
}

interface ColumnOption {
  id: string;
  name: string;
  position: number;
}

export function CreateDemandModal({ open, onOpenChange, contact, companyId, lastMessages }: CreateDemandModalProps) {
  const { user, profile } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [columns, setColumns] = useState<ColumnOption[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [leadName, setLeadName] = useState(contact.name);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingWs, setLoadingWs] = useState(true);

  useEffect(() => {
    if (!open || !companyId) return;
    setLoadingWs(true);
    supabase
      .from("workspaces")
      .select("id, name, color")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setWorkspaces(data || []);
        setLoadingWs(false);
      });
    setLeadName(contact.name);
    setNotes("");
    setSelectedWorkspace("");
    setSelectedColumn("");
  }, [open, companyId, contact.name]);

  useEffect(() => {
    if (!selectedWorkspace) { setColumns([]); return; }
    supabase
      .from("kanban_columns")
      .select("id, name, position")
      .eq("workspace_id", selectedWorkspace)
      .order("position")
      .then(({ data }) => {
        const cols = data || [];
        setColumns(cols);
        if (cols.length > 0) setSelectedColumn(cols[0].id);
      });
  }, [selectedWorkspace]);

  const handleCreate = async () => {
    if (!selectedWorkspace) {
      toast.error("Selecione um workspace");
      return;
    }
    setLoading(true);
    try {
      const { data: lead, error } = await supabase
        .from("crm_leads")
        .insert({
          servidor_id: companyId,
          company_name: leadName,
          contact_name: contact.name,
          phone: contact.phone,
          source: "whatsapp",
          workspace_id: selectedWorkspace,
          stage: selectedColumn || undefined,
          notes: notes || `Criado via WhatsApp. ${lastMessages}`.slice(0, 1000),
          created_by_user_id: user?.id,
          created_by_name: profile?.name,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Link contact to lead
      await supabase
        .from("whatsapp_contacts")
        .update({ lead_id: lead.id, workspace_id: selectedWorkspace })
        .eq("id", contact.id);

      toast.success("Demanda criada com sucesso no Kanban!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar demanda");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KanbanSquare className="h-5 w-5 text-primary" />
            Abrir Demanda no Kanban
          </DialogTitle>
          <DialogDescription>
            Crie um card no workspace a partir desta conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Contact info */}
          <div className="rounded-lg border border-border p-3 bg-muted/30 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold">
              {contact.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{contact.name}</p>
              <p className="text-xs text-muted-foreground">{contact.phone}</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px]">WhatsApp</Badge>
          </div>

          {/* Lead name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nome da demanda</Label>
            <Input
              value={leadName}
              onChange={e => setLeadName(e.target.value)}
              className="h-9 text-sm"
              placeholder="Nome do lead/demanda"
            />
          </div>

          {/* Workspace */}
          <div className="space-y-1.5">
            <Label className="text-xs">Workspace de destino *</Label>
            {loadingWs ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
              </div>
            ) : (
              <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o workspace" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map(ws => (
                    <SelectItem key={ws.id} value={ws.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ws.color || "hsl(var(--primary))" }}
                        />
                        {ws.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Column */}
          {columns.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Coluna de entrada</Label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Primeira coluna" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
              placeholder="Notas sobre a demanda..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-9 text-xs">
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={loading || !selectedWorkspace} className="h-9 text-xs gap-1.5">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar Demanda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
