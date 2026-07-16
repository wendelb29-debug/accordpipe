import { useEffect, useState } from "react";
import { Save, Zap, Megaphone, Keyboard, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TenantWhatsAppIntegration, WhatsAppProvider } from "@/hooks/useTenantWhatsAppIntegration";

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

function ToggleRow({ icon, title, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface Props {
  integration: TenantWhatsAppIntegration | null;
  provider: WhatsAppProvider;
  save: (provider: WhatsAppProvider, payload: Partial<TenantWhatsAppIntegration>) => Promise<any>;
}

export function InstanceSettingsPanel({ integration, provider, save }: Props) {
  const meta = (integration?.provider_metadata || {}) as any;
  const initial = meta.settings || {};

  const [displayName, setDisplayName] = useState<string>(meta.display_name || integration?.instance_name || "");
  const [defaultFlow, setDefaultFlow] = useState<string>(meta.default_flow || "");
  const [allowActive, setAllowActive] = useState<boolean>(!!initial.allow_active);
  const [allowBroadcast, setAllowBroadcast] = useState<boolean>(!!initial.allow_broadcast);
  const [simulateTyping, setSimulateTyping] = useState<boolean>(!!initial.simulate_typing);
  const [restrictAgents, setRestrictAgents] = useState<boolean>(!!initial.restrict_agents);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const m = (integration?.provider_metadata || {}) as any;
    const s = m.settings || {};
    setDisplayName(m.display_name || integration?.instance_name || "");
    setDefaultFlow(m.default_flow || "");
    setAllowActive(!!s.allow_active);
    setAllowBroadcast(!!s.allow_broadcast);
    setSimulateTyping(!!s.simulate_typing);
    setRestrictAgents(!!s.restrict_agents);
  }, [integration?.id]);

  const handleSave = async () => {
    if (!integration) {
      toast.error("Configure as credenciais primeiro.");
      return;
    }
    setSaving(true);
    try {
      const newMeta = {
        ...(integration.provider_metadata || {}),
        display_name: displayName,
        default_flow: defaultFlow,
        settings: {
          allow_active: allowActive,
          allow_broadcast: allowBroadcast,
          simulate_typing: simulateTyping,
          restrict_agents: restrictAgents,
        },
      };
      await save(provider, { provider_metadata: newMeta } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-base font-semibold">Configurações</h3>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Nome de exibição do canal</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex: Atendimento Principal"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Fluxo padrão vinculado</Label>
          <Input
            value={defaultFlow}
            onChange={(e) => setDefaultFlow(e.target.value)}
            placeholder="Nenhum"
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Mensagens
        </div>
        <div className="divide-y divide-border">
          <ToggleRow
            icon={<Zap className="h-4 w-4" />}
            title="Permitir ativo"
            description="Envio de mensagens fora do contexto de uma conversa em andamento."
            checked={allowActive}
            onCheckedChange={setAllowActive}
          />
          <ToggleRow
            icon={<Megaphone className="h-4 w-4" />}
            title="Permitir transmissão"
            description="Habilita disparos em massa através deste canal."
            checked={allowBroadcast}
            onCheckedChange={setAllowBroadcast}
          />
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Atendimento
        </div>
        <div className="divide-y divide-border">
          <ToggleRow
            icon={<Keyboard className="h-4 w-4" />}
            title="Simular digitando"
            description="Mostra o indicador de digitação antes de enviar a mensagem."
            checked={simulateTyping}
            onCheckedChange={setSimulateTyping}
          />
          <ToggleRow
            icon={<Users className="h-4 w-4" />}
            title="Restringir atendentes"
            description="Apenas atendentes selecionados podem atender este canal."
            checked={restrictAgents}
            onCheckedChange={setRestrictAgents}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="h-4 w-4" />
        Salvar
      </Button>
    </div>
  );
}
