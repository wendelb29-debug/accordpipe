import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePaddleSubscription } from "@/hooks/usePaddleSubscription";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { isActive, loading, refetch } = usePaddleSubscription();
  const [waited, setWaited] = useState(0);

  // Polling extra além do realtime, caso webhook demore
  useEffect(() => {
    if (isActive) return;
    const interval = setInterval(() => {
      refetch();
      setWaited(w => w + 2);
    }, 2000);
    const stopAfter = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(stopAfter);
    };
  }, [isActive, refetch]);

  useEffect(() => {
    if (isActive) {
      const t = setTimeout(() => navigate("/home"), 1800);
      return () => clearTimeout(t);
    }
  }, [isActive, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {isActive ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
              <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
              <p className="text-sm text-muted-foreground">
                Sua assinatura está ativa. Redirecionando…
              </p>
            </>
          ) : (
            <>
              <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
              <h1 className="text-xl font-semibold">Confirmando seu pagamento…</h1>
              <p className="text-sm text-muted-foreground">
                Estamos processando a confirmação da operadora. Isso costuma levar poucos segundos.
              </p>
              {waited > 15 && (
                <div className="pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Está demorando mais que o esperado. Você pode prosseguir e a assinatura será ativada assim que confirmada.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/assinatura")}>
                    Ir para Assinatura
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
