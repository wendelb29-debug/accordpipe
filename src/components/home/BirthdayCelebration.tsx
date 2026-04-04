import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import confetti from "canvas-confetti";

const MESSAGES = [
  "Hoje é o seu dia! Continue crescendo e conquistando grandes resultados 🚀",
  "Que esse novo ciclo venha com ainda mais vitórias e sucesso!",
  "Você é peça importante no time. Aproveite seu dia ao máximo!",
  "Parabéns! Que venham muitas realizações nesse novo ano de vida 🌟",
  "Comemore cada conquista. Você merece tudo de melhor! 🎊",
];

function isBirthdayToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const bd = new Date(dateStr + "T12:00:00");
  return bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
}

export function BirthdayCelebration() {
  const { profile } = useAuth();
  const [show, setShow] = useState(false);
  const [message] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  const birthDate = (profile as any)?.birth_date;
  const firstName = profile?.name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    if (!isBirthdayToday(birthDate)) return;

    const key = `birthday_celebrated_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "true");
    setShow(true);

    // Fire confetti
    const duration = 4000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#a855f7", "#ec4899", "#3b82f6", "#f59e0b"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#a855f7", "#ec4899", "#3b82f6", "#f59e0b"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [birthDate]);

  const handleClose = useCallback(() => {
    setShow(false);
    confetti.reset();
  }, []);

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md text-center border-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950/80 dark:via-pink-950/60 dark:to-blue-950/80">
        <div className="space-y-4 py-4">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
            Feliz Aniversário, {firstName}!
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed px-4">
            {message}
          </p>
          <Button onClick={handleClose} className="mt-4" size="lg">
            Começar meu dia 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
