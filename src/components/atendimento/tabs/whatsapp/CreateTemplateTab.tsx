import { useMemo, useState } from "react";
import { Bold, Italic, Strikethrough, Code, Smile, AlignLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import { PhonePreview } from "./PhonePreview";
import type { WhatsAppTemplateDraft } from "./TemplatesTab";

interface Props {
  onPublish: (t: WhatsAppTemplateDraft) => void;
}

const CATEGORIES = [
  { id: "MARKETING", label: "Marketing", desc: "Promoções, ofertas e novidades para engajar clientes." },
  { id: "UTILIDADE", label: "Utilidade", desc: "Atualizações de conta, alertas e informações transacionais." },
  { id: "AUTENTICAÇÃO", label: "Autenticação", desc: "Códigos de verificação e senhas de uso único." },
] as const;

const SUBTYPES = [
  { id: "padrao", label: "Padrão", desc: "Mensagem simples com texto, mídia e botões." },
  { id: "catalogo", label: "Catálogo", desc: "Envia produtos do seu catálogo do WhatsApp." },
  { id: "carrossel", label: "Carrossel", desc: "Múltiplos cards deslizáveis." },
  { id: "oferta", label: "Oferta por tempo limitado", desc: "Promoção com contador regressivo." },
];

export function CreateTemplateTab({ onPublish }: Props) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("pt_BR");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("MARKETING");
  const [subtype, setSubtype] = useState("padrao");
  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<string[]>([]);

  const templateId = useMemo(() => slugify(name) || "novo-template", [name]);

  const clear = () => {
    setName("");
    setLanguage("pt_BR");
    setCategory("MARKETING");
    setSubtype("padrao");
    setHeader("");
    setBody("");
    setFooter("");
    setButtons([]);
  };

  const publish = () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Nome e corpo são obrigatórios.");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);
    onPublish({
      id: templateId,
      name,
      category,
      language,
      status: "pendente",
      header: header || undefined,
      body,
      footer: footer || undefined,
      buttons: buttons.length ? buttons : undefined,
      createdAt: now,
      updatedAt: now,
    });
    toast.success("Template enviado para aprovação.");
    clear();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-6">
      <div className="space-y-6">
        {/* Nome e idioma */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-widest">
              Nome do template e idioma
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,180px] gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Dê um nome ao seu modelo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} maxLength={60} />
              <div className="text-[10px] text-muted-foreground text-right mt-1">{name.length}/60</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="en_US">Inglês (US)</SelectItem>
                  <SelectItem value="es_ES">Espanhol</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* ID */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-2">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">ID do Template</div>
          <code className="block rounded-md bg-muted px-3 py-2 text-sm font-mono">{templateId}</code>
        </section>

        {/* Categoria */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">Categoria</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  category === c.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="font-semibold text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
              </button>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            {SUBTYPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSubtype(s.id)}
                className={`w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  subtype === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className={`mt-1 h-3 w-3 rounded-full border-2 ${subtype === s.id ? "border-primary bg-primary" : "border-muted-foreground"}`} />
                <div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Conteúdo */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">Conteúdo</div>

          <div>
            <Label className="text-xs text-muted-foreground">Cabeçalho (opcional)</Label>
            <Input value={header} onChange={(e) => setHeader(e.target.value)} placeholder="Ex: Sua fatura chegou" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Corpo *</Label>
            <div className="flex items-center gap-1 rounded-t-md border border-border border-b-0 bg-muted/40 px-2 py-1">
              <button type="button" className="p-1 hover:bg-muted rounded"><Bold className="h-3.5 w-3.5" /></button>
              <button type="button" className="p-1 hover:bg-muted rounded"><Italic className="h-3.5 w-3.5" /></button>
              <button type="button" className="p-1 hover:bg-muted rounded"><Strikethrough className="h-3.5 w-3.5" /></button>
              <button type="button" className="p-1 hover:bg-muted rounded"><Code className="h-3.5 w-3.5" /></button>
              <button type="button" className="p-1 hover:bg-muted rounded"><Smile className="h-3.5 w-3.5" /></button>
              <button type="button" className="p-1 hover:bg-muted rounded"><AlignLeft className="h-3.5 w-3.5" /></button>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 1024))}
              rows={6}
              className="rounded-t-none"
              placeholder="Olá {{1}}, sua {{2}} está pronta."
            />
            <div className="flex items-center justify-between mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => setBody((b) => `${b}{{${(b.match(/\{\{\d+\}\}/g)?.length || 0) + 1}}}`)}
              >
                <Plus className="h-3 w-3" /> Adicionar variável
              </Button>
              <div className="text-[10px] text-muted-foreground">{body.length}/1024</div>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Rodapé (opcional)</Label>
            <Input value={footer} onChange={(e) => setFooter(e.target.value.slice(0, 60))} maxLength={60} />
            <div className="text-[10px] text-muted-foreground text-right mt-1">{footer.length}/60</div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Botões (opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Até 10 botões. Acima de 3 aparecem como lista.
            </p>
            <div className="space-y-2">
              {buttons.map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={b}
                    onChange={(e) => setButtons((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                    placeholder="Texto do botão"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setButtons((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 gap-1"
              disabled={buttons.length >= 10}
              onClick={() => setButtons((prev) => [...prev, ""])}
            >
              <Plus className="h-3 w-3" /> Adicionar Botão
            </Button>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={clear}>Limpar formulário</Button>
          <Button onClick={publish}>Publicar</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-4 h-fit">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground mb-3 text-center">Pré-visualização</div>
          <PhonePreview
            header={header}
            body={body}
            footer={footer}
            buttons={buttons.filter(Boolean)}
          />
        </div>
      </div>
    </div>
  );
}
