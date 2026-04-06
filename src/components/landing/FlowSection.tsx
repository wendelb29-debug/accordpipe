import { ArrowRight, UserPlus, Handshake, FileSignature, UserCheck } from "lucide-react";

const steps = [
  { icon: UserPlus, label: "Lead", description: "Captação automática" },
  { icon: Handshake, label: "Venda", description: "Pipeline Kanban" },
  { icon: FileSignature, label: "Contrato", description: "Assinatura digital" },
  { icon: UserCheck, label: "Cliente", description: "Gestão completa" },
];

export function FlowSection() {
  return (
    <section className="relative py-20 sm:py-28 bg-[hsl(228,40%,6%)]">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(210,40%,98%)] sm:text-4xl">
            Fluxo completo. Zero retrabalho.
          </h2>
          <p className="mt-4 text-lg text-[hsl(218,14%,65%)]">
            Do primeiro contato ao pós-venda, tudo automatizado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-4 sm:gap-0">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(224,76%,53%,0.2)] to-[hsl(263,87%,60%,0.1)] border border-[hsl(224,76%,53%,0.2)]">
                  <step.icon className="h-7 w-7 text-[hsl(224,76%,65%)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(210,40%,98%)]">{step.label}</p>
                  <p className="text-xs text-[hsl(218,14%,50%)]">{step.description}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-5 w-5 text-[hsl(224,76%,53%,0.4)] mx-6 hidden sm:block shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
