import { Building2, Mail, Phone, User, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChildTenant } from "@/hooks/useChildTenants";

interface Props {
  child: ChildTenant;
  onUpdated: () => void;
}

export function ChildTenantDadosTab({ child }: Props) {
  const fields = [
    { icon: Building2, label: "Razão Social", value: child.razao_social },
    { icon: Building2, label: "Nome Fantasia", value: child.nome_fantasia || "—" },
    { icon: Building2, label: "CNPJ", value: child.cnpj },
    { icon: User, label: "Responsável", value: child.responsavel || "—" },
    { icon: Mail, label: "E-mail", value: child.email || "—" },
    { icon: Phone, label: "Telefone", value: child.telefone || "—" },
    { icon: Calendar, label: "Criado em", value: new Date(child.created_at).toLocaleDateString("pt-BR") },
  ];

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <f.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground min-w-[120px]">{f.label}:</span>
            <span className="font-medium text-foreground">{f.value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
