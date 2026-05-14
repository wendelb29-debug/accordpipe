import { Clock, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const SUPPORT_WHATSAPP = "5511999999999"; // ajuste conforme necessário
const SUPPORT_EMAIL = "comercial@accordpipe.com.br";

export default function TrialExpired() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent("Olá! Meu período de trial no Accord expirou e gostaria de ativar minha conta completa.");
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto">
          <Clock className="h-10 w-10 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Seu período de trial expirou</h1>
          <p className="text-muted-foreground">
            Entre em contato com nosso comercial para ativar sua conta completa e continuar
            aproveitando todos os recursos do Accord.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleWhatsApp} className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
            <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`mailto:${SUPPORT_EMAIL}`, "_blank")}
            className="w-full"
          >
            Enviar e-mail para o comercial
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="w-full gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
