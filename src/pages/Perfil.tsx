import { useState, useRef, useEffect } from "react";
import {
  User, Camera, Building2, Mail, Shield, Calendar, Loader2, AlertTriangle,
  Phone, FileText, Bell, BellOff, MessageSquare, Wifi, WifiOff, Hash,
  Save, CheckCircle2, XCircle, TestTube,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useNotificationManager } from "@/hooks/useNotificationManager";
import { useOperatorStatus } from "@/hooks/useOperatorStatus";
import { useTenantWhatsAppIntegration } from "@/hooks/useTenantWhatsAppIntegration";
import { Link } from "react-router-dom";

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
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione um arquivo de imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 5MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `avatars/${profile.user_id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: signedData } = await supabase.storage.from("documents").createSignedUrl(filePath, 3600);
      const signedUrl = signedData?.signedUrl || "";
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: signedUrl } as any).eq("user_id", profile.user_id);
      if (updateError) throw updateError;
      setAvatarUrl(signedUrl);
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
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
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
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
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
                  <Badge variant="secondary" className="text-xs">
                    {roleLabels[role || ""] || "Sem departamento"}
                  </Badge>
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
  const { integrations, loading } = useTenantWhatsAppIntegration(activeCompany?.id || null);

  const active = integrations.find((i) => i.is_active) || integrations[0];
  const isConnected = active?.connection_status === "connected";
  const lastSync = active?.last_seen_at || active?.last_sync_at;

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
          </>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" asChild>
            <Link to="/accord-stack">
              <Wifi className="h-3.5 w-3.5" /> Verificar Conexão
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs gap-1.5" asChild>
            <Link to="/accord-stack">
              <Hash className="h-3.5 w-3.5" /> Ler QR Code
            </Link>
          </Button>
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
