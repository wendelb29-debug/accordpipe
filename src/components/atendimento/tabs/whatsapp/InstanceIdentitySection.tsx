import { useEffect, useState } from "react";
import { Upload, Save, Bold, Italic, Strikethrough, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { TenantWhatsAppIntegration, WhatsAppProvider } from "@/hooks/useTenantWhatsAppIntegration";

interface Props {
  integration: TenantWhatsAppIntegration | null;
  provider: WhatsAppProvider;
  save: (provider: WhatsAppProvider, payload: Partial<TenantWhatsAppIntegration>) => Promise<any>;
}

export function InstanceIdentitySection({ integration, provider, save }: Props) {
  const meta = (integration?.provider_metadata || {}) as any;
  const identity = meta.identity || {};

  const [avatar, setAvatar] = useState<string>(identity.avatar_url || "");
  const [category, setCategory] = useState<string>(identity.category || "");
  const [description, setDescription] = useState<string>(identity.description || "");
  const [appName, setAppName] = useState<string>(meta.app_name || integration?.instance_name || "");
  const [displayName, setDisplayName] = useState<string>(meta.display_name || "");
  const [phone, setPhone] = useState<string>(integration?.connected_phone || "");
  const [about, setAbout] = useState<string>(identity.about || "");
  const [email, setEmail] = useState<string>(identity.email || "");
  const [address, setAddress] = useState<string>(identity.address || "");
  const [website, setWebsite] = useState<string>(identity.website || "");
  const [website2, setWebsite2] = useState<string>(identity.website_2 || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const m = (integration?.provider_metadata || {}) as any;
    const id = m.identity || {};
    setAvatar(id.avatar_url || "");
    setCategory(id.category || "");
    setDescription(id.description || "");
    setAppName(m.app_name || integration?.instance_name || "");
    setDisplayName(m.display_name || "");
    setPhone(integration?.connected_phone || "");
    setAbout(id.about || "");
    setEmail(id.email || "");
    setAddress(id.address || "");
    setWebsite(id.website || "");
    setWebsite2(id.website_2 || "");
  }, [integration?.id]);

  const handleSave = async () => {
    if (!integration) {
      toast.error("Configure as credenciais primeiro.");
      return;
    }
    setSaving(true);
    try {
      const newMeta = {
        ...(integration.provider_metadata || {}),
        app_name: appName,
        display_name: displayName,
        identity: {
          avatar_url: avatar,
          category,
          description,
          about,
          email,
          address,
          website,
          website_2: website2,
        },
      };
      await save(provider, { provider_metadata: newMeta } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div>
        <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
          01 — Dados da instância
        </div>
        <p className="text-sm text-muted-foreground">
          Identidade visível do seu canal no WhatsApp.
        </p>
      </div>

      {/* Avatar upload */}
      <div>
        <Label className="text-xs text-muted-foreground">Imagem de perfil</Label>
        <label className="mt-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-sm text-muted-foreground hover:bg-muted/30 cursor-pointer transition-colors">
          <Upload className="h-4 w-4" />
          {avatar ? <span className="truncate max-w-[200px]">{avatar}</span> : "Arraste ou clique para adicionar"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAvatar(f.name);
            }}
          />
        </label>
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
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nome de exibição</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Número de telefone</Label>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-2 text-sm">🇧🇷 +55</span>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Recado</Label>
          <Input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Ex: Disponível" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs text-muted-foreground">Endereço</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Site</Label>
          <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Site secundário</Label>
          <Input value={website2} onChange={(e) => setWebsite2(e.target.value)} placeholder="https://" />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        Salvar identidade
      </Button>
    </div>
  );
}
