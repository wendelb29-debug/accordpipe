import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WonCelebrationDialogProps {
  open: boolean;
  onClose: () => void;
  leadName: string;
}

export function WonCelebrationDialog({ open, onClose, leadName }: WonCelebrationDialogProps) {
  const [motivationalQuote, setMotivationalQuote] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const confettiInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      // Start confetti
      const fire = () => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.6, x: Math.random() * 0.4 + 0.3 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"],
        });
      };
      fire();
      confettiInterval.current = setInterval(fire, 2500);

      // Fetch AI quote
      setLoadingQuote(true);
      setMotivationalQuote("");
      supabase.functions
        .invoke("won-motivation", { body: { leadName } })
        .then(({ data, error }) => {
          if (error) {
            console.error("AI quote error:", error);
            setMotivationalQuote("Cada venda é uma semente plantada para o sucesso. Continue colhendo vitórias! 🌟");
          } else {
            setMotivationalQuote(data?.quote || "Sua dedicação está construindo um legado de resultados. Parabéns! 🚀");
          }
        })
        .catch(() => {
          setMotivationalQuote("O sucesso é a soma de pequenas vitórias diárias. Você está no caminho certo! 💪");
        })
        .finally(() => setLoadingQuote(false));
    }

    return () => {
      if (confettiInterval.current) {
        clearInterval(confettiInterval.current);
        confettiInterval.current = null;
      }
    };
  }, [open, leadName]);

  const handleClose = () => {
    if (confettiInterval.current) {
      clearInterval(confettiInterval.current);
      confettiInterval.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl">🎉 Parabéns pela venda!</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            A oportunidade <strong className="text-foreground">{leadName}</strong> foi marcada como <strong className="text-green-600">GANHA</strong>!
          </p>

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motivação IA</span>
            </div>
            {loadingQuote ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Gerando mensagem...</span>
              </div>
            ) : (
              <p className="text-sm italic text-foreground leading-relaxed">"{motivationalQuote}"</p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleClose} className="gap-1.5 bg-green-600 hover:bg-green-700">
            Fechar e continuar vendendo! 🚀
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
