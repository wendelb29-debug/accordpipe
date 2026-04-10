import { ArrowRight } from "lucide-react";

export function DifferentialSection() {
  return (
    <section className="relative py-24 sm:py-32" style={{ background: "#080D19" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight mb-6">
          Você não precisa de mais ferramentas.{" "}
          <br className="hidden sm:block" />
          <span className="text-[#64748B]">Você precisa de um sistema que funcione.</span>
        </h2>

        <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto mb-10">
          Enquanto outras empresas usam 5, 6 ou até 10 sistemas diferentes, o Accord centraliza tudo em uma única plataforma.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          {[
            { label: "Menos retrabalho", color: "#3B82F6" },
            { label: "Menos erro", color: "#6366F1" },
            { label: "Mais resultado", color: "#22C55E" },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                <span className="text-sm font-semibold text-[#E2E8F0]">{item.label}</span>
              </div>
              {i < 2 && <ArrowRight className="hidden sm:block h-4 w-4 text-[rgba(255,255,255,0.12)]" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
