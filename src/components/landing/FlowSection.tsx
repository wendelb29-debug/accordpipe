import { ArrowRight, UserPlus, Handshake, FileSignature, UserCheck } from "lucide-react";

const steps = [
  { icon: UserPlus, label: "Lead", description: "Captação automática", color: "#2563EB" },
  { icon: Handshake, label: "Venda", description: "Pipeline Kanban", color: "#7C3AED" },
  { icon: FileSignature, label: "Contrato", description: "Assinatura digital", color: "#A855F7" },
  { icon: UserCheck, label: "Cliente", description: "Gestão completa", color: "#22C55E" },
];

export function FlowSection() {
  return (
    <section id="como-funciona" className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(37,99,235,0.06),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-sm font-semibold text-[#7C3AED] tracking-wider uppercase mb-3">Como funciona na prática</p>
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
            Fluxo completo. Zero retrabalho.
          </h2>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Do primeiro contato ao pós-venda, tudo automatizado em um único lugar.
          </p>
        </div>

        {/* Flow steps */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-6 sm:gap-0">
              <div className="group flex flex-col items-center text-center gap-4">
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#111827] transition-all duration-200 group-hover:scale-105"
                  style={{ boxShadow: `0 0 30px ${step.color}15, 0 0 60px ${step.color}08` }}
                >
                  <step.icon className="h-8 w-8" style={{ color: step.color }} />
                  {/* Step number */}
                  <div
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: step.color }}
                  >
                    {i + 1}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#E5E7EB]">{step.label}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{step.description}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:flex items-center mx-8">
                  <div className="w-12 h-[2px] bg-gradient-to-r from-[rgba(255,255,255,0.1)] to-[rgba(255,255,255,0.03)]" />
                  <ArrowRight className="h-4 w-4 text-[rgba(255,255,255,0.15)] -ml-1" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Connection line */}
        <div className="hidden sm:block mt-8 mx-auto max-w-md">
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(124,58,237,0.2)] to-transparent" />
        </div>
      </div>
    </section>
  );
}
