import { Mail, MapPin } from "lucide-react";
import accordLogo from "@/assets/accord-logo.png";

export function FooterSection() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.04)]" style={{ background: '#070A12' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <img src={accordLogo} alt="ACCORD" className="h-7 sm:h-8 w-auto brightness-200" />
              <span className="text-base sm:text-lg font-bold text-[#E5E7EB]">ACCORD</span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
              Tudo gira sob controle. Plataforma completa de gestão operacional para sua empresa.
            </p>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-[#E5E7EB] mb-3 sm:mb-4">Links</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#6B7280]">
              <li><a href="#features" className="hover:text-[#D1D5DB] transition-colors duration-150">Funcionalidades</a></li>
              <li><a href="#faq" className="hover:text-[#D1D5DB] transition-colors duration-150">Perguntas Frequentes</a></li>
              <li><a href="#planos" className="hover:text-[#D1D5DB] transition-colors duration-150">Planos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-[#E5E7EB] mb-3 sm:mb-4">Contato</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-[#6B7280]">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2563EB] shrink-0" />
                <a href="mailto:suporte@accordclass.com.br" className="hover:text-[#D1D5DB] transition-colors duration-150 break-all">
                  suporte@accordclass.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#2563EB] shrink-0" />
                <span>Uberlândia — MG</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 sm:mt-10 border-t border-[rgba(255,255,255,0.04)] pt-5 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs text-[#4B5563]">© 2026 ACCORD. Todos os direitos reservados.</p>
          <p className="text-[11px] sm:text-xs text-[#4B5563]">Tudo gira sob controle.</p>
        </div>
      </div>
    </footer>
  );
}
