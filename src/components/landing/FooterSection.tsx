import { Phone, Mail, MapPin } from "lucide-react";
import orbitLogo from "@/assets/orbit-logo.png";

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={orbitLogo} alt="ORBIT" className="h-8 w-auto" />
              <span className="text-lg font-bold text-foreground">ORBIT HUB</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tudo gira sob controle. Plataforma completa de gestão operacional para sua empresa.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">Perguntas Frequentes</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Política de Privacidade</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <span>(11) 99999-9999</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:contato@orbithub.com.br" className="hover:text-foreground transition-colors">
                  contato@orbithub.com.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>São Paulo, SP — Brasil</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">© 2026 ORBIT HUB ERP. Todos os direitos reservados.</p>
          <p className="text-xs text-muted-foreground">Tudo gira sob controle.</p>
        </div>
      </div>
    </footer>
  );
}
