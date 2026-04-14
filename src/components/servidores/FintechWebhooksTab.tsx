import { AsaasIntegrationTab } from "./AsaasIntegrationTab";

export function FintechWebhooksTab({ companyId }: { companyId: string | null }) {
  if (!companyId) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Salve o tenant primeiro para configurar a integração financeira.
      </p>
    );
  }

  return <AsaasIntegrationTab companyId={companyId} />;
}
