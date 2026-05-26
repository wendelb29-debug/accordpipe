import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, Shield, Upload, Trash2, RefreshCw,
  Calendar, Building2, FileKey, Loader2, Eye, EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Cert = {
  id: string;
  tenant_id: string | null;
  is_global: boolean;
  name: string;
  storage_path: string;
  holder_name: string | null;
  holder_document: string | null;
  issuer: string | null;
  valid_from: string | null;
  valid_until: string | null;
  environment: "producao" | "homologacao";
  is_active: boolean;
  is_icp_brasil: boolean;
  use_master_global: boolean;
  uso_nfe: boolean;
  uso_assinatura_contratos: boolean;
  ambiente_nfe: "homologacao" | "producao" | null;
  last_test_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  created_at: string;
};

function daysUntil(dateIso: string | null) {
  if (!dateIso) return null;
  return Math.floor((new Date(dateIso).getTime() - Date.now()) / 86400000);
}

function statusOf(c: Cert) {
  const d = daysUntil(c.valid_until);
  if (d === null) return { label: "Não testado", color: "bg-slate-500/15 text-slate-300 border-slate-500/30" };
  if (d < 0) return { label: "Expirado", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
  if (d <= 30) return { label: `Expira em ${d}d`, color: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  return { label: "Válido", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
}

function CertCard({
  cert, onTest, onDelete, onTogglePurpose,
}: {
  cert: Cert;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePurpose: (id: string, patch: { uso_nfe?: boolean; uso_assinatura_contratos?: boolean; ambiente_nfe?: "homologacao" | "producao" }) => void;
}) {
  const st = statusOf(cert);
  const [testing, setTesting] = useState(false);
  return (
    <Card className="bg-card/60 backdrop-blur border-border/50 rounded-2xl overflow-hidden hover:border-blue-500/40 transition-all">
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/15 text-blue-300">
              <FileKey className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{cert.name}</CardTitle>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{cert.holder_name || "—"}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0", st.color)}>{st.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {cert.uso_assinatura_contratos && (
            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Contratos ativo</Badge>
          )}
          {cert.uso_nfe && (
            <Badge variant="outline" className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30">NF-e ativo</Badge>
          )}
          {cert.uso_nfe && cert.ambiente_nfe && (
            <Badge variant="outline" className={cn(
              cert.ambiente_nfe === "producao"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            )}>
              {cert.ambiente_nfe === "producao" ? "Produção" : "Homologação"}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>{cert.valid_until ? new Date(cert.valid_until).toLocaleDateString("pt-BR") : "—"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            {cert.is_icp_brasil
              ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              : <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />}
            <span>{cert.is_icp_brasil ? "ICP-Brasil" : "Não-ICP"}</span>
          </div>
          {cert.holder_document && (
            <div className="col-span-2 text-muted-foreground">
              <span className="font-mono">{cert.holder_document}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium">Assinar contratos</p>
              <p className="text-[10px] text-muted-foreground">PAdES / ICP-Brasil</p>
            </div>
            <Switch
              checked={cert.uso_assinatura_contratos}
              onCheckedChange={(v) => onTogglePurpose(cert.id, { uso_assinatura_contratos: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium">Emitir Nota Fiscal</p>
              <p className="text-[10px] text-muted-foreground">CNPJ do cert deve bater com o tenant</p>
            </div>
            <Switch
              checked={cert.uso_nfe}
              onCheckedChange={(v) => onTogglePurpose(cert.id, { uso_nfe: v })}
            />
          </div>
          {cert.uso_nfe && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Ambiente NF-e</p>
              <select
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                value={cert.ambiente_nfe || "homologacao"}
                onChange={(e) => onTogglePurpose(cert.id, { ambiente_nfe: e.target.value as any })}
              >
                <option value="homologacao">Homologação</option>
                <option value="producao">Produção</option>
              </select>
            </div>
          )}
        </div>

        {cert.last_test_message && (
          <div className="text-xs px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-muted-foreground">
            {cert.last_test_message}
            {cert.last_test_at && <span className="block opacity-60 mt-1">{new Date(cert.last_test_at).toLocaleString("pt-BR")}</span>}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm" variant="secondary" className="flex-1"
            disabled={testing}
            onClick={async () => { setTesting(true); await onTest(cert.id); setTesting(false); }}
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Testar
          </Button>
          <Button size="sm" variant="ghost" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => onDelete(cert.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadDialog({
  open, onOpenChange, tenantId, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tenantId: string;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"producao" | "homologacao">("producao");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setName(""); setPassword(""); setFile(null); setEnvironment("producao"); }
  }, [open]);

  const onPick = (f: File | undefined | null) => {
    if (!f) return;
    if (!/\.(pfx|p12)$/i.test(f.name)) { toast.error("Apenas arquivos .pfx ou .p12"); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Arquivo muito grande (>5MB)"); return; }
    setFile(f);
    if (!name) setName(f.name.replace(/\.(pfx|p12)$/i, ""));
  };

  const submit = async () => {
    if (!file || !password || !name) { toast.error("Preencha todos os campos"); return; }
    setUploading(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("manage-certificate", {
        body: { action: "upload", name, file_b64: b64, password, environment, is_global: false, tenant_id: tenantId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Certificado enviado");
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5 text-blue-400" />
            Novo certificado do tenant
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); onPick(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all",
              dragOver ? "border-blue-500 bg-blue-500/10" : "border-border/60 hover:border-blue-500/50 hover:bg-muted/30"
            )}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">{file ? file.name : "Arraste o arquivo .pfx ou .p12"}</p>
            <p className="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
            <input ref={fileRef} type="file" hidden accept=".pfx,.p12" onChange={(e) => onPick(e.target.files?.[0])} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: A1 do tenant" />
            </div>
            <div>
              <Label className="text-xs">Ambiente</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
              >
                <option value="producao">Produção</option>
                <option value="homologacao">Homologação</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Senha do certificado</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Criptografada em AES-256-GCM antes de ser persistida.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={uploading || !file || !password || !name}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Enviar certificado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantCertificatesTab({ tenantId }: { tenantId: string | null }) {
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);

  const certsQ = useQuery({
    queryKey: ["tenant-certs", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_certificates")
        .select("*")
        .eq("tenant_id", tenantId!)
        .neq("storage_path", "n/a")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Cert[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["tenant-certs", tenantId] });

  const onTest = async (id: string) => {
    const { data, error } = await supabase.functions.invoke("manage-certificate", { body: { action: "test", cert_id: id } });
    if (error || data?.error) { toast.error(data?.error || error?.message || "Falha no teste"); return; }
    toast.success("Certificado testado");
    refresh();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Remover este certificado?")) return;
    const { data, error } = await supabase.functions.invoke("manage-certificate", { body: { action: "delete", cert_id: id } });
    if (error || data?.error) { toast.error(data?.error || error?.message || "Falha"); return; }
    toast.success("Removido");
    refresh();
  };

  const onTogglePurpose = async (id: string, patch: { uso_nfe?: boolean; uso_assinatura_contratos?: boolean; ambiente_nfe?: "homologacao" | "producao" }) => {
    const { data, error } = await supabase.functions.invoke("manage-certificate", {
      body: { action: "update_purpose", cert_id: id, ...patch },
    });
    if (error || data?.error) { toast.error(data?.error || error?.message || "Falha"); return; }
    refresh();
  };

  if (!tenantId) {
    return (
      <Card className="bg-card/30 border-dashed border-border/50 rounded-2xl p-8 text-center text-muted-foreground">
        Salve o tenant primeiro para configurar o certificado fiscal.
      </Card>
    );
  }

  const certs = certsQ.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Fiscal & Certificados</h3>
            <p className="text-xs text-muted-foreground">Certificado A1 (ICP-Brasil) exclusivo deste tenant.</p>
          </div>
        </div>
        <Button onClick={() => setUploadOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500">
          <Upload className="h-4 w-4 mr-2" /> Subir certificado
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certsQ.isLoading && (
          <Card className="col-span-full p-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </Card>
        )}
        {!certsQ.isLoading && certs.length === 0 && (
          <Card className="col-span-full bg-card/30 border-dashed border-border/50 rounded-2xl p-8 text-center text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Nenhum certificado cadastrado para este tenant.
          </Card>
        )}
        {certs.map(c => (
          <CertCard key={c.id} cert={c} onTest={onTest} onDelete={onDelete} onTogglePurpose={onTogglePurpose} />
        ))}
      </div>

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} tenantId={tenantId} onDone={refresh} />
    </div>
  );
}
