import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PhonePreview } from "./PhonePreview";
import type { WhatsAppTemplate } from "./TemplatesTab";

interface Props {
  onPublished: () => void;
  editing?: WhatsAppTemplate | null;
}

type HeaderType = "none" | "text" | "image" | "video" | "document" | "audio";
type ButtonType = "reply" | "url" | "call" | "copy";
interface TplButton { label: string; type: ButtonType; value: string }

const HEADER_TYPES: { v: HeaderType; label: string }[] = [
  { v: "none", label: "Sem cabeçalho" },
  { v: "text", label: "Texto" },
  { v: "image", label: "Imagem" },
  { v: "video", label: "Vídeo" },
  { v: "document", label: "Documento" },
  { v: "audio", label: "Áudio" },
];

const BTN_TYPES: { v: ButtonType; label: string; hint: string }[] = [
  { v: "reply", label: "Resposta rápida", hint: "" },
  { v: "url", label: "Abrir link", hint: "https://..." },
  { v: "call", label: "Ligar", hint: "+55..." },
  { v: "copy", label: "Copiar texto", hint: "código..." },
];

const ACCEPT: Record<HeaderType, string> = {
  none: "",
  text: "",
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  document: ".pdf,.doc,.docx,.xls,.xlsx,.txt",
};

function extractVarCount(...parts: (string | null | undefined)[]): number {
  let max = 0;
  for (const p of parts) {
    if (!p) continue;
    for (const m of p.matchAll(/\{\{(\d+)\}\}/g)) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

export function CreateTemplateTab({ onPublished, editing }: Props) {
  const { activeCompanyId } = useAuth();
  const [name, setName] = useState(editing?.name || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [headerType, setHeaderType] = useState<HeaderType>((editing?.header_type as HeaderType) || "none");
  const [headerText, setHeaderText] = useState(editing?.header_text || "");
  const [headerMediaPath, setHeaderMediaPath] = useState<string | null>(editing?.header_media_url || null);
  const [headerMediaPreview, setHeaderMediaPreview] = useState<string | null>(null);
  const [headerMediaDocName, setHeaderMediaDocName] = useState(editing?.header_media_doc_name || "");
  const [body, setBody] = useState(editing?.body || "");
  const [footer, setFooter] = useState(editing?.footer || "");
  const [buttons, setButtons] = useState<TplButton[]>(
    (editing?.buttons as TplButton[] | undefined) || [],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // signed url for preview
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!headerMediaPath || /^https?:\/\//i.test(headerMediaPath)) {
        setHeaderMediaPreview(headerMediaPath);
        return;
      }
      const { data } = await supabase.storage
        .from("whatsapp-template-media")
        .createSignedUrl(headerMediaPath, 60 * 60);
      if (!cancelled) setHeaderMediaPreview(data?.signedUrl ?? null);
    })();
    return () => { cancelled = true; };
  }, [headerMediaPath]);

  const variableCount = useMemo(
    () => extractVarCount(body, headerText, footer),
    [body, headerText, footer],
  );

  const showMediaButtonsWarning =
    ["document", "audio", "video"].includes(headerType) && buttons.length > 0;

  const handleUpload = async (file: File) => {
    if (!activeCompanyId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${activeCompanyId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("whatsapp-template-media")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      setHeaderMediaPath(path);
      if (headerType === "document" && !headerMediaDocName) setHeaderMediaDocName(file.name);
      toast.success("Mídia enviada");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const addButton = () => {
    if (buttons.length >= 10) return;
    setButtons((prev) => [...prev, { label: "", type: "reply", value: "" }]);
  };
  const updateButton = (i: number, patch: Partial<TplButton>) =>
    setButtons((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeButton = (i: number) =>
    setButtons((prev) => prev.filter((_, idx) => idx !== i));

  const insertVar = () => {
    const n = variableCount + 1;
    setBody((b) => `${b}{{${n}}}`);
  };

  const publish = async () => {
    if (!activeCompanyId) return;
    if (!name.trim() || !body.trim()) {
      toast.error("Nome e corpo são obrigatórios."); return;
    }
    if (headerType === "text" && !headerText.trim()) {
      toast.error("Preencha o texto do cabeçalho ou escolha outro tipo."); return;
    }
    if (["image", "video", "document", "audio"].includes(headerType) && !headerMediaPath) {
      toast.error("Envie o arquivo do cabeçalho."); return;
    }
    if (headerType === "document" && !headerMediaDocName.trim()) {
      toast.error("Informe o nome de exibição do documento."); return;
    }
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      if (!b.label.trim()) return toast.error(`Botão ${i + 1}: rótulo vazio.`);
      if (b.type !== "reply" && !b.value.trim()) return toast.error(`Botão ${i + 1}: valor obrigatório.`);
    }

    setSaving(true);
    try {
      const payload = {
        tenant_id: activeCompanyId,
        name: name.trim(),
        description: description.trim() || null,
        header_type: headerType,
        header_text: headerType === "text" ? headerText.trim() : null,
        header_media_url: ["image", "video", "document", "audio"].includes(headerType) ? headerMediaPath : null,
        header_media_doc_name: headerType === "document" ? headerMediaDocName.trim() : null,
        body: body.trim(),
        footer: footer.trim() || null,
        buttons: buttons as any,
        variable_count: variableCount,
      };
      const { error } = editing?.id
        ? await supabase.from("whatsapp_templates").update(payload).eq("id", editing.id)
        : await supabase.from("whatsapp_templates").insert(payload);
      if (error) throw error;
      toast.success(editing ? "Template atualizado." : "Template publicado.");
      onPublished();
    } catch (e: any) {
      toast.error(e.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
      <div className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">Identificação</div>
          <div>
            <Label className="text-xs text-muted-foreground">Nome do template *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Descrição interna</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">Cabeçalho</div>
          <Select value={headerType} onValueChange={(v) => setHeaderType(v as HeaderType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HEADER_TYPES.map((h) => (
                <SelectItem key={h.v} value={h.v}>{h.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {headerType === "text" && (
            <div>
              <Label className="text-xs text-muted-foreground">Texto do cabeçalho</Label>
              <Input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Ex: Sua fatura {{1}}" maxLength={60} />
            </div>
          )}

          {["image", "video", "document", "audio"].includes(headerType) && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Arquivo</Label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs hover:bg-muted">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Enviando..." : headerMediaPath ? "Trocar arquivo" : "Enviar arquivo"}
                  <input
                    type="file"
                    className="hidden"
                    accept={ACCEPT[headerType]}
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {headerMediaPath && (
                  <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                    {headerMediaPath.split("/").pop()}
                  </span>
                )}
              </div>
              {headerType === "document" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Nome exibido do documento</Label>
                  <Input value={headerMediaDocName} onChange={(e) => setHeaderMediaDocName(e.target.value)} placeholder="Contrato.pdf" />
                </div>
              )}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">Corpo *</div>
          <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value.slice(0, 1024))}
            placeholder="Olá {{1}}, sua {{2}} está pronta." />
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={insertVar} className="gap-1 text-xs">
              <Plus className="h-3 w-3" /> Adicionar variável
            </Button>
            <div className="text-[10px] text-muted-foreground">
              {variableCount} variável{variableCount === 1 ? "" : "s"} · {body.length}/1024
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Rodapé</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value.slice(0, 60))} maxLength={60} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-primary uppercase tracking-widest">Botões</div>
            <span className="text-[10px] text-muted-foreground">Até 10 botões. Acima de 3 aparecem como lista.</span>
          </div>

          {showMediaButtonsWarning && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
              Atenção: botões só suportam imagem no cabeçalho na API do WhatsApp. Vídeo/áudio/documento serão enviados como uma mensagem separada, logo antes dos botões.
            </div>
          )}

          <div className="space-y-2">
            {buttons.map((b, i) => {
              const meta = BTN_TYPES.find(x => x.v === b.type)!;
              return (
                <div key={i} className="grid grid-cols-[140px_1fr_1fr_auto] gap-2 items-center">
                  <Select value={b.type} onValueChange={(v) => updateButton(i, { type: v as ButtonType, value: v === "reply" ? "" : b.value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BTN_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={b.label} onChange={(e) => updateButton(i, { label: e.target.value.slice(0, 25) })} placeholder="Rótulo" />
                  <Input
                    value={b.value}
                    onChange={(e) => updateButton(i, { value: e.target.value })}
                    placeholder={b.type === "reply" ? "(sem valor)" : meta.hint}
                    disabled={b.type === "reply"}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeButton(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" className="gap-1" disabled={buttons.length >= 10} onClick={addButton}>
            <Plus className="h-3 w-3" /> Adicionar botão
          </Button>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onPublished} disabled={saving}>Cancelar</Button>
          <Button onClick={publish} disabled={saving || uploading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? "Salvar alterações" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 h-fit">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-3 text-center">Pré-visualização</div>
          <PhonePreview
            header={headerText}
            headerMediaType={headerType}
            headerMediaUrl={headerMediaPreview}
            headerMediaDocName={headerMediaDocName}
            body={body}
            footer={footer}
            buttons={buttons.map(b => ({ label: b.label, type: b.type }))}
          />
        </div>
      </div>
    </div>
  );
}
