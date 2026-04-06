import { Mail, MapPin } from "lucide-react";
import accordLogo from "@/assets/accord-logo.png";

export function FooterSection() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.04)]" style={{ background: '#070A12' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={accordLogo} alt="ACCORD" className="h-8 w-auto brightness-200" />
              <span className="text-lg font-bold text-[#E5E7EB]">ACCORD</span>
            </div>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Tudo gira sob controle. Plataforma completa de gestão operacional para sua empresa.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#E5E7EB] mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-[#6B7280]">
              <li><a href="#features" className="hover:text-[#D1D5DB] transition-colors duration-150">Funcionalidades</a></li>
              <li><a href="#faq" className="hover:text-[#D1D5DB] transition-colors duration-150">Perguntas Frequentes</a></li>
              <li><a href="#planos" className="hover:text-[#D1D5DB] transition-colors duration-150">Planos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#E5E7EB] mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-[#6B7280]">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2563EB]" />
                <a href="mailto:suporte@accordclass.com.br" className="hover:text-[#D1D5DB] transition-colors duration-150">
                  suporte@accordclass.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#2563EB]" />
                <span>Uberlândia — MG</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[rgba(255,255,255,0.04)] pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[#4B5563]">© 2026 ACCORD. Todos os direitos reservados.</p>
          <p className="text-xs text-[#4B5563]">Tudo gira sob controle.</p>
        </div>
      </div>
    </footer>
  );
}
