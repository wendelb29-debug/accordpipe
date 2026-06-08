import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link2, Plus, Search, Target } from "lucide-react";
import { toast } from "sonner";

interface EmailLike {
  id: string;
  from_email: string;
  from_name?: string | null;
  subject: string;
  body_text?: string | null;
  body_html?: string | null;
  snippet?: string;
  received_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: EmailLike | null;
  onLinked?: (leadId: string) => void;
}

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

export function LinkEmailToLeadDialog({ open, onOpenChange, message, onLinked }: Props) {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [stages, setStages] = useState<any[]>([]);
  const [stageId, setStageId] = useState<string>("");
  const [contactName, setContactName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const emailBody = useMemo(() => {
    if (!message) return "";
    if (message.body_text && message.body_text.trim()) return message.body_text.trim();
    if (message.body_html) return stripHtml(message.body_html);
    return message.snippet || "";
  }, [message]);

  // Reset on open
  useEffect(() => {
    if (open && message) {
      setMode("existing");
      setSearch(message.from_email || "");
      setSelectedLeadId("");
      setContactName(message.from_name || "");
      setCompanyName(message.from_name || "");
      setEmail(message.from_email || "");
    }
  }, [open, message]);

  // Search leads
  useEffect(() => {
    if (!open || !companyId || mode !== "existing") return;
    let cancelled = false;
    const run = async () => {
      setLoadingLeads(true);
      let q = supabase
        .from("crm_leads")
        .select("id, company_name, contact_name, email, stage, workspace_id")
        .eq("servidor_id", companyId)
        .neq("lead_status", "lost")
        .order("created_at", { ascending: false })
        .limit(30);
      const term = search.trim();
      if (term) {
        q = q.or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`);
      }
      const { data } = await q;
      if (!cancelled) {
        setLeads(data || []);
        setLoadingLeads(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, companyId, mode, search]);

  // Load workspaces for "new" mode
  useEffect(() => {
    if (!open || !companyId || mode !== "new") return;
    supabase
      .from("workspaces")
      .select("id, name, pipeline_type")
      .eq("servidor_id", companyId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const list = data || [];
        setWorkspaces(list);
        if (list.length && !workspaceId) setWorkspaceId(list[0].id);
      });
  }, [open, companyId, mode]);

  // Load stages for selected workspace
  useEffect(() => {
    if (!workspaceId || mode !== "new") return;
    supabase
      .from("kanban_columns")
      .select("id, title, order_index")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .then(({ data }) => {
        const list = data || [];
        setStages(list);
        if (list.length) setStageId(list[0].id);
      });
  }, [workspaceId, mode]);

  const logActivityAndNotes = async (leadId: string) => {
    if (!message || !companyId) return;
    const title = `📧 E-mail: ${message.subject || "(sem assunto)"}`;
    const description = `De: ${message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}\nRecebido: ${new Date(message.received_at).toLocaleString("pt-BR")}\n\n${emailBody}`;

    // Insert activity (will appear in history)
    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      servidor_id: companyId,
      type: "email",
      title,
      description,
      status: "completed",
      completed_at: new Date().toISOString(),
      created_by_user_id: profile?.user_id,
      created_by_name: profile?.name || profile?.email,
      completed_by_user_id: profile?.user_id,
      completed_by_name: profile?.name || profile?.email,
      metadata: {
        email_message_id: message.id,
        from_email: message.from_email,
        from_name: message.from_name,
        subject: message.subject,
        received_at: message.received_at,
      },
    });

    // Append email body to lead notes
    const { data: leadRow } = await supabase
      .from("crm_leads")
      .select("notes")
      .eq("id", leadId)
      .maybeSingle();
    const stamp = new Date().toLocaleString("pt-BR");
    const block = `\n\n— E-mail recebido em ${stamp} —\nAssunto: ${message.subject || "(sem assunto)"}\nDe: ${message.from_email}\n\n${emailBody}`;
    const newNotes = `${leadRow?.notes || ""}${block}`.trim();
    await supabase.from("crm_leads").update({ notes: newNotes }).eq("id", leadId);
  };

  const handleLinkExisting = async () => {
    if (!selectedLeadId) {
      toast.error("Selecione um card");
      return;
    }
    setSubmitting(true);
    try {
      await logActivityAndNotes(selectedLeadId);
      toast.success("E-mail vinculado ao card");
      onLinked?.(selectedLeadId);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao vincular: " + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNew = async () => {
    if (!companyId) return;
    if (!contactName.trim() && !companyName.trim()) {
      toast.error("Informe o nome do contato ou empresa");
      return;
    }
    if (!workspaceId) {
      toast.error("Selecione um workspace");
      return;
    }
    setSubmitting(true);
    try {
      const insertData: any = {
        servidor_id: companyId,
        workspace_id: workspaceId,
        company_name: companyName || contactName,
        contact_name: contactName || companyName,
        email,
        source: "email",
        stage: stageId || (stages[0]?.id ?? null),
        created_by_user_id: profile?.user_id,
        created_by_name: profile?.name || profile?.email,
      };
      const { data, error } = await supabase
        .from("crm_leads")
        .insert(insertData)
        .select("id")
        .single();
      if (error) throw error;
      await logActivityAndNotes(data.id);
      toast.success("Card criado e e-mail vinculado");
      onLinked?.(data.id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao criar card: " + (e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            Vincular e-mail ao CRM
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
            <div className="font-medium text-foreground truncate">{message.subject || "(sem assunto)"}</div>
            <div className="text-muted-foreground truncate">De: {message.from_name || message.from_email}</div>
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="existing"><Link2 className="h-4 w-4 mr-1.5" />Card existente</TabsTrigger>
            <TabsTrigger value="new"><Plus className="h-4 w-4 mr-1.5" />Novo card</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por empresa, contato ou e-mail"
                className="pl-8"
              />
            </div>
            <div className="border border-border rounded-md divide-y divide-border max-h-[280px] overflow-y-auto">
              {loadingLeads && (
                <div className="p-4 flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…
                </div>
              )}
              {!loadingLeads && leads.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhum card encontrado</div>
              )}
              {!loadingLeads && leads.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setSelectedLeadId(l.id)}
                  className={`w-full text-left p-3 text-sm hover:bg-muted/40 transition ${selectedLeadId === l.id ? "bg-emerald-500/10" : ""}`}
                >
                  <div className="font-medium text-foreground truncate">{l.company_name || l.contact_name || "(sem nome)"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.contact_name && l.company_name ? `${l.contact_name} · ` : ""}{l.email || "sem e-mail"}
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Workspace</Label>
                <Select value={workspaceId} onValueChange={setWorkspaceId}>
                  <SelectTrigger><SelectValue placeholder="Workspace" /></SelectTrigger>
                  <SelectContent>
                    {workspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Etapa</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger><SelectValue placeholder="Etapa" /></SelectTrigger>
                  <SelectContent>
                    {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Nome do contato</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Empresa</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          {mode === "existing" ? (
            <Button onClick={handleLinkExisting} disabled={submitting || !selectedLeadId}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vincular ao card
            </Button>
          ) : (
            <Button onClick={handleCreateNew} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar card e vincular
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
