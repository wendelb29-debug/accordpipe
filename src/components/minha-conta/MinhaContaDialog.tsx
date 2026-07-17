import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper, { Area } from "react-easy-crop";
import { toast } from "sonner";
import {
  User, Camera, Mail, Shield, Loader2, Building2, KeyRound,
  Palette, Bell, Globe, Moon, Sun, Check, X, ShieldCheck,
  ShieldOff, QrCode, AlertCircle, Save, LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MinhaContaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador", operador: "Operador", leitura: "Leitura",
  ceo: "CEO", administrativo: "Administrativo", financeiro: "Financeiro",
  comercial: "Comercial", master: "Master",
};

const NOTIFICATION_CATEGORIES: Array<{ key: string; label: string; description: string }> = [
  { key: "mentions", label: "Menções e respostas", description: "Quando você é mencionado ou respondem sua publicação" },
  { key: "reactions", label: "Reações", description: "Reações em publicações e comentários seus" },
  { key: "comments", label: "Comentários", description: "Novos comentários em publicações que você segue" },
  { key: "birthdays", label: "Aniversários", description: "Aniversariantes do seu tenant" },
  { key: "activities", label: "Atividades e agenda", description: "Lembretes de compromissos e follow-ups" },
  { key: "documents", label: "Documentos e assinaturas", description: "Contratos e assinaturas eletrônicas" },
  { key: "leads", label: "Leads e propostas", description: "Novos leads, atualizações de propostas e cards" },
  { key: "system", label: "Sistema", description: "Comunicados administrativos e do sistema" },
];

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function MinhaContaDialog({ open, onOpenChange }: MinhaContaDialogProps) {
  const { profile, role, activeCompany, isMaster, signOut } = useAuth();
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("perfil");

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-lg">Minha conta</DialogTitle>
          <DialogDescription className="text-xs">
            Gerencie seu perfil, vínculos, segurança, preferências e notificações
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-3 border-b shrink-0">
            <TabsList className="h-10 bg-transparent p-0 gap-1 w-full justify-start overflow-x-auto">
              <TabsTrigger value="perfil" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1.5">
                <User className="h-3.5 w-3.5" /> Perfil
              </TabsTrigger>
              <TabsTrigger value="vinculos" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Vínculos
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Segurança
              </TabsTrigger>
              <TabsTrigger value="preferencias" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Preferências
              </TabsTrigger>
              <TabsTrigger value="notificacoes" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Notificações
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="perfil" className="m-0 p-6"><PerfilTab /></TabsContent>
            <TabsContent value="vinculos" className="m-0 p-6"><VinculosTab /></TabsContent>
            <TabsContent value="seguranca" className="m-0 p-6"><SegurancaTab /></TabsContent>
            <TabsContent value="preferencias" className="m-0 p-6"><PreferenciasTab /></TabsContent>
            <TabsContent value="notificacoes" className="m-0 p-6"><NotificacoesTab /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* =====================================================================
   ABA 1 — PERFIL
   ===================================================================== */
function PerfilTab() {
  const { profile, role } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url || null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    supabase.from("profiles").select("cpf, first_name, last_name, phone, mobile, name" as any)
      .eq("user_id", profile.user_id).maybeSingle()
      .then(({ data }: any) => {
        if (!data) return;
        const fallbackParts = (data.name || "").split(" ");
        setFirstName(data.first_name || fallbackParts[0] || "");
        setLastName(data.last_name || fallbackParts.slice(1).join(" ") || "");
        setPhone(data.phone ? formatPhone(data.phone) : "");
        setMobile(data.mobile ? formatPhone(data.mobile) : "");
        setCpf(data.cpf ? formatCpf(data.cpf) : "");
      });
  }, [profile?.user_id]);

  // Cropping
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, area: Area) => setCroppedAreaPixels(area), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Máx. 10MB"); return; }
    const r = new FileReader();
    r.onload = () => { setCropSrc(r.result as string); setCrop({ x: 0, y: 0 }); setZoom(1); };
    r.readAsDataURL(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const getCroppedBlob = (src: string, area: Area): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = 512; c.height = 512;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 512, 512);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha"))), "image/jpeg", 0.9);
      };
      img.onerror = () => reject(new Error("Falha"));
      img.src = src;
    });

  const handleSaveCrop = async () => {
    if (!profile || !cropSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const path = `${profile.user_id}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const url = `https://nglwgzknqgihlbkdnflu.supabase.co/functions/v1/avatar-proxy?u=${profile.user_id}&v=${Date.now()}`;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", profile.user_id);
      if (updErr) throw updErr;
      setAvatarUrl(url); setAvatarFailed(false); setCropSrc(null);
      toast.success("Foto atualizada!");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!firstName.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase.from("profiles").update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        name: fullName,
        phone: phone.replace(/\D/g, "") || null,
        mobile: mobile.replace(/\D/g, "") || null,
        cpf: cpf.replace(/\D/g, "") || null,
      } as any).eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("Perfil atualizado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const initials = (firstName + " " + lastName).trim().split(" ").map(s => s[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-4 border-background shadow">
            {avatarUrl && !avatarFailed ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
            ) : (
              <span className="text-2xl font-bold text-primary">{initials}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow hover:bg-primary/90"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
        <div>
          <p className="font-semibold text-foreground">{profile?.name || "-"}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {profile?.email}</p>
          <Badge variant="outline" className="text-[10px] mt-1.5">{roleLabels[role || ""] || role}</Badge>
        </div>
      </div>

      <Separator />

      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Nome *</Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Primeiro nome" />
        </div>
        <div>
          <Label className="text-xs">Sobrenome</Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Sobrenome" />
        </div>
        <div>
          <Label className="text-xs">CPF</Label>
          <Input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" />
        </div>
        <div>
          <Label className="text-xs">E-mail</Label>
          <Input value={profile.email} disabled className="opacity-60" />
        </div>
        <div>
          <Label className="text-xs">Telefone fixo</Label>
          <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 0000-0000" />
        </div>
        <div>
          <Label className="text-xs">Celular / WhatsApp</Label>
          <Input value={mobile} onChange={(e) => setMobile(formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>

      {/* Cropper Dialog */}
      <Dialog open={!!cropSrc} onOpenChange={(o) => !o && setCropSrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar foto</DialogTitle>
            <DialogDescription>Enquadre sua foto de perfil (512x512)</DialogDescription>
          </DialogHeader>
          <div className="relative h-72 bg-muted rounded-lg overflow-hidden">
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
          <div>
            <Label className="text-xs">Zoom</Label>
            <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropSrc(null)}>Cancelar</Button>
            <Button onClick={handleSaveCrop} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =====================================================================
   ABA 2 — VÍNCULOS
   ===================================================================== */
function VinculosTab() {
  const { profile, role, activeCompany, companies, activeCompanyId, setActiveCompanyId } = useAuth();
  const userId = profile?.user_id;

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["minha-conta-departments", userId, activeCompanyId],
    enabled: !!userId && !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_departments")
        .select("department_id, priority, is_active, tenant_departments ( name, color, description )")
        .eq("user_id", userId!)
        .eq("tenant_id", activeCompanyId!)
        .eq("is_active", true)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Tenants disponíveis
        </h3>
        <div className="grid gap-2">
          {companies.length === 0 && <p className="text-sm text-muted-foreground">Nenhum tenant vinculado</p>}
          {companies.map((c: any) => {
            const isActive = c.id === activeCompanyId;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCompanyId(c.id)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                  isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.nome_fantasia || c.razao_social}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.cnpj || c.email || ""}</p>
                  </div>
                </div>
                {isActive && <Badge variant="default" className="text-[10px]">Ativo</Badge>}
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Papel no tenant
        </h3>
        <p className="text-xs text-muted-foreground mb-3">Seu papel em {activeCompany?.nome_fantasia || activeCompany?.razao_social}</p>
        <Badge variant="outline" className="text-xs">{roleLabels[role || ""] || role || "sem papel"}</Badge>
      </section>

      <Separator />

      <section>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Departamentos
        </h3>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && departments.length === 0 && (
          <p className="text-sm text-muted-foreground">Você não está vinculado a nenhum departamento neste tenant.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {departments.map((d: any) => (
            <div key={d.department_id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: d.tenant_departments?.color || "#8B5CF6" }}
              />
              <span className="text-sm">{d.tenant_departments?.name || "-"}</span>
              {d.priority === 1 && <Badge variant="secondary" className="text-[9px] h-4">Principal</Badge>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* =====================================================================
   ABA 3 — SEGURANÇA
   ===================================================================== */
function SegurancaTab() {
  const { profile } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Password change
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // MFA
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollData, setEnrollData] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const loadMfa = useCallback(async () => {
    setLoadingMfa(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setMfaFactors(data?.totp || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingMfa(false);
    }
  }, []);

  useEffect(() => { loadMfa(); }, [loadMfa]);

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      toast.error("E-mail inválido"); return;
    }
    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success("Confirmação enviada para o novo e-mail");
      setNewEmail("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao alterar e-mail");
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd.length < 8) { toast.error("Senha deve ter pelo menos 8 caracteres"); return; }
    if (newPwd !== confirmPwd) { toast.error("Senhas não conferem"); return; }
    setChangingPwd(true);
    try {
      // Reautentica com senha atual (best-effort)
      if (profile?.email && oldPwd) {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: oldPwd });
        if (signErr) throw new Error("Senha atual incorreta");
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Senha alterada com sucesso");
      setOldPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao alterar senha");
    } finally {
      setChangingPwd(false);
    }
  };

  const handleEnrollMfa = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setEnrollData({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao iniciar MFA");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!enrollData || verifyCode.length !== 6) { toast.error("Digite o código de 6 dígitos"); return; }
    setVerifying(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enrollData.factorId });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrollData.factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (vErr) throw vErr;
      toast.success("MFA ativado com sucesso!");
      setEnrollData(null);
      setVerifyCode("");
      await supabase.from("profiles").update({ two_factor_enabled: true } as any).eq("user_id", profile!.user_id);
      loadMfa();
    } catch (e: any) {
      toast.error(e?.message || "Código inválido");
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenrollMfa = async (factorId: string) => {
    if (!confirm("Desativar MFA? Sua conta ficará menos protegida.")) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await supabase.from("profiles").update({ two_factor_enabled: false } as any).eq("user_id", profile!.user_id);
      toast.success("MFA desativado");
      loadMfa();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao desativar MFA");
    }
  };

  const activeMfa = mfaFactors.find((f) => f.status === "verified");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* MFA */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center",
              activeMfa ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500")}>
              {activeMfa ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-semibold text-sm">Autenticação de dois fatores (TOTP)</p>
              <p className="text-xs text-muted-foreground">
                {activeMfa ? "Ativo — use seu app autenticador ao entrar" : "Proteja sua conta com um app autenticador"}
              </p>
            </div>
          </div>
          {loadingMfa ? <Loader2 className="h-4 w-4 animate-spin" /> :
            activeMfa ? (
              <Button size="sm" variant="outline" onClick={() => handleUnenrollMfa(activeMfa.id)}>Desativar</Button>
            ) : (
              <Button size="sm" onClick={handleEnrollMfa} disabled={enrolling}>
                {enrolling && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Ativar
              </Button>
            )
          }
        </div>

        {enrollData && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-xs">1. Escaneie o QR Code no Google Authenticator / 1Password / Authy:</p>
            <div className="flex justify-center bg-white p-3 rounded-lg">
              <img src={enrollData.qr} alt="MFA QR" className="h-40 w-40" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Ou digite manualmente: <code className="bg-background px-1 py-0.5 rounded">{enrollData.secret}</code>
            </p>
            <div>
              <Label className="text-xs">2. Digite o código de 6 dígitos gerado:</Label>
              <div className="flex gap-2 mt-1">
                <Input value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" maxLength={6} />
                <Button onClick={handleVerifyMfa} disabled={verifying || verifyCode.length !== 6}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verificar"}
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setEnrollData(null); setVerifyCode(""); }}>Cancelar</Button>
          </div>
        )}
      </section>

      {/* Email */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Alterar e-mail</p>
        </div>
        <p className="text-xs text-muted-foreground">Atual: <span className="font-mono">{profile?.email}</span></p>
        <div className="flex gap-2">
          <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@email.com" />
          <Button onClick={handleChangeEmail} disabled={changingEmail}>
            {changingEmail && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Alterar
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          Um link de confirmação será enviado ao novo endereço. O e-mail só muda após confirmação.
        </p>
      </section>

      {/* Password */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Alterar senha</p>
        </div>
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Senha atual</Label>
            <Input type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nova senha (mín. 8)</Label>
              <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Confirmar nova senha</Label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPwd} className="w-full sm:w-auto">
            {changingPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Alterar senha
          </Button>
        </div>
      </section>
    </div>
  );
}

/* =====================================================================
   ABA 4 — PREFERÊNCIAS
   ===================================================================== */
function PreferenciasTab() {
  const { profile } = useAuth();
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark" | "system">(
    () => (localStorage.getItem("theme") as any) || "system"
  );
  const [language, setLanguage] = useState<string>(i18n.language || "pt-BR");
  const [saving, setSaving] = useState(false);

  const applyTheme = (t: "light" | "dark" | "system") => {
    setTheme(t);
    const actual = t === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : t;
    document.documentElement.classList.add("theme-transition");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(actual);
    localStorage.setItem("theme", t);
    setTimeout(() => document.documentElement.classList.remove("theme-transition"), 200);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      i18n.changeLanguage(language);
      localStorage.setItem("i18nextLng", language);
      await supabase.from("profiles").update({
        theme,
        preferred_language: language,
      } as any).eq("user_id", profile.user_id);
      toast.success("Preferências salvas");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Idioma</p>
        </div>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
            <SelectItem value="en">🇺🇸 English</SelectItem>
            <SelectItem value="es">🇪🇸 Español</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">Aparência</p>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-md">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => applyTheme(t)}
              className={cn(
                "rounded-lg border p-3 flex flex-col items-center gap-2 transition-colors",
                theme === t ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              )}
            >
              {t === "light" && <Sun className="h-5 w-5" />}
              {t === "dark" && <Moon className="h-5 w-5" />}
              {t === "system" && <Palette className="h-5 w-5" />}
              <span className="text-xs capitalize">{t === "system" ? "Sistema" : t === "dark" ? "Escuro" : "Claro"}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}

/* =====================================================================
   ABA 5 — NOTIFICAÇÕES
   ===================================================================== */
function NotificacoesTab() {
  const { profile } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, { in_app: boolean; email: boolean; push: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles")
        .select("notification_preferences" as any)
        .eq("user_id", profile.user_id)
        .maybeSingle();
      const stored = (data as any)?.notification_preferences || {};
      const initial: any = {};
      NOTIFICATION_CATEGORIES.forEach((c) => {
        initial[c.key] = {
          in_app: stored?.[c.key]?.in_app !== false,
          email: stored?.[c.key]?.email === true,
          push: stored?.[c.key]?.push !== false,
        };
      });
      setPrefs(initial);
      setLoading(false);
    })();
  }, [profile?.user_id]);

  const toggle = (cat: string, channel: "in_app" | "email" | "push", value: boolean) => {
    setPrefs((p) => ({ ...p, [cat]: { ...p[cat], [channel]: value } }));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles")
        .update({ notification_preferences: prefs } as any)
        .eq("user_id", profile.user_id);
      if (error) throw error;
      toast.success("Preferências de notificação salvas");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-xs text-muted-foreground">Escolha por onde receber cada tipo de notificação.</p>

      <div className="rounded-xl border overflow-hidden">
        <div className="grid grid-cols-[1fr_70px_70px_70px] gap-2 px-4 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide">
          <div>Categoria</div>
          <div className="text-center">In-app</div>
          <div className="text-center">E-mail</div>
          <div className="text-center">Push</div>
        </div>
        {NOTIFICATION_CATEGORIES.map((c, i) => (
          <div key={c.key} className={cn("grid grid-cols-[1fr_70px_70px_70px] gap-2 px-4 py-3 items-center", i > 0 && "border-t")}>
            <div className="min-w-0">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-[11px] text-muted-foreground">{c.description}</p>
            </div>
            <div className="flex justify-center"><Switch checked={prefs[c.key]?.in_app ?? true} onCheckedChange={(v) => toggle(c.key, "in_app", v)} /></div>
            <div className="flex justify-center"><Switch checked={prefs[c.key]?.email ?? false} onCheckedChange={(v) => toggle(c.key, "email", v)} /></div>
            <div className="flex justify-center"><Switch checked={prefs[c.key]?.push ?? true} onCheckedChange={(v) => toggle(c.key, "push", v)} /></div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar notificações
        </Button>
      </div>
    </div>
  );
}
