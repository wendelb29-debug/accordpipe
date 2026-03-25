import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  MessageSquareText,
} from "lucide-react";

interface InboxHeaderProps {
  connectionStatus: "disconnected" | "connecting" | "connected";
  onConnectClick: () => void;
}

export function InboxHeader({ connectionStatus, onConnectClick }: InboxHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366]/10">
          <MessageSquareText className="h-5 w-5 text-[#25D366]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">
            Orbit Inbox – Central Inteligente de Conversas
          </h1>
          <p className="text-xs text-muted-foreground">
            Gerencie atendimentos, responda clientes e automatize conversas com
            inteligência artificial.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={
            connectionStatus === "connected"
              ? "border-green-500/30 text-green-600 bg-green-500/10"
              : "text-muted-foreground"
          }
        >
          {connectionStatus === "connected" ? (
            <>
              <Wifi className="h-3 w-3 mr-1" /> Conectado
            </>
          ) : connectionStatus === "connecting" ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Conectando…
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" /> Desconectado
            </>
          )}
        </Badge>
        <Button
          size="sm"
          variant={connectionStatus === "connected" ? "outline" : "default"}
          className="gap-1.5"
          onClick={onConnectClick}
        >
          <QrCode className="h-4 w-4" />
          {connectionStatus === "connected"
            ? "Reconectar"
            : "Conectar WhatsApp"}
        </Button>
      </div>
    </div>
  );
}
