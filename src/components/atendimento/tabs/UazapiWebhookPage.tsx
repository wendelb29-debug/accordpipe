import { UazapiInstancePanel } from "./whatsapp/UazapiInstancePanel";
import { UazapiWebhookSection } from "./UazapiWebhookSection";
import { UazapiDiagnostics } from "./UazapiDiagnostics";
import { WhatsAppProfileSection } from "./whatsapp/WhatsAppProfileSection";

interface Props {
  tenantId: string | null;
}

/**
 * Onda 8/9 — Página dedicada da integração uazapiGO no Editar Tenant.
 * Separada do "Webhooks Z-API" pra não confundir credenciais/URLs.
 */
export function UazapiWebhookPage({ tenantId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Webhooks WhatsApp (uazapiGO)</h2>
        <p className="text-sm text-muted-foreground">
          Configuração da instância uazapiGO deste tenant. Independente do Z-API.
        </p>
      </div>

      <UazapiInstancePanel tenantId={tenantId} />
      <WhatsAppProfileSection tenantId={tenantId} />
      <UazapiWebhookSection tenantId={tenantId} />
      <UazapiDiagnostics tenantId={tenantId} />
    </div>
  );
}
