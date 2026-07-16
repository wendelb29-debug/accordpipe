import { useMessageTemplates, ALL_TEMPLATE_TYPES, TEMPLATE_LABELS, AVAILABLE_VARIABLES, type TemplateType } from "@/hooks/useChatbotAutomation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, RefreshCw, Wand2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "messenger", label: "Messenger" },
  { id: "webchat", label: "Webchat" },
];

export function AutomacaoMensagensPanel() {
  const { templates, update, restoreDefault, loading, saving, dirty, save, discard } = useMessageTemplates();
  const [active, setActive] = useState<TemplateType>("welcome");

  if (loading) return <div className="py-8 flex items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando…</div>;

  const t = templates[active];
  if (!t) return null;

  return (
    <div className="space-y-4">
      <Tabs value={active} onValueChange={(v) => setActive(v as TemplateType)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/40 p-1">
          {ALL_TEMPLATE_TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {TEMPLATE_LABELS[type].label}
              {!templates[type]?.enabled && <span className="ml-1 opacity-40">·off</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {ALL_TEMPLATE_TYPES.map((type) => (
          <TabsContent key={type} value={type} className="mt-4 space-y-4">
            <TemplateEditor
              type={type}
              value={templates[type]}
              onChange={(patch) => update(type, patch)}
              onRestore={() => restoreDefault(type)}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
        {dirty && <span className="text-xs text-amber-500 mr-auto">Alterações não salvas</span>}
        <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty || saving}><RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Descartar</Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
          Salvar mensagens
        </Button>
      </div>
    </div>
  );
}

function TemplateEditor({ type, value, onChange, onRestore }: any) {
  const meta = TEMPLATE_LABELS[type as TemplateType];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVar = (v: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? value.content.length;
    const end = ta.selectionEnd ?? value.content.length;
    const next = value.content.slice(0, start) + v + value.content.slice(end);
    onChange({ content: next });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + v.length, start + v.length);
    }, 10);
  };

  const toggleChannel = (id: string) => {
    const cur: string[] = value.channels ?? [];
    onChange({ channels: cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id] });
  };

  const preview = renderPreview(value.content);

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-foreground">{meta.label}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Ativa</span>
          <Switch checked={value.enabled} onCheckedChange={(v) => onChange({ enabled: v })} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs">Texto da mensagem</Label>
          <div className="flex items-center gap-1.5">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs"><Wand2 className="h-3 w-3 mr-1" /> Variáveis</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="text-xs font-medium mb-1.5 text-muted-foreground">Inserir variável</div>
                <div className="grid grid-cols-2 gap-1">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button key={v} onClick={() => insertVar(v)} className="text-xs px-2 py-1 rounded hover:bg-muted text-left font-mono">{v}</button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="sm" onClick={onRestore} className="h-7 text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Padrão</Button>
          </div>
        </div>
        <Textarea
          ref={textareaRef}
          value={value.content}
          onChange={(e) => onChange({ content: e.target.value })}
          rows={4}
          maxLength={1000}
          className="font-mono text-sm"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-[10px] text-muted-foreground">{value.content.length}/1000 caracteres</span>
        </div>
      </div>

      <div>
        <Label className="text-xs">Canais permitidos</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {CHANNELS.map((c) => {
            const active = (value.channels ?? []).includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleChannel(c.id)}
                className={`px-3 py-1 rounded-full text-xs border transition ${active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 border border-dashed border-border p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Prévia</div>
        <div className="text-sm text-foreground whitespace-pre-wrap">{preview || <span className="text-muted-foreground italic">Sem conteúdo</span>}</div>
      </div>
    </div>
  );
}

function renderPreview(text: string): string {
  const sample: Record<string, string> = {
    "{{nome_contato}}": "Maria Silva",
    "{{primeiro_nome}}": "Maria",
    "{{empresa}}": "Accord",
    "{{nome_agente}}": "Accord IA",
    "{{nome_atendente}}": "João",
    "{{nome_equipe}}": "Comercial",
    "{{data_atual}}": new Date().toLocaleDateString("pt-BR"),
    "{{hora_atual}}": new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    "{{protocolo}}": "ACC-000123",
    "{{numero_pedido}}": "PED-4567",
    "{{responsavel_comercial}}": "Ana",
    "{{link_agendamento}}": "https://accord.com/agendar/xyz",
    "{{link_pagamento}}": "https://accord.com/pagar/xyz",
    "{{canal}}": "WhatsApp",
  };
  let out = text;
  for (const [k, v] of Object.entries(sample)) out = out.split(k).join(v);
  return out;
}
