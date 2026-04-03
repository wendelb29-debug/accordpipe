import { Users, LayoutGrid, FileSignature, CreditCard, BarChart3 } from "lucide-react";

const steps = [
  { icon: Users, number: "01", title: "Captura de Leads", description: "Clientes entram via WhatsApp, formulários ou landing pages." },
  { icon: LayoutGrid, number: "02", title: "Gestão no CRM", description: "Organize negociações com funil visual estilo Kanban." },
  { icon: FileSignature, number: "03", title: "Contrato Digital", description: "Envie contratos com assinatura digital, foto e geolocalização." },
  { icon: CreditCard, number: "04", title: "Faturamento Automático", description: "Gere cobranças automáticas via PIX, boleto ou cartão." },
  { icon: BarChart3, number: "05", title: "Relatórios em Tempo Real", description: "Acompanhe faturamento, performance e crescimento da operação." },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center mb-16">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Como o ACCORD funciona
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Do primeiro contato ao relatório final, tudo automatizado em 5 etapas.
        </p>
      </div>
      <div className="relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/60 hidden lg:block" />
        <div className="grid gap-8 lg:gap-0">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative flex flex-col items-center gap-4 lg:flex-row lg:gap-12 ${
                i % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className={`flex-1 ${i % 2 === 1 ? "lg:text-left" : "lg:text-right"}`}>
                <div className={`rounded-2xl border border-border/40 bg-card p-7 shadow-card transition-all premium-hover ${i % 2 === 1 ? "" : "lg:ml-auto"} max-w-md`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-primary bg-primary/8 px-2.5 py-1 rounded-full">
                      ETAPA {step.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-background gradient-primary text-primary-foreground shadow-lg shadow-primary/20">
                <step.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 hidden lg:block" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
