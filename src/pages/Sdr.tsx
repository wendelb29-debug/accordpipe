import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { SdrPanel } from "@/components/sdr/SdrPanel";
import { Rocket } from "lucide-react";

export default function Sdr() {
  return (
    <PageContainer>
      <PageHeader
        title="SDR Operating System"
        description="Copiloto de vendas consultivas com IA — qualificação, DISC, copiloto, percepção, objeções, fechamento e cold outreach."
        icon={Rocket}
      />
      <SdrPanel />
    </PageContainer>
  );
}
