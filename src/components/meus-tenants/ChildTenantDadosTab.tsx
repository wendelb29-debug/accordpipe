import { useState } from "react";
import { Building2, Mail, Phone, User, Calendar, Save, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChildTenant } from "@/hooks/useChildTenants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  child: ChildTenant;
  onUpdated: () => void;
}

export function ChildTenantDadosTab({ child, onUpdated }: Props) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome_fantasia: child.nome_fantasia || "",
    responsavel: child.responsavel || "",
    email: child.email || "",
    telefone: child.telefone || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const oldData = {
        nome_fantasia: child.nome_fantasia,
        responsavel: child.responsavel,
        email: child.email,
        telefone: child.telefone,
      };

      const { error } = await supabase
        .from("companies")
        .update({
          nome_fantasia: form.nome_fantasia || null,
          responsavel: form.responsavel || null,
          email: form.email || null,
          telefone: form.telefone || null,
        })
        .eq("id", child.id);

      if (error) throw error;

      // Audit log
      if (user) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          user_name: user.email,
          action: "update_child_tenant_data",
          target_type: "company",
          target_id: child.id,
          details: { old: oldData, new: form },
        });
      }

      toast.success("Dados do tenant atualizados!");
      setEditing(false);
      onUpdated();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { icon: Building2, label: "Razão Social", value: child.razao_social },
    { icon: Building2, label: "Nome Fantasia", value: editing ? undefined : (child.nome_fantasia || "—"), field: "nome_fantasia" },
    { icon: Building2, label: "CNPJ", value: child.cnpj },
    { icon: User, label: "Responsável", value: editing ? undefined : (child.responsavel || "—"), field: "responsavel" },
    { icon: Mail, label: "E-mail", value: editing ? undefined : (child.email || "—"), field: "email" },
    { icon: Phone, label: "Telefone", value: editing ? undefined : (child.telefone || "—"), field: "telefone" },
    { icon: Calendar, label: "Criado em", value: new Date(child.created_at).toLocaleDateString("pt-BR") },
  ];

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground min-w-[120px]">{f.label}:</span>
            {editing && f.field ? (
              <Input
                value={(form as any)[f.field]}
                onChange={(e) => setForm({ ...form, [f.field!]: e.target.value })}
                className="h-8 text-sm"
              />
            ) : (
              <span className="font-medium text-foreground">{f.value}</span>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-3 border-t border-border/50">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Editar Dados
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
