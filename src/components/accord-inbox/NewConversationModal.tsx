import { useState } from "react";
import { X, MessageSquare, Smartphone, Cloud, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NewConversationIntegration {
  id: string;
  provider: "zapi" | "uazapi" | "cloud";
  label: string;
  phone?: string;
  serverUrl?: string;
  instanceName?: string;
  isConnected: boolean;
}

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrations: NewConversationIntegration[];
  onStart: (params: {
    phone: string;
    name: string;
    integrationId: string;
    initialMessage?: string;
  }) => void;
}

const PROVIDER_META = {
  zapi: { icon: <MessageSquare size={15} />, bg: "bg-purple-100 dark:bg-purple-900/30", color: "text-purple-700 dark:text-purple-300", label: "Z-API" },
  uazapi: { icon: <Smartphone size={15} />, bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-700 dark:text-emerald-300", label: "Uazapi" },
  cloud: { icon: <Cloud size={15} />, bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-700 dark:text-blue-300", label: "Cloud API" },
};

export function NewConversationModal({ open, onOpenChange, integrations, onStart }: NewConversationModalProps) {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState(
    integrations.find((i) => i.isConnected)?.id || ""
  );
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [initialMessage, setInitialMessage] = useState("");

  if (!open) return null;

  const handleStart = () => {
    if (!phone.trim() || !selectedIntegrationId) return;
    onStart({ phone: phone.trim(), name: name.trim(), integrationId: selectedIntegrationId, initialMessage: initialMessage.trim() });
    setPhone(""); setName(""); setInitialMessage("");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border/60 rounded-2xl shadow-2xl w-[380px] p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-medium text-foreground">Nova conversa</h3>
          <button onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-2 block">Canal / instância</label>
          <div className="space-y-1.5">
            {integrations.map((intg) => {
              const meta = PROVIDER_META[intg.provider];
              const isSelected = intg.id === selectedIntegrationId;
              return (
                <div key={intg.id}
                  onClick={() => intg.isConnected && setSelectedIntegrationId(intg.id)}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all",
                    isSelected ? "border-primary/50 bg-primary/5" : "border-border/50 hover:bg-muted/40",
                    !intg.isConnected && "opacity-50 cursor-not-allowed"
                  )}>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", meta.bg, meta.color)}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{intg.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {intg.phone || intg.serverUrl || intg.instanceName || meta.label}
                    </p>
                  </div>
                  {intg.isConnected ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      conectado
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                      desconectado
                    </span>
                  )}
                  {isSelected && <CheckCircle2 size={14} className="text-primary flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">Número do contato *</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="(34) 9 9999-0000"
            className="w-full px-3 py-2 rounded-xl border border-border/50 bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all" />
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Nome do contato
            <span className="ml-1 text-[10px] text-muted-foreground/60">(buscado automaticamente no WhatsApp)</span>
          </label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full px-3 py-2 rounded-xl border border-border/50 bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all" />
        </div>

        <div className="mb-5">
          <label className="text-xs text-muted-foreground mb-1.5 block">Mensagem inicial (opcional)</label>
          <input type="text" value={initialMessage} onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Olá! Como posso ajudar?"
            className="w-full px-3 py-2 rounded-xl border border-border/50 bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-all" />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition-all">
            Cancelar
          </button>
          <button onClick={handleStart}
            disabled={!phone.trim() || !selectedIntegrationId}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Iniciar conversa
          </button>
        </div>
      </div>
    </div>
  );
}
