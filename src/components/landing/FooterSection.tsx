import { Mail, MapPin } from "lucide-react";
import accordLogo from "@/assets/accord-logo.png";

export function FooterSection() {
  return (
    <footer className="border-t border-[hsl(220,20%,12%)] bg-[hsl(228,40%,4%)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={accordLogo} alt="ACCORD" className="h-8 w-auto brightness-200" />
              <span className="text-lg font-bold text-[hsl(210,40%,98%)]">ACCORD</span>
            </div>
            <p className="text-sm text-[hsl(218,14%,50%)] leading-relaxed">
              Tudo gira sob controle. Plataforma completa de gestão operacional para sua empresa.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[hsl(210,40%,98%)] mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-[hsl(218,14%,50%)]">
              <li><a href="#features" className="hover:text-[hsl(210,40%,90%)] transition-colors">Funcionalidades</a></li>
              <li><a href="#faq" className="hover:text-[hsl(210,40%,90%)] transition-colors">Perguntas Frequentes</a></li>
              <li><a href="#planos" className="hover:text-[hsl(210,40%,90%)] transition-colors">Planos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[hsl(210,40%,98%)] mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-[hsl(218,14%,50%)]">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[hsl(224,76%,60%)]" />
                <a href="mailto:suporte@accordclass.com.br" className="hover:text-[hsl(210,40%,90%)] transition-colors">
                  suporte@accordclass.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[hsl(224,76%,60%)]" />
                <span>Uberlândia — MG</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[hsl(220,20%,12%)] pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[hsl(218,14%,40%)]">© 2026 ACCORD. Todos os direitos reservados.</p>
          <p className="text-xs text-[hsl(218,14%,40%)]">Tudo gira sob controle.</p>
        </div>
      </div>
    </footer>
  );
}
