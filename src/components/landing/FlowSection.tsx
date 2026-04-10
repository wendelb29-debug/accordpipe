import { ArrowRight, UserPlus, Handshake, FileSignature, UserCheck } from "lucide-react";

const steps = [
  { icon: UserPlus, label: "Captação", description: "Leads automáticos", color: "#3B82F6", num: "01" },
  { icon: Handshake, label: "Negociação", description: "Pipeline Kanban", color: "#6366F1", num: "02" },
  { icon: FileSignature, label: "Contrato", description: "Assinatura digital", color: "#8B5CF6", num: "03" },
  { icon: UserCheck, label: "Cliente", description: "Gestão completa", color: "#22C55E", num: "04" },
];

export function FlowSection() {
  return (
    <section id="como-funciona" className="relative py-24 sm:py-32" style={{ background: "#0B1120" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.06)] px-4 py-1.5 text-xs font-medium text-[#4ADE80] mb-4">
            Fluxo integrado
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Do lead ao cliente.{" "}
            <span className="text-[#64748B]">Zero retrabalho.</span>
          </h2>
          <p className="mt-4 text-lg text-[#64748B] max-w-xl mx-auto">
            Cada etapa conectada automaticamente, sem precisar trocar de ferramenta.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-8 sm:gap-0">
              <div className="group flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] transition-all duration-300 group-hover:scale-105 group-hover:border-[rgba(255,255,255,0.12)]"
                  >
                    <step.icon className="h-8 w-8" style={{ color: step.color }} />
                  </div>
                  <div
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: step.color }}
                  >
                    {step.num}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E2E8F0]">{step.label}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">{step.description}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:flex items-center mx-10">
                  <div className="w-16 h-px bg-gradient-to-r from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.02)]" />
                  <ArrowRight className="h-4 w-4 text-[rgba(255,255,255,0.12)] -ml-1" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
