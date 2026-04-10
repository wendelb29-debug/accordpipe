import { useState } from "react";
import { Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrialSignupDialog } from "./TrialSignupDialog";

export function PremiumCTASection() {
  const [trialOpen, setTrialOpen] = useState(false);

  return (
    <section className="relative py-24 sm:py-32" style={{ background: "#070B14" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] via-[#1a1f3d] to-[#0f0a2e]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.12),transparent_60%)] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_60%)] pointer-events-none" />
          <div className="absolute inset-0 border border-[rgba(255,255,255,0.06)] rounded-3xl" />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-2xl mx-auto leading-tight">
              Pronto para transformar sua operação comercial?
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-[#94A3B8]">
              Comece gratuitamente. Sem cartão de crédito. Configure em minutos.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="gap-2.5 px-10 text-base font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-xl shadow-[rgba(37,99,235,0.3)] h-14 rounded-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 border-0"
                onClick={() => setTrialOpen(true)}
              >
                <Rocket className="h-5 w-5" />
                Criar conta grátis
              </Button>
              <a href="mailto:contato@accordhub.com.br?subject=Quero saber mais">
                <Button size="lg" variant="outline" className="gap-2.5 px-10 text-base font-medium h-14 rounded-xl border-[rgba(255,255,255,0.12)] text-[#E2E8F0] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-200 bg-transparent">
                  Falar com especialista
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
      <TrialSignupDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </section>
  );
}
