import { ZuperProposalModule } from "./proposta/ZuperProposalModule";
import { CrmLead } from "@/hooks/useCrmLeads";

/**
 * LeadPropostasTab — agora delega para o novo módulo Zuper (proposta/).
 * Mantém a assinatura legada por compatibilidade. `signatureMode` ainda não
 * é tratado neste módulo novo (ele só renderiza listagem + form de proposta).
 */
export function LeadPropostasTab({
  lead,
}: {
  lead: CrmLead;
  addActivity?: (data: any) => Promise<any>;
  signatureMode?: boolean;
  onUpdateLead?: (id: string, updates: Partial<CrmLead>) => Promise<boolean>;
}) {
  return (
    <ZuperProposalModule
      lead={{
        id: lead.id,
        name: lead.name,
        email: (lead as any).email,
        phone: (lead as any).phone,
        company_name: (lead as any).company_name,
        servidor_id: (lead as any).servidor_id,
      }}
      servidorId={(lead as any).servidor_id}
    />
  );
}
