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
  const l = lead as any;
  return (
    <ZuperProposalModule
      lead={{
        id: l.id,
        name: l.name ?? l.nome ?? l.full_name ?? null,
        email: l.email,
        phone: l.phone ?? l.telefone,
        company_name: l.company_name ?? l.empresa,
        servidor_id: l.servidor_id,
      }}
      servidorId={l.servidor_id}
    />
  );
}
