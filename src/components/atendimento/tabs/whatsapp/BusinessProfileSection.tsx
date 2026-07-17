import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Store, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tenantId: string | null | undefined;
}

interface BusinessProfile {
  description: string;
  address: string;
  email: string;
}

export function BusinessProfileSection({ tenantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  const [initial, setInitial] = useState<BusinessProfile>({ description: "", address: "", email: "" });
  const [values, setValues] = useState<BusinessProfile>({ description: "", address: "", email: "" });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-business-get-profile", {
        body: { tenant_id: tenantId },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      setIsBusiness(Boolean(d?.isBusiness));
      if (d?.profile) {
        const p: BusinessProfile = {
          description: d.profile.description ?? "",
          address: d.profile.address ?? "",
          email: d.profile.email ?? "",
        };
        setInitial(p);
        setValues(p);
      }
    } catch (e: any) {
      // Instance not connected is common — do not spam the user with a toast; render inline.
      if (!/instance_not_connected|no_instance/.test(e?.message || "")) {
        toast.error("Falha ao carregar perfil comercial: " + (e.message || String(e)), { duration: 10000 });
      }
      setIsBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const diff = (): Partial<BusinessProfile> => {
    const out: Partial<BusinessProfile> = {};
    if (values.description !== initial.description) out.description = values.description;
    if (values.address !== initial.address) out.address = values.address;
    if (values.email !== initial.email) out.email = values.email;
    return out;
  };
  const isDirty = Object.keys(diff()).length > 0;

  const save = async () => {
    if (!tenantId) return;
    const payload = diff();
    if (!Object.keys(payload).length) return;
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      toast.error("E-mail inválido");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-business-update-profile", {
        body: { tenant_id: tenantId, ...payload },
      });
      if (error) throw new Error(error.message);
      const d = data as any;
      if (d?.error) throw new Error(d.error);

      if (d?.partial) {
        const saved: string[] = d.saved ?? [];
        const failed: { field: string; error: string }[] = d.failed ?? [];
        if (saved.length) {
          const nextInitial = { ...initial };
          for (const f of saved) (nextInitial as any)[f] = (values as any)[f];
          setInitial(nextInitial);
        }
        if (failed.length) {
          const list = failed.map((f) => `${f.field}: ${f.error}`).join(" • ");
          toast.error(`Sucesso parcial. Falharam: ${list}`, { duration: 12000 });
        } else {
          toast.success("Perfil comercial atualizado");
        }
      } else {
        setInitial({ ...values });
        toast.success("Perfil comercial atualizado");
      }
    } catch (e: any) {
      toast.error("Falha ao salvar: " + (e.message || String(e)), { duration: 12000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-2">
          <Store size={13} /> Perfil comercial (WhatsApp Business)
        </CardTitle>
        <CardDescription>
          Sincroniza descrição, endereço e e-mail com o perfil comercial da conta conectada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> Carregando…
          </div>
        ) : isBusiness === false ? (
          <div className="flex items-start gap-2 text-xs rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-amber-600 dark:text-amber-400">
            <AlertCircle size={14} className="mt-0.5" />
            Perfil comercial disponível apenas para contas WhatsApp Business.
          </div>
        ) : isBusiness === null ? (
          <div className="flex items-start gap-2 text-xs rounded-md border border-border bg-muted/30 p-3 text-muted-foreground">
            <AlertCircle size={14} className="mt-0.5" />
            Conecte a instância uazapi para editar o perfil comercial.
          </div>
        ) : (
          <>
            <div>
              <Label className="text-xs">Descrição</Label>
              <Textarea
                rows={3}
                value={values.description}
                onChange={(e) => setValues({ ...values, description: e.target.value })}
                placeholder="Sobre o seu negócio"
              />
            </div>
            <div>
              <Label className="text-xs">Endereço</Label>
              <Input
                value={values.address}
                onChange={(e) => setValues({ ...values, address: e.target.value })}
                placeholder="Rua, número, cidade"
              />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={!isDirty || saving}>
                {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
                Salvar perfil comercial
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
