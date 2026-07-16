import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle } from "lucide-react";
import { InstanceCredentialsCard } from "../InstanceCredentialsCard";
import { InstanceStatusCard } from "../InstanceStatusCard";
import { UazapiWebhookSection } from "../UazapiWebhookSection";
import { InstanceIdentitySection } from "./InstanceIdentitySection";
import { InstanceSettingsPanel } from "./InstanceSettingsPanel";
import { WebhooksCardsSection } from "./WebhooksCardsSection";
import { useTenantWhatsAppIntegration, type WhatsAppProvider } from "@/hooks/useTenantWhatsAppIntegration";

interface Props {
  tenantId: string | null;
  companyId: string | null;
  provider: WhatsAppProvider;
  onProviderChange: (p: WhatsAppProvider) => void;
  /** Legacy Z-API webhook config UI (existing WebhookConfig internals) */
  legacyZapiWebhookConfig?: React.ReactNode;
}

export function InstanceDetailTab({
  tenantId,
  companyId,
  provider,
  onProviderChange,
  legacyZapiWebhookConfig,
}: Props) {
  const [sub, setSub] = useState<"instance" | "webhooks">("instance");
  const { getByProvider, save } = useTenantWhatsAppIntegration(tenantId);
  const integration = getByProvider(provider);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-6">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Tabs value={sub} onValueChange={(v) => setSub(v as any)}>
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-muted/30 px-2">
              <TabsTrigger value="instance">Instância</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            </TabsList>

            <TabsContent value="instance" className="p-5 space-y-5 m-0">
              <InstanceCredentialsCard
                tenantId={tenantId}
                provider={provider}
                onProviderChange={onProviderChange}
              />
              <InstanceIdentitySection integration={integration} provider={provider} save={save} />
            </TabsContent>

            <TabsContent value="webhooks" className="p-5 space-y-5 m-0">
              {provider === "zapi" ? (
                <>
                  <WebhooksCardsSection
                    companyId={companyId}
                    provider={provider}
                    existingUrl={null}
                  />
                  {legacyZapiWebhookConfig && (
                    <details className="rounded-lg border border-border bg-muted/30 p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Configuração avançada (URLs por evento)
                      </summary>
                      <div className="pt-4">{legacyZapiWebhookConfig}</div>
                    </details>
                  )}
                </>
              ) : (
                <UazapiWebhookSection tenantId={tenantId} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 px-3 py-2 text-xs text-yellow-200/90">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-yellow-500" />
            Dados sensíveis — não compartilhe.
          </div>
          <h3 className="text-base font-semibold">Informações da integração</h3>
          <InstanceStatusCard tenantId={tenantId} provider={provider} />
        </div>

        <InstanceSettingsPanel integration={integration} provider={provider} save={save} />
      </div>
    </div>
  );
}
