import { useState } from "react";
import { Search, Filter, RefreshCw, Grid, List as ListIcon, AlertTriangle, Clock, Check, Copy, Trash2, Share2, TestTube, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhonePreview } from "./PhonePreview";

export interface WhatsAppTemplateDraft {
  id: string;
  name: string;
  category: "MARKETING" | "UTILIDADE" | "AUTENTICAÇÃO";
  language: string;
  status: "aprovado" | "pendente";
  body: string;
  header?: string;
  footer?: string;
  buttons?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  templates: WhatsAppTemplateDraft[];
  onCreate: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  UTILIDADE: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  "AUTENTICAÇÃO": "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

export function TemplatesTab({ templates, onCreate }: Props) {
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState(12);
  const [preview, setPreview] = useState<WhatsAppTemplateDraft | null>(null);

  const filtered = templates.filter((t) =>
    !q || t.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar templates..." className="pl-9" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Data de criação</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={`px-2.5 py-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-2.5 py-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
        <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[12, 24, 48].map((n) => (
              <SelectItem key={n} value={String(n)}>Mostrar {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Criar template
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
        <span className="text-yellow-200/90">
          Modelos pendentes podem levar até 24 horas para aprovação pelo provedor.
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl">
          <MessageCircle className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">Nenhum template ainda.</p>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Criar primeiro template
          </Button>
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => setPreview(t)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{t.name}</div>
                  <Badge variant="outline" className={`mt-1 text-[10px] ${CATEGORY_COLORS[t.category]}`}>
                    {t.category}
                  </Badge>
                </div>
                {t.status === "aprovado" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-500" />
                )}
              </div>

              <div className="rounded-lg bg-muted/40 p-2">
                <PhonePreview body={t.body} header={t.header} footer={t.footer} buttons={t.buttons} compact />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <button className="p-1.5 hover:bg-muted rounded" title="Duplicar"><Copy className="h-3.5 w-3.5" /></button>
                  <button className="p-1.5 hover:bg-muted rounded" title="Testar"><TestTube className="h-3.5 w-3.5" /></button>
                  <button className="p-1.5 hover:bg-muted rounded" title="Compartilhar"><Share2 className="h-3.5 w-3.5" /></button>
                  <button className="p-1.5 hover:bg-muted rounded" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <span className="text-[10px] text-muted-foreground">{t.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pré-visualização do template</DialogTitle>
          </DialogHeader>
          {preview && (
            <PhonePreview
              body={preview.body}
              header={preview.header}
              footer={preview.footer}
              buttons={preview.buttons}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
