import { useEffect, useState, useCallback } from "react";
import { Plus, Copy, Trash2, Loader2, Megaphone, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { toast } from "sonner";

const GOOGLE_WEBHOOK_URL = "https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/google-leadform-webhook";

interface AdLeadForm {
  id: string;
  servidor_id: string;
  provider: "google" | "meta";
  external_form_id: string | null;
  external_form_name: string | null;
  campaign_id: string | null;
  workspace_id: string | null;
  stage: string | null;
  tags: string[] | null;
  is_active: boolean;
  last_lead_at: string | null;
  lead_count: number;
  created_at: string;
  // google_webhook_key is NOT selectable from the client; we receive it once on create via insert ... returning
}

function generateKey(): string {
  // 32-char random alphanumeric
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(36).padStart(2, "0")).join("").substring(0, 32);
}

export default function AdsCapture() {
  const { profile } = useAuth();
  const companyId = useActiveCompanyId();
  const { workspaces } = useWorkspaceContext();

  const [forms, setForms] = useState<AdLeadForm[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [stageId, setStageId] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Once-shown credentials after create
  const [credsDialog, setCredsDialog] = useState<{ key: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Per-row revealed keys (fetched on demand)
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});

  const { dynamicStages } = useKanbanColumns(workspaceId || null);

  const fetchForms = useCallback(async () => {
    if (!companyId) { setForms([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("ad_lead_forms" as any)
      .select("id, servidor_id, provider, external_form_id, external_form_name, campaign_id, workspace_id, stage, tags, is_active, last_lead_at, lead_count, created_at")
      .eq("servidor_id", companyId)
      .eq("provider", "google")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar captações");
    } else {
      setForms((data || []) as unknown as AdLeadForm[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleCreate = async () => {
    if (!companyId) { toast.error("Tenant não identificado"); return; }
    if (!workspaceId) { toast.error("Selecione o workspace de destino"); return; }
    setSaving(true);
    const key = generateKey();
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const { data, error } = await (supabase
      .from("ad_lead_forms" as any) as any)
      .insert({
        servidor_id: companyId,
        provider: "google",
        workspace_id: workspaceId,
        stage: stageId || null,
        tags,
        google_webhook_key: key,
        is_active: true,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error(`Erro ao criar captação: ${error.message}`);
      return;
    }
    setDialogOpen(false);
    setWorkspaceId(""); setStageId(""); setTagsInput("");
    toast.success("Captação Google criada!");
    setCredsDialog({ key });
    const newId = (data as any)?.id as string | undefined;
    if (newId) setRevealedKeys((prev) => ({ ...prev, [newId]: key }));
    fetchForms();
  };

  const toggleActive = async (form: AdLeadForm) => {
    const { error } = await supabase
      .from("ad_lead_forms" as any)
      .update({ is_active: !form.is_active })
      .eq("id", form.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, is_active: !f.is_active } : f));
  };

  const removeForm = async (form: AdLeadForm) => {
    if (!confirm("Excluir esta captação? Os leads já recebidos serão mantidos.")) return;
    const { error } = await supabase.from("ad_lead_forms" as any).delete().eq("id", form.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    setForms((prev) => prev.filter((f) => f.id !== form.id));
    toast.success("Captação excluída");
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copiado!");
    setTimeout(() => setCopied(null), 1500);
  };

  // For listing: we cannot SELECT google_webhook_key from the client. We only show the key
  // immediately after creation (saved in revealedKeys). For older rows the user can use the
  // Webhook URL + the per-row identifier; if they lost the key, they need to recreate the
  // captação. This protects the secret from being exposed via the Data API.

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Captação de Ads</h2>
          <p className="text-sm text-muted-foreground">Receba leads dos seus anúncios diretamente no CRM.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova captação Google
        </Button>
      </div>

      {/* Google section */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold">Google Ads — Lead Form</h3>
              <p className="text-xs text-muted-foreground">Conecte o Lead Form extension do Google Ads via Webhook URL + Key.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-3">Nenhuma captação Google configurada ainda.</p>
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Criar primeira captação
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((f) => {
                const wsName = workspaces.find((w) => w.id === f.workspace_id)?.name || "—";
                const key = revealedKeys[f.id];
                return (
                  <div key={f.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">Workspace: {wsName}</span>
                          <Badge variant={f.is_active ? "default" : "secondary"} className={f.is_active ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" : ""}>
                            {f.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                          <div className="rounded bg-muted/40 p-2">
                            <p className="text-[10px] uppercase text-muted-foreground">Leads</p>
                            <p className="font-semibold">{f.lead_count || 0}</p>
                          </div>
                          <div className="rounded bg-muted/40 p-2">
                            <p className="text-[10px] uppercase text-muted-foreground">Último lead</p>
                            <p className="font-medium truncate">{f.last_lead_at ? new Date(f.last_lead_at).toLocaleDateString("pt-BR") : "—"}</p>
                          </div>
                          {f.tags && f.tags.length > 0 && (
                            <div className="rounded bg-muted/40 p-2 col-span-2">
                              <p className="text-[10px] uppercase text-muted-foreground">Tags</p>
                              <p className="font-medium truncate">{f.tags.join(", ")}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={f.is_active} onCheckedChange={() => toggleActive(f)} />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => removeForm(f)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 text-xs">
                      <div className="flex items-center gap-2 rounded border bg-muted/30 p-2">
                        <span className="text-[10px] uppercase text-muted-foreground shrink-0">Webhook URL</span>
                        <code className="flex-1 truncate font-mono text-[11px]">{GOOGLE_WEBHOOK_URL}</code>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(GOOGLE_WEBHOOK_URL, `url-${f.id}`)}>
                          {copied === `url-${f.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 rounded border bg-muted/30 p-2">
                        <span className="text-[10px] uppercase text-muted-foreground shrink-0">Key</span>
                        <code className="flex-1 truncate font-mono text-[11px]">
                          {key ? key : "•••••••• (visível apenas na criação)"}
                        </code>
                        {key && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(key, `key-${f.id}`)}>
                            {copied === `key-${f.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta placeholder */}
      <Card className="opacity-70">
        <CardContent className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">Meta (Facebook / Instagram)</h3>
              <p className="text-xs text-muted-foreground">Conecte páginas e Lead Ads do Meta Business.</p>
            </div>
          </div>
          <Button disabled variant="outline" size="sm">Conectar Meta (em breve)</Button>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova captação Google Ads</DialogTitle>
            <DialogDescription>Os leads do Google Lead Form serão criados automaticamente no workspace escolhido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Workspace de destino *</Label>
              <Select value={workspaceId} onValueChange={(v) => { setWorkspaceId(v); setStageId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o workspace..." /></SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (<SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etapa inicial (opcional)</Label>
              <Select value={stageId} onValueChange={setStageId} disabled={!workspaceId}>
                <SelectTrigger><SelectValue placeholder={workspaceId ? "Primeira coluna do kanban" : "Selecione um workspace primeiro"} /></SelectTrigger>
                <SelectContent>
                  {dynamicStages.map((s) => (<SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Se vazio, usa a primeira coluna do kanban.</p>
            </div>
            <div className="space-y-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="ex: campanha-junho, lead-quente" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving || !workspaceId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar captação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog (shown once after create) */}
      <Dialog open={!!credsDialog} onOpenChange={(o) => !o && setCredsDialog(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Configure no Google Ads</DialogTitle>
            <DialogDescription>
              Cole estes dois campos no Lead Form do Google Ads (Webhook URL e Key).
              A Key não poderá ser visualizada novamente por motivos de segurança — copie agora.
            </DialogDescription>
          </DialogHeader>
          {credsDialog && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Webhook URL</Label>
                <div className="flex items-center gap-2 rounded border bg-muted/40 p-2">
                  <code className="flex-1 truncate font-mono text-[12px]">{GOOGLE_WEBHOOK_URL}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(GOOGLE_WEBHOOK_URL, "creds-url")}>
                    {copied === "creds-url" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Key</Label>
                <div className="flex items-center gap-2 rounded border bg-muted/40 p-2">
                  <code className="flex-1 truncate font-mono text-[12px]">{credsDialog.key}</code>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => copyText(credsDialog.key, "creds-key")}>
                    {copied === "creds-key" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                No Google Ads, abra o Lead Form da campanha → seção "Webhook integration" → cole a URL no campo Webhook URL e a Key no campo Key. Clique em "Send test data" para validar.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredsDialog(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
