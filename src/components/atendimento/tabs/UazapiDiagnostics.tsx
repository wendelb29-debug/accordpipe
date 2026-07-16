import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tenantId: string | null;
}

type DiagKey = "verify" | "errors" | "sync";
type FnName = "uazapi-verify-webhook" | "uazapi-webhook-errors" | "uazapi-sync-chats";

/**
 * Onda 8 — Diagnóstico do webhook uazapiGO em página própria (separado do Z-API).
 *
 * Chama as edge functions via fetch direto pra conseguir ler o corpo JSON
 * mesmo quando o status é >=400. Isso faz com que o erro REAL (ex: "uazapi
 * /webhook failed: 401 {\"error\":\"instance info not found\"}") apareça no
 * toast, em vez da mensagem genérica "Edge Function returned a non-2xx status".
 */
export function UazapiDiagnostics({ tenantId }: Props) {
  const [loading, setLoading] = useState<null | DiagKey>(null);
  const [config, setConfig] = useState<any>(null);
  const [errors, setErrors] = useState<{ remote: any; remote_error: string | null; local: any[] } | null>(null);
  const [sync, setSync] = useState<any>(null);

  const invoke = async (fn: FnName, key: DiagKey) => {
    if (!tenantId) {
      toast.error("Selecione um tenant");
      return;
    }
    setLoading(key);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;

      const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey ?? "",
          Authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${anonKey ?? ""}`,
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      });

      const raw = await res.text();
      let payload: any = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = { raw };
      }

      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error(`[${fn}] HTTP ${res.status}`, payload);
        const msg =
          payload?.error ||
          payload?.message ||
          payload?.raw ||
          `HTTP ${res.status}`;
        toast.error(`${fn}: ${msg}`, { duration: 12000 });
        return;
      }

      // eslint-disable-next-line no-console
      console.log(`[${fn}] ok`, payload);

      if (key === "verify") setConfig(payload?.config ?? payload);
      if (key === "errors")
        setErrors({
          remote: payload?.remote ?? null,
          remote_error: payload?.remote_error ?? null,
          local: payload?.local ?? [],
        });
      if (key === "sync") {
        setSync(payload);
        toast.success(`Chats sincronizados: ${payload?.saved ?? 0}`);
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(`[${fn}] exception`, e);
      toast.error(`${fn}: ${e?.message || String(e)}`, { duration: 12000 });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary">
          Diagnóstico do webhook (uazapiGO)
        </CardTitle>
        <CardDescription>
          Verifique se o webhook está configurado corretamente, veja erros de entrega e sincronize a lista de chats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => invoke("uazapi-verify-webhook", "verify")}>
            {loading === "verify" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Verificar config do webhook
          </Button>
          <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => invoke("uazapi-webhook-errors", "errors")}>
            {loading === "errors" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Ver erros de entrega
          </Button>
          <Button size="sm" variant="outline" disabled={loading !== null} onClick={() => invoke("uazapi-sync-chats", "sync")}>
            {loading === "sync" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar chats
          </Button>
        </div>

        {config && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="text-xs font-semibold mb-2">Config atual (GET /webhook)</div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        )}

        {errors && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3 space-y-3">
            <div>
              <div className="text-xs font-semibold mb-1">Erros remotos (uazapi /webhook/errors)</div>
              {errors.remote_error && <div className="text-[11px] text-destructive">{errors.remote_error}</div>}
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto">
                {JSON.stringify(errors.remote, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1">Erros locais recentes ({errors.local.length})</div>
              <div className="space-y-1 max-h-48 overflow-auto">
                {errors.local.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">Nenhum erro registrado.</div>
                )}
                {errors.local.map((e: any) => (
                  <div key={e.id} className="text-[11px] border border-border/40 rounded p-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{e.event_type ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-destructive mt-1 break-all">{e.error_message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sync && (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="text-xs">
              Sincronização concluída: <span className="font-semibold">{sync.saved}</span> chats atualizados
              {typeof sync.scanned === "number" ? <> (varridos {sync.scanned})</> : null}.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
