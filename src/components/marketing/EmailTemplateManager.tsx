import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { captureAppError } from "@/lib/monitoring";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles, Plus, Search, Star, Copy, Trash2, Edit, X, Save, Eye,
  Code, Smartphone, Monitor, Loader2, Image as ImageIcon, Wand2,
} from "lucide-react";

// Tabela ainda não tipada nos types gerados — usamos cliente sem tipos
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db: any = supabase;

interface EmailTemplate {
  id: string;
  servidor_id: string;
  user_id: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  preview_text: string | null;
  category: string;
  is_shared: boolean;
  is_favorite: boolean;
  variables: string[];
  used_count: number;
  last_used_at: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelectTemplate?: (t: { subject: string; body_html: string }) => void;
  mode?: "manage" | "pick";
}

const CATEGORIES = [
  { id: "general",       label: "Geral",         color: "bg-slate-500" },
  { id: "promotional",   label: "Promocional",   color: "bg-fuchsia-500" },
  { id: "transactional", label: "Transacional",  color: "bg-blue-500" },
  { id: "newsletter",    label: "Newsletter",    color: "bg-emerald-500" },
  { id: "onboarding",    label: "Onboarding",    color: "bg-violet-500" },
];

export function EmailTemplateManager({ open, onOpenChange, onSelectTemplate, mode = "manage" }: Props) {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("email_templates")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      captureAppError(error, { module: "marketing.templates", action: "list" }, "error");
      return;
    }
    setTemplates((data || []) as EmailTemplate[]);
  };

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  const filtered = useMemo(() => {
    let list = templates;
    if (filterCat !== "all") list = list.filter(t => t.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [templates, filterCat, search]);

  const toggleFavorite = async (t: EmailTemplate) => {
    await db.from("email_templates").update({ is_favorite: !t.is_favorite }).eq("id", t.id);
    loadTemplates();
  };

  const duplicateTemplate = async (t: EmailTemplate) => {
    if (!companyId || !user) return;
    const { error } = await db.from("email_templates").insert({
      servidor_id: companyId,
      user_id: user.id,
      name: t.name + " (cópia)",
      description: t.description,
      subject: t.subject,
      body_html: t.body_html,
      preview_text: t.preview_text,
      category: t.category,
      variables: t.variables,
    });
    if (error) toast.error("Erro ao duplicar", { description: error.message });
    else { toast.success("Template duplicado"); loadTemplates(); }
  };

  const deleteTemplate = async (t: EmailTemplate) => {
    if (!confirm(`Excluir o template "${t.name}"?`)) return;
    const { error } = await db.from("email_templates").delete().eq("id", t.id);
    if (error) toast.error("Erro ao excluir", { description: error.message });
    else { toast.success("Template excluído"); loadTemplates(); }
  };

  const pickTemplate = async (t: EmailTemplate) => {
    await db.from("email_templates").update({
      used_count: t.used_count + 1,
      last_used_at: new Date().toISOString(),
    }).eq("id", t.id);
    onSelectTemplate?.({ subject: t.subject, body_html: t.body_html });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[92vh] p-0 overflow-hidden flex flex-col gap-0">
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[18px] font-bold">
                {mode === "pick" ? "Escolher template" : "Templates de E-mail"}
              </DialogTitle>
              <p className="text-[12px] text-muted-foreground">
                {mode === "pick"
                  ? "Selecione um template salvo ou crie um novo"
                  : "Salve templates HTML pra reutilizar em campanhas"}
              </p>
            </div>
            <button
              onClick={() => setAiOpen(true)}
              className="h-9 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition shadow-md"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Gerar com IA
            </button>
            <button
              onClick={() => setCreating(true)}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar do zero
            </button>
          </div>

          <div className="px-6 py-3 border-b border-border flex items-center gap-3 bg-muted/30 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-card border border-border rounded-lg px-3 h-9">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar templates..."
                className="flex-1 bg-transparent outline-none text-[13px]"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <CatChip active={filterCat === "all"} onClick={() => setFilterCat("all")}>Todas</CatChip>
              {CATEGORIES.map(c => (
                <CatChip key={c.id} active={filterCat === c.id} onClick={() => setFilterCat(c.id)}>
                  {c.label}
                </CatChip>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground">Nenhum template ainda</h3>
                <p className="text-[12.5px] text-muted-foreground mt-1 max-w-sm">
                  Clique em "Gerar com IA" pra criar um automaticamente ou "Criar do zero" pra abrir o editor.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filtered.map(t => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    mode={mode}
                    onEdit={() => setEditing(t)}
                    onPick={() => pickTemplate(t)}
                    onFavorite={() => toggleFavorite(t)}
                    onDuplicate={() => duplicateTemplate(t)}
                    onDelete={() => deleteTemplate(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {(editing || creating) && (
        <TemplateEditorDialog
          template={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); loadTemplates(); }}
        />
      )}

      {aiOpen && (
        <AIGeneratorDialog
          onClose={() => setAiOpen(false)}
          onGenerated={(generated) => {
            setAiOpen(false);
            setEditing({
              id: "", servidor_id: companyId!, user_id: user!.id,
              name: "", description: null, category: "general",
              is_shared: false, is_favorite: false, variables: [],
              used_count: 0, last_used_at: null,
              created_at: new Date().toISOString(),
              ...generated,
            } as EmailTemplate);
          }}
        />
      )}
    </>
  );
}

function TemplateCard({ template, mode, onEdit, onPick, onFavorite, onDuplicate, onDelete }: any) {
  const cat = CATEGORIES.find(c => c.id === template.category) || CATEGORIES[0];
  return (
    <div className="group rounded-2xl border border-border bg-card hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-lg transition overflow-hidden">
      <div className="h-40 bg-white relative overflow-hidden border-b border-border">
        <iframe
          srcDoc={`<html><body style="margin:0;font-family:Arial,sans-serif;transform:scale(0.4);transform-origin:top left;width:250%;height:250%;pointer-events:none;">${template.body_html}</body></html>`}
          className="w-full h-full pointer-events-none"
          sandbox=""
          title={template.name}
        />
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition shadow-sm"
        >
          <Star className={`w-3.5 h-3.5 ${template.is_favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      </div>

      <div className="p-3.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded ${cat.color}`}>
            {cat.label}
          </span>
          {template.is_shared && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-500/15 px-1.5 py-0.5 rounded">
              COMPARTILHADO
            </span>
          )}
        </div>
        <h3 className="text-[13.5px] font-bold text-foreground truncate">{template.name || "Sem nome"}</h3>
        <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{template.subject}</p>

        <div className="flex items-center justify-between mt-3 gap-2">
          {mode === "pick" ? (
            <button
              onClick={onPick}
              className="flex-1 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11.5px] font-semibold transition"
            >
              Usar este template
            </button>
          ) : (
            <>
              <button onClick={onEdit} className="text-[11px] font-medium text-violet-600 hover:underline inline-flex items-center gap-1">
                <Edit className="w-3 h-3" /> Editar
              </button>
              <div className="flex gap-1">
                <button onClick={onDuplicate} title="Duplicar" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition text-muted-foreground">
                  <Copy className="w-3 h-3" />
                </button>
                <button onClick={onDelete} title="Excluir" className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition text-muted-foreground">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CatChip({ children, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-[11px] font-semibold transition ${
        active ? "bg-violet-500 text-white" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function TemplateEditorDialog({ template, onClose, onSaved }: any) {
  const companyId = useActiveCompanyId();
  const { user } = useAuth();
  const isNew = !template?.id;

  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [previewText, setPreviewText] = useState(template?.preview_text || "");
  const [bodyHtml, setBodyHtml] = useState(template?.body_html || DEFAULT_TEMPLATE);
  const [category, setCategory] = useState(template?.category || "general");
  const [isShared, setIsShared] = useState(template?.is_shared || false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  const variables = useMemo(() => {
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const set = new Set<string>();
    const text = subject + " " + bodyHtml;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) set.add(m[1]);
    return Array.from(set);
  }, [subject, bodyHtml]);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !bodyHtml.trim()) {
      toast.error("Preencha nome, assunto e corpo");
      return;
    }
    setSaving(true);
    const payload = {
      servidor_id: companyId,
      user_id: user!.id,
      name: name.trim(),
      subject: subject.trim(),
      preview_text: previewText.trim() || null,
      body_html: bodyHtml,
      category,
      is_shared: isShared,
      variables,
    };
    const { error } = isNew
      ? await db.from("email_templates").insert(payload)
      : await db.from("email_templates").update(payload).eq("id", template.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success(isNew ? "Template criado!" : "Template atualizado");
      onSaved();
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setUploadingImg(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `email-templates/${companyId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("documents").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = data?.signedUrl;
      if (!url) throw new Error("Sem URL");

      const imgTag = `<img src="${url}" alt="" style="max-width:100%;height:auto;display:block;border:0;" />`;
      setBodyHtml(prev => prev + "\n" + imgTag);
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Imagem inserida no corpo!", { description: "URL copiada também" });
    } catch (err: any) {
      toast.error("Erro no upload", { description: err.message });
    } finally {
      setUploadingImg(false);
    }
  };

  const wrappedPreview = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f5f5;padding:20px;font-family:Arial,sans-serif;">${bodyHtml}</body></html>`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden flex flex-col gap-0">
        <div className="px-6 py-3 border-b border-border flex items-center gap-3">
          <h2 className="text-[16px] font-bold flex-1">
            {isNew ? "Novo template" : "Editar template"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border bg-muted/20 grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-4">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Nome interno</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Black Friday 2026"
              className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="col-span-12 md:col-span-5">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Assunto do e-mail</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ex: Sua oferta especial chegou, {{nome}}!"
              className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-span-6 md:col-span-1 flex items-end">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="w-4 h-4 accent-violet-500" />
              <span className="text-[11px] font-medium">Compartilhar</span>
            </label>
          </div>
        </div>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="w-1/2 border-r border-border flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
              <Code className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex-1">HTML</span>
              <label className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 cursor-pointer hover:underline">
                {uploadingImg ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                Inserir imagem
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  disabled={uploadingImg}
                />
              </label>
            </div>
            <textarea
              value={bodyHtml}
              onChange={e => setBodyHtml(e.target.value)}
              className="flex-1 p-3 font-mono text-[12px] bg-card text-foreground outline-none resize-none"
              spellCheck={false}
            />
            {variables.length > 0 && (
              <div className="px-3 py-2 border-t border-border bg-muted/20">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">Variáveis detectadas:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {variables.map(v => (
                    <span key={v} className="text-[10.5px] font-mono bg-violet-500/10 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-1/2 flex flex-col min-h-0 bg-muted/30">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex-1">Pré-visualização</span>
              <button
                onClick={() => setDevice("desktop")}
                className={`w-7 h-7 rounded flex items-center justify-center transition ${device === "desktop" ? "bg-violet-500/15 text-violet-600" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={`w-7 h-7 rounded flex items-center justify-center transition ${device === "mobile" ? "bg-violet-500/15 text-violet-600" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <iframe
                srcDoc={wrappedPreview}
                className={`bg-white rounded-lg shadow-md border border-border mx-auto h-full ${device === "mobile" ? "w-[375px]" : "w-full max-w-2xl"}`}
                sandbox=""
                title="preview"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border flex items-center gap-3">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition">
            Cancelar
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[13px] font-bold inline-flex items-center gap-2 disabled:opacity-50 transition shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? "Criar template" : "Salvar alterações"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AIGeneratorDialog({ onClose, onGenerated }: any) {
  const [briefing, setBriefing] = useState("");
  const [brandColor, setBrandColor] = useState("#10b981");
  const [brandName, setBrandName] = useState("Accord");
  const [tone, setTone] = useState("profissional e amigável");
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    if (briefing.trim().length < 10) {
      toast.error("Descreva melhor o objetivo do e-mail (mín. 10 caracteres)");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email-template", {
        body: { briefing, brand_color: brandColor, brand_name: brandName, tone, language: "pt-BR" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      if (!d?.body_html) throw new Error("IA não retornou HTML");

      toast.success("Template gerado! Revise e salve.");
      onGenerated({
        name: `IA — ${briefing.slice(0, 30)}...`,
        subject: d.subject,
        preview_text: d.preview_text,
        body_html: d.body_html,
      });
    } catch (err: any) {
      toast.error("Erro na geração", { description: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div>Gerar com IA</div>
              <div className="text-[11px] font-normal text-muted-foreground">Descreva o e-mail e a IA gera o HTML</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              O que você quer comunicar? *
            </label>
            <textarea
              value={briefing}
              onChange={e => setBriefing(e.target.value)}
              placeholder={`Ex: E-mail de Black Friday 2026 anunciando 50% off em todos os planos. Quero destaque pro botão "Garantir desconto" que leva pra https://accordpipe.com.br/black-friday. Mencionar que a oferta termina em 48h.`}
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-card text-[13px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition resize-none"
            />
            <p className="text-[10.5px] text-muted-foreground mt-1">
              Dica: quanto mais detalhe (público, tom, CTA, imagens), melhor o resultado.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Cor da marca</label>
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="h-9 w-full rounded-lg border border-border cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Nome da marca</label>
              <input
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Tom</label>
              <select
                value={tone}
                onChange={e => setTone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] outline-none focus:border-violet-400"
              >
                <option>profissional e amigável</option>
                <option>formal e corporativo</option>
                <option>descontraído e divertido</option>
                <option>urgente e direto</option>
                <option>emocional e inspirador</option>
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-[13px] font-semibold text-muted-foreground hover:bg-muted transition">
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[13px] font-bold inline-flex items-center gap-2 disabled:opacity-50 transition shadow-md"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {busy ? "Gerando..." : "Gerar agora"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_TEMPLATE = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f5;padding:30px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:30px;text-align:center;background:#10b981;">
            <h1 style="color:#ffffff;font-family:Arial,sans-serif;font-size:24px;margin:0;">Olá {{nome}}!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;font-family:Arial,sans-serif;color:#333;font-size:15px;line-height:1.6;">
            <p>Escreva sua mensagem aqui...</p>
            <p style="text-align:center;margin:30px 0;">
              <a href="https://accordpipe.com.br" style="display:inline-block;background:#10b981;color:#ffffff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">Clique aqui</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center;background:#fafafa;font-family:Arial,sans-serif;color:#999;font-size:12px;">
            <p>© 2026 Accord · <a href="#" style="color:#999;">Cancelar inscrição</a></p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
