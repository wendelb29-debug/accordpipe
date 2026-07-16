import { useState } from "react";
import { Plus, Copy, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const MESSAGE_EVENTS = ["SENT", "DELIVERED", "READ", "DELETED", "OTHERS", "FAILED", "MESSAGE", "BILLING", "ENQUEUED"];
const SYSTEM_EVENTS = ["TEMPLATE", "ACCOUNT"];

interface WebhookCard {
  id: string;
  name: string;
  callbackUrl: string;
  events: string[];
  format?: string;
}

interface Props {
  companyId: string | null;
  provider: "zapi" | "uazapi";
  existingUrl?: string | null;
}

export function WebhooksCardsSection({ companyId, provider, existingUrl }: Props) {
  const [cards, setCards] = useState<WebhookCard[]>(() =>
    existingUrl
      ? [{
          id: "default",
          name: `Webhook ${provider.toUpperCase()}`,
          callbackUrl: existingUrl,
          events: MESSAGE_EVENTS,
          format: "JSON v1",
        }]
      : []
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    useProviderWebhook: true,
    callbackUrl: "",
    events: [] as string[],
  });

  const copy = (v: string, id: string) => {
    navigator.clipboard.writeText(v);
    setCopied(id);
    toast.success("URL copiada");
    setTimeout(() => setCopied(null), 1500);
  };

  const toggleEvent = (ev: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Informe um nome/tag");
      return;
    }
    const url = form.useProviderWebhook
      ? existingUrl || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${provider === "zapi" ? "zapi-webhook" : "whatsapp-webhook"}/${companyId}`
      : form.callbackUrl;
    setCards((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: form.name, callbackUrl: url, events: form.events, format: "JSON v1" },
    ]);
    setDialogOpen(false);
    setForm({ name: "", useProviderWebhook: true, callbackUrl: "", events: [] });
    toast.success("Webhook criado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Webhooks</h3>
          <p className="text-xs text-muted-foreground">Informações dos webhooks</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Criar webhook
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum webhook configurado. Crie um para receber eventos.
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <button className="p-1 hover:bg-muted rounded"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  <button className="p-1 hover:bg-muted rounded"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                </div>
                <Badge variant="outline" className="text-[10px]">{c.format}</Badge>
              </div>

              <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
                <code className="text-xs truncate flex-1">{c.callbackUrl}</code>
                <button
                  onClick={() => copy(c.callbackUrl, c.id)}
                  className="p-1 hover:bg-muted rounded shrink-0"
                >
                  {copied === c.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Eventos de Mensagem
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MESSAGE_EVENTS.map((ev) => (
                    <Badge
                      key={ev}
                      variant="outline"
                      className={`text-[10px] ${c.events.includes(ev) ? "bg-primary/15 text-primary border-primary/30" : ""}`}
                    >
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                  Eventos de Sistema
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SYSTEM_EVENTS.map((ev) => (
                    <Badge
                      key={ev}
                      variant="outline"
                      className={`text-[10px] ${c.events.includes(ev) ? "bg-primary/15 text-primary border-primary/30" : ""}`}
                    >
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar webhook</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Nome do webhook (tag)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Usar webhook da {provider.toUpperCase()}</div>
                <div className="text-xs text-muted-foreground">Gera a Callback URL automaticamente.</div>
              </div>
              <Switch
                checked={form.useProviderWebhook}
                onCheckedChange={(v) => setForm({ ...form, useProviderWebhook: v })}
              />
            </div>

            {!form.useProviderWebhook && (
              <div>
                <Label className="text-xs text-muted-foreground">Callback URL personalizada</Label>
                <Input
                  value={form.callbackUrl}
                  onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Eventos
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[...MESSAGE_EVENTS, ...SYSTEM_EVENTS].map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={form.events.includes(ev)} onCheckedChange={() => toggleEvent(ev)} />
                    {ev}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={submit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
