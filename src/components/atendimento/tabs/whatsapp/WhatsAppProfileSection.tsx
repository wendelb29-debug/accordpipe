import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload, Save, Trash2, RefreshCw, ShieldCheck, Wifi, WifiOff, Bold, Italic, Strikethrough, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useTenantWhatsAppIntegration } from "@/hooks/useTenantWhatsAppIntegration";

interface Props {
  tenantId: string | null | undefined;
}

interface InstanceRow {
  id: string;
  status: string;
  phone_number: string | null;
  profile_name: string | null;
  profile_pic_url: string | null;
}

const NAME_MAX = 25;

/**
 * Onda 9 — Perfil real do WhatsApp (uazapi).
 * Sincroniza foto e nome de exibição direto na conta conectada via API.
 * Campos "Categoria / Nome do aplicativo / Descrição" continuam sendo apenas
 * metadados internos do Accord (não vão pra API do WhatsApp).
 */
export function WhatsAppProfileSection({ tenantId }: Props) {
  const [row, setRow] = useState<InstanceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);

  // Real API fields
  const [displayName, setDisplayName] = useState("");
  const [initialDisplayName, setInitialDisplayName] = useState("");
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accord-only metadata
  const { getByProvider, save: saveIntegration, saving: savingMeta } =
    useTenantWhatsAppIntegration(tenantId ?? null);
  const integration = getByProvider("uazapi");
  const meta = (integration?.provider_metadata || {}) as any;
  const identity = meta.identity || {};
  const [category, setCategory] = useState(identity.category || "");
  const [appName, setAppName] = useState(meta.app_name || integration?.instance_name || "");
  const [description, setDescription] = useState(identity.description || "");

  useEffect(() => {
    setCategory(identity.category || "");
    setAppName(meta.app_name || integration?.instance_name || "");
    setDescription(identity.description || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id]);

  const loadInstance = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_instances" as any)
      .select("id, status, phone_number, profile_name, profile_pic_url")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const r = (data as any) ?? null;
    setRow(r);
    setDisplayName(r?.profile_name || "");
    setInitialDisplayName(r?.profile_name || "");
    setPreviewSrc(r?.profile_pic_url || null);
    setPendingBase64(null);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { loadInstance(); }, [loadInstance]);

  const refreshFromApi = useCallback(async (silent = false) => {
    if (!tenantId) return;
    if (!silent) setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-instance-status", {
        body: { tenant_id: tenantId },
      });
      if (error) throw new Error(error.message);
      const err = (data as any)?.error;
      if (err) throw new Error(err);
      await loadInstance();
      if (!silent) toast.success("Perfil atualizado com dados atuais do WhatsApp");
    } catch (e: any) {
      if (!silent) toast.error("Falha ao buscar perfil atual: " + (e.message || String(e)), { duration: 12000 });
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [tenantId, loadInstance]);

  // Auto-sync: poll /instance/status a cada 5s enquanto desconectado (pega o
  // momento em que o QR é escaneado) e a cada 60s quando conectado. Assim que
  // a uazapi reporta "connected", a própria edge function grava profile_name
  // e profile_pic_url em whatsapp_instances — aqui só precisamos recarregar.
  useEffect(() => {
    if (!tenantId) return;
    const isConnected = row?.status === "connected";
    const interval = isConnected ? 60000 : 5000;
    const t = setInterval(() => { refreshFromApi(true); }, interval);
    return () => clearInterval(t);
  }, [tenantId, row?.status, refreshFromApi]);

  // Toast quando detecta a transição para "connected"
  const prevStatusRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStatusRef.current;
    const cur = row?.status ?? null;
    if (prev && prev !== "connected" && cur === "connected") {
      toast.success("WhatsApp conectado — perfil sincronizado automaticamente");
    }
    prevStatusRef.current = cur;
  }, [row?.status]);

  const connected = row?.status === "connected";
  const nameChanged = displayName.trim() !== initialDisplayName.trim();
  const imageChanged = !!pendingBase64;

  const handleFile = async (file: File) => {
    try {
      const b64 = await resizeToJpegBase64(file, 640);
      setPendingBase64(b64);
      setPreviewSrc(`data:image/jpeg;base64,${b64}`);
    } catch (e: any) {
      toast.error("Falha ao processar imagem: " + (e.message || String(e)));
    }
  };

  const saveImage = async (): Promise<boolean> => {
    if (!tenantId || !pendingBase64) return true;
    setSavingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-update-profile-image", {
        body: { tenant_id: tenantId, image_base64: pendingBase64 },
      });
      if (error) throw new Error(error.message);
      const err = (data as any)?.error;
      if (err) throw new Error(err + ((data as any)?.detail ? `: ${JSON.stringify((data as any).detail)}` : ""));
      toast.success("Foto de perfil atualizada no WhatsApp");
      setPendingBase64(null);
      await loadInstance();
      return true;
    } catch (e: any) {
      toast.error("Erro ao atualizar foto: " + (e.message || String(e)), { duration: 12000 });
      return false;
    } finally {
      setSavingImage(false);
    }
  };

  const removeImage = async () => {
    if (!tenantId) return;
    if (!confirm("Remover a foto de perfil do WhatsApp?")) return;
    setRemovingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-update-profile-image", {
        body: { tenant_id: tenantId, remove: true },
      });
      if (error) throw new Error(error.message);
      const err = (data as any)?.error;
      if (err) throw new Error(err);
      toast.success("Foto de perfil removida");
      await loadInstance();
    } catch (e: any) {
      toast.error("Erro ao remover foto: " + (e.message || String(e)), { duration: 12000 });
    } finally {
      setRemovingImage(false);
    }
  };

  const saveName = async (): Promise<boolean> => {
    if (!tenantId || !nameChanged) return true;
    const name = displayName.trim();
    if (name.length > NAME_MAX) {
      toast.error(`Nome de exibição deve ter no máximo ${NAME_MAX} caracteres`);
      return false;
    }
    setSavingName(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-update-profile-name", {
        body: { tenant_id: tenantId, name },
      });
      if (error) throw new Error(error.message);
      const err = (data as any)?.error;
      if (err) throw new Error(err + ((data as any)?.detail ? `: ${JSON.stringify((data as any).detail)}` : ""));
      toast.success("Nome de exibição atualizado no WhatsApp");
      setInitialDisplayName(name);
      return true;
    } catch (e: any) {
      toast.error("Erro ao atualizar nome: " + (e.message || String(e)), { duration: 12000 });
      return false;
    } finally {
      setSavingName(false);
    }
  };

  const saveInternalMeta = async () => {
    if (!tenantId) return;
    const newMeta = {
      ...(integration?.provider_metadata || {}),
      app_name: appName,
      identity: {
        ...(integration?.provider_metadata as any || {}).identity,
        category,
        description,
      },
    };
    await saveIntegration("uazapi", { provider_metadata: newMeta } as any);
  };

  const saveWhatsAppProfile = async () => {
    if (!connected) {
      toast.error("Conecte o WhatsApp primeiro para alterar o perfil");
      return;
    }
    if (!nameChanged && !imageChanged) {
      toast.info("Nada para salvar");
      return;
    }
    if (imageChanged) await saveImage();
    if (nameChanged) await saveName();
  };

  if (!tenantId) {
    return <div className="text-sm text-muted-foreground">Selecione um tenant.</div>;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Perfil real do WhatsApp (sincroniza via API) */}
      <div className="rounded-xl border border-emerald-500/30 bg-card p-5 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Perfil do WhatsApp — sincronizado com a API
            </div>
            <p className="text-sm text-muted-foreground">
              Alterações aqui são aplicadas no WhatsApp conectado imediatamente.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1">
                <Wifi className="h-3 w-3" /> Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <WifiOff className="h-3 w-3" /> Desconectado
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={refreshFromApi} disabled={refreshing} className="gap-2">
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Atualizar
            </Button>
          </div>
        </div>

        {!connected && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200/90">
            Conecte o WhatsApp primeiro em{" "}
            <Link to="/configuracoes/whatsapp" className="underline font-medium">Conexão WhatsApp</Link>{" "}
            para alterar foto e nome. A uazapi exige uma sessão ativa.
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Foto */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-32 w-32 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center">
              {previewSrc ? (
                <img src={previewSrc} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground text-center px-3">Sem foto</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={!connected}
                className="gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                {previewSrc ? "Trocar foto" : "Enviar foto"}
              </Button>
              {previewSrc && !pendingBase64 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={removeImage}
                  disabled={!connected || removingImage}
                  className="gap-2 text-destructive"
                >
                  {removingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Remover
                </Button>
              )}
            </div>
            {pendingBase64 && (
              <div className="text-[11px] text-amber-500">Nova foto pendente — clique em "Salvar perfil"</div>
            )}
            <div className="text-[11px] text-muted-foreground text-center max-w-[160px]">
              Recomendado: JPEG quadrado. Será redimensionado automaticamente para 640×640.
            </div>
          </div>

          {/* Nome + telefone */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground">Nome de exibição</Label>
                <span className={`text-[11px] ${displayName.length > NAME_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                  {displayName.length}/{NAME_MAX}
                </span>
              </div>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, NAME_MAX))}
                disabled={!connected}
                placeholder="Como você aparece pros contatos"
                maxLength={NAME_MAX}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Número de telefone</Label>
              <Input
                value={row?.phone_number ? `+${row.phone_number}` : ""}
                readOnly
                disabled
                placeholder="Conecte via QR Code"
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                Somente leitura. Para trocar o número, desconecte e escaneie o QR de outro chip.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={saveWhatsAppProfile}
                disabled={!connected || (!nameChanged && !imageChanged) || savingImage || savingName}
                className="gap-2"
              >
                {(savingImage || savingName) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar perfil do WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — Metadados internos do Accord (NÃO vai pra API) */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            Metadados internos do Accord
          </div>
          <p className="text-sm text-muted-foreground">
            Usados apenas dentro do Accord para organização. <strong>Não</strong> são sincronizados com o WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {["Varejo", "Serviços", "Educação", "Saúde", "Financeiro", "Tecnologia", "Outros"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nome do aplicativo</Label>
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Descrição</Label>
          <div className="flex items-center gap-1 rounded-t-md border border-border border-b-0 bg-muted/40 px-2 py-1">
            <button type="button" className="p-1 hover:bg-muted rounded"><Bold className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1 hover:bg-muted rounded"><Italic className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1 hover:bg-muted rounded"><Strikethrough className="h-3.5 w-3.5" /></button>
            <button type="button" className="p-1 hover:bg-muted rounded"><Code className="h-3.5 w-3.5" /></button>
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-t-none"
          />
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={saveInternalMeta} disabled={savingMeta} className="gap-2">
            {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar metadados
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Resize/center-crop an image file to a square JPEG of the given size. Returns pure base64 (no prefix). */
async function resizeToJpegBase64(file: File, size: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Falha ao carregar imagem"));
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");
  const srcMin = Math.min(img.width, img.height);
  const sx = (img.width - srcMin) / 2;
  const sy = (img.height - srcMin) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, srcMin, srcMin, 0, 0, size, size);
  const out = canvas.toDataURL("image/jpeg", 0.9);
  const idx = out.indexOf("base64,");
  return idx >= 0 ? out.slice(idx + 7) : out;
}
