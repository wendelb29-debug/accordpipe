import { useState, useRef } from "react";
import { User, Camera, Building2, Mail, Shield, Calendar, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitura: "Leitura",
  ceo: "CEO",
};

export default function Perfil() {
  const { profile, role, activeCompany, isMaster } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `avatars/${profile.user_id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl } as any)
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada com sucesso!");
      // Reload to update context
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  if (!profile) return null;

  const createdAt = new Date(profile.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      {/* Photo + Basic Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-28 w-28 rounded-full border-4 border-primary/20 overflow-hidden bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              {!avatarUrl && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">*</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-2">
              <h2 className="text-xl font-semibold text-foreground">{profile.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /> {profile.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <Badge variant="outline">{roleLabels[role || ""] || role}</Badge>
                {isMaster && <Badge className="bg-primary text-primary-foreground text-[10px]">Master</Badge>}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" /> Membro desde {createdAt}
              </div>
              {!avatarUrl && (
                <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Foto obrigatória * — Clique na foto para enviar
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servidor / Company */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Servidor (Empresa)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeCompany ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Razão Social</p>
                <p className="font-medium text-foreground">{activeCompany.razao_social}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Nome Fantasia</p>
                <p className="font-medium text-foreground">{activeCompany.nome_fantasia || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">CNPJ</p>
                <p className="font-medium text-foreground font-mono">{activeCompany.cnpj}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum servidor vinculado</p>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Dados da Conta
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
  );
}
