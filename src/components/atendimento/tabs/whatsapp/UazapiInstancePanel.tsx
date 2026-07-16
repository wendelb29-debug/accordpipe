import { useCallback, useEffect, useState } from "react";
import { Loader2, QrCode, Power, PowerOff, RefreshCw, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tenantId: string | null | undefined;
}

interface InstanceRow {
  id: string;
  status: "disconnected" | "connecting" | "connected" | "hibernated" | string;
  uazapi_instance_id: string | null;
  instance_name: string | null;
  phone_number: string | null;
  profile_name: string | null;
  profile_pic_url: string | null;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    connected: { label: "Conectada", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    connecting: { label: "Conectando…", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    disconnected: { label: "Desconectada", className: "bg-muted text-muted-foreground border-border" },
    hibernated: { label: "Hibernada", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  };
  const m = map[status] ?? map.disconnected;
  return <Badge variant="outline" className={m.className}>{m.label}</Badge>;
}

export function UazapiInstancePanel({ tenantId }: Props) {
  const [row, setRow] = useState<InstanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | "create" | "connect" | "disconnect" | "sync">(null);
  const [qrcode, setQrcode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_instances" as any)
      .select("id, status, uazapi_instance_id, instance_name, phone_number, profile_name, profile_pic_url")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    setRow((data as any) ?? null);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  // Poll status while connecting / when QR is on screen.
  useEffect(() => {
    if (!tenantId) return;
    if (row?.status !== "connecting" && !qrcode) return;
    const t = setInterval(async () => {
      await syncStatus(false);
    }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, row?.status, qrcode]);

  const createInstance = async () => {
    if (!tenantId) return;
    setBusy("create");
    const { data, error } = await supabase.functions.invoke("uazapi-create-instance", {
      body: { tenant_id: tenantId },
    });
    setBusy(null);
    if (error || (data && (data as any).error)) {
      toast.error("Erro ao criar instância: " + (error?.message || (data as any)?.error));
      return;
    }
    toast.success("Instância criada");
    await load();
  };

  const connect = async () => {
    if (!tenantId) return;
    setBusy("connect");
    const { data, error } = await supabase.functions.invoke("uazapi-connect-instance", {
      body: { tenant_id: tenantId },
    });
    setBusy(null);
    if (error || (data && (data as any).error)) {
      toast.error("Erro ao gerar QR: " + (error?.message || (data as any)?.error));
      return;
    }
    setQrcode((data as any)?.qrcode ?? null);
    await load();
  };

  const disconnect = async () => {
    if (!tenantId) return;
    setBusy("disconnect");
    const { data, error } = await supabase.functions.invoke("uazapi-disconnect-instance", {
      body: { tenant_id: tenantId },
    });
    setBusy(null);
    if (error || (data && (data as any).error)) {
      toast.error("Erro ao desconectar: " + (error?.message || (data as any)?.error));
      return;
    }
    setQrcode(null);
    toast.success("Instância desconectada");
    await load();
  };

  const syncStatus = async (verbose = true) => {
    if (!tenantId) return;
    if (verbose) setBusy("sync");
    const { data } = await supabase.functions.invoke("uazapi-instance-status", {
      body: { tenant_id: tenantId },
    });
    if (verbose) setBusy(null);
    if ((data as any)?.status === "connected") {
      setQrcode(null);
      if (verbose) toast.success("Conectado!");
    }
    await load();
  };

  if (!tenantId) {
    return <div className="text-sm text-muted-foreground">Selecione um tenant.</div>;
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {row?.instance_name || "Nenhuma instância criada"}
              </div>
              <div className="text-xs text-muted-foreground">
                {row?.phone_number ? `+${row.phone_number}` : "Sem número conectado"}
                {row?.profile_name ? ` · ${row.profile_name}` : ""}
              </div>
            </div>
          </div>
          {row ? statusBadge(row.status) : <Badge variant="outline">Não criada</Badge>}
        </div>

        <div className="flex flex-wrap gap-2">
          {!row && (
            <Button onClick={createInstance} disabled={busy === "create"} className="gap-2">
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              Criar instância
            </Button>
          )}
          {row && row.status !== "connected" && (
            <Button onClick={connect} disabled={busy === "connect"} className="gap-2">
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              Gerar QR Code
            </Button>
          )}
          {row && (
            <Button variant="outline" onClick={() => syncStatus(true)} disabled={busy === "sync"} className="gap-2">
              {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar status
            </Button>
          )}
          {row && row.status === "connected" && (
            <Button variant="outline" onClick={disconnect} disabled={busy === "disconnect"} className="gap-2 text-destructive">
              {busy === "disconnect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
              Desconectar
            </Button>
          )}
        </div>
      </div>

      {qrcode && (
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col items-center gap-3">
          <div className="text-sm font-semibold text-foreground">Escaneie no WhatsApp</div>
          <div className="text-xs text-muted-foreground text-center max-w-sm">
            Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar um aparelho.
          </div>
          <img
            src={qrcode.startsWith("data:") ? qrcode : `data:image/png;base64,${qrcode}`}
            alt="QR Code"
            className="w-64 h-64 rounded bg-white p-2"
          />
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando conexão…
          </div>
        </div>
      )}

      {row?.status === "connected" && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div className="text-sm text-foreground">
            WhatsApp conectado. O webhook do Accord já foi configurado automaticamente e mensagens recebidas cairão no inbox.
          </div>
        </div>
      )}
    </div>
  );
}
