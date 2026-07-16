import { useEffect, useState } from "react";
import { Search, RefreshCw, Grid, List as ListIcon, Trash2, Star, TestTube, Pencil, Plus, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PhonePreview } from "./PhonePreview";

export type WhatsAppHeaderType = "none" | "text" | "image" | "video" | "document" | "audio";
export interface WhatsAppTemplateButton {
  label: string;
  type: "reply" | "url" | "call" | "copy";
  value: string;
}
export interface WhatsAppTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  header_type: WhatsAppHeaderType;
  header_text: string | null;
  header_media_url: string | null;
  header_media_doc_name: string | null;
  body: string;
  footer: string | null;
  buttons: WhatsAppTemplateButton[];
  variable_count: number;
  is_favorite: boolean;
  updated_at: string;
}

// legacy alias used elsewhere in codebase
export type WhatsAppTemplateDraft = WhatsAppTemplate;

interface Props {
  onCreate: () => void;
  onEdit: (t: WhatsAppTemplate) => void;
  refreshKey?: number;
}

export function TemplatesTab({ onCreate, onEdit, refreshKey }: Props) {
  const { activeCompanyId } = useAuth();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<WhatsAppTemplate | null>(null);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("tenant_id", activeCompanyId)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = ((data as any) || []) as WhatsAppTemplate[];
    setTemplates(list);
    setLoading(false);
    // sign media urls
    const paths = list.filter(t => t.header_media_url && !/^https?:\/\//i.test(t.header_media_url)).map(t => t.header_media_url!);
    if (paths.length) {
      const map: Record<string, string> = {};
      await Promise.all(paths.map(async (p) => {
        const { data: s } = await supabase.storage.from("whatsapp-template-media").createSignedUrl(p, 60 * 60);
        if (s?.signedUrl) map[p] = s.signedUrl;
      }));
      setSignedMap(map);
    }
  };

  useEffect(() => { load(); }, [activeCompanyId, refreshKey]);

  const remove = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template excluído.");
    load();
  };

  const toggleFav = async (t: WhatsAppTemplate) => {
    const { error } = await supabase.from("whatsapp_templates")
      .update({ is_favorite: !t.is_favorite }).eq("id", t.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = templates.filter((t) =>
    !q || t.name.toLowerCase().includes(q.toLowerCase()) || (t.description || "").toLowerCase().includes(q.toLowerCase())
  );

  const resolveMedia = (t: WhatsAppTemplate) =>
    t.header_media_url ? (signedMap[t.header_media_url] || (/^https?:\/\//i.test(t.header_media_url) ? t.header_media_url : null)) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar templates..." className="pl-9" />
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button onClick={() => setView("grid")} className={`px-2.5 py-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <Grid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("list")} className={`px-2.5 py-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="icon" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={onCreate} className="gap-2"><Plus className="h-4 w-4" /> Criar template</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <MessageCircle className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">Nenhum template ainda.</p>
          <Button onClick={onCreate} className="gap-2"><Plus className="h-4 w-4" /> Criar primeiro template</Button>
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {filtered.map((t) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 cursor-pointer" onClick={() => setPreview(t)}>
                  <div className="font-semibold truncate">{t.name}</div>
                  {t.description && <div className="text-xs text-muted-foreground truncate">{t.description}</div>}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{t.header_type}</Badge>
                    {t.variable_count > 0 && <Badge variant="outline" className="text-[10px]">{t.variable_count} var</Badge>}
                    {t.buttons?.length > 0 && <Badge variant="outline" className="text-[10px]">{t.buttons.length} botões</Badge>}
                  </div>
                </div>
                <button onClick={() => toggleFav(t)} className="p-1 hover:bg-muted rounded">
                  <Star className={`h-4 w-4 ${t.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              </div>

              <div className="rounded-lg bg-muted/40 p-2 cursor-pointer" onClick={() => setPreview(t)}>
                <PhonePreview
                  body={t.body}
                  header={t.header_text || ""}
                  headerMediaType={t.header_type}
                  headerMediaUrl={resolveMedia(t)}
                  headerMediaDocName={t.header_media_doc_name || ""}
                  footer={t.footer || ""}
                  buttons={(t.buttons || []).map(b => ({ label: b.label, type: b.type }))}
                  compact
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <button className="p-1.5 hover:bg-muted rounded" title="Editar" onClick={() => onEdit(t)}><Pencil className="h-3.5 w-3.5" /></button>
                  <button className="p-1.5 hover:bg-muted rounded" title="Testar"><TestTube className="h-3.5 w-3.5" /></button>
                  <button className="p-1.5 hover:bg-muted rounded" title="Excluir" onClick={() => remove(t.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(t.updated_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            <PhonePreview
              body={preview.body}
              header={preview.header_text || ""}
              headerMediaType={preview.header_type}
              headerMediaUrl={resolveMedia(preview)}
              headerMediaDocName={preview.header_media_doc_name || ""}
              footer={preview.footer || ""}
              buttons={(preview.buttons || []).map(b => ({ label: b.label, type: b.type }))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
