import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Headset, Users, Zap } from "lucide-react";
import { DistribuicaoPanel } from "@/components/atendimento-config/DistribuicaoPanel";
import { RecursosChatPanel } from "@/components/atendimento-config/RecursosChatPanel";
import { TransferenciaPanel } from "@/components/atendimento-config/TransferenciaPanel";
import { MensagensHorarioPanel } from "@/components/atendimento-config/MensagensHorarioPanel";
import { DepartamentosPanel } from "@/components/atendimento-config/DepartamentosPanel";
import { ClassificacoesPanel } from "@/components/atendimento-config/ClassificacoesPanel";
import { TagsPanel } from "@/components/atendimento-config/TagsPanel";
import { FeriadosPanel } from "@/components/atendimento-config/FeriadosPanel";

export default function ConfiguracoesAtendimento() {
  const [tab, setTab] = useState("atendimento");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações de Atendimento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize distribuição, equipe, permissões e automações — configurações isoladas por tenant.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 max-w-2xl">
          <TabsTrigger value="atendimento" className="gap-2"><Headset className="w-4 h-4" />Atendimento</TabsTrigger>
          <TabsTrigger value="equipe" className="gap-2"><Users className="w-4 h-4" />Equipe e Recursos</TabsTrigger>
          <TabsTrigger value="automacao" className="gap-2"><Zap className="w-4 h-4" />Automação e Comunicação</TabsTrigger>
        </TabsList>

        <TabsContent value="atendimento" className="mt-6">
          <Accordion type="multiple" defaultValue={["distribuicao"]} className="space-y-2">
            <PanelItem value="distribuicao" title="Distribuição de atendimentos"><DistribuicaoPanel /></PanelItem>
            <PanelItem value="recursos" title="Recursos do chat"><RecursosChatPanel /></PanelItem>
            <PanelItem value="transferencias" title="Transferências e fluxo"><TransferenciaPanel /></PanelItem>
            <PanelItem value="mensagens" title="Mensagens automáticas e horário de atendimento"><MensagensHorarioPanel /></PanelItem>
            <PanelItem value="departamentos" title="Gerenciar departamentos"><DepartamentosPanel /></PanelItem>
            <PanelItem value="classificacoes" title="Gerenciar classificações"><ClassificacoesPanel /></PanelItem>
            <PanelItem value="tags" title="Gerenciar tags"><TagsPanel /></PanelItem>
            <PanelItem value="feriados" title="Feriados e datas especiais"><FeriadosPanel /></PanelItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="equipe" className="mt-6">
          <ComingSoon title="Equipe e Recursos"
            desc="Onda B — extensão da tela de Usuários com departamentos de atendimento e supervisão, perfis Atendente/Supervisor/Admin, templates por atendente, mensagens rápidas, horário de acesso, figurinhas e tipos de pausa." />
        </TabsContent>

        <TabsContent value="automacao" className="mt-6">
          <ComingSoon title="Automação e Comunicação"
            desc="Onda C — configurações do Flow Builder (auto-organizar nós, permitir publicação), mensagens agendadas e gerador de link de atendimento (genérico + WhatsApp direto)." />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PanelItem({ value, title, children }: { value: string; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border border-border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline font-semibold">{title}</AccordionTrigger>
      <AccordionContent className="pt-2 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-10 text-center">
      <h3 className="font-semibold text-lg">{title} — em breve</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto">{desc}</p>
    </div>
  );
}
