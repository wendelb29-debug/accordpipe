import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  QrCode,
  Search,
  Bell,
  MessageSquareText,
} from "lucide-react";

interface InboxHeaderProps {
  connectionStatus: "disconnected" | "connecting" | "connected";
  onConnectClick: () => void;
}

export function InboxHeader({ connectionStatus, onConnectClick }: InboxHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <MessageSquareText className="h-4 w-4 text-primary" />
        </div>
        <h1 className="text-sm font-semibold text-foreground hidden md:block">
          Inbox Inteligente
        </h1>
      </div>

      {/* Center – search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos, mensagens..."
            className="pl-9 h-8 text-xs rounded-lg bg-muted/50 border-transparent focus:border-border"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-8 w-8 relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Badge
          variant="outline"
          className={`h-6 text-[10px] font-medium gap-1 px-2 ${
            connectionStatus === "connected"
              ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
              : connectionStatus === "connecting"
              ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
              : "border-muted text-muted-foreground"
          }`}
        >
          {connectionStatus === "connected" ? (
            <><Wifi className="h-3 w-3" /> Online</>
          ) : connectionStatus === "connecting" ? (
            <><RefreshCw className="h-3 w-3 animate-spin" /> Conectando</>
          ) : (
            <><WifiOff className="h-3 w-3" /> Offline</>
          )}
        </Badge>

        <Button
          size="sm"
          onClick={onConnectClick}
          className="h-8 gap-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <QrCode className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {connectionStatus === "connected" ? "Reconectar" : "Conectar WhatsApp"}
          </span>
        </Button>
      </div>
    </div>
  );
}
