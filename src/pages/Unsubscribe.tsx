import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type State = "loading" | "valid" | "invalid" | "already" | "success" | "error";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<State>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) return setState("invalid");
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: ANON_KEY } },
        );
        const json = await res.json();
        if (!res.ok) return setState("invalid");
        if (json.valid) return setState("valid");
        if (json.reason === "already_unsubscribed") return setState("already");
        setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    setSubmitting(false);
    if (error) return setState("error");
    if (data?.success) return setState("success");
    if (data?.reason === "already_unsubscribed") return setState("already");
    setState("error");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {state === "loading" && (
            <>
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Validando...</p>
            </>
          )}
          {state === "valid" && (
            <>
              <MailX className="h-10 w-10 mx-auto text-primary" />
              <h1 className="text-xl font-semibold">Cancelar inscrição</h1>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja deixar de receber e-mails da Accord neste endereço?
              </p>
              <Button onClick={confirm} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar cancelamento
              </Button>
            </>
          )}
          {state === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
              <h1 className="text-xl font-semibold">Inscrição cancelada</h1>
              <p className="text-sm text-muted-foreground">Você não receberá mais e-mails da Accord.</p>
            </>
          )}
          {state === "already" && (
            <>
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
              <h1 className="text-xl font-semibold">Já cancelado</h1>
              <p className="text-sm text-muted-foreground">Este endereço já havia sido removido.</p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <XCircle className="h-10 w-10 mx-auto text-destructive" />
              <h1 className="text-xl font-semibold">Link inválido</h1>
              <p className="text-sm text-muted-foreground">
                O link de cancelamento é inválido ou expirou.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
