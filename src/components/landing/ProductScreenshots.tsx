import { useState } from "react";
import { Monitor, FileText, PenTool, MessageCircle } from "lucide-react";
import crmImg from "@/assets/screenshots/crm-screenshot.jpg";
import proposalImg from "@/assets/screenshots/proposal-screenshot.jpg";
import contractImg from "@/assets/screenshots/contract-screenshot.jpg";
import inboxImg from "@/assets/screenshots/inbox-screenshot.jpg";

const tabs = [
  { id: "crm", label: "CRM & Pipeline", icon: Monitor, img: crmImg, desc: "Gerencie todo o funil de vendas em um Kanban visual e intuitivo." },
  { id: "proposta", label: "Propostas", icon: FileText, img: proposalImg, desc: "Crie propostas comerciais profissionais em segundos." },
  { id: "contrato", label: "Contratos", icon: PenTool, img: contractImg, desc: "Assine contratos digitalmente com validade jurídica." },
  { id: "inbox", label: "Atendimento", icon: MessageCircle, img: inboxImg, desc: "Centralize o atendimento via WhatsApp em um único painel." },
];

export function ProductScreenshots() {
  const [active, setActive] = useState("crm");
  const current = tabs.find((t) => t.id === active)!;

  return (
    <section className="relative py-28 sm:py-36" style={{ background: "#080D19" }}>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.12)] to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-[#3B82F6] tracking-wider uppercase mb-3">
            Veja na prática
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Conheça o sistema por dentro
          </h2>
          <p className="mt-4 text-base text-[#94A3B8] max-w-xl mx-auto">
            Cada módulo foi pensado para simplificar sua operação e acelerar resultados.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                active === t.id
                  ? "bg-[rgba(37,99,235,0.12)] border-[rgba(37,99,235,0.3)] text-[#60A5FA]"
                  : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[#64748B] hover:text-[#CBD5E1] hover:border-[rgba(255,255,255,0.12)]"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Screenshot */}
        <div className="relative mx-auto max-w-4xl">
          <div className="absolute -inset-6 bg-[radial-gradient(ellipse,rgba(37,99,235,0.08),transparent_70%)] blur-2xl pointer-events-none" />

          <div className="relative rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(17,24,39,0.6)] backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(17,24,39,0.8)]">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
              <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
              <div className="ml-3 flex-1 rounded-lg bg-[rgba(255,255,255,0.05)] px-3 py-1">
                <span className="text-[11px] text-[#4B5563]">app.accordhub.com.br</span>
              </div>
            </div>

            <img
              src={current.img}
              alt={current.label}
              className="w-full h-auto"
              loading="lazy"
              width={1280}
              height={800}
            />
          </div>

          <p className="text-center text-sm text-[#94A3B8] mt-6">{current.desc}</p>
        </div>
      </div>
    </section>
  );
}
