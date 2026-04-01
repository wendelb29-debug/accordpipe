import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WonConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (observation: string) => void;
  saving: boolean;
}

export function WonConfirmDialog({ open, onClose, onConfirm, saving }: WonConfirmDialogProps) {
  const [observation, setObservation] = useState("");

  useEffect(() => {
    if (open) setObservation("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-bold">Concluir Card</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Confirme o ganho deste card. Você pode adicionar uma observação opcional.
        </p>

        <div className="text-left space-y-2 mt-2">
          <Label htmlFor="won-observation" className="text-sm font-medium">Observação de conclusão</Label>
          <Textarea
            id="won-observation"
            placeholder="Adicione uma observação sobre esta venda..."
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(observation)}
            disabled={saving}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Ganhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

      setLoadingQuote(true);
      setMotivationalQuote("");
      supabase.functions
        .invoke("won-motivation", { body: { leadName } })
        .then(({ data, error }) => {
          if (error) {
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
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-bold">Parabéns! Venda ganha!</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {loadingQuote ? (
            <div className="flex items-center justify-center gap-2 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Gerando motivação...</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic leading-relaxed">{motivationalQuote}</p>
          )}
        </div>

        <DialogFooter className="sm:justify-center mt-2">
          <Button onClick={handleClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            Vamos para a próxima venda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
