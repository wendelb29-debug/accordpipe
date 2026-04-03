import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wifi, WifiOff, RefreshCw, QrCode } from "lucide-react";

interface QrCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string | null;
  connectionStatus: "disconnected" | "connecting" | "connected";
  loading: boolean;
  onGenerateQrCode: () => void;
}

export function QrCodeModal({
  open,
  onOpenChange,
  qrCode,
  connectionStatus,
  loading,
  onGenerateQrCode,
}: QrCodeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#25D366]" />
            Conectar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {qrCode ? (
            <>
              <div className="rounded-xl border border-border p-3 bg-white">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="h-56 w-56 object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                Abra o WhatsApp → Aparelhos conectados → Conectar → Escaneie o
                QR Code acima
              </p>
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Aguardando
                conexão…
              </Badge>
            </>
          ) : connectionStatus === "connected" ? (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
                <Wifi className="h-10 w-10 text-green-500" />
              </div>
              <p className="text-sm font-medium text-foreground">
                WhatsApp conectado!
              </p>
            </>
          ) : (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <WifiOff className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhum WhatsApp conectado
              </p>
            </>
          )}

          <Button
            onClick={onGenerateQrCode}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
            {connectionStatus === "connected"
              ? "Reconectar"
              : "Gerar QR Code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
