import { useState } from "react";
import { Plus, Copy, Check, Trash2, Edit2, Eye, EyeOff, Code2, BarChart3, Loader2, FileText, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCrmForms, AVAILABLE_FIELDS, CrmForm } from "@/hooks/useCrmForms";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { slugify } from "@/lib/slugify";
import { toast } from "sonner";

export default function Formularios() {
  const { forms, loading, createForm, updateForm, deleteForm } = useCrmForms();
  const { workspaces } = useWorkspaceContext();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<CrmForm | null>(null);
  const [embedDialogOpen, setEmbedDialogOpen] = useState(false);
  const [embedFormId, setEmbedFormId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>(["nome", "telefone", "email", "empresa"]);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [landingEnabled, setLandingEnabled] = useState(true);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [thankYouMessage, setThankYouMessage] = useState("");

  const openNew = () => {
    setEditingForm(null);
    setFormName("");
    setFormDescription("");
    setSelectedWorkspaceId("");
    setSelectedFields(["nome", "telefone", "email", "empresa"]);
    setFormTags([]);
    setTagInput("");
    setFormSlug("");
    setSlugTouched(false);
    setLandingEnabled(true);
    setHeadline("");
    setSubheadline("");
    setCtaText("");
    setThankYouMessage("");
    setDialogOpen(true);
  };

  const openEdit = (form: CrmForm) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormDescription(form.description || "");
    setSelectedWorkspaceId(form.workspace_id || "");
    setSelectedFields(form.fields || ["nome", "telefone"]);
    setFormTags(form.tags || []);
    setTagInput("");
    setFormSlug(form.slug || "");
    setSlugTouched(true);
    setLandingEnabled(form.landing_page_enabled ?? true);
    setHeadline(form.headline || "");
    setSubheadline(form.subheadline || "");
    setCtaText(form.cta_text || "");
    setThankYouMessage(form.thank_you_message || "");
    setDialogOpen(true);
  };

  const handleNameChange = (v: string) => {
    setFormName(v);
    if (!slugTouched && !editingForm) {
      setFormSlug(slugify(v));
    }
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!selectedWorkspaceId) { toast.error("Selecione o workspace de destino"); return; }
    const fields = ["nome", "telefone", ...selectedFields.filter((f) => f !== "nome" && f !== "telefone")];
    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      fields,
      workspace_id: selectedWorkspaceId,
      tags: formTags.length > 0 ? formTags : null,
      slug: formSlug.trim() || slugify(formName),
      landing_page_enabled: landingEnabled,
      headline: headline.trim() || null,
      subheadline: subheadline.trim() || null,
      cta_text: ctaText.trim() || null,
      thank_you_message: thankYouMessage.trim() || null,
    };
    if (editingForm) {
      await updateForm(editingForm.id, payload as any);
    } else {
      await createForm(payload as any);
    }
    setDialogOpen(false);
  };

  const toggleField = (fieldId: string) => {
    const field = AVAILABLE_FIELDS.find((f) => f.id === fieldId);
    if (field && !field.removable) return;
    setSelectedFields((prev) =>
      prev.includes(fieldId) ? prev.filter((f) => f !== fieldId) : [...prev, fieldId]
    );
  };

  const getFormUrl = (form: CrmForm | { id: string; slug?: string | null }) => {
    const slug = (form as any).slug;
    return slug
      ? `${window.location.origin}/form/${slug}`
      : `${window.location.origin}/form/${form.id}`;
  };

  const copyLink = (form: CrmForm) => {
    navigator.clipboard.writeText(getFormUrl(form));
    setCopiedId(form.id);
    toast.success("Link público copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEmbed = (id: string) => {
    setEmbedFormId(id);
    setEmbedDialogOpen(true);
  };

  const embedFormObj = forms.find((f) => f.id === embedFormId);
  const embedFormUrl = embedFormObj ? getFormUrl(embedFormObj) : "";
  const embedCode = embedFormObj
    ? `<iframe src="${embedFormUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
    : "";

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success("Código embed copiado!");
  };

  const handleToggleActive = async (form: CrmForm) => {
    await updateForm(form.id, { is_active: !form.is_active } as any);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formulários de Captura</h1>
          <p className="text-sm text-muted-foreground">Crie formulários personalizados para capturar leads automaticamente no CRM.</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Formulário
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{forms.length}</p>
              <p className="text-xs text-muted-foreground">Formulários</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{forms.reduce((s, f) => s + (f.lead_count || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Leads Capturados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{forms.filter((f) => f.is_active).length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {forms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-1">Nenhum formulário criado</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro formulário para começar a capturar leads.</p>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Formulário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Workspace</TableHead>
                <TableHead className="hidden sm:table-cell">Campos</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{form.name}</p>
                      {form.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{form.description}</p>
                      )}
                      {form.tags && form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {form.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline" className="text-xs">
                      {workspaces.find((ws) => ws.id === form.workspace_id)?.name || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(form.fields || []).map((f) => (
                        <Badge key={f} variant="secondary" className="text-[10px]">
                          {AVAILABLE_FIELDS.find((af) => af.id === f)?.label || f}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">{form.lead_count || 0}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={form.is_active ? "default" : "secondary"}>
                      {form.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => copyLink(form)} title="Copiar link público">
                        {copiedId === form.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(getFormUrl(form), "_blank")} title="Visualizar Landing Page">
                        <Globe className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEmbed(form.id)} title="Código embed">
                        <Code2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(form)} title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(form)} title={form.is_active ? "Desativar" : "Ativar"}>
                        {form.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteForm(form.id)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? "Editar Formulário" : "Novo Formulário"}</DialogTitle>
            <DialogDescription>Configure os campos e a landing page pública.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do formulário *</Label>
              <Input value={formName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: Tráfego Pago — Consultoria" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> URL pública (slug)
              </Label>
              <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 text-xs">
                <span className="text-muted-foreground py-2 select-all">{window.location.origin}/form/</span>
                <Input
                  value={formSlug}
                  onChange={(e) => { setFormSlug(slugify(e.target.value)); setSlugTouched(true); }}
                  placeholder="trafego-pago"
                  className="border-0 bg-transparent px-1 focus-visible:ring-0 h-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Use em campanhas: link curto, único e amigável.</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Gerar landing page pública</Label>
                <p className="text-xs text-muted-foreground">Ative para usar a URL pública em tráfego pago.</p>
              </div>
              <Switch checked={landingEnabled} onCheckedChange={setLandingEnabled} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descrição exibida no topo do formulário" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Workspace de destino *</Label>
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o workspace..." />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Selecione em qual workspace os leads deste formulário serão criados.</p>
            </div>
            <div className="space-y-2">
              <Label>Tags do formulário</Label>
              <p className="text-xs text-muted-foreground">Tags serão aplicadas automaticamente aos leads criados por este formulário.</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => setFormTags(prev => prev.filter(t => t !== tag))} className="ml-0.5 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagInput.trim()) {
                      e.preventDefault();
                      const newTag = tagInput.trim();
                      if (!formTags.includes(newTag)) setFormTags(prev => [...prev, newTag]);
                      setTagInput("");
                    }
                  }}
                  placeholder="Ex: Via Lead Ads, Site, Instagram..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (tagInput.trim() && !formTags.includes(tagInput.trim())) {
                      setFormTags(prev => [...prev, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Campos do formulário</Label>
              <div className="space-y-2 rounded-lg border p-3">
                {AVAILABLE_FIELDS.map((field) => (
                  <label key={field.id} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={() => toggleField(field.id)}
                      disabled={!field.removable}
                    />
                    <span className="text-sm">{field.label}</span>
                    {field.required && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
                  </label>
                ))}
              </div>
            </div>

            {/* Landing page customization */}
            {landingEnabled && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Globe className="h-4 w-4 text-primary" /> Personalização da Landing Page
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Headline (título principal)</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Transforme sua operação comercial" maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Subheadline</Label>
                  <Input value={subheadline} onChange={(e) => setSubheadline(e.target.value)} placeholder="Fale com um especialista e veja como podemos ajudar." maxLength={200} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Texto do botão (CTA)</Label>
                  <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Quero falar com um especialista" maxLength={60} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Mensagem de sucesso</Label>
                  <Textarea value={thankYouMessage} onChange={(e) => setThankYouMessage(e.target.value)} placeholder="Recebemos seu contato! Em breve um especialista falará com você." rows={2} maxLength={300} />
                </div>
              </div>
            )}
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingForm ? "Salvar" : "Criar Formulário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embed Dialog */}
      <Dialog open={embedDialogOpen} onOpenChange={setEmbedDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" /> Código Embed
            </DialogTitle>
            <DialogDescription>Copie o código abaixo e cole no HTML do seu site.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Link direto</Label>
              <code className="block bg-muted px-3 py-2 rounded-md text-xs font-mono break-all">{embedFormUrl}</code>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Código iframe</Label>
              <code className="block bg-muted px-3 py-2 rounded-md text-xs font-mono break-all whitespace-pre-wrap">{embedCode}</code>
            </div>
            <Button onClick={copyEmbed} className="w-full gap-2">
              <Copy className="h-4 w-4" /> Copiar Código Embed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
