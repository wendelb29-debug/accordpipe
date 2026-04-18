import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenantWhatsAppIntegration, WhatsAppProvider } from "@/hooks/useTenantWhatsAppIntegration";
import { Wifi, WifiOff, RefreshCw, Phone, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  tenantId: string | null;
  provider: WhatsAppProvider;
}

const STATUS_LABEL: Record<string, { label: string; tone: "ok" | "bad" | "muted" }> = {
  connected: { label: "Conectado", tone: "ok" },
  disconnected: { label: "Desconectado", tone: "bad" },
  invalid_credentials: { label: "Credenciais inválidas", tone: "bad" },
  pending: { label: "Aguardando", tone: "muted" },
  webhook_not_configured: { label: "Webhook pendente", tone: "muted" },
  unknown: { label: "Não sincronizado", tone: "muted" },
};

export function InstanceStatusCard({ tenantId, provider }: Props) {
  const { getByProvider, testConnection, testing, loading } = useTenantWhatsAppIntegration(tenantId);
  const integ = getByProvider(provider);

  const status = integ?.connection_status || "unknown";
  const meta = STATUS_LABEL[status] || STATUS_LABEL.unknown;

  const tone =
    meta.tone === "ok"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : meta.tone === "bad"
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {meta.tone === "ok" ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              Status da Instância
            </CardTitle>
            <CardDescription className="mt-1">
              Provider ativo: <span className="font-medium">{provider === "uazapi" ? "Uazapi" : "Z-API"}</span>
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => testConnection(provider)}
            disabled={testing || !integ || loading}
            className="gap-2"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sincronizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Conexão</div>
          <Badge className={tone} variant="outline">{meta.label}</Badge>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Número conectado</div>
          <div className="font-medium">{integ?.connected_phone || <span className="text-muted-foreground font-normal">—</span>}</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Última sincronização</div>
          <div className="font-medium">
            {integ?.last_sync_at
              ? formatDistanceToNow(new Date(integ.last_sync_at), { addSuffix: true, locale: ptBR })
              : <span className="text-muted-foreground font-normal">nunca</span>}
          </div>
        </div>

        <div className="space-y-1 md:col-span-3 text-xs text-muted-foreground border-t border-border/50 pt-3">
          {integ?.last_seen_at
            ? <>Último evento recebido {formatDistanceToNow(new Date(integ.last_seen_at), { addSuffix: true, locale: ptBR })}</>
            : "Nenhum evento recebido ainda. Configure o webhook na sua instância para começar a receber mensagens."}
        </div>
      </CardContent>
    </Card>
  );
}
