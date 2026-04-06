import { BarChart3, FileCheck, TrendingUp } from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.png";

const highlights = [
  { icon: BarChart3, label: "Pipeline visual" },
  { icon: FileCheck, label: "Contratos assinados" },
  { icon: TrendingUp, label: "Métricas em tempo real" },
];

export function DashboardVisualSection() {
  return (
    <section className="relative py-20 sm:py-28" style={{ background: '#0B0F19' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse,rgba(124,58,237,0.05),transparent_70%)] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#2563EB] tracking-wider uppercase mb-3">Visão geral</p>
          <h2 className="text-3xl font-bold tracking-tight text-[#E5E7EB] sm:text-4xl">
            Veja tudo em um só painel
          </h2>
          <p className="mt-4 text-lg text-[#9CA3AF]">
            Dashboard completo com pipeline, contratos e métricas de performance.
          </p>
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {highlights.map((h) => (
            <div key={h.label} className="flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[#111827] px-5 py-2.5 text-sm text-[#D1D5DB]">
              <h.icon className="h-4 w-4 text-[#7C3AED]" />
              {h.label}
            </div>
          ))}
        </div>

        {/* Mockup */}
        <div className="relative max-w-5xl mx-auto">
          <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[rgba(37,99,235,0.08)] via-[rgba(124,58,237,0.06)] to-transparent blur-2xl" />
          <div className="relative rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-2xl shadow-[rgba(0,0,0,0.5)] overflow-hidden bg-[#111827]">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.04)] bg-[#0D1321]">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#EF4444]/50" />
                <div className="h-3 w-3 rounded-full bg-[#F59E0B]/50" />
                <div className="h-3 w-3 rounded-full bg-[#22C55E]/50" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-5 w-40 rounded-md bg-[rgba(255,255,255,0.03)]" />
              </div>
            </div>
            <img src={dashboardMockup} alt="Dashboard ACCORD" className="w-full" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}
