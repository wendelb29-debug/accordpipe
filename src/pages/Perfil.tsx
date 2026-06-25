import { useState, useRef, useEffect, useCallback } from "react";
import {
  User, Camera, Building2, Mail, Shield, Calendar, Loader2, AlertTriangle,
  Phone, FileText, Bell, BellOff, MessageSquare, Wifi, WifiOff, Hash,
  Save, CheckCircle2, XCircle, TestTube,
} from "lucide-react";
import Cropper, { Area } from "react-easy-crop";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useNotificationManager } from "@/hooks/useNotificationManager";
import { useOperatorStatus } from "@/hooks/useOperatorStatus";
import { useTenantWhatsAppIntegration } from "@/hooks/useTenantWhatsAppIntegration";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
  administrativo: "Administrativo",
  financeiro: "Financeiro",
  comercial: "Comercial",
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function Perfil() {
  const { profile, role, activeCompany, isMaster } = useAuth();
  const isMobile = useIsMobile();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url || null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const userId = (profile as any)?.user_id as string | undefined;
  const tenantId = activeCompany?.id as string | undefined;
  const { data: userDepartments, isLoading: loadingDepartments } = useQuery({
    queryKey: ["user-departments", userId, tenantId],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase
        .from("user_departments")
        .select("department_id, priority, tenant_departments ( name, color )")
        .eq("user_id", userId!)
        .eq("is_active", true);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data, error } = await q.order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{
        department_id: string;
        priority: number | null;
        tenant_departments: { name: string; color: string | null } | null;
      }>;
    },
  });

  // Editable fields
  const [name, setName] = useState(profile?.name || "");
  const [email] = useState(profile?.email || "");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  // Load extra profile fields
  useEffect(() => {
    if (!profile?.user_id) return;
    supabase
      .from("profiles")
      .select("cpf")
      .eq("user_id", profile.user_id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCpf((data as any).cpf ? formatCpf((data as any).cpf) : "");
        }
      });
  }, [profile?.user_id]);

  // ---- Crop state ----
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const getCroppedBlob = (imageSrc: string, area: Area): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = 512;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
          "image/jpeg",
          0.9,
        );
      };
      img.onerror = () => reject(new Error("Falha ao carregar imagem"));
      img.src = imageSrc;
    });

  const handleCancelCrop = () => {
    setCropSrc(null);
    setCroppedAreaPixels(null);
  };

  const handleSaveCroppedPhoto = async () => {
    if (!profile || !cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const filePath = `${profile.user_id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const proxyUrl = `https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/avatar-proxy?u=${profile.user_id}&v=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: proxyUrl } as any)
        .eq("user_id", profile.user_id);
      if (updateError) throw updateError;
      setAvatarUrl(proxyUrl);
      setAvatarFailed(false);
      setCropSrc(null);
      toast.success("Foto atualizada com sucesso!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const rawCpf = cpf.replace(/\D/g, "");
      const { error } = await supabase
        .from("profiles")
        .update({ name, cpf: rawCpf || null } as any)
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  const createdAt = new Date(profile.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const initials = profile.name
    ? profile.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/30" />
        <CardContent className="relative pb-6 pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="h-28 w-28 rounded-full border-4 border-background overflow-hidden bg-muted flex items-center justify-center shadow-lg">
                {avatarUrl && !avatarFailed ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Name & Email */}
            <div className="text-center sm:text-left flex-1 pb-1">
              <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start">
                <Mail className="h-3.5 w-3.5" /> {profile.email}
              </p>
              <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start flex-wrap">
                <Badge variant="outline" className="text-xs">{roleLabels[role || ""] || role}</Badge>
                {profile?.is_master === true && <Badge className="bg-primary text-primary-foreground text-[10px]">Master</Badge>}
              </div>
            </div>

            {!avatarUrl && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Foto obrigatória
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout */}
      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Meus Vínculos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Meus Vínculos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Departamentos</p>
                <div className="flex flex-wrap gap-2">
                  {loadingDepartments ? (
                    <div className="h-5 w-24 rounded bg-muted animate-pulse" />
                  ) : userDepartments && userDepartments.length > 0 ? (
                    userDepartments.map((ud) => {
                      const name = ud.tenant_departments?.name || "Departamento";
                      const color = ud.tenant_departments?.color || undefined;
                      return (
                        <Badge
                          key={ud.department_id}
                          variant="outline"
                          className="text-xs"
                          style={color ? { borderColor: color, color, backgroundColor: `${color}1A` } : undefined}
                        >
                          {name}
                        </Badge>
                      );
                    })
                  ) : (
                    <Badge variant="secondary" className="text-xs">Sem departamento</Badge>
                  )}
                </div>
              </div>
              {activeCompany && !isMaster && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tenant Vinculado</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{activeCompany.nome_fantasia || activeCompany.razao_social}</p>
                      <p className="text-xs text-muted-foreground font-mono">{activeCompany.cnpj}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editar Perfil */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Editar Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prof-name">Nome Completo</Label>
                <Input id="prof-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prof-email">E-mail</Label>
                <Input id="prof-email" value={email} disabled className="bg-muted/50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prof-phone">Telefone</Label>
                  <Input
                    id="prof-phone"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prof-cpf">CPF</Label>
                  <Input
                    id="prof-cpf"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Membro desde</Label>
                <Input value={createdAt} disabled className="bg-muted/50" />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* WhatsApp */}
          <MeuCanalWhatsAppCard />

          {/* Status de Atendimento */}
          <StatusAtendimentoCard />

          {/* Notificações Push */}
          <NotificacoesPushCard />

          {/* Dados da Conta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Dados da Conta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant={profile.is_active ? "default" : "destructive"} className="mt-0.5">
                    {profile.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ID do Usuário</p>
                  <p className="font-mono text-xs text-muted-foreground truncate">{profile.user_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Crop dialog */}
      <Dialog open={!!cropSrc} onOpenChange={(o) => { if (!o && !uploading) handleCancelCrop(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-72 bg-muted rounded-md overflow-hidden">
            {cropSrc && (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-xs text-muted-foreground">Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelCrop} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCroppedPhoto} disabled={uploading || !croppedAreaPixels} className="gap-2">
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificacoesPushCard() {
  const { enabled, permissionState, enableNotifications, disableNotifications, sendTestNotification } = useNotificationManager();
  const notifSupported = "Notification" in window;

  const handleToggle = async () => {
    if (enabled) {
      disableNotifications();
      toast.success("Notificações desativadas");
    } else {
      if ("Notification" in window && Notification.permission === "denied") {
        toast.error("Notificações bloqueadas pelo navegador. Acesse as configurações do site no navegador e permita notificações, depois tente novamente.");
        return;
      }
      const granted = await enableNotifications();
      if (granted) {
        toast.success("Notificações ativadas!");
      } else {
        toast.error("Permissão de notificação negada pelo navegador. Verifique as configurações do site.");
      }
    }
  };

  const handleTest = () => {
    if (permissionState !== "granted") {
      toast.error("Permita as notificações primeiro");
      return;
    }
    sendTestNotification();
    toast.success("Notificação de teste enviada!");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!notifSupported ? (
          <Badge variant="destructive" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" /> Navegador não suporta notificações
          </Badge>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                permissionState === "granted"
                  ? "text-emerald-500 border-emerald-500/30"
                  : "text-destructive border-destructive/30"
              )}
            >
              {permissionState === "granted" ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Permissão concedida</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Permissão pendente</>
              )}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                enabled
                  ? "text-emerald-500 border-emerald-500/30"
                  : "text-muted-foreground border-border"
              )}
            >
              {enabled ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativas</>
              ) : (
                <><BellOff className="h-3 w-3 mr-1" /> Desativadas</>
              )}
            </Badge>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1.5"
            onClick={handleToggle}
            disabled={!notifSupported}
          >
            {enabled ? <><BellOff className="h-3.5 w-3.5" /> Desativar</> : <><Bell className="h-3.5 w-3.5" /> Ativar</>}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1.5"
            onClick={handleTest}
            disabled={!notifSupported || !enabled}
          >
            <TestTube className="h-3.5 w-3.5" /> Testar Notificação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MeuCanalWhatsAppCard() {
  const { activeCompany } = useAuth();
  const { integrations, loading, testConnection, save, reload, testing } = useTenantWhatsAppIntegration(activeCompany?.id || null);

  const active = integrations.find((i) => i.is_active) || integrations[0];
  const isConnected = active?.connection_status === "connected";
  const lastSync = active?.last_seen_at || active?.last_sync_at;

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [countdown, setCountdown] = useState(40);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizeQr = (raw: string) =>
    raw?.startsWith("data:image") ? raw : `data:image/png;base64,${raw}`;

  const handleGenerateQr = async () => {
    if (!active?.server_url || !active?.instance_token) {
      toast.error("Configure as credenciais do canal primeiro");
      return;
    }
    setGenerating(true);
    try {
      const base = active.server_url.trim().replace(/\/$/, "");
      const headers = { token: active.instance_token.trim(), "Content-Type": "application/json" };

      // 1) Verifica status antes
      try {
        const sres = await fetch(`${base}/instance/status`, { headers });
        if (sres.ok) {
          const sdata = await sres.json();
          const st = sdata?.status || sdata?.connection_status;
          if (st === "connected") {
            toast.info("Já conectado! Desconecte primeiro para escanear novo QR Code");
            await reload();
            return;
          }
        }
      } catch { /* ignora e segue para gerar QR */ }

      // 2) Gera o QR
      const res = await fetch(`${base}/instance/connect`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const qr = data.qrcode || data.base64 || data.qr;
      if (!qr) throw new Error("QR não retornado");
      setQrCode(normalizeQr(qr));
      setCountdown(40);
    } catch (err: any) {
      toast.error("Erro ao gerar QR: " + (err.message || "desconhecido"));
    } finally {
      setGenerating(false);
    }
  };

  const [disconnecting, setDisconnecting] = useState(false);
  const handleDisconnect = async () => {
    if (!active?.server_url || !active?.instance_token) return;
    if (!confirm("Desconectar WhatsApp deste canal?")) return;
    setDisconnecting(true);
    try {
      const base = active.server_url.trim().replace(/\/$/, "");
      const headers = { token: active.instance_token.trim(), "Content-Type": "application/json" };
      const res = await fetch(`${base}/instance/disconnect`, { method: "POST", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("WhatsApp desconectado");
      setQrCode(null);
      await testConnection(active.provider_type);
      await reload();
    } catch (err: any) {
      toast.error("Erro ao desconectar: " + (err.message || "desconhecido"));
    } finally {
      setDisconnecting(false);
    }
  };

  // countdown + polling enquanto QR visível
  useEffect(() => {
    if (!qrCode) {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setQrCode(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    pollRef.current = setInterval(async () => {
      try {
        const base = active!.server_url!.trim().replace(/\/$/, "");
        const sres = await fetch(`${base}/instance/status`, {
          headers: { token: active!.instance_token!.trim(), "Content-Type": "application/json" },
        });
        if (!sres.ok) return;
        const sdata = await sres.json();
        const status = sdata?.status || sdata?.connection_status;
        if (status === "connected") {
          toast.success("WhatsApp conectado com sucesso! 🎉");
          setQrCode(null);
          await testConnection(active!.provider_type); // sincroniza no banco
          await reload();
        }
      } catch { /* silencioso */ }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [qrCode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Meu Canal WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
            <Loader2 className="h-3 w-3 animate-spin" /> Carregando canal...
          </div>
        ) : !active ? (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs text-muted-foreground">
            Nenhum canal configurado neste tenant.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                isConnected ? "bg-emerald-500/10" : "bg-destructive/10"
              )}>
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-emerald-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {active.instance_name || active.provider_type.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {active.connected_phone || active.provider_type}
                  {lastSync && ` · ${new Date(lastSync).toLocaleString("pt-BR")}`}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  isConnected
                    ? "text-emerald-500 border-emerald-500/30"
                    : "text-destructive border-destructive/30"
                )}
              >
                {isConnected ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
                )}
              </Badge>
            </div>

            {qrCode && (
              <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="rounded-lg bg-white p-2">
                  <img src={qrCode} alt="QR Code WhatsApp" className="h-44 w-44 object-contain" />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  WhatsApp → Aparelhos conectados → Conectar
                </p>
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <Loader2 className="h-3 w-3 animate-spin" /> Expira em {countdown}s
                </Badge>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1.5"
            onClick={() => active && testConnection(active.provider_type)}
            disabled={!active || testing}
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            Verificar Conexão
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs gap-1.5"
            onClick={handleGenerateQr}
            disabled={!active || generating}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Hash className="h-3.5 w-3.5" />}
            {qrCode ? "Gerar Novo QR" : "Ler QR Code"}
          </Button>
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDisconnect}
              disabled={!active || disconnecting}
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
              Desconectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusAtendimentoCard() {
  const { status, loading, updating, setOperatorStatus, isAvailable } = useOperatorStatus();

  const handleToggle = async (checked: boolean) => {
    const ok = await setOperatorStatus(checked ? "available" : "unavailable");
    if (ok) {
      toast.success(checked ? "Você está disponível" : "Você está indisponível");
    } else {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Status de Atendimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isAvailable ? "Disponível para atendimento" : "Indisponível"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isAvailable
                ? "Novos atendimentos serão direcionados a você"
                : "Você não receberá novas conversas automaticamente"}
            </p>
          </div>
          <Switch
            checked={isAvailable}
            onCheckedChange={handleToggle}
            disabled={loading || updating}
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isAvailable
                ? "text-emerald-500 border-emerald-500/30"
                : "text-muted-foreground border-border"
            )}
          >
            {isAvailable ? (
              <><CheckCircle2 className="h-3 w-3 mr-1" /> {status === "available" ? "Disponível" : status}</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Indisponível</>
            )}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
