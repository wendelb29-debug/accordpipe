import { useState } from "react";
import { Plus, Copy, Check, Trash2, Edit2, Eye, EyeOff, Code2, BarChart3, Loader2, FileText, ExternalLink } from "lucide-react";
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

  const openNew = () => {
    setEditingForm(null);
    setFormName("");
    setFormDescription("");
    setSelectedWorkspaceId("");
    setSelectedFields(["nome", "telefone", "email", "empresa"]);
    setDialogOpen(true);
  };

  const openEdit = (form: CrmForm) => {
    setEditingForm(form);
    setFormName(form.name);
    setFormDescription(form.description || "");
    setSelectedWorkspaceId(form.workspace_id || "");
    setSelectedFields(form.fields || ["nome", "telefone"]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!selectedWorkspaceId) { toast.error("Selecione o workspace de destino"); return; }
    const fields = ["nome", "telefone", ...selectedFields.filter((f) => f !== "nome" && f !== "telefone")];
    if (editingForm) {
      await updateForm(editingForm.id, { name: formName.trim(), description: formDescription.trim() || null, fields, workspace_id: selectedWorkspaceId } as any);
    } else {
      await createForm({ name: formName.trim(), description: formDescription.trim() || null, fields, workspace_id: selectedWorkspaceId } as any);
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

  const getFormUrl = (id: string) => `${window.location.origin}/form/${id}`;

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(getFormUrl(id));
    setCopiedId(id);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEmbed = (id: string) => {
    setEmbedFormId(id);
    setEmbedDialogOpen(true);
  };

  const embedCode = embedFormId
    ? `<iframe src="${getFormUrl(embedFormId)}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
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
                    </div>
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
                      <Button size="sm" variant="ghost" onClick={() => copyLink(form.id)} title="Copiar link">
                        {copiedId === form.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(getFormUrl(form.id), "_blank")} title="Abrir formulário">
                        <ExternalLink className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingForm ? "Editar Formulário" : "Novo Formulário"}</DialogTitle>
            <DialogDescription>Configure os campos que serão exibidos no formulário público.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do formulário *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Formulário Site Principal" />
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
              <code className="block bg-muted px-3 py-2 rounded-md text-xs font-mono break-all">{getFormUrl(embedFormId)}</code>
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
