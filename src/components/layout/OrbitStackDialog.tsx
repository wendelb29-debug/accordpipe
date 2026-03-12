import { Rocket, Server, Plug, MessageSquare, Layers, Database, Cpu, HardDrive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const steps = [
  {
    icon: Server,
    title: "1️⃣ Subir a Evolution API",
    description: "Suba em um servidor (VPS, Railway, Render, EasyPanel, Coolify ou Docker).",
    detail: "Resultado: https://seu-servidor.com ou http://IP:8080",
    options: ["DigitalOcean", "Contabo", "Hostinger", "Railway", "Render", "EasyPanel", "Coolify", "Docker"],
  },
  {
    icon: Plug,
    title: "2️⃣ Criar uma instância",
    description: "Endpoint: POST /instance/create",
    detail: "Isso gera o QR Code do WhatsApp para conectar.",
  },
  {
    icon: MessageSquare,
    title: "3️⃣ Conectar no Orbit",
    description: "Use os endpoints da Evolution API para integrar:",
    endpoints: ["/message/sendText", "/message/sendImage", "/message/sendAudio"],
    features: ["Enviar mensagem automática", "Disparar WhatsApp", "Responder clientes", "Integrar funil"],
  },
];

const stackItems = [
  { label: "Lovable", desc: "Interface", icon: Layers },
  { label: "Supabase", desc: "Banco de dados", icon: Database },
  { label: "Evolution API", desc: "WhatsApp", icon: MessageSquare },
  { label: "Redis", desc: "Fila", icon: Cpu },
  { label: "PostgreSQL", desc: "Persistência", icon: HardDrive },
];

export function OrbitStackDialog({ collapsed }: { collapsed: boolean }) {
  const trigger = collapsed ? (
    <Button variant="ghost" size="icon" className="w-full h-9 rounded-xl text-primary">
      <Rocket className="h-4 w-4" />
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="w-full gap-2 rounded-xl border-primary/20 text-primary hover:bg-primary/5 h-9 text-xs font-semibold">
      <Rocket className="h-3.5 w-3.5" />
      Orbit Stack
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            Orbit Stack
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Steps */}
          {steps.map((step, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{step.description}</p>
              {step.detail && (
                <p className="text-xs font-mono text-primary/80 bg-muted/50 rounded-lg px-3 py-1.5">{step.detail}</p>
              )}
              {step.options && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {step.options.map((o) => (
                    <Badge key={o} variant="secondary" className="text-[10px] font-normal">{o}</Badge>
                  ))}
                </div>
              )}
              {step.endpoints && (
                <div className="space-y-1 pt-1">
                  {step.endpoints.map((e) => (
                    <p key={e} className="text-xs font-mono text-primary/80 bg-muted/50 rounded px-2 py-1">{e}</p>
                  ))}
                </div>
              )}
              {step.features && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {step.features.map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] font-normal">{f}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Architecture */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              ⚡ Arquitetura Ideal
            </h3>
            <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
              <Badge className="text-xs">Orbit (Lovable Frontend)</Badge>
              <span>↓</span>
              <Badge variant="secondary" className="text-xs">API do Orbit (Edge Functions)</Badge>
              <span>↓</span>
              <Badge variant="outline" className="text-xs">Evolution API</Badge>
              <span>↓</span>
              <Badge variant="secondary" className="text-xs">WhatsApp</Badge>
            </div>
          </div>

          {/* Stack */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">🔥 Orbit Stack Profissional</h3>
            <div className="grid grid-cols-2 gap-2">
              {stackItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              CRM estilo Z-API / Whaticket / Leadster
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
